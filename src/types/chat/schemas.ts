/**
 * Chat API Zod Validation Schemas
 *
 * Request validation schemas for chat API endpoints
 */
import { z } from 'zod';

// ============== Common ==============

export const IdParamSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
});

// ============== Config Schemas ==============

const AgentConfigSchema = z.object({
  model: z.string(),
  provider: z.string().optional(),
  systemRole: z.string().optional(),
  params: z
    .object({
      frequency_penalty: z.number().optional(),
      max_tokens: z.number().optional(),
      presence_penalty: z.number().optional(),
      temperature: z.number().optional(),
      top_p: z.number().optional(),
    })
    .optional(),
  chatConfig: z
    .object({
      enableAutoCreateTopic: z.boolean().optional(),
      enableHistoryCount: z.boolean().optional(),
      historyCount: z.number().optional(),
    })
    .optional(),
  openingMessage: z.string().optional(),
  openingQuestions: z.array(z.string()).optional(),
  plugins: z.array(z.string()).optional(),
});

const SessionMetaSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  avatar: z.string().optional(),
  backgroundColor: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ============== Session Schemas ==============

export const CreateSessionSchema = z.object({
  slug: z.string().min(1, 'Slug不能为空'),
  type: z.enum(['agent', 'group']),
  groupId: z.string().optional(),
  pinned: z.boolean().optional(),
  config: AgentConfigSchema.optional(),
  meta: SessionMetaSchema.optional(),
  agentId: z.string().optional(),
  // 新增：从 Agent 创建 Session
  agentSlug: z.string().optional(),
});

export const UpdateSessionSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
  slug: z.string().optional(),
  groupId: z.string().optional().nullable(),
  pinned: z.boolean().optional(),
  config: AgentConfigSchema.partial().optional(),
  meta: SessionMetaSchema.partial().optional(),
});

export const DeleteSessionSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
});

// ============== Topic Schemas ==============

export const GetTopicsSchema = z.object({
  sessionId: z.string().min(1, '会话ID不能为空'),
});

export const CreateTopicSchema = z.object({
  sessionId: z.string().min(1, '会话ID不能为空'),
  title: z.string().min(1, '标题不能为空'),
  favorite: z.boolean().optional(),
  messages: z.array(z.string()).optional(),
});

export const UpdateTopicSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
  title: z.string().optional(),
  favorite: z.boolean().optional(),
});

export const DeleteTopicSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
});

// ============== Message Schemas ==============

export const GetMessagesSchema = z.object({
  sessionId: z.string().min(1, '会话ID不能为空'),
  topicId: z.string().optional(),
  pageSize: z.coerce.number().min(1).max(10000).optional().default(50),
  cursor: z.string().optional(),
});

export const CreateMessageSchema = z.object({
  sessionId: z.string().min(1, '会话ID不能为空'),
  topicId: z.string().optional(),
  parentId: z.string().optional(),
  role: z.enum(['user', 'system', 'assistant', 'tool']),
  content: z.string().min(1, '内容不能为空'),
  files: z.array(z.string()).optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  traceId: z.string().optional(),
});

export const UpdateMessageSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
  content: z.string().optional(),
  userLikeTag: z.enum(['like', 'dislike', 'unknown']).optional(),
});

export const DeleteMessageSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
});

// ============== Type Exports ==============

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>;
export type CreateTopicInput = z.infer<typeof CreateTopicSchema>;
export type UpdateTopicInput = z.infer<typeof UpdateTopicSchema>;
export type GetMessagesInput = z.infer<typeof GetMessagesSchema>;
export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;
export type UpdateMessageInput = z.infer<typeof UpdateMessageSchema>;