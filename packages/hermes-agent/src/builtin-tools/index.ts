/**
 * Built-in tool schemas and handlers for Hermes Agent.
 *
 * Ported from Python hermes-agent's tools/ directory.
 * These are the core file/terminal/memory tools that most agents need.
 *
 * Usage:
 *   import { registerBuiltinTools } from './builtin-tools';
 *   const registry = ToolRegistry.create();
 *   registerBuiltinTools(registry);
 */

export { registerBuiltinTools, type BuiltinToolsConfig } from './register';
