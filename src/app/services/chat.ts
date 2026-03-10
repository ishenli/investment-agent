import {
  ChatImageChunk,
  ChatMessage,
  ChatMessageError,
  CitationItem,
  MessageGroundingChunk,
  MessageReasoningChunk,
  MessageRelatedChunk,
  MessageTextChunk,
  MessageThoughtChainChunk,
  MessageToolCall,
  MessageToolCallsChunk,
  ModelReasoning,
  ModelSpeed,
  ModelThoughtChain,
  ModelTokensUsage,
} from '@typings/message';
import {
  ChatStreamPayload,
  OpenAIChatMessage,
  UserMessageContentPart,
} from '@typings/openai/chat';
import { GroundingSearch } from '@typings/search';
import { get, isEmpty, merge } from 'lodash';
import { post } from '../lib/request';
import { connectAgentStream } from '@/app/lib/agentStreamClient';
import { DEFAULT_AGENT_CONFIG } from '../const/settings/agent';
import { getSessionStoreState } from '@renderer/store/session';
import { agentChatConfigSelectors } from '@renderer/store/session/selectors';
import { isServerMode } from '@/shared';
import { filesPrompts } from '../prompts/files';
import { genToolCallingName } from '../lib/utils/toolCall';
import { INBOX_SESSION_ID } from '../const/session';
import { toolSelectors } from '../store/tool/selectors';
import { produce } from 'immer';
import { getToolStoreState } from '../store/tool';
import { BuiltinSystemRolePrompts } from '../prompts/systemRole';
import { t } from 'i18next';
import { safeParseJSON } from '../lib/utils/safeParseJSON';

type SSEFinishType = 'done' | 'error' | 'abort';

interface GetChatCompletionPayload extends Partial<Omit<ChatStreamPayload, 'messages' | 'tools'>> {
  messages: ChatMessage[];
  sessionId?: string;
  agentId: string;
  engineType?: 'deepagents' | 'claude';
  mode?: 'code' | 'plan' | 'ask';
  /** 会话级激活的 skill slugs，仅对 claude 引擎生效，用于按需构建 systemPrompt */
  skills?: string[];
}

type ContentType = 'stream' | 'text' | 'thought' | 'tool' | 'image' | 'file' | 'error';

type StreamResponse = {
  data: {
    msgType: 'CHAT' | '';
    traceId?: string;
    contents: {
      contentType: ContentType;
      content: {
        title: string;
        text: string;
      };
      text: string; // 工具的调用信息，是这个 string 的 json 字符串
      related?: string[]; // 相关建议内容
      relateType?: string; // 相关类型
    }[];
  };
};

export type onFinishContext = {
  grounding?: GroundingSearch;
  images?: ChatImageChunk[];
  observationId?: string | null;
  reasoning?: ModelReasoning;
  speed?: ModelSpeed;
  toolCalls?: MessageToolCall[];
  traceId?: string;
  chatId?: string;
  sessionId?: string;
  type?: SSEFinishType;
  usage?: ModelTokensUsage;
  related?: string[];
};

export type onMessageHandle = (
  chunk:
    | MessageTextChunk
    | MessageGroundingChunk
    | MessageToolCallsChunk
    | MessageReasoningChunk
    | MessageRelatedChunk
    | MessageThoughtChainChunk,
) => void;

export type OnFinishHandler = (text: string, context: onFinishContext) => Promise<void>;

export type onErrorHandle = (error: ChatMessageError) => void;

interface CreateAssistantMessageStream {
  abortController?: AbortController;
  onAbort?: () => void;
  onMessageHandle?: onMessageHandle;
  onErrorHandle?: onErrorHandle;
  onFinish?: OnFinishHandler;
  onToolCallStart?: (toolCall: { id: string; name: string; arguments: string }) => void;
  onToolCallUpdate?: (
    toolCallId: string,
    status: string,
    message?: string,
    content?: string,
  ) => void;
  onToolCallComplete?: (toolCallId: string, result: string, toolCallData: any) => void;
  historySummary?: string;
  isWelcomeQuestion?: boolean;
  params: GetChatCompletionPayload;
  trace?: string;
}

