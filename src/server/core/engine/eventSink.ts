/**
 * Engine Event Sink Interface
 *
 * 定义引擎事件的接收器接口。
 * 遵循依赖倒置原则：引擎依赖抽象接口，而不是具体实现。
 *
 * 实现可以是：
 * - SSEEmitter：用于 HTTP SSE 流式响应
 * - NoOpEventSink：用于不需要事件输出的场景（如 Weixin Channel）
 * - LoggingEventSink：用于调试和日志记录
 * - CompositeEventSink：组合多个 sink
 */

import type { AgentStreamEvent } from '@typings/agentStream';

/**
 * 引擎事件接收器接口
 */
export interface EngineEventSink {
  /**
   * 发送任意事件
   */
  send(event: AgentStreamEvent): Promise<boolean>;

  /**
   * 发送状态更新
   */
  sendStatus(
    message: string,
    extra?: {
      id?: string;
      level?: 'info' | 'debug' | 'warning' | 'error';
      step?: string;
      progress?: number;
    },
  ): Promise<boolean>;

  /**
   * 发送文本增量
   */
  sendTextDelta(id: string, delta: string, isFinal?: boolean): Promise<boolean>;

  /**
   * 发送工具使用事件
   */
  sendToolUseEvent(
    id: string,
    toolName: string,
    toolArgs: Record<string, unknown>,
  ): Promise<boolean>;

  /**
   * 发送最终结果
   */
  sendResult(
    id: string,
    content: unknown,
    tokens?: {
      input?: number;
      output?: number;
      total?: number;
      costUsd?: number;
    },
  ): Promise<boolean>;

  /**
   * 发送错误事件
   */
  sendAgentError(message: string, code?: string, details?: unknown): Promise<boolean>;
}

/**
 * 空事件接收器 - 丢弃所有事件，不产生任何输出
 * 用于不需要事件流的场景（如 Weixin Channel）
 */
export class NoOpEventSink implements EngineEventSink {
  async send(_event: AgentStreamEvent): Promise<boolean> {
    return true;
  }

  async sendStatus(
    _message: string,
    _extra?: {
      id?: string;
      level?: 'info' | 'debug' | 'warning' | 'error';
      step?: string;
      progress?: number;
    },
  ): Promise<boolean> {
    return true;
  }

  async sendTextDelta(_id: string, _delta: string, _isFinal?: boolean): Promise<boolean> {
    return true;
  }

  async sendToolUseEvent(
    _id: string,
    _toolName: string,
    _toolArgs: Record<string, unknown>,
  ): Promise<boolean> {
    return true;
  }

  async sendResult(
    _id: string,
    _content: unknown,
    _tokens?: {
      input?: number;
      output?: number;
      total?: number;
      costUsd?: number;
    },
  ): Promise<boolean> {
    return true;
  }

  async sendAgentError(_message: string, _code?: string, _details?: unknown): Promise<boolean> {
    return true;
  }
}

/**
 * 日志事件接收器 - 将事件记录到日志
 * 用于调试和监控
 */
export class LoggingEventSink implements EngineEventSink {
  constructor(private prefix: string = '[EngineEvent]') {}

  async send(event: AgentStreamEvent): Promise<boolean> {
    console.log(`${this.prefix} ${event.type}`, event);
    return true;
  }

  async sendStatus(message: string, extra?: { id?: string; level?: 'info' | 'debug' | 'warning' | 'error'; step?: string; progress?: number }): Promise<boolean> {
    console.log(`${this.prefix} [STATUS] ${message}`, extra);
    return true;
  }

  async sendTextDelta(id: string, delta: string, isFinal?: boolean): Promise<boolean> {
    if (isFinal) {
      console.log(`${this.prefix} [TEXT] ${id} FINAL`);
    }
    return true;
  }

  async sendToolUseEvent(id: string, toolName: string, toolArgs: Record<string, unknown>): Promise<boolean> {
    console.log(`${this.prefix} [TOOL] ${toolName}`, toolArgs);
    return true;
  }

  async sendResult(id: string, content: unknown, tokens?: { input?: number; output?: number; total?: number; costUsd?: number }): Promise<boolean> {
    console.log(`${this.prefix} [RESULT] ${id}`, tokens);
    return true;
  }

  async sendAgentError(message: string, code?: string, details?: unknown): Promise<boolean> {
    console.error(`${this.prefix} [ERROR] ${code || 'UNKNOWN'}: ${message}`, details);
    return true;
  }
}
