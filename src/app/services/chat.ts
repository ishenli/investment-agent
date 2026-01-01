import {
  ChatImageChunk,
  ChatMessage,
  ChatMessageError,
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
import { ChatCompletionChunk, ChatStreamPayload, OpenAIChatMessage, UserMessageContentPart } from '@typings/openai/chat';
import { GroundingSearch } from '@typings/search';
import { transformOpenAIStream } from '@renderer/lib/utils/stream/openai';
import { get, isEmpty, merge } from 'lodash';
import { post, requestSSE } from '../lib/request';
import { DEFAULT_AGENT_CONFIG } from '../const/settings/agent';
import { getAgentStoreState } from '../store/agent';
import { agentChatConfigSelectors } from '../store/agent/slices/chat';
import { isServerMode } from '@/shared';
import { filesPrompts } from '../prompts/files';
import { genToolCallingName } from '../lib/utils/toolCall';
import { INBOX_SESSION_ID } from '../const/session';
import { toolSelectors } from '../store/tool/selectors';
import { produce } from 'immer';
import { getToolStoreState } from '../store/tool';
import { BuiltinSystemRolePrompts } from '../prompts/systemRole';

type SSEFinishType = 'done' | 'error' | 'abort';

interface GetChatCompletionPayload extends Partial<Omit<ChatStreamPayload, 'messages' | 'tools'>> {
  messages: ChatMessage[];
  sessionId?: string;
  agentId: string;
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
  let outputQueue: string[] = [];
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

          let actualChars = Math.min(charsToProcess, outputQueue.length);
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

    const chatConfig = agentChatConfigSelectors.currentChatConfig(getAgentStoreState());
    const enabledSearch = chatConfig.searchMode !== 'off';
    const pluginIds = [...(enabledPlugins || [])];

    const oaiMessages = await this.processMessages(
      {
        messages: messages,
        model: payload.model,
        provider: payload.provider!,
        tools: pluginIds,
        isWelcomeQuestion,
        trace,
        historySummary,
      }
    );


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
      const assistantType = this.determineAssistantType(params);
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
    ...options
  }: {
    messages: ChatMessage[];
    model: string;
    provider: string;
    tools: string[];
    isWelcomeQuestion?: boolean;
    trace?: string;
    historySummary?: string;
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
      // if it's a welcome question, inject InboxGuide SystemRole
      const inboxGuideSystemRole =
        isWelcomeQuestion &&
        trace === INBOX_SESSION_ID &&
        'INBOX_GUIDE_SYSTEMROLE';

      // Inject Tool SystemRole
      const hasTools = tools && tools?.length > 0;
      const hasFC = hasTools;
      const toolsSystemRoles =
        hasFC && toolSelectors.enabledSystemRoles(tools)(getToolStoreState());


      console.info('[toolsSystemRoles]', toolsSystemRoles)
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
    const streamContext = {};
    let textFinal = '';
    let reasonTextFinal = '';
    await requestSSE({
      api: '/api/chat/agent',
      body: {
        sessionId: params.sessionId || 'default-session',
        agentId: params.agentId || '',
        model: params.model!,
        stream: true,
        messages: params.messages,
      },
      signal: abortController?.signal,
      onProcessChunk: (value: string) => {
        const chunk = JSON.parse(value) as ChatCompletionChunk;

        const chunkAfterTransform = transformOpenAIStream(chunk, streamContext);
        if (Array.isArray(chunkAfterTransform)) {
          return Promise.resolve();
        } else if (chunkAfterTransform.data) {
          const text = chunkAfterTransform.data;
          if (chunkAfterTransform.type === 'text') {
            textFinal += text || '';
            textController.pushToQueue(text);
            if (!textController.isAnimationActive) textController.startAnimation();
          } else if (chunkAfterTransform.type === 'reasoning') {
            reasonTextFinal += chunkAfterTransform.data;
            thinkingController.pushToQueue(chunkAfterTransform.data);
            if (!thinkingController.isAnimationActive) thinkingController.startAnimation();
          } else if (chunkAfterTransform.type === 'tool_calls') {
            onMessageHandle?.({
              type: 'thoughtChain',
              thoughtChain: {
                title: chunkAfterTransform.data[0].function.name,
                type: 'TOOL',
                content: chunkAfterTransform.data[0].function.arguments,
              },
            });
          }
        }
      },
      onAfterProcess: () => {
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