interface FetchAITaskResultParams {
  abortController?: AbortController;
  onMessageHandle?: onMessageHandle;
  onFinish?: OnFinishHandler;
  onError?: (e: Error, rawError?: any) => void;
  /**
   * 加载状态变化处理函数
   * @param loading - 是否处于加载状态
   */
  onLoadingChange?: (loading: boolean) => void;
  /**
   * 请求对象
   */
  params: Partial<ChatStreamPayload>;
}

const START_ANIMATION_SPEED = 10; // 默认起始速度

const END_ANIMATION_SPEED = 16;

const createSmoothMessage = (params: {
  onTextUpdate: (delta: string, text: string) => void;
  startSpeed?: number;
}) => {
  const { startSpeed = START_ANIMATION_SPEED } = params;

  let buffer = '';
  const outputQueue: string[] = [];
  let isAnimationActive = false;
  let animationFrameId: number | null = null;
  let lastFrameTime = 0;
  let accumulatedTime = 0;
  let currentSpeed = startSpeed;
  let lastQueueLength = 0; // 记录上一帧的队列长度

  const stopAnimation = () => {
    isAnimationActive = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const startAnimation = (speed = startSpeed) => {
    return new Promise<void>((resolve) => {
      if (isAnimationActive) {
        resolve();
        return;
      }

      isAnimationActive = true;
      lastFrameTime = performance.now();
      accumulatedTime = 0;
      currentSpeed = speed;
      lastQueueLength = 0; // 重置上一帧队列长度

      const updateText = (timestamp: number) => {
        if (!isAnimationActive) {
          if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
          }
          resolve();
          return;
        }

        const frameDuration = timestamp - lastFrameTime;
        lastFrameTime = timestamp;
        accumulatedTime += frameDuration;

        let charsToProcess = 0;
        if (outputQueue.length > 0) {
          // 更平滑的速度调整
          const targetSpeed = Math.max(speed, outputQueue.length);
          // 根据队列长度变化调整速度变化率
          const speedChangeRate = Math.abs(outputQueue.length - lastQueueLength) * 0.0008 + 0.005;
          currentSpeed += (targetSpeed - currentSpeed) * speedChangeRate;

          charsToProcess = Math.floor((accumulatedTime * currentSpeed) / 1000);
        }

        if (charsToProcess > 0) {
          accumulatedTime -= (charsToProcess * 1000) / currentSpeed;

          const actualChars = Math.min(charsToProcess, outputQueue.length);
          // actualChars = Math.min(speed, actualChars); // 速度上限

          // if (actualChars * 2 < outputQueue.length && /[\dA-Za-z]/.test(outputQueue[actualChars])) {
          //   actualChars *= 2;
          // }

          const charsToAdd = outputQueue.splice(0, actualChars).join('');
          buffer += charsToAdd;
          params.onTextUpdate(charsToAdd, buffer);
        }

        lastQueueLength = outputQueue.length; // 更新上一帧的队列长度

        if (outputQueue.length > 0 && isAnimationActive) {
          animationFrameId = requestAnimationFrame(updateText);
        } else {
          isAnimationActive = false;
          animationFrameId = null;
          resolve();
        }
      };

      animationFrameId = requestAnimationFrame(updateText);
    });
  };

  const pushToQueue = (text: string) => {
    outputQueue.push(...text.split(''));
  };

  return {
    isAnimationActive,
    isTokenRemain: () => outputQueue.length > 0,
    pushToQueue,
    startAnimation,
    stopAnimation,
  };
};

interface BaiLingParams {
  sessionId: string;
  model: string;
  messages: OpenAIChatMessage[];
  stream: boolean;
  tools: string[];
  agentId: string;
  engineType?: 'deepagents' | 'claude';
  /** Claude 引擎的对话模式 */
  mode?: 'code' | 'plan' | 'ask';
  /** 会话级激活的 skill slugs，用于服务端按需注入 skill prompt */
  skills?: string[];
}

interface BailingAgentStreamParams {
  params: BaiLingParams;
  abortController?: AbortController;
  abortRef: {
    current: () => void;
  };
  onMessageHandle: onMessageHandle | undefined;
  onErrorHandle: onErrorHandle | undefined;
  onFinish: OnFinishHandler | undefined;
  textController: ReturnType<typeof createSmoothMessage>;
  thinkingController: ReturnType<typeof createSmoothMessage>;
}

