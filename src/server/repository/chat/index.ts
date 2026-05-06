/**
 * Chat Repository Exports
 *
 * 统一导出所有聊天相关的 Repository
 */
// Base
export { BaseRepository } from './base';

// Sessions
export {
  SessionRepository,
  SessionGroupRepository,
  sessionRepository,
  sessionGroupRepository,
  type CreateSessionParams,
  type CreateSessionRepoParams,
  type UpdateSessionParams,
} from './session';

// Topics
export {
  TopicRepository,
  topicRepository,
  type CreateTopicParams,
  type UpdateTopicParams,
} from './topic';

// Messages
export {
  MessageRepository,
  messageRepository,
  type CreateMessageParams,
  type UpdateMessageParams,
  type QueryMessageParams,
} from './message';

// Threads
export {
  ThreadRepository,
  threadRepository,
  type CreateThreadParams,
  type UpdateThreadParams,
} from './thread';

// Files
export {
  FileRepository,
  fileRepository,
  type CreateFileParams,
  type UpdateFileParams,
} from './file';

// Plugins
export {
  PluginRepository,
  pluginRepository,
  type CreatePluginParams,
  type UpdatePluginParams,
} from './plugin';

// Observability
export {
  TraceRepository,
  traceRepository,
  type TraceEntity,
  type CreateTraceData,
  type UpdateTraceData,
} from './trace';
export {
  SpanRepository,
  spanRepository,
  type SpanEntity,
  type CreateSpanData,
  type UpdateSpanData,
} from './span';