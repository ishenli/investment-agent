import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import { Type, type TObject } from '@sinclair/typebox';
import z from 'zod';
import logger from '@server/base/logger';

import type { HermesToolConfig } from './types';

// ============== Claude Agent SDK Adapter ==============

const MarketInfoSaveParamsShape = {
  asset_meta_ids: z.array(z.number()).describe('【必需】关联的资产元数据 IDs，如: [652]'),
  title: z.string().describe('【必需】标题'),
  symbol: z.string().describe('【必需】资产代号，如: BABA'),
  sentiment: z.string().describe('【必需】情绪评级'),
  importance: z.string().describe('【必需】重要性'),
  summary: z.string().describe('【必需】摘要'),
  key_topics: z.string().optional().describe('关键主题'),
  market_impact: z.string().describe('【必需】市场影响'),
  key_data_points: z.string().optional().describe('关键数据点'),
  source_url: z.string().optional().describe('来源 URL'),
  source_name: z.string().optional().describe('来源名称'),
  original_content: z.string().optional().describe('原始内容'),
  content_mode: z.enum(['ai_summary', 'original']).optional().describe('内容模式: ai_summary | original，默认 ai_summary'),
  market_info_id: z.string().optional().describe('用于获取原文内容的市场信息 ID'),
};

export const marketInfoSaveClaudeTool = claudeTool(
  'marketInfoSaveTool',
  '保存新的市场信息到本地数据库（录入市场信息），asset_meta_ids 必须为已存在的资产元数据 ID',
  MarketInfoSaveParamsShape,
  async (args) => {
    try {
      const { MarketBizController } = await import('@server/controller/market');
      const controller = new MarketBizController();
      const result = await controller.saveMarketInfo({
        assetMetaIds: args.asset_meta_ids as number[],
        title: String(args.title),
        symbol: String(args.symbol),
        sentiment: String(args.sentiment),
        importance: String(args.importance),
        summary: String(args.summary),
        keyTopics: args.key_topics !== undefined ? String(args.key_topics) : undefined,
        marketImpact: String(args.market_impact),
        keyDataPoints: args.key_data_points !== undefined ? String(args.key_data_points) : undefined,
        sourceUrl: args.source_url !== undefined ? String(args.source_url) : undefined,
        sourceName: args.source_name !== undefined ? String(args.source_name) : undefined,
        originalContent: args.original_content !== undefined ? String(args.original_content) : undefined,
        contentMode: args.content_mode as 'ai_summary' | 'original' | undefined,
        marketInfoId: args.market_info_id !== undefined ? String(args.market_info_id) : undefined,
      });
      if (result.success) {
        return {
          content: [
            { type: 'text', text: `${String(result.message ?? '市场信息保存成功')}\n${JSON.stringify(result.data, null, 2)}` },
          ],
        };
      }
      return {
        content: [{ type: 'text', text: `保存市场信息失败: ${String(result.message ?? result.code ?? '')}` }],
        isError: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[marketInfoSaveClaudeTool] failed:', error);
      return { content: [{ type: 'text', text: `保存市场信息失败: ${errorMsg}` }], isError: true };
    }
  },
);

// ============== Hermes Adapter ==============

const assetMarketInfoSaveSchema: TObject = Type.Object({
  asset_meta_ids: Type.Array(Type.Number(), { description: '关联的资产元数据 IDs' }),
  title: Type.String({ description: '标题' }),
  symbol: Type.String({ description: '资产代号' }),
  sentiment: Type.String({ description: '情绪评级' }),
  importance: Type.String({ description: '重要性' }),
  summary: Type.String({ description: '摘要' }),
  key_topics: Type.Optional(Type.String({ description: '关键主题' })),
  market_impact: Type.String({ description: '市场影响' }),
  key_data_points: Type.Optional(Type.String({ description: '关键数据点' })),
  source_url: Type.Optional(Type.String({ description: '来源 URL' })),
  source_name: Type.Optional(Type.String({ description: '来源名称' })),
  original_content: Type.Optional(Type.String({ description: '原始内容' })),
  content_mode: Type.Optional(Type.String({ description: '内容模式: ai_summary | original，默认 ai_summary' })),
  market_info_id: Type.Optional(Type.String({ description: '用于获取原文内容的市场信息 ID' })),
});

export const marketInfoSaveHermesConfig: HermesToolConfig = {
  name: 'asset_market_info_save',
  description: '保存新的市场分析信息到本地数据库',
  schema: assetMarketInfoSaveSchema,
  handler: async (_id, args) => {
    try {
      const { MarketBizController } = await import('@server/controller/market');
      const controller = new MarketBizController();
      const result = await controller.saveMarketInfo({
        assetMetaIds: args.asset_meta_ids as number[],
        title: String(args.title),
        symbol: String(args.symbol),
        sentiment: String(args.sentiment),
        importance: String(args.importance),
        summary: String(args.summary),
        keyTopics: args.key_topics !== undefined ? String(args.key_topics) : undefined,
        marketImpact: String(args.market_impact),
        keyDataPoints: args.key_data_points !== undefined ? String(args.key_data_points) : undefined,
        sourceUrl: args.source_url !== undefined ? String(args.source_url) : undefined,
        sourceName: args.source_name !== undefined ? String(args.source_name) : undefined,
        originalContent: args.original_content !== undefined ? String(args.original_content) : undefined,
        contentMode: args.content_mode as 'ai_summary' | 'original' | undefined,
        marketInfoId: args.market_info_id !== undefined ? String(args.market_info_id) : undefined,
      });
      if (result.success) {
        return { content: [{ type: 'text', text: `${String(result.message ?? '市场信息保存成功')}\n${JSON.stringify(result.data, null, 2)}` }] };
      }
      return { content: [{ type: 'text', text: `保存市场信息失败: ${String(result.message ?? result.code ?? '')}` }], isError: true };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'write',
};