interface BailingLLMStreamParams {
  params: BaiLingParams;
  abortController: AbortController | undefined;
  onMessageHandle: onMessageHandle | undefined;
  onErrorHandle: onErrorHandle | undefined;
  onFinish: OnFinishHandler | undefined;
  textController: ReturnType<typeof createSmoothMessage>;
  thinkingController: ReturnType<typeof createSmoothMessage>;
}

class ChatService {
  /**
   * 获取预设任务结果
   * @param params 任务参数
   * @returns 任务结果
   */
  async fetchPresetTaskResult({
    params,
    onMessageHandle,
    onFinish,
    onError,
    onLoadingChange,
    abortController,
  }: FetchAITaskResultParams) {
    const errorHandle = (error: Error, errorContent?: any) => {
      onLoadingChange?.(false);
      if (abortController?.signal.aborted) {
        return;
      }
      onError?.(error, errorContent);
      console.error(error);
    };
    onLoadingChange?.(true);
    try {
      // 这里可以调用具体的API来获取预设任务结果
      const res = await post('/api/chat/llm', {
        model: params.model!,
        messages: params.messages as any,
      });
      const bailingMessages = res.data;

      const answer = get(bailingMessages, 'choices[0].message.content', '');

      if (answer && onMessageHandle) {
        onMessageHandle({
          type: 'text',
          text: answer,
        });
      }
      onFinish?.(answer, {
        toolCalls: [],
        reasoning: {},
        grounding: { citations: [], searchQueries: [] },
        usage: {},
        speed: {},
        type: 'done',
      });
    } catch (error) {
      errorHandle(error as Error);
    } finally {
      onLoadingChange?.(false);
    }
  }

  /**
   * 判断应该使用哪个助手
   * @param params 请求参数
   * @returns 助手类型
   */
  private determineAssistantType(params: GetChatCompletionPayload): 'bailing' | 'llm' {
    // 检查是否有工具配置
    return 'llm';
  }
  /**
   * 创建助手消息流
   * @param options 创建消息流的选项
   */
  createAssistantMessageStream = async ({
    params,
    abortController,
    onAbort,
    onMessageHandle,
    onErrorHandle,
    onFinish,
    ...options
  }: CreateAssistantMessageStream) => {
    console.info('[chat.ts]createAssistantMessageStream', params);
    const { plugins: enabledPlugins, messages, ...restParams } = params;
    const { isWelcomeQuestion, trace, historySummary } = options;
    const payload = merge(
      {
        model: DEFAULT_AGENT_CONFIG.model,
        stream: true,
        ...DEFAULT_AGENT_CONFIG.params,
      },
      restParams,
    );

    const chatConfig = agentChatConfigSelectors.currentChatConfig(getSessionStoreState());
    const enabledSearch = chatConfig.searchMode !== 'off';
    const pluginIds = [...(enabledPlugins || [])];

    const oaiMessages = await this.processMessages({
      messages: messages,
      model: payload.model,
      provider: payload.provider!,
      tools: pluginIds,
      isWelcomeQuestion,
      trace,
      historySummary,
      engineType: params.engineType,
    });

    try {
      // 验证必要参数
      if (!params || !params.messages) {
        throw new Error('Invalid parameters: messages are required');
      }

      // 创建 AbortController 的引用
      const abortRef = {
        current: () => {
          abortController?.abort();
        },
      };

      // 判断使用哪个助手
      const textController = createSmoothMessage({
        onTextUpdate: (delta, text) => {
          onMessageHandle?.({ text: delta, type: 'text' });
        },
        startSpeed: 2,
      });
      const thinkingController = createSmoothMessage({
        onTextUpdate: (delta, text) => {
          onMessageHandle?.({ text: delta, type: 'reasoning' });
        },
        startSpeed: 2,
      });

      await this.bailingLLMStream({
        params: {
          sessionId: payload.sessionId || '',
          agentId: payload.agentId,
          model: payload.model,
          messages: oaiMessages,
          stream: true,
          tools: pluginIds,
          engineType: params.engineType,
          mode: params.mode,
          skills: params.skills,
        },
        abortController,
        onMessageHandle,
        onErrorHandle,
        onFinish,
        textController,
        thinkingController,
      });
    } catch (error) {
      console.error('Error in createAssistantMessageStream:', error);
      if (onErrorHandle) {
        onErrorHandle({
          message: error instanceof Error ? error.message : 'Unknown error',
          body: error,
          type: error instanceof Error ? 'System Error' : 'Unknown error',
        });
      }
    }
  };

  processMessages = async ({
    messages,
    model,
    provider,
    tools,
    isWelcomeQuestion,
    trace,
    historySummary,
    engineType,
    ...options
  }: {
    messages: ChatMessage[];
    model: string;
    provider: string;
    tools: string[];
    isWelcomeQuestion?: boolean;
    trace?: string;
    historySummary?: string;
    engineType?: 'deepagents' | 'claude';
  }) => {
    const getUserContent = async (m: ChatMessage) => {
      // only if message doesn't have images and files, then return the plain content
      if ((!m.imageList || m.imageList.length === 0) && (!m.fileList || m.fileList.length === 0))
        return m.content;

      const imageList = m.imageList || [];
      // const imageContentParts = await this.processImageList({ imageList, model, provider });

      const filesContext = isServerMode
        ? filesPrompts({ addUrl: true, fileList: m.fileList, imageList })
        : '';
      return [
        { text: (m.content + '\n\n' + filesContext).trim(), type: 'text' },
      ] as UserMessageContentPart[];
    };

    const getAssistantContent = async (m: ChatMessage) => {
      // signature is a signal of anthropic thinking mode
      const shouldIncludeThinking = m.reasoning && !!m.reasoning?.signature;

      if (shouldIncludeThinking) {
        return [
          {
            signature: m.reasoning!.signature,
            thinking: m.reasoning!.content,
            type: 'thinking',
          },
          { text: m.content, type: 'text' },
        ] as UserMessageContentPart[];
      }
      // only if message doesn't have images and files, then return the plain content

      if (m.imageList && m.imageList.length > 0) {
        return [
          !!m.content ? { text: m.content, type: 'text' } : undefined,
          // ...imageContentParts,
        ].filter(Boolean) as UserMessageContentPart[];
      }

      return m.content;
    };

    let postMessages = await Promise.all(
      messages.map(async (m): Promise<OpenAIChatMessage> => {
        const supportTools = true;
        switch (m.role) {
          case 'user': {
            return { content: await getUserContent(m), role: m.role };
          }

          case 'assistant': {
            const content = await getAssistantContent(m);

            if (!supportTools) {
              return { content, role: m.role };
            }

            return {
              content,
              role: m.role,
              tool_calls: m.tools?.map(
                (tool): MessageToolCall => ({
                  function: {
                    arguments: tool.arguments,
                    name: genToolCallingName(tool.identifier, tool.apiName, tool.type),
                  },
                  id: tool.id,
                  type: 'function',
                }),
              ),
            };
          }

          case 'tool': {
            if (!supportTools) {
              return { content: m.content, role: 'user' };
            }

            return {
              content: m.content,
              name: genToolCallingName(m.plugin!.identifier, m.plugin!.apiName, m.plugin?.type),
              role: m.role,
              tool_call_id: m.tool_call_id,
            };
          }

          default: {
            return { content: m.content, role: m.role as any };
          }
        }
      }),
    );

    postMessages = produce(postMessages, (draft) => {

      if (engineType === 'claude') return;

      // if it's a welcome question, inject InboxGuide SystemRole
      const inboxGuideSystemRole =
        isWelcomeQuestion && trace === INBOX_SESSION_ID && 'INBOX_GUIDE_SYSTEMROLE';

      // Inject Tool SystemRole
      const hasTools = tools && tools?.length > 0;
      const hasFC = hasTools;
      const toolsSystemRoles =
        hasFC && toolSelectors.enabledSystemRoles(tools)(getToolStoreState());

      console.info('[toolsSystemRoles]', toolsSystemRoles);
      const injectSystemRoles = BuiltinSystemRolePrompts({
        historySummary,
        plugins: toolsSystemRoles as string,
        welcome: inboxGuideSystemRole as string,
      });

      if (!injectSystemRoles) return;

      const systemMessage = draft.find((i) => i.role === 'system');

      if (systemMessage) {
        systemMessage.content = [systemMessage.content, injectSystemRoles]
          .filter(Boolean)
          .join('\n\n');
      } else {
        draft.unshift({
          content: injectSystemRoles,
          role: 'system',
        });
      }
    });

    return postMessages;
  };

