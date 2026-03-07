/**
 * Claude SDK Chat API Route
 *
 * 使用 Claude Agent SDK 处理聊天请求
 * 遵循项目规范:
 * - 使用 BaseController 和 Zod 验证
 * - 通过 ClaudeService 获取 Provider 配置
 * - 通过 ChatStorageService 持久化消息
 * - 支持用户认证和会话管理
 * - 使用统一的 AgentStreamEvent 格式输出
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { streamClaude } from '../../../../server/core/claude/claudeClient';
import { claudeService } from '@server/service/claudeService';
import authService from '@server/service/authService';
import { skillService } from '@server/service/skillService';
import { BaseController } from '../../base/baseController';
import { WithRequestContextStatic } from '@server/base/decorators';
import { SSEEmitter } from '@server/base/sseEmitter';
import { createSSEResponse } from '@server/base/responseUtil';
import logger from '@server/base/logger';
import type { SSEEvent, TokenUsage, MessageContentBlock, FileAttachment } from '@/types';
import { igToolsServer } from '@/server/core/claude/buildTools';
import positionService from '@/server/service/positionService';
import transactionService from '@/server/service/transactionService';
import { getToolDisplayName } from '@/server/core/claude/toolNameMapper';
import { recordPrompt } from '@/server/utils/file';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Zod 验证 Schema - 适配前端统一的入参格式
const ClaudeChatRequestSchema = z.object({
  sessionId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    }),
  ),
  model: z.string(),
  agentId: z.string().optional(),
  stream: z.boolean().optional(),
  mode: z.enum(['code', 'plan', 'ask']).optional(),
  /** T401: 会话级别激活的 skill slugs，作为全局已启用 skills 的子集过滤 */
  skills: z.array(z.string()).optional(),
  files: z
    .array(
      z.object({
        fileName: z.string(),
        fileContent: z.string(),
        mimeType: z.string().optional(),
        filePath: z.string().optional(),
      }),
    )
    .optional(),
  toolTimeout: z.number().optional(),
  provider_id: z.string().optional(),
});

