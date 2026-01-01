import { WithRequestContext, WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import { z } from 'zod';
import logger from '@server/base/logger';
import { db } from '@server/lib/db';
import { 
  assetMeta, 
  assetMarketInfo, 
  assetCompanyInfo,
  assetPositions,
  transactions,
  accounts
} from '@drizzle/schema';
import { and, or, like, sql } from 'drizzle-orm';

// 定义搜索请求参数的验证模式
const SearchQuerySchema = z.object({
  query: z.string().min(1, '搜索关键词不能为空'),
  page: z.string().optional().default('1'),
  pageSize: z.string().optional().default('10'),
});

class SearchController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request) {
    try {
      // 验证查询参数
      const params = await this.validateParams(request, SearchQuerySchema);
      const query = params.query;
      const page = parseInt(params.page, 10);
      const pageSize = parseInt(params.pageSize, 10);
      
      // 计算偏移量
      const offset = (page - 1) * pageSize;
      
      // 搜索结果数组
      const results: any[] = [];
      
      // 1. 搜索资产元数据 (assetMeta)
      const metaResults = await db.select({
        id: assetMeta.id,
        symbol: assetMeta.symbol,
        chineseName: assetMeta.chineseName,
        investmentMemo: assetMeta.investmentMemo,
        createdAt: assetMeta.createdAt,
      })
      .from(assetMeta)
      .where(
        or(
          like(assetMeta.symbol, `%${query}%`),
          like(assetMeta.chineseName, `%${query}%`),
          like(assetMeta.investmentMemo, `%${query}%`)
        )
      )
      .limit(pageSize)
      .offset(offset);
      
      // 格式化资产元数据结果
      metaResults.forEach(item => {
        results.push({
          id: `meta-${item.id}`,
          title: item.chineseName ? `${item.chineseName} (${item.symbol})` : item.symbol,
          description: item.investmentMemo || '资产投资笔记',
          type: 'local' as const,
          source: '资产信息',
          createdAt: item.createdAt,
        });
      });
      
      // 2. 搜索市场信息 (assetMarketInfo)
      const marketInfoResults = await db.select({
        id: assetMarketInfo.id,
        title: assetMarketInfo.title,
        summary: assetMarketInfo.summary,
        sourceName: assetMarketInfo.sourceName,
        createdAt: assetMarketInfo.createdAt,
      })
      .from(assetMarketInfo)
      .where(
        or(
          like(assetMarketInfo.title, `%${query}%`),
          like(assetMarketInfo.summary, `%${query}%`),
          like(assetMarketInfo.sourceName, `%${query}%`)
        )
      )
      .limit(pageSize)
      .offset(offset);
      
      // 格式化市场信息结果
      marketInfoResults.forEach(item => {
        results.push({
          id: `market-${item.id}`,
          title: item.title,
          description: item.summary,
          type: 'local' as const,
          source: item.sourceName || '市场信息',
          createdAt: item.createdAt,
        });
      });
      
      // 3. 搜索公司信息 (assetCompanyInfo)
      const companyInfoResults = await db.select({
        id: assetCompanyInfo.id,
        title: assetCompanyInfo.title,
        content: assetCompanyInfo.content,
        createdAt: assetCompanyInfo.createdAt,
      })
      .from(assetCompanyInfo)
      .where(
        or(
          like(assetCompanyInfo.title, `%${query}%`),
          like(assetCompanyInfo.content, `%${query}%`)
        )
      )
      .limit(pageSize)
      .offset(offset);
      
      // 格式化公司信息结果
      companyInfoResults.forEach(item => {
        results.push({
          id: `company-${item.id}`,
          title: item.title,
          description: item.content.substring(0, 200) + (item.content.length > 200 ? '...' : ''),
          type: 'local' as const,
          source: '公司信息',
          createdAt: item.createdAt,
        });
      });
      
      // 4. 搜索持仓信息 (assetPositions)
      const positionResults = await db.select({
        id: assetPositions.id,
        symbol: assetPositions.symbol,
        quantity: assetPositions.quantity,
        averagePriceCents: assetPositions.averagePriceCents,
        sector: assetPositions.sector,
        createdAt: assetPositions.createdAt,
      })
      .from(assetPositions)
      .where(
        like(assetPositions.symbol, `%${query}%`)
      )
      .limit(pageSize)
      .offset(offset);
      
      // 格式化持仓信息结果
      positionResults.forEach(item => {
        results.push({
          id: `position-${item.id}`,
          title: `持仓: ${item.symbol}`,
          description: `数量: ${item.quantity}, 平均价格: ${(item.averagePriceCents / 100).toFixed(2)}, 类型: ${item.sector}`,
          type: 'local' as const,
          source: '持仓信息',
          createdAt: item.createdAt,
        });
      });
      
      // 5. 搜索交易记录 (transactions)
      const transactionResults = await db.select({
        id: transactions.id,
        type: transactions.type,
        symbol: transactions.symbol,
        quantity: transactions.quantity,
        totalAmountCents: transactions.totalAmountCents,
        description: transactions.description,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(
        or(
          like(transactions.symbol, `%${query}%`),
          like(transactions.description, `%${query}%`)
        )
      )
      .limit(pageSize)
      .offset(offset);
      
      // 格式化交易记录结果
      transactionResults.forEach(item => {
        results.push({
          id: `transaction-${item.id}`,
          title: `交易: ${item.type} ${item.symbol || ''}`,
          description: item.description || `数量: ${item.quantity || 'N/A'}, 金额: ${(item.totalAmountCents / 100).toFixed(2)}`,
          type: 'local' as const,
          source: '交易记录',
          createdAt: item.createdAt,
        });
      });
      
      // 计算总数 (简化实现，实际应该分别计算每种类型的总数)
      const total = results.length;
      const totalPages = Math.ceil(total / pageSize);
      
      // 构造响应数据
      const responseData = {
        results: results.slice(0, pageSize), // 确保不超过页面大小
        total,
        page,
        pageSize,
        totalPages,
      };

      return this.success(responseData);
    } catch (error) {
      logger.error('[SearchController] 搜索失败:', error);
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      return this.error('搜索失败', 'search_error');
    }
  }
}

export const GET = SearchController.GET;