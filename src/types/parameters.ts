import z from 'zod';

export const MAX_SEED = 2 ** 31 - 1;

// 定义顶层的元规范 - 平铺结构
export const ModelParamsMetaSchema = z.object({
  aspectRatio: z
    .object({
      default: z.string(),
      description: z.string().optional(),
      enum: z.array(z.string()),
      type: z.literal('string').optional(),
    })
    .optional(),

  cfg: z
    .object({
      default: z.number(),
      description: z.string().optional(),
      max: z.number(),
      min: z.number(),
      step: z.number(),
      type: z.literal('number').optional(),
    })
    .optional(),

  height: z
    .object({
      default: z.number(),
      description: z.string().optional(),
      max: z.number(),
      min: z.number(),
      step: z.number().optional().default(1),
      type: z.literal('number').optional(),
    })
    .optional(),

  imageUrl: z
    .object({
      default: z.string().nullable().optional(),
      description: z.string().optional(),
      maxFileSize: z.number().optional(),
      type: z.tuple([z.literal('string'), z.literal('null')]).optional(),
    })
    .optional(),

  imageUrls: z
    .object({
      default: z.array(z.string()),
      description: z.string().optional(),
      maxCount: z.number().optional(),
      maxFileSize: z.number().optional(),
      type: z.literal('array').optional(),
    })
    .optional(),

  /**
   * Prompt 是唯一一个每个模型都有的参数
   */
  prompt: z.object({
    default: z.string().optional().default(''),
    description: z.string().optional(),
    type: z.literal('string').optional(),
  }),

  seed: z
    .object({
      default: z.number().nullable().default(null),
      description: z.string().optional(),
      max: z.number().optional().default(MAX_SEED),
      min: z.number().optional().default(0),
      type: z.tuple([z.literal('number'), z.literal('null')]).optional(),
    })
    .optional(),

  size: z
    .object({
      default: z.string(),
      description: z.string().optional(),
      enum: z.array(z.string()),
      type: z.literal('string').optional(),
    })
    .optional(),

  steps: z
    .object({
      default: z.number(),
      description: z.string().optional(),
      max: z.number(),
      min: z.number(),
      step: z.number().optional().default(1),
      type: z.literal('number').optional(),
    })
    .optional(),

  width: z
    .object({
      default: z.number(),
      description: z.string().optional(),
      max: z.number(),
      min: z.number(),
      step: z.number().optional().default(1),
      type: z.literal('number').optional(),
    })
    .optional(),
});

export type ModelParamsSchema = z.input<typeof ModelParamsMetaSchema>;