class ClaudeChatController extends BaseController {
  @WithRequestContextStatic()
  static async POST(request: NextRequest) {
    try {
      // 1. 参数验证
      const body = await this.validateBody(request, ClaudeChatRequestSchema);
      const { sessionId, messages, model, mode, files, toolTimeout, skills: requestedSkills } = body;

      // 提取最后一条用户消息作为 prompt
      const userMessage = messages.findLast((msg) => msg.role === 'user');
      if (!userMessage) {
        return this.error('未找到用户消息', 'no_user_message');
      }
      const content = userMessage.content;

      // 2. 用户认证
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 3. 验证会话并获取真实的 session ID
      if (!sessionId) {
        return this.error('会话不存在', 'session_not_found');
      }
     
      const userIdNum = parseInt(userId, 10);
      // T302/T403: 按需加载 skills prompt
      // 仅当前端明确传递了非空 skills 数组时才查询并注入。
      // 使用 getSkillsBySlugs 而非 getEnabledSkills，因为用户在工具面板中明确选择了这些技能，
      // 即使它们的全局 isEnabled=false 也应该被尊重。
      let skillsSystemPrompt: string | undefined;
      if (requestedSkills && requestedSkills.length > 0) {
        const selectedSkills = await skillService.getSkillsBySlugs(userIdNum, requestedSkills);
        if (selectedSkills.length > 0) {
          skillsSystemPrompt = selectedSkills
            .filter((s) => s.prompt)
            .map((s) => `## Skill: ${s.name}\n\n${s.description}`)
            .join('\n\n---\n\n') || undefined;
        }
      }
      // 使用真实的 session ID, "inbox_NU7XvF4aO3DEGlwJnGsD7"使用后半部分
      const realSessionId = sessionId.split('_')[1];

      // 4. 创建 SSE Emitter (验证通过后才创建)
      const sseEmitter = new SSEEmitter();

      // 5. 权限模式映射
      const effectiveMode = mode || 'code';
      let permissionMode: string;
      let systemPromptOverride: string | undefined;
      switch (effectiveMode) {
        case 'plan':
          permissionMode = 'plan';
          break;
        case 'ask':
          permissionMode = 'default';
          systemPromptOverride =
            '\n\nYou are in Ask mode. Answer questions and provide information only. Do not use any tools, do not read or write files, do not execute commands. Only respond with text.';
          break;
        default: // 
          systemPromptOverride =
            '\n\nYou are in agent mode. You can use tools, read and write files, and execute commands. You are an investment assistant.';
          permissionMode = 'acceptEdits';
          break;
      }

      // T304: 合并 systemPromptOverride 与 skillsSystemPrompt 为 finalSystemPrompt
      const finalSystemPrompt =
        [systemPromptOverride, skillsSystemPrompt].filter(Boolean).join('\n\n') || undefined;

      // 4. 获取 Claude 配置 (通过 ClaudeService)
      const claudeConfig = await claudeService.getClaudeConfig(userIdNum, model);
      const provider = claudeService.toStreamClaudeProvider(claudeConfig);

      logger.info(
        `[ClaudeChatController] Using model ${claudeConfig.modelSlug} from provider ${claudeConfig.provider.name}`,
      );

      // 5. 准备 AbortController
      const abortController = new AbortController();
      request.signal.addEventListener('abort', () => {
        abortController.abort();
      });

      const accountInfo = await authService.getCurrentUserAccount();

      if (!accountInfo) {
        return this.error('用户账户不存在', 'account_not_found');
      }

      // 创建 claude 工作区间
      const workingDirectory = await claudeService.createWorkspace(userIdNum, 'invest-advisor', {
        title: 'Claude 内存工作空间上下文',
        description: '本目录包含交易记录、持仓和市场信息等业务数据文件，供 Claude Agent SDK 作为上下文读取。',
        positions: await positionService.getPositionSummaryMarkdown(accountInfo.id),
        transactions: await transactionService.getTransactionSummaryMarkdown(accountInfo.id),
      });

      recordPrompt(content + '\n\n' + finalSystemPrompt, 'claude-prompt.md');  

      // 7. 调用 streamClaude 并在后台处理
      (async () => {
        sseEmitter.sendStatus(`使用模型 ${claudeConfig.modelSlug}`, {
          id: realSessionId,
          level: 'info',
        });
        try {
          const stream = streamClaude({
            prompt: content,
            sessionId: realSessionId,
            sdkSessionId: undefined, // TODO: 从数据库加载实际的 sdk_session_id
            model: claudeConfig.modelSlug,
            systemPrompt: finalSystemPrompt,
            workingDirectory: workingDirectory || undefined,
            abortController,
            permissionMode,
            files: files as FileAttachment[] | undefined,
            toolTimeoutSeconds: toolTimeout || 600,
            provider,
            settings: {},
            mcpServers: {
              'ig-tools': igToolsServer,
            },
            allowedTools: ["Skill", "Read", "Write", "Bash"],  // 启用 Skill 工具
            updateSdkSessionId: (id: string, newSdkSessionId: string) => {
              // TODO: 将 newSdkSessionId 保存到数据库
              logger.info(
                `[ClaudeChatController] Update SDK session ID for ${id}: ${newSdkSessionId}`,
              );
            },
          });

          // 8. 转换 Claude SDK SSE 为 AgentStreamEvent 并发送到客户端
          await convertClaudeStreamToAgentEvents(
            stream,
            sseEmitter,
            realSessionId,
            claudeConfig.modelSlug,
            claudeConfig.provider.name,
          );
        } catch (error) {
          logger.error('[ClaudeChatController] Stream processing error:', error);
          await sseEmitter.sendAgentEvent({
            type: 'error',
            message: error instanceof Error ? error.message : 'Stream processing failed',
            code: 'stream_error',
          });
        } finally {
          await sseEmitter.sendDone();
          await sseEmitter.close();
        }
      })();

      return createSSEResponse(sseEmitter.readable);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }

      logger.error('[ClaudeChatController] Error processing request:', error);
      return this.error('处理 Claude 聊天请求时发生错误', 'claude_chat_error');
    }
  }
}

/**
 * 转换 Claude SDK 的 SSE 流为统一的 AgentStreamEvent 格式
 * 同时收集响应内容并保存到数据库
 */
