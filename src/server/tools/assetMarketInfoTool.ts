import logger from '@server/base/logger';
import { Type, type TObject } from '@sinclair/typebox';

import type { HermesToolConfig } from './types';
import { unwrapControllerResult } from './controllerUtil';

// ============== Core Logic ==============

async function getMarketBizController() {
  const { MarketBizController } = await import('@server/controller/market');
  return new MarketBizController();
}

// ============== Hermes Adapters ==============

const assetMarketInfoListSchema: TObject = Type.Object({
  asset_meta_id: Type.String({ description: '资产元数据 ID' }),
  page: Type.Optional(Type.String({ description: '页码，默认 1' })),
  limit: Type.Optional(Type.String({ description: '每页数量，默认 10' })),
});

export const assetMarketInfoListHermesConfig: HermesToolConfig = {
  name: 'asset_market_info_list',
  description: '获取指定资产的市场信息列表（本地数据库）',
  schema: assetMarketInfoListSchema,
  handler: async (_id, args) => {
    try {
      const controller = await getMarketBizController();
      const result = await controller.getAssetMarketInfoList({
        assetMetaId: String(args.asset_meta_id),
        page: args.page ? String(args.page) : '1',
        limit: args.limit ? String(args.limit) : '10',
      });
      return { content: [{ type: 'text', text: unwrapControllerResult(result) }] };
    } catch (e) {
      logger.error('[assetMarketInfoListTool] failed:', e);
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};

const assetMarketInfoLatestSchema: TObject = Type.Object({
  asset_meta_id: Type.String({ description: '资产元数据 ID' }),
});

export const assetMarketInfoLatestHermesConfig: HermesToolConfig = {
  name: 'asset_market_info_latest',
  description: '获取指定资产的最新市场信息（本地数据库）',
  schema: assetMarketInfoLatestSchema,
  handler: async (_id, args) => {
    try {
      const controller = await getMarketBizController();
      const result = await controller.getAssetMarketInfo({
        assetMetaId: String(args.asset_meta_id),
        type: 'latest',
      });
      return { content: [{ type: 'text', text: unwrapControllerResult(result) }] };
    } catch (e) {
      logger.error('[assetMarketInfoLatestTool] failed:', e);
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};

const assetMarketInfoDetailSchema: TObject = Type.Object({
  id: Type.String({ description: '市场信息记录 ID' }),
});

export const assetMarketInfoDetailHermesConfig: HermesToolConfig = {
  name: 'asset_market_info_detail',
  description: '获取指定 ID 的市场信息详情',
  schema: assetMarketInfoDetailSchema,
  handler: async (_id, args) => {
    try {
      const controller = await getMarketBizController();
      const result = await controller.getAssetMarketInfo({
        id: String(args.id),
        type: 'detail',
      });
      return { content: [{ type: 'text', text: unwrapControllerResult(result) }] };
    } catch (e) {
      logger.error('[assetMarketInfoDetailTool] failed:', e);
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};

const assetMarketInfoUpdateSchema: TObject = Type.Object({
  id: Type.String({ description: '市场信息记录 ID' }),
  asset_meta_ids: Type.Optional(Type.Array(Type.Number(), { description: '关联的资产元数据 IDs' })),
  title: Type.Optional(Type.String({ description: '标题' })),
  symbol: Type.Optional(Type.String({ description: '资产代号' })),
  sentiment: Type.Optional(Type.String({ description: '情绪评级' })),
  importance: Type.Optional(Type.String({ description: '重要性' })),
  summary: Type.Optional(Type.String({ description: '摘要' })),
  key_topics: Type.Optional(Type.String({ description: '关键主题' })),
  market_impact: Type.Optional(Type.String({ description: '市场影响' })),
  key_data_points: Type.Optional(Type.String({ description: '关键数据点' })),
  source_url: Type.Optional(Type.String({ description: '来源 URL' })),
  source_name: Type.Optional(Type.String({ description: '来源名称' })),
  original_content: Type.Optional(Type.String({ description: '原始内容' })),
  content_mode: Type.Optional(Type.String({ description: '内容模式: ai_summary | original' })),
});

export const assetMarketInfoUpdateHermesConfig: HermesToolConfig = {
  name: 'asset_market_info_update',
  description: '更新指定 ID 的市场信息',
  schema: assetMarketInfoUpdateSchema,
  handler: async (_id, args) => {
    try {
      const controller = await getMarketBizController();
      const body: Record<string, unknown> = { id: String(args.id) };
      if (args.asset_meta_ids !== undefined) body.assetMetaIds = args.asset_meta_ids;
      if (args.title !== undefined) body.title = String(args.title);
      if (args.symbol !== undefined) body.symbol = String(args.symbol);
      if (args.sentiment !== undefined) body.sentiment = String(args.sentiment);
      if (args.importance !== undefined) body.importance = String(args.importance);
      if (args.summary !== undefined) body.summary = String(args.summary);
      if (args.key_topics !== undefined) body.keyTopics = String(args.key_topics);
      if (args.market_impact !== undefined) body.marketImpact = String(args.market_impact);
      if (args.key_data_points !== undefined) body.keyDataPoints = String(args.key_data_points);
      if (args.source_url !== undefined) body.sourceUrl = String(args.source_url);
      if (args.source_name !== undefined) body.sourceName = String(args.source_name);
      if (args.original_content !== undefined) body.originalContent = String(args.original_content);
      if (args.content_mode !== undefined) body.contentMode = String(args.content_mode);
      const result = await controller.updateMarketInfo(body);
      return { content: [{ type: 'text', text: unwrapControllerResult(result) }] };
    } catch (e) {
      logger.error('[assetMarketInfoUpdateTool] failed:', e);
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'write',
};

const assetMarketInfoDeleteSchema: TObject = Type.Object({
  id: Type.String({ description: '市场信息记录 ID' }),
});

export const assetMarketInfoDeleteHermesConfig: HermesToolConfig = {
  name: 'asset_market_info_delete',
  description: '删除指定 ID 的市场信息',
  schema: assetMarketInfoDeleteSchema,
  handler: async (_id, args) => {
    try {
      const controller = await getMarketBizController();
      const result = await controller.deleteMarketInfo({ id: String(args.id) });
      return { content: [{ type: 'text', text: unwrapControllerResult(result) }] };
    } catch (e) {
      logger.error('[assetMarketInfoDeleteTool] failed:', e);
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'system',
};