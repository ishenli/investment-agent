/**
 * Register business-specific tools with a Hermes ToolRegistry.
 *
 * 所有业务工具已迁移到 `@server/tools` 统一工具目录，直接复用其 HermesToolConfig，
 * 与 Claude 引擎共享同一份核心逻辑。仅 `create_ui_artifact` 保留内联定义 —— 它依赖
 * Hermes 引擎的 eventSink（SSE 推送），无法用 HermesToolConfig 的 handler 签名表达。
 */

import { Type, type ToolRegistry } from '@investment-agent/hermes-agent';
import {
  stockGetPriceHermesConfig,
  stockMarketInfoHermesConfig,
  stockCompanyInfoHermesConfig,
  stockSearchNewsHermesConfig,
  noteQueryHermesConfig,
  noteCreateHermesConfig,
  noteListHermesConfig,
  noteGetHermesConfig,
  noteUpdateHermesConfig,
  noteDeleteHermesConfig,
  tavilySearchHermesConfig,
  dbQueryHermesConfig,
  marketInfoSaveHermesConfig,
  transactionHistoryHermesConfig,
  transactionHistoryByDateHermesConfig,
  accountBalanceHermesConfig,
  transactionSummaryHermesConfig,
  addTransactionHermesConfig,
  portfolioQueryHermesConfig,
  taskCreateHermesConfig,
  taskListHermesConfig,
  taskUpdateHermesConfig,
  assetMetaCreateHermesConfig,
  assetMetaUpdateHermesConfig,
  assetMarketInfoListHermesConfig,
  assetMarketInfoLatestHermesConfig,
  assetMarketInfoDetailHermesConfig,
  assetMarketInfoUpdateHermesConfig,
  assetMarketInfoDeleteHermesConfig,
  reportListHermesConfig,
  reportDetailHermesConfig,
} from '@server/tools';
import type { HermesToolConfig } from '@server/tools';
import type { UIArtifactType } from '@typings/chat/uiArtifact';
import { validateUIArtifact, UI_ARTIFACT_TYPES, UI_ARTIFACT_VERSION } from '@typings/chat/uiArtifact';
import type { EngineEventSink } from '@server/core/engine/types';
import logger from '@server/base/logger';

// ============== Config → Registry Helper ==============

/** 将统一 HermesToolConfig 注册到 ToolRegistry，保持与 Claude 引擎一致的定义。 */
function registerFromConfig(registry: ToolRegistry, config: HermesToolConfig): void {
  registry.register(config.name, config.description, config.schema, config.handler, config.category);
}

// ============== UI Artifact Schema（Hermes 引擎专属） ==============

const createUIArtifactSchema = Type.Object({
  artifact_type: Type.Union(
    UI_ARTIFACT_TYPES.map((t) => Type.Literal(t)),
    { description: 'UI component type. Must be one of: stock_quote_card, fund_detail_panel, data_chart, trade_intent_card' },
  ),
  props: Type.Record(Type.String(), Type.Unknown(), {
    description: `Component props object. Structure depends on artifact_type:

[stock_quote_card] Required: symbol(string), displayName(string), price(number), change(number), changePercent(number). Optional: currency(string), metrics(array of {label,value}), miniTrend(array of {timestamp,value}).

[fund_detail_panel] Required: fundName(string), returnMetrics(array of {period,value}), riskLevel("low"|"medium"|"high"). Optional: fundCode(string), holdings(array of {name,percentage}).

[data_chart] Required: chartType("line"|"bar"|"pie"), series(array of {name, data:[{x,y}], color?}). Optional: title(string), xAxisLabel(string), yAxisLabel(string).

[trade_intent_card] Required: action("buy"|"sell"), symbol(string), displayName(string), quantity(number>0), status("pending"), idempotencyKey(string). Optional: price(number>0), orderType("market"|"limit").`,
  }),
  fallback_text: Type.String({ description: 'Fallback text shown when the client does not support this component. Always provide a meaningful text summary of the data.' }),
});

// ============== Tool Names ==============

