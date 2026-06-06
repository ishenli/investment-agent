import { z } from 'zod';

// ============== Constants ==============

export const UI_ARTIFACT_VERSION = 1 as const;

export const MAX_CHART_SERIES = 5;
export const MAX_CHART_DATA_POINTS = 100;
export const MAX_METRICS = 10;
export const MAX_MINI_TREND_POINTS = 30;
export const MAX_HOLDINGS = 20;
export const MAX_RETURN_METRICS = 10;

// ============== Artifact Type Registry ==============

export const UI_ARTIFACT_TYPES = [
  'stock_quote_card',
  'fund_detail_panel',
  'data_chart',
  'trade_intent_card',
] as const;

export type UIArtifactType = (typeof UI_ARTIFACT_TYPES)[number];

// ============== Props Schemas ==============

export const StockQuoteCardPropsSchema = z.object({
  symbol: z.string().min(1),
  displayName: z.string().min(1),
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
  currency: z.string().optional(),
  metrics: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .max(MAX_METRICS)
    .optional(),
  miniTrend: z
    .array(
      z.object({
        timestamp: z.number(),
        value: z.number(),
      }),
    )
    .max(MAX_MINI_TREND_POINTS)
    .optional(),
});

export const FundDetailPanelPropsSchema = z.object({
  fundName: z.string().min(1),
  fundCode: z.string().optional(),
  returnMetrics: z
    .array(
      z.object({
        period: z.string(),
        value: z.number(),
      }),
    )
    .max(MAX_RETURN_METRICS),
  riskLevel: z.enum(['low', 'medium', 'high']),
  holdings: z
    .array(
      z.object({
        name: z.string(),
        percentage: z.number().min(0).max(100),
      }),
    )
    .max(MAX_HOLDINGS)
    .optional(),
});

export const DataChartPropsSchema = z.object({
  chartType: z.enum(['line', 'bar', 'pie']),
  title: z.string().optional(),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  series: z
    .array(
      z.object({
        name: z.string(),
        data: z
          .array(
            z.object({
              x: z.union([z.string(), z.number()]),
              y: z.number(),
            }),
          )
          .max(MAX_CHART_DATA_POINTS),
        color: z.string().optional(),
      }),
    )
    .min(1)
    .max(MAX_CHART_SERIES),
});

export const TradeIntentCardPropsSchema = z.object({
  action: z.enum(['buy', 'sell']),
  symbol: z.string().min(1),
  displayName: z.string().min(1),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  orderType: z.enum(['market', 'limit']).optional(),
  status: z.literal('pending'),
  idempotencyKey: z.string().min(1),
});

// ============== Props Schema Map ==============

export const UI_ARTIFACT_PROPS_SCHEMAS: Record<UIArtifactType, z.ZodType> = {
  stock_quote_card: StockQuoteCardPropsSchema,
  fund_detail_panel: FundDetailPanelPropsSchema,
  data_chart: DataChartPropsSchema,
  trade_intent_card: TradeIntentCardPropsSchema,
};

// ============== Base UIArtifact Schema ==============

export const UIArtifactSchema = z.object({
  id: z.string().min(1),
  type: z.enum(UI_ARTIFACT_TYPES),
  version: z.literal(UI_ARTIFACT_VERSION),
  props: z.record(z.string(), z.unknown()),
  fallbackText: z.string().min(1),
});

// ============== Type Exports ==============

export type UIArtifact = z.infer<typeof UIArtifactSchema>;
export type StockQuoteCardProps = z.infer<typeof StockQuoteCardPropsSchema>;
export type FundDetailPanelProps = z.infer<typeof FundDetailPanelPropsSchema>;
export type DataChartProps = z.infer<typeof DataChartPropsSchema>;
export type TradeIntentCardProps = z.infer<typeof TradeIntentCardPropsSchema>;

// ============== Validation Helpers ==============

export function validateUIArtifact(data: unknown): {
  success: boolean;
  artifact?: UIArtifact;
  error?: z.ZodError;
} {
  const baseResult = UIArtifactSchema.safeParse(data);
  if (!baseResult.success) {
    return { success: false, error: baseResult.error };
  }

  const artifact = baseResult.data;
  const propsSchema = UI_ARTIFACT_PROPS_SCHEMAS[artifact.type];
  const propsResult = propsSchema.safeParse(artifact.props);
  if (!propsResult.success) {
    return { success: false, error: propsResult.error };
  }

  return { success: true, artifact };
}

export function validateUIArtifacts(data: unknown[]): {
  valid: UIArtifact[];
  invalid: Array<{ index: number; error: z.ZodError }>;
} {
  const valid: UIArtifact[] = [];
  const invalid: Array<{ index: number; error: z.ZodError }> = [];

  for (let i = 0; i < data.length; i++) {
    const result = validateUIArtifact(data[i]);
    if (result.success && result.artifact) {
      valid.push(result.artifact);
    } else if (result.error) {
      invalid.push({ index: i, error: result.error });
    }
  }

  return { valid, invalid };
}
