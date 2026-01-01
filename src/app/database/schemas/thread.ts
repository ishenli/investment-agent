import z from 'zod';

export const DB_ThreadSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  type: z.enum(['continuation', 'standalone']),
  status: z.enum(['active', 'deprecated', 'archived']).default('active'),
  topicId: z.string(),
  sourceMessageId: z.string(),
  parentThreadId: z.string().optional(),
  clientId: z.string().optional(),
  userId: z.string(),
  lastActiveAt: z.number().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type DB_Thread = z.infer<typeof DB_ThreadSchema>;
