/**
 * Tool registry for Hermes Agent.
 *
 * Wraps pi-ai's Tool interface with a registry pattern for dynamic
 * tool registration and dispatch.
 */

import type { Tool, TextContent, ImageContent } from '@mariozechner/pi-ai';
import type { TObject } from '@sinclair/typebox';
import type { ToolCallResult } from './types';

type ToolHandler = (
  toolCallId: string,
  args: Record<string, unknown>,
) => Promise<{ content: (TextContent | ImageContent)[]; isError?: boolean }>;

interface RegisteredTool {
  definition: Tool;
  handler: ToolHandler;
}

export class ToolRegistry {
  private readonly _tools = new Map<string, RegisteredTool>();

  /**
   * Register a tool with its schema and handler.
   *
   * @param name - Unique tool name
   * @param description - Description for the LLM
   * @param parameters - TypeBox schema for arguments
   * @param handler - Async function that executes the tool
   */
  register(
    name: string,
    description: string,
    parameters: TObject,
    handler: ToolHandler,
  ): void {
    if (this._tools.has(name)) {
      throw new Error(`Tool "${name}" is already registered`);
    }

    this._tools.set(name, {
      definition: { name, description, parameters },
      handler,
    });
  }

  /** Unregister a tool by name. */
  unregister(name: string): boolean {
    return this._tools.delete(name);
  }

  /** Check if a tool is registered. */
  has(name: string): boolean {
    return this._tools.has(name);
  }

  /** Get all registered tool names. */
  get names(): string[] {
    return Array.from(this._tools.keys());
  }

  /** Get pi-ai Tool definitions for the LLM context. */
  getDefinitions(): Tool[] {
    return Array.from(this._tools.values()).map((t) => t.definition);
  }

  /** Execute a tool by name and return the result. */
  async execute(
    name: string,
    args: Record<string, unknown>,
    toolCallId: string,
  ): Promise<ToolCallResult> {
    const tool = this._tools.get(name);
    if (!tool) {
      return {
        toolCallId,
        toolName: name,
        content: [{ type: 'text', text: `Tool "${name}" not found` }],
        isError: true,
      };
    }

    const start = Date.now();
    try {
      const result = await tool.handler(toolCallId, args);
      return {
        toolCallId,
        toolName: name,
        content: result.content,
        isError: result.isError ?? false,
        durationMs: Date.now() - start,
      };
    } catch (raw) {
      const message = raw instanceof Error ? raw.message : String(raw);
      return {
        toolCallId,
        toolName: name,
        content: [{ type: 'text', text: message }],
        isError: true,
        durationMs: Date.now() - start,
      };
    }
  }

  static create(): ToolRegistry {
    return new ToolRegistry();
  }
}
