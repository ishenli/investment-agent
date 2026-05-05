/**
 * Agent Engine Interface
 *
 * 统一的 Agent 引擎协议，所有引擎（DeepAgents / Claude / Hermes）实现此接口，
 * 减少新增引擎时的样板代码。
 */
import { SSEEmitter } from '@server/base/sseEmitter';

export const ENGINE_TYPES = ['deepagents', 'claude', 'hermes'] as const;
export type EngineType = (typeof ENGINE_TYPES)[number];

/**
 * 引擎接收的标准化消息格式
 */
export interface EngineMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Claude 引擎所需的额外上下文
 */
export interface ClaudeEngineExtra {
  /** API Provider 配置对象（由 claudeService.toStreamClaudeProvider() 生成） */
  provider?: Record<string, unknown>;
  /** 前端传入的文件附件 */
  files?: Array<{
    fileName: string;
    fileContent: string;
    mimeType?: string;
    filePath?: string;
  }>;
  /** 工具超时秒数 */
  toolTimeout?: number;
  /** 权限模式 */
  permissionMode?: 'code' | 'plan' | 'ask';
  /** 会话级激活的 skill slugs */
  skills?: string[];
  /** 用户 workspace 根目录 */
  workingDirectory?: string;
  /** provider_id（Claude 配置） */
  provider_id?: string;
  /** 系统提示词覆盖 */
  systemPromptOverride?: string;
  /** MCP 服务器配置 */
  mcpServers?: Record<string, unknown>;
  /** 允许使用的工具列表 */
  allowedTools?: string[];
}

/**
 * DeepAgents 引擎所需的额外上下文
 */
export interface DeepAgentsEngineExtra {
  /** 用户账户 ID（字符串，默认从 ctx.userId 推导） */
  accountId?: string;
  /** 对话消息的 LangChain 格式 */
  messages?: EngineMessage[];
}

/**
 * Hermes 引擎所需的额外上下文
 */
export interface HermesEngineExtra {
  /** 是否启用工具（默认 true） */
  enableTools?: boolean;
  /** 最大迭代次数（默认 30） */
  maxIterations?: number;
  /** Agent 名称（默认 'hermes'） */
  name?: string;
  /** 平台提示，影响输出格式（默认 'web'） */
  platform?: 'web' | 'weixin' | string;
}

/**
 * 引擎运行所需的上下文
 */
export interface EngineRunContext {
  /** 会话 ID（已去除 inbox_ 前缀） */
  sessionId: string;
  /** 用户 ID */
  userId: number;
  /** 消息 ID（用于 SSE 事件标识） */
  messageId: string;
  /** 模型标识 (e.g. 'gpt-4o', 'claude-sonnet-4-20250514') */
  model: string;
  /** Provider 标识 (e.g. 'openai', 'anthropic') */
  provider?: string;
  /** 对话消息列表 */
  messages: EngineMessage[];
  /** 系统提示词 */
  systemPrompt?: string;
  /** 取消信号 */
  signal: AbortSignal;
  /** 引擎特定的额外参数 */
  extra?: Record<string, unknown>;
}

/**
 * 引擎运行结果
 */
export interface EngineRunResult {
  /** 最终的助手回复文本 */
  content: string;
  /** 是否成功完成 */
  completed: boolean;
  /** 错误信息（如果失败） */
  error?: string;
  /** Token 用量 */
  usage?: {
    input?: number;
    output?: number;
    total?: number;
    costUsd?: number;
  };
  /** API 调用次数 */
  apiCalls?: number;
}

/**
 * Agent 引擎接口
 *
 * 每个引擎实现 `run()` 方法，通过 SSEEmitter 输出流式事件。
 * Route 层负责：认证、参数校验、创建 SSEEmitter、消息持久化。
 * Engine 层负责：模型调用、工具执行、流式输出。
 */
export interface IAgentEngine {
  /** 引擎名称，用于日志和调试 */
  readonly name: string;

  /**
   * 运行引擎处理一次对话
   *
   * @param ctx 运行上下文（会话、消息、模型配置等）
   * @param emitter SSE 事件发射器
   * @returns 运行结果
   */
  run(ctx: EngineRunContext, emitter: SSEEmitter): Promise<EngineRunResult>;
}
