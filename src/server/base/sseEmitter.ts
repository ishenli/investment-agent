/**
 * SSE Event Emitter
 *
 * 实现 EngineEventSink 接口，用于 HTTP SSE 流式响应。
 */
import { AgentStreamEvent } from '@typings/agentStream';
import { UIMessageChunk } from 'ai';
import {
  convertToOpenAICompatibleMessage,
  OpenAICompatibleMessage,
} from '@server/core/agents/langchain/utils/messageUtils';
import type { EngineEventSink } from '@server/core/engine/eventSink';

export class SSEEmitter implements EngineEventSink {
  public readonly readable: ReadableStream<Uint8Array>;
  private readonly writable: WritableStream<Uint8Array>;
  private readonly encoder: TextEncoder;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null;
  private isClosed: boolean = false;
  private errorHandler?: (error: Error) => void;

  constructor() {
    const { readable, writable } = new TransformStream<Uint8Array>();
    const encoder = new TextEncoder();
    this.readable = readable;
    this.writable = writable;
    this.encoder = encoder;
    this.writer = writable.getWriter();
  }

  /**
   * 发送数据到客户端
   * @param data 要发送的数据
   * @returns 是否发送成功
   */
  async send(data: unknown): Promise<boolean> {
    if (this.isClosed || !this.writer) {
      return false;
    }

    try {
      const encoded = this.encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
      await this.writer.write(encoded);
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  async sendAgentEvent(event: AgentStreamEvent): Promise<boolean> {
    return this.send(event);
  }

  async sendStatus(
    message: string,
    extra?: {
      id?: string;
      level?: 'info' | 'debug' | 'warning' | 'error';
      step?: string;
      progress?: number;
    },
  ): Promise<boolean> {
    const { id, level, step, progress } = extra || {};
    return this.sendAgentEvent({
      type: 'status',
      message,
      id,
      level,
      step,
      progress,
    });
  }

  async sendTextDelta(id: string, delta: string, isFinal?: boolean): Promise<boolean> {
    return this.sendAgentEvent({
      type: 'text',
      id,
      delta,
      isFinal,
    });
  }

  /**
   * 发送思考链 token 增量
   */
  async sendReasoningDelta(id: string, delta: string): Promise<boolean> {
    return this.sendAgentEvent({ type: 'reasoning', id, delta });
  }

  /**
   * 发送搜索基底信息
   */
  async sendGrounding(citations: unknown[], searchQueries?: string[]): Promise<boolean> {
    return this.sendAgentEvent({ type: 'grounding', citations, searchQueries });
  }

  /**
   * 发送相关建议问题
   */
  async sendRelated(items: string[]): Promise<boolean> {
    return this.sendAgentEvent({ type: 'related', items });
  }

  async sendToolUseEvent(
    id: string,
    toolName: string,
    toolArgs: Record<string, unknown>,
  ): Promise<boolean> {
    return this.sendAgentEvent({
      type: 'tool_use',
      id,
      toolName,
      arguments: toolArgs,
    });
  }

  async sendResult(
    id: string,
    content: unknown,
    tokens?: {
      input?: number;
      output?: number;
      total?: number;
      costUsd?: number;
    },
  ): Promise<boolean> {
    return this.sendAgentEvent({
      type: 'result',
      id,
      content,
      tokens,
    });
  }

  async sendAgentError(message: string, code?: string, details?: unknown): Promise<boolean> {
    return this.sendAgentEvent({
      type: 'error',
      message,
      code,
      details,
    });
  }

  async sendDone(): Promise<boolean> {
    return this.sendAgentEvent({ type: 'done' });
  }

  /**
   * 发送数据到客户端
   * @param data 要发送的数据
   * @returns 是否发送成功
   */
  async sendAISdkMessage(data: UIMessageChunk): Promise<boolean> {
    if (this.isClosed || !this.writer) {
      return false;
    }

    try {
      const encoded = this.encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
      await this.writer.write(encoded);
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  async sendAISdkStart(): Promise<boolean> {
    return this.send({ type: 'text-start', id: '1' });
  }

  async sendAISdkEnd(): Promise<boolean> {
    return this.send({ type: 'text-end', id: '1' });
  }

  /**
   * 提供一个openai 规范的方法
   */
  sendOpenAICompatibleMessage(data: OpenAICompatibleMessage): Promise<boolean> {
    const message = convertToOpenAICompatibleMessage(data);
    return this.send(message);
  }

  /**
   * 发送错误消息到客户端
   * @param error 错误信息
   */
  async sendError(error: string | Error): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    await this.send({ error: errorMessage });
  }

  /**
   * 设置错误处理器
   * @param handler 错误处理函数
   */
  setErrorHandler(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  /**
   * 处理错误
   * @param error 错误对象
   */
  private handleError(error: unknown): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    if (this.errorHandler) {
      this.errorHandler(errorObj);
    }
  }

  /**
   * 关闭 SSE 连接
   */
  async close(): Promise<void> {
    if (this.writer && !this.isClosed) {
      try {
        await this.writer.close();
        this.isClosed = true;
        this.writer = null;
      } catch (error) {
        // 忽略已经关闭的错误
        if (error instanceof TypeError && error.message.includes('WritableStream is closed')) {
          this.isClosed = true;
          this.writer = null;
          return;
        }
        this.handleError(error);
      }
    }
  }

  

  /**
   * 获取可读流
   */
  getReadableStream(): ReadableStream<Uint8Array> {
    return this.readable;
  }

  /**
   * 检查连接是否已关闭
   */
  isConnectionClosed(): boolean {
    return this.isClosed;
  }
}
