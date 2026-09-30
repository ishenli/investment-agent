/**
 * 市场信息录入工具（MCP 白名单）
 *
 * 将「保存新的市场信息到本地数据库」（asset_market_info_save 能力）包装为
 * Claude SDK 工具，供外部 CodingAgent 通过 MCP 调用。
 *
 * 复用 MarketBizController.saveMarketInfo（与 Hermes 内置工具同源），
 * 由 controller 完成 SaveMarketInfoSchema 校验与 original 模式原文获取。
 *
 * 注意：这是用户显式要求暴露的**写操作**工具，区别于默认只读白名单。
 */
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import z from 'zod';

import logger from '@server/base/logger';

const MarketInfoSaveParams = z.object({
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
});

export const marketInfoSaveClaudeTool = claudeTool(
  'marketInfoSaveTool',
  '保存新的市场信息到本地数据库（录入市场信息），asset_meta_ids 必须为已存在的资产元数据 ID',
  MarketInfoSaveParams.shape,
  async (args) => {
    try {
      // 懒加载市场控制器：避免测试导入链引入 marketFetcherService/WebCrawler
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