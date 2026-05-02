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
import { runEngine } from '@server/core/engine';
import { claudeService } from '@server/service/claudeService';
import authService from '@server/service/authService';
import { skillService } from '@server/service/skillService';
import { BaseController } from '../../base/baseController';
import { WithRequestContextStatic } from '@server/base/decorators';
import { SSEEmitter } from '@server/base/sseEmitter';
import { createSSEResponse } from '@server/base/responseUtil';
import logger from '@server/base/logger';
import { igToolsServer } from '@/server/core/agents/claude/buildTools';
import positionService from '@/server/service/positionService';
import transactionService from '@/server/service/transactionService';
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
      // 将消息数组格式化为带角色标签的对话文本，便于 AI 理解上下文
      const content = messages
        .map((msg) => {
          const roleLabel =
            msg.role === 'user' ? 'Human' : msg.role === 'assistant' ? 'Assistant' : 'System';
          return `<${roleLabel}>\n${msg.content.trim()}\n</${roleLabel}>`;
        }).join('\n');

      const prompt =[
        '# 聊天记录',
        content,
        '# 用户问题',
        userMessage.content,
      ].join('\n');

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
      // T302: 获取已启用的 skills
      let enabledSkills = await skillService.getEnabledSkills(userIdNum);

      // T403: 会话级别过滤 — 若请求携带非空 skills 数组，则仅保留交集
      // ResolvedSkill 使用 id 字段作为 slug（业务键）
      if (requestedSkills && requestedSkills.length > 0) {
        const requestedSet = new Set(requestedSkills);
        enabledSkills = enabledSkills.filter((s) => requestedSet.has(s.id));
      }

      // T303: 构建 skillsSystemPrompt
      // skillPath = SKILL.md 的绝对路径，其 dirname 即为 {baseDir}
      const skillsSystemPrompt = (() => {
        const skillItems = enabledSkills
          .filter((s) => s.prompt)
          .map((s) => {
            // const baseDir = path.dirname(s.skillPath);
            // const promptWithBaseDir = s.prompt.replace(/\{baseDir\}/g, baseDir);
            return [
              `<skill name="${s.name}">`,
              `<description>${s.description.replace(/"/g, '&quot;')}</description>`,
              s.prompt,
              `</skill>`,
            ].join('\n');
          });
        if (skillItems.length === 0) return undefined;
        
        return [
          '# 内置技能列表',
          `<skills>\n${skillItems.join('\n')}\n</skills>`
        ].join('\n');
      })();
      const realSessionId = this.resolveSessionId(sessionId);

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
        default: // 'code'
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

      // 创建 claude 工作区间（写入持仓/交易上下文文件）
      await claudeService.createWorkspace(userIdNum, 'invest-advisor', {
        title: 'Claude 内存工作空间上下文',
        description: '本目录包含交易记录、持仓和市场信息等业务数据文件，供 Claude Agent SDK 作为上下文读取。',
        positions: await positionService.getPositionSummaryMarkdown(accountInfo.id),
        transactions: await transactionService.getTransactionSummaryMarkdown(accountInfo.id),
      });

      // SDK cwd 使用用户根目录 memory/claude/{userId}/，
      // 技能文件已由 SkillService 在技能变更时部署到该目录下的 .claude/skills/
      const sdkCwd = claudeService.getUserWorkspaceRoot(userIdNum);

      recordPrompt(prompt + '\n\n' + finalSystemPrompt, 'claude-investment-prompt.md');

      // 7. 通过 engineRegistry 运行 Claude 引擎
      (async () => {
        try {
          await runEngine(
            'claude',
            {
              sessionId: realSessionId,
              userId: userIdNum,
              messageId: `msg_${Date.now()}`,
              model: claudeConfig.modelSlug,
              messages: body.messages,
              systemPrompt: finalSystemPrompt || undefined,
              signal: abortController.signal,
              extra: {
                provider,
                workingDirectory: sdkCwd || undefined,
                files,
                toolTimeout: toolTimeout || 600,
                permissionMode,
                mcpServers: { 'ig-tools': igToolsServer },
                allowedTools: ['Skill', 'Read', 'Write', 'Bash', 'Glob'],
              },
            },
            sseEmitter,
          );
        } catch (error) {
          logger.error('[ClaudeChatController] Engine error:', error);
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

export const POST = ClaudeChatController.POST;