async function convertClaudeStreamToAgentEvents(
  stream: ReadableStream<string>,
  emitter: SSEEmitter,
  sessionId: string,
  modelSlug: string,
  providerName: string,
): Promise<void> {
  const reader = stream.getReader();
  const contentBlocks: MessageContentBlock[] = [];
  let currentText = '';
  let tokenUsage: TokenUsage | null = null;
  const messageId = `msg_${Date.now()}`;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = value.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        try {
          const event: SSEEvent = JSON.parse(line.slice(6));

          // 转换 Claude SSE 事件到 AgentStreamEvent
          switch (event.type) {
            case 'text': {
              // Claude SDK: { type: 'text', data: string }
              // → AgentStreamEvent: { type: 'text', id: string, delta: string }
              currentText += event.data;
              await emitter.sendTextDelta(messageId, event.data);
              break;
            }

            case 'tool_use': {
              // Flush accumulated text before tool use
              if (currentText.trim()) {
                contentBlocks.push({ type: 'text', text: currentText });
                currentText = '';
              }

              try {
                const toolData = JSON.parse(event.data);
                contentBlocks.push({
                  type: 'tool_use',
                  id: toolData.id,
                  name: toolData.name,
                  input: toolData.input,
                });

                // 获取友好的工具名称用于显示
                const displayName = getToolDisplayName(toolData.name, 'zh-CN', true);
                
                // Claude SDK: { type: 'tool_use', data: JSON }
                // → AgentStreamEvent: { type: 'tool_use', id, toolName, arguments }
                // 保持原始 toolName 用于内部处理,但添加 displayName 用于前端显示
                await emitter.sendToolUseEvent(toolData.id, displayName, toolData.input);
                
                // 发送状态消息,使用友好名称
                await emitter.sendStatus(`tool ${toolData.name} started`, {
                  id: toolData.id,
                  level: 'info',
                  step: 'tool_start',
                });
              } catch (parseError) {
                logger.warn('[ClaudeChatController] Failed to parse tool_use data:', parseError);
              }
              break;
            }

            case 'tool_result': {
              try {
                const resultData = JSON.parse(event.data);
                contentBlocks.push({
                  type: 'tool_result',
                  tool_use_id: resultData.tool_use_id,
                  content: resultData.content,
                  is_error: resultData.is_error || false,
                });

                // 尝试从 contentBlocks 中找到对应的 tool_use 获取工具名
                const toolUse = contentBlocks.find(
                  (b) => b.type === 'tool_use' && b.id === resultData.tool_use_id
                ) as { type: 'tool_use'; id: string; name: string } | undefined;
                
                const toolName = toolUse?.name || 'unknown';
                const displayName = getToolDisplayName(toolName, 'zh-CN', true);

                // 工具结果作为状态消息发送，如果是错误则包含错误详情
                const statusMessage = resultData.is_error 
                  ? `${displayName} 执行失败: ${resultData.content?.substring(0, 100) || '未知错误'}`
                  : `${displayName} 执行成功`;
                
                await emitter.sendStatus(statusMessage, {
                  id: resultData.tool_use_id,
                  level: resultData.is_error ? 'error' : 'info',
                });
                
                // 如果是错误，记录完整错误信息到日志
                if (resultData.is_error) {
                  logger.error(`[ClaudeChatController] Tool execution failed: ${displayName} (${resultData.tool_use_id})`, {
                    content: resultData.content,
                  });
                }
              } catch (parseError) {
                logger.warn('[ClaudeChatController] Failed to parse tool_result data:', parseError);
              }
              break;
            }

            case 'tool_output': {
              // 工具输出作为状态消息
              await emitter.sendStatus(event.data, {
                id: messageId,
                level: 'debug',
                step: 'tool_output',
              });
              break;
            }

            case 'status': {
              // SDK 初始化状态
              try {
                const statusData = JSON.parse(event.data);
                if (statusData.session_id) {
                  logger.info(
                    `[ClaudeChatController] SDK session initialized: ${statusData.session_id}`,
                  );
                }
                await emitter.sendStatus('Claude SDK 已初始化', {
                  id: sessionId,
                  level: 'info',
                });
              } catch {
                // Ignore malformed status data
              }
              break;
            }

            case 'result': {
              try {
                const resultData = JSON.parse(event.data);
                if (resultData.usage) {
                  tokenUsage = resultData.usage;
                }
                if (resultData.session_id) {
                  logger.info(
                    `[ClaudeChatController] SDK session completed: ${resultData.session_id}`,
                  );
                }
              } catch {
                // Ignore malformed result data
              }
              break;
            }

            case 'error': {
              await emitter.sendAgentEvent({
                type: 'error',
                message: typeof event.data === 'string' ? event.data : JSON.stringify(event.data),
                code: 'claude_sdk_error',
              });
              break;
            }

            case 'permission_request': {
              // 发送权限请求事件到前端
              try {
                const permData = JSON.parse(event.data);
                await emitter.sendAgentEvent({
                  type: 'permission_request',
                  permissionRequestId: permData.permissionRequestId,
                  toolName: permData.toolName,
                  toolInput: permData.toolInput,
                  suggestions: permData.suggestions,
                  decisionReason: permData.decisionReason,
                  blockedPath: permData.blockedPath,
                  toolUseId: permData.toolUseId,
                  description: permData.description,
                });
                
                // 同时发送状态消息提示用户
                await emitter.sendStatus(`需要授权: ${permData.toolName}`, {
                  id: messageId,
                  level: 'warning',
                  step: 'permission_request',
                });
              } catch (parseError) {
                logger.warn('[ClaudeChatController] Failed to parse permission_request:', parseError);
              }
              break;
            }

            default:
              // 忽略其他事件类型
              break;
          }
        } catch (parseError) {
          logger.warn('[ClaudeChatController] Failed to parse SSE line:', parseError);
          continue;
        }
      }
    }

    // Flush remaining text
    if (currentText.trim()) {
      contentBlocks.push({ type: 'text', text: currentText });
      await emitter.sendTextDelta(messageId, '', true); // isFinal = true
    }

    // // 保存助手消息到数据库
    // if (contentBlocks.length > 0) {
    //   const hasToolBlocks = contentBlocks.some(
    //     (b) => b.type === 'tool_use' || b.type === 'tool_result',
    //   );

    //   const content = hasToolBlocks
    //     ? JSON.stringify(contentBlocks)
    //     : contentBlocks
    //         .filter((b): b is Extract<MessageContentBlock, { type: 'text' }> => b.type === 'text')
    //         .map((b) => b.text)
    //         .join('')
    //         .trim();

    //   if (content) {
    //     await chatStorageService.createMessage({
    //       sessionId,
    //       role: 'assistant',
    //       content,
    //       fromModel: modelSlug,
    //       fromProvider: providerName,
    //       metadata: tokenUsage ? { tokenUsage } : undefined,
    //     });

    //     // 发送最终结果
    //     await emitter.sendResult(
    //       messageId,
    //       content,
    //       tokenUsage
    //         ? {
    //             input: tokenUsage.input_tokens,
    //             output: tokenUsage.output_tokens,
    //             total: (tokenUsage.input_tokens || 0) + (tokenUsage.output_tokens || 0),
    //           }
    //         : undefined,
    //     );

    //     logger.info(`[ClaudeChatController] Saved assistant message to session ${sessionId}`);
    //   }
    // }
  } catch (error) {
    logger.error('[ClaudeChatController] Error converting stream:', error);
    // Best effort: save partial response
    if (currentText.trim()) {
      contentBlocks.push({ type: 'text', text: currentText });
    }
    if (contentBlocks.length > 0) {
      // const hasToolBlocks = contentBlocks.some(
      //   (b) => b.type === 'tool_use' || b.type === 'tool_result',
      // );
      // // const content = hasToolBlocks
      // //   ? JSON.stringify(contentBlocks)
      // //   : contentBlocks
      // //       .filter((b): b is Extract<MessageContentBlock, { type: 'text' }> => b.type === 'text')
      // //       .map((b) => b.text)
      // //       .join('')
      // //       .trim();

      // if (content) {
      //   try {
      //     await chatStorageService.createMessage({
      //       sessionId,
      //       role: 'assistant',
      //       content,
      //       fromModel: modelSlug,
      //       fromProvider: providerName,
      //     });
      //   } catch (saveError) {
      //     logger.error('[ClaudeChatController] Failed to save partial message:', saveError);
      //   }
      // }
    }
    throw error;
  }
}

export const POST = ClaudeChatController.POST;
