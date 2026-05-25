/**
 * Tool registry for Hermes Agent.
 *
 * Wraps pi-ai's Tool interface with a registry pattern for dynamic
 * tool registration and dispatch.
 */

import type { Tool, TextContent, ImageContent } from '@mariozechner/pi-ai';
import type { TObject } from '@sinclair/typebox';
import type { ToolCallResult } from './types';
import type { ToolCategory, PermissionLevel } from './permission/types';

type ToolHandler = (
  toolCallId: string,
  args: Record<string, unknown>,
) => Promise<{ content: (TextContent | ImageContent)[]; isError?: boolean }>;

interface RegisteredTool {
  definition: Tool;
  handler: ToolHandler;
  category: ToolCategory;
}

/**
 * Options for ToolRegistry construction.
 */
export interface ToolRegistryOptions {
  /** Permission level for tool execution */
  permissionLevel?: PermissionLevel;
  /** Whether to emit warnings in development mode */
  devMode?: boolean;
}

export class ToolRegistry {
  private readonly _tools = new Map<string, RegisteredTool>();
  private _permissionLevel: PermissionLevel;
  private readonly _devMode: boolean;

 constructor(options: ToolRegistryOptions = {}) {
    this._permissionLevel = options.permissionLevel ?? 'auto';
   this._devMode = options.devMode ?? (process.env.NODE_ENV === 'development');
  }

  /**
   * Register a tool with its schema, handler, and category.
   *
   * @param name - Unique tool name
   * @param description - Description for the LLM
   * @param parameters - TypeBox schema for arguments
   * @param handler - Async function that executes the tool
   * @param category - Tool category for permission checks (defaults to 'read')
   */
  register(
    name: string,
    description: string,
    parameters: TObject,
    handler: ToolHandler,
    category?: ToolCategory,
  ): void {
    if (this._tools.has(name)) {
      throw new Error(`Tool "${name}" is already registered`);
    }

    const toolCategory = category ?? 'write';

    if (!category && this._devMode) {
      console.warn(
        `[ToolRegistry] Tool "${name}" registered without explicit category. ` +
        `Defaulting to 'write'. Consider specifying a category for proper permission handling.`
      );
    }

    this._tools.set(name, {
      definition: { name, description, parameters },
      handler,
      category: toolCategory,
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

  /** Get the category of a tool. */
  getCategory(name: string): ToolCategory | undefined {
    return this._tools.get(name)?.category;
  }

  /** Get the permission level. */
  get permissionLevel(): PermissionLevel {
    return this._permissionLevel;
  }

  /** Set the permission level. */
  setPermissionLevel(level: PermissionLevel): void {
    this._permissionLevel = level;
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

  static create(options?: ToolRegistryOptions): ToolRegistry {
    return new ToolRegistry(options);
  }
}
