import { z } from 'zod';

import { DEFAULT_MODEL } from '@renderer/const/settings';
import { AgentChatConfigSchema } from '@typings/agent';
import { LobeMetaDataSchema } from '@typings/meta';

const fewShotsSchema = z.array(
  z.object({
    content: z.string(),
    role: z.string(),
  }),
);

const ttsSchema = z.object({
  showAllLocaleVoice: z.boolean().optional(),
  sttLocale: z.string().default('auto'),
  ttsService: z.string().default('openai'),
  voice: z
    .object({
      edge: z.string().optional(),
      microsoft: z.string().optional(),
      openai: z.string().default(''),
    })
    .optional(),
});

export const AgentSchema = z.object({
  chatConfig: AgentChatConfigSchema,
  // fewShots: fewShotsSchema.optional(),
  model: z.string().default(DEFAULT_MODEL),
  openingMessage: z.string().optional(),
  openingQuestions: z.array(z.string()).default([]).optional(),
  // 跟 LLMParams 类型对齐，增加 reasoning_effort 字段，调整注释顺序
  params: z.object({
    frequency_penalty: z.number().default(0).optional(), // 惩罚重复性
    max_tokens: z.number().optional(), // 最大生成长度
    presence_penalty: z.number().default(0).optional(), // 惩罚主题变化
    reasoning_effort: z.string().optional(), // 控制模型推理能力
    temperature: z.number().default(1).optional(), // 随机度
    top_p: z.number().default(1).optional(), // 最高概率
  }),
  plugins: z.array(z.string()).optional(),
  provider: z.string().default('openai').optional(),
  systemRole: z.string().default(''),
  tts: ttsSchema.optional(),
});

export const DB_SessionSchema = z.object({
  id: z.string().default(''),
  slug: z.string().default(''),
  config: AgentSchema,
  group: z.string().default('default'),
  meta: LobeMetaDataSchema,
  pinned: z.number().int().min(0).max(1).optional(),
  type: z.enum(['agent', 'group']).default('agent'),
  agentId: z.string().default(''),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type DB_Session = z.infer<typeof DB_SessionSchema>;