  bailingLLMStream = async ({
    params,
    abortController,
    onFinish,
    textController,
    thinkingController,
    onMessageHandle,
  }: BailingLLMStreamParams) => {
    let textFinal = '';
    let reasonTextFinal = '';

    // 拦截逻辑：当 model 参数为空时，直接返回提示消息
    if (!params.model || params.model.trim() === '') {
      const promptMessage = t('chat:sessionConfig.selectModelMessage');
      textController.pushToQueue(promptMessage);
      textController.startAnimation();
      
      // 等待动画完成后调用 onFinish
      setTimeout(() => {
        onFinish?.(promptMessage, {
          toolCalls: [],
          related: [],
          reasoning: { content: '' },
          grounding: { citations: [], searchQueries: [] },
          usage: {},
          speed: {},
          type: 'done',
        });
      }, 100);
      
      return;
    }

    // 根据 engineType 选择不同的 API 端点
    const engineType = params.engineType || 'deepagents';
    const apiEndpoint = engineType === 'claude' ? '/api/chat/claude' : '/api/chat/agent';

    await connectAgentStream({
      api: apiEndpoint,
      body: {
        sessionId: params.sessionId || 'default-session',
        agentId: params.agentId || '',
        model: params.model!,
        stream: true,
        messages: params.messages,
        // 仅对 claude 引擎传递 mode / skills
        ...(engineType === 'claude'
          ? {
              ...(params.mode !== undefined ? { mode: params.mode } : {}),
              ...(params.skills !== undefined ? { skills: params.skills } : {}),
            }
          : {}),
      },
      signal: abortController?.signal,
      onEvent: (event) => {
        switch (event.type) {
          case 'text': {
            textFinal += event.delta;
            textController.pushToQueue(event.delta);
            textController.startAnimation();
            break;
          }
          case 'reasoning': {
            reasonTextFinal += event.delta;
            thinkingController.pushToQueue(event.delta);
            thinkingController.startAnimation();
            break;
          }
          case 'grounding': {
            if (event.citations && event.citations.length > 0) {
              onMessageHandle?.({
                type: 'grounding',
                grounding: {
                  citations: event.citations as CitationItem[],
                  searchQueries: event.searchQueries,
                },
              });
            }
            break;
          }
          case 'related': {
            if (event.items && event.items.length > 0) {
              onMessageHandle?.({
                type: 'related',
                related: event.items,
              });
            }
            break;
          }
          case 'tool_use': {
            onMessageHandle?.({
              type: 'thoughtChain',
              thoughtChain: {
                title: event.toolName,
                type: 'TOOL',
                content:
                  typeof event.arguments === 'string'
                    ? safeParseJSON(event.arguments)
                    : event.arguments,
              },
            });
            break;
          }
          case 'permission_request': {
            // 处理权限请求,保存到消息的 permissionRequest 字段
            onMessageHandle?.({
              type: 'thoughtChain',
              thoughtChain: {
                title: `⚠️ 权限请求: ${event.toolName}`,
                type: 'PERMISSION',
                content: {
                  permissionRequestId: event.permissionRequestId,
                  toolName: event.toolName,
                  toolInput: event.toolInput,
                  decisionReason: event.decisionReason,
                  blockedPath: event.blockedPath,
                  description: event.description || `工具 ${event.toolName} 需要您的授权才能继续`,
                },
              },
            });
            break;
          }
          case 'error': {
            // 错误在 onError 回调中处理
            break;
          }
          default:
            break;
        }
      },
      onError: (_error) => {
        // AbortError 或网络错误：流已结束，直接上报最终结果
        onFinish?.(textFinal, {
          toolCalls: [],
          related: [],
          reasoning: { content: reasonTextFinal },
          grounding: { citations: [], searchQueries: [] },
          usage: {},
          speed: {},
          type: 'abort',
        });
      },
      onDone: () => {
        onFinish?.(textFinal, {
          toolCalls: [],
          related: [],
          reasoning: { content: reasonTextFinal },
          grounding: { citations: [], searchQueries: [] },
          usage: {},
          speed: {},
          type: 'done',
        });
      },
    });
  };
}

export const chatService = new ChatService();
