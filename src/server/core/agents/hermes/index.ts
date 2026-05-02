/**
 * Hermes Core - Business Logic Layer
 *
 * Exports:
 *  - Business tool registration (stock, note, db, search)
 *  - Shared system prompts for the investment assistant agent
 *
 * All Hermes Agent entry points (HTTP route, channel handlers, engines)
 * should import from here to ensure consistent agent behaviour across
 * every delivery channel.
 */

export {
  registerBusinessTools,
  type BusinessToolsConfig,
  type BusinessToolName,
} from './registerBusinessTools';

export { INVESTMENT_ASSISTANT_SYSTEM_PROMPT } from './agentPrompts';