export type BusinessToolName =
  | 'stock_get_price'
  | 'stock_market_info'
  | 'stock_company_info'
  | 'stock_search_news'
  | 'asset_meta_create'
  | 'asset_meta_update'
  | 'note_query'
  | 'note_create'
  | 'note_list'
  | 'note_get'
  | 'note_update'
  | 'note_delete'
  | 'tavily_search'
  | 'db_query'
  | 'transaction_history'
  | 'transaction_history_by_date'
  | 'account_balance'
  | 'transaction_summary'
  | 'add_transaction'
  | 'asset_market_info_list'
  | 'asset_market_info_latest'
  | 'asset_market_info_detail'
  | 'asset_market_info_save'
  | 'asset_market_info_update'
  | 'asset_market_info_delete'
  | 'report_list'
  | 'report_detail'
  | 'portfolio_query'
  | 'task_create'
  | 'task_list'
  | 'task_update'
  | 'create_ui_artifact';

export interface BusinessToolsConfig {
  enable?: BusinessToolName[];
  exclude?: BusinessToolName[];
}

// ============== Registration ==============

export function registerBusinessTools(
  registry: ToolRegistry,
  config: BusinessToolsConfig = {},
  eventSink?: EngineEventSink,
): void {
  const excludeSet = new Set(config.exclude ?? []);
  const enabled = config.enable
    ? new Set(config.enable.filter((t) => !excludeSet.has(t)))
    : new Set<BusinessToolName>([
        'stock_get_price',
        'stock_market_info',
        'stock_company_info',
        'stock_search_news',
        'asset_meta_create',
        'asset_meta_update',
        'note_query',
        'note_create',
        'note_list',
        'note_get',
        'note_update',
        'note_delete',
        'tavily_search',
        'db_query',
        'transaction_history',
        'transaction_history_by_date',
        'account_balance',
        'transaction_summary',
        'add_transaction',
        'asset_market_info_list',
        'asset_market_info_latest',
        'asset_market_info_detail',
        'asset_market_info_save',
        'asset_market_info_update',
        'asset_market_info_delete',
        'report_list',
        'report_detail',
        'portfolio_query',
        'task_create',
        'task_list',
        'task_update',
        'create_ui_artifact',
      ]);

  for (const t of excludeSet) enabled.delete(t);

  // ============== 迁移到 @server/tools 的工具 ==============

  if (enabled.has('stock_get_price')) registerFromConfig(registry, stockGetPriceHermesConfig);
  if (enabled.has('stock_market_info')) registerFromConfig(registry, stockMarketInfoHermesConfig);
  if (enabled.has('stock_company_info')) registerFromConfig(registry, stockCompanyInfoHermesConfig);
  if (enabled.has('stock_search_news')) registerFromConfig(registry, stockSearchNewsHermesConfig);
  if (enabled.has('note_query')) registerFromConfig(registry, noteQueryHermesConfig);
  if (enabled.has('note_create')) registerFromConfig(registry, noteCreateHermesConfig);
  if (enabled.has('note_list')) registerFromConfig(registry, noteListHermesConfig);
  if (enabled.has('note_get')) registerFromConfig(registry, noteGetHermesConfig);
  if (enabled.has('note_update')) registerFromConfig(registry, noteUpdateHermesConfig);
  if (enabled.has('note_delete')) registerFromConfig(registry, noteDeleteHermesConfig);
  if (enabled.has('tavily_search')) registerFromConfig(registry, tavilySearchHermesConfig);
  if (enabled.has('db_query')) registerFromConfig(registry, dbQueryHermesConfig);
  if (enabled.has('transaction_history')) registerFromConfig(registry, transactionHistoryHermesConfig);
  if (enabled.has('transaction_history_by_date')) registerFromConfig(registry, transactionHistoryByDateHermesConfig);
  if (enabled.has('account_balance')) registerFromConfig(registry, accountBalanceHermesConfig);
  if (enabled.has('transaction_summary')) registerFromConfig(registry, transactionSummaryHermesConfig);
  if (enabled.has('add_transaction')) registerFromConfig(registry, addTransactionHermesConfig);
  if (enabled.has('portfolio_query')) registerFromConfig(registry, portfolioQueryHermesConfig);
  if (enabled.has('task_create')) registerFromConfig(registry, taskCreateHermesConfig);
  if (enabled.has('task_list')) registerFromConfig(registry, taskListHermesConfig);
  if (enabled.has('task_update')) registerFromConfig(registry, taskUpdateHermesConfig);
  if (enabled.has('asset_market_info_save')) registerFromConfig(registry, marketInfoSaveHermesConfig);
  if (enabled.has('asset_market_info_list')) registerFromConfig(registry, assetMarketInfoListHermesConfig);
  if (enabled.has('asset_market_info_latest')) registerFromConfig(registry, assetMarketInfoLatestHermesConfig);
  if (enabled.has('asset_market_info_detail')) registerFromConfig(registry, assetMarketInfoDetailHermesConfig);
  if (enabled.has('asset_market_info_update')) registerFromConfig(registry, assetMarketInfoUpdateHermesConfig);
  if (enabled.has('asset_market_info_delete')) registerFromConfig(registry, assetMarketInfoDeleteHermesConfig);
  if (enabled.has('report_list')) registerFromConfig(registry, reportListHermesConfig);
  if (enabled.has('report_detail')) registerFromConfig(registry, reportDetailHermesConfig);
  if (enabled.has('asset_meta_create')) registerFromConfig(registry, assetMetaCreateHermesConfig);
  if (enabled.has('asset_meta_update')) registerFromConfig(registry, assetMetaUpdateHermesConfig);

  // ============== Hermes 引擎专属工具（依赖 eventSink） ==============

  if (enabled.has('create_ui_artifact')) {
    const PROPS_HINT: Record<string, string> = {
      stock_quote_card: 'Required: symbol(string), displayName(string), price(number), change(number), changePercent(number). Optional: currency, metrics([{label,value}]), miniTrend([{timestamp,value}]).',
      fund_detail_panel: 'Required: fundName(string), returnMetrics([{period,value}]), riskLevel("low"|"medium"|"high"). Optional: fundCode, holdings([{name,percentage}]).',
      data_chart: 'Required: chartType("line"|"bar"|"pie"), series([{name, data:[{x,y}], color?}]). Optional: title, xAxisLabel, yAxisLabel.',
      trade_intent_card: 'Required: action("buy"|"sell"), symbol(string), displayName(string), quantity(number>0), status("pending"), idempotencyKey(string). Optional: price(number>0), orderType("market"|"limit").',
    };

    registry.register(
      'create_ui_artifact',
      'Create a rich interactive UI component and push it to the client in real-time. ' +
        'Use this tool when the user asks about stock prices, fund details, data visualization, or trading. ' +
        'You MUST fill all required props for the chosen artifact_type — see the props parameter description for the full schema per type. ' +
        'Always provide a meaningful fallback_text summarizing the data in plain text.',
      createUIArtifactSchema,
      async (_id, args) => {
        const artifactType = String(args.artifact_type) as UIArtifactType;
        const artifactId = `artifact_${crypto.randomUUID()}`;
        const artifact = {
          id: artifactId,
          type: artifactType,
          version: UI_ARTIFACT_VERSION,
          props: args.props as Record<string, unknown>,
          fallbackText: String(args.fallback_text),
        };

        const validation = validateUIArtifact(artifact);
        if (!validation.success) {
          const fields = validation.error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`) ?? [];
          const hint = PROPS_HINT[artifactType] ?? '';
          const errMsg =
            `Validation failed for artifact_type="${artifactType}". ` +
            `Issues: ${fields.join('; ')}. ` +
            (hint ? `Expected props schema: ${hint}` : '');
          logger.warn(`[create_ui_artifact] ${errMsg}`);
          return { content: [{ type: 'text', text: errMsg }], isError: true };
        }

        if (eventSink) {
          await eventSink.send({ type: 'ui_artifact', messageId: _id, artifact });
        }

        return { content: [{ type: 'text', text: JSON.stringify(artifact) }] };
      },
      'write',
    );
  }
}