// ============== Agent ==============
export { HermesAgent, type HermesAgentConfig } from './agent';

// ============== Loop ==============
export { runAgentLoop, createToolExecutor } from './loop';

// ============== Tools ==============
export { ToolRegistry } from './tools';

// ============== Error ==============
export {
  HermesAgentError,
  classifyError,
  type HermesErrorCode,
  type ErrorRecoveryHint,
} from './error';

// ============== Budget ==============
export { IterationBudget } from './budget';

// ============== Retry ==============
export { jitteredBackoff, withRetry, type RetryOptions } from './retry';

// ============== Context ==============
export {
  ContextCompressor,
  type ContextEngineConfig,
  type ContextEngineStatus,
} from './context';

// ============== Prompt Builder ==============
export {
  buildSystemPrompt,
  loadContextFiles,
  DEFAULT_AGENT_IDENTITY,
  TOOL_USE_ENFORCEMENT,
  MEMORY_GUIDANCE,
  PLATFORM_HINTS,
  type PromptBuilderConfig,
} from './prompt';

// ============== Memory Provider ==============
export {
  MemoryProvider,
  type ToolSchema,
  type ConfigField,
  type MemoryWriteMetadata,
  type TurnStartOptions,
  type InitializeOptions,
  type DelegationOptions,
} from './memory-provider';

// ============== Memory Manager ==============
export {
  MemoryManager,
  sanitizeContext,
  buildMemoryContextBlock,
} from './memory-manager';

// ============== Plugin Discovery ==============
export {
  discoverMemoryProviders,
  loadMemoryProvider,
  type PluginDiscoveryConfig,
  type DiscoveredProvider,
} from './plugin-discovery';

// ============== Built-in Tools ==============
export {
  registerBuiltinTools,
  type BuiltinToolsConfig,
} from './builtin-tools';
export { MemoryStore, memorySchema, createMemoryHandler, type MemoryStoreConfig } from './builtin-tools/memory';
export { BuiltinMemoryProvider } from './builtin-tools/builtin-memory-provider';

// ============== Skill Tools ==============
export {
  registerSkillTools,
  type SkillToolsConfig,
  // Individual tools
  skillsListSchema,
  createSkillsListHandler,
  skillViewSchema,
  createSkillViewHandler,
  skillManageSchema,
  createSkillManageHandler,
  // Preprocessing
  preprocessSkillContent,
  substituteTemplateVars,
  expandInlineShell,
  // Utilities
  parseFrontmatter as parseSkillFrontmatter,
  buildSkillMarkdown,
  skillMatchesPlatform,
  scanSkills,
  findSkillDir,
  parseSkillMetadata,
  parseSkillContent,
  listSkillDirs,
  listSupportingFiles,
  // Constants
  SKILL_FILE_NAME,
  ALLOWED_SUBDIRS,
  MAX_NAME_LENGTH,
  MAX_SKILL_CONTENT_CHARS,
  MAX_SKILL_FILE_BYTES,
  VALID_NAME_RE,
  PLATFORM_MAP,
} from './skill-tools';

export type {
  SkillMetadata,
  SkillContent,
  SkillManageAction,
  SkillManageResult,
  SkillFrontmatter,
  SkillScanOptions,
  PreprocessingConfig,
} from './skill-tools';

// ============== Schema ==============
export { Type } from '@sinclair/typebox';
export type { Static, TSchema } from '@sinclair/typebox';

// ============== Observability ==============
export {
  createObservability,
  Tracer,
  MetricsCollector,
  CostTracker,
  calculateCost,
  ConsoleSink,
  FileSink,
} from './observability';

export type {
  ObservabilityConfig,
  ObservabilityResult,
  TraceContext,
  TraceStartEvent,
  SpanStartEvent,
  SpanEndEvent,
  TraceEndEvent,
  MetricEvent,
  ModelPricingTable,
  CostBreakdown,
  TraceMetrics,
  ObservabilitySink,
  LogLevel,
  SinkConfig,
} from './observability';

// ============== Types ==============
export type {
  // pi-ai re-exports
  Context,
  Message,
  AssistantMessage,
  UserMessage,
  ToolResultMessage,
  Tool,
  ToolCall,
  TextContent,
  ThinkingContent,
  ImageContent,
  Api,
  Model,
  // Hermes types
  HermesAgentInput,
  HermesAgentResult,
  ToolCallResult,
  ToolExecutor,
  AgentCallbacks,
  AgentConfig,
  StreamOptions,
} from './types';

// ============== pi-ai Re-exports ==============
export { getModel, getModels, getProviders, getEnvApiKey } from '@mariozechner/pi-ai';
export type { KnownProvider } from '@mariozechner/pi-ai';
