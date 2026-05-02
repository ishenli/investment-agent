import { WithRequestContextStatic } from '@server/base/decorators';
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
} from '@drizzle/schema';
import { or, like, sql, eq, and, isNull } from 'drizzle-orm';
import authService from '@server/service/authService';
import accountService from '@server/service/accountService';

const SearchQuerySchema = z.object({
  query: z.string().min(1, '搜索关键词不能为空'),
  page: z.string().optional().default('1'),
  pageSize: z.string().optional().default('10'),
});

class SearchController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request) {
    try {
      const params = await this.validateParams(request, SearchQuerySchema);
      const query = params.query;
      const page = parseInt(params.page, 10);
      const pageSize = parseInt(params.pageSize, 10);
      const offset = (page - 1) * pageSize;

      // 获取当前用户的 accountId（用于隔离 positions/transactions）
      const userId = await authService.getCurrentUserId();
      let accountId: number | null = null;
      if (userId) {
        const account = await accountService.getUserSelectedAccount(userId);
        accountId = account?.id ? parseInt(account.id, 10) : null;
      }

      // 并行查询所有表的匹配数和结果
      const likePattern = `%${query}%`;

      // 统计各表匹配总数（用于真实分页）
      const [metaCount, marketCount, companyCount, positionCount, transactionCount] =
        await Promise.all([
          db
            .select({ count: sql<number>`count(*)` })
            .from(assetMeta)
            .where(
              and(
                isNull(assetMeta.deletedAt),
                or(
                  like(assetMeta.symbol, likePattern),
                  like(assetMeta.chineseName, likePattern),
                  like(assetMeta.investmentMemo, likePattern),
                ),
              ),
            )
            .then((r) => r[0]?.count ?? 0),
          db
            .select({ count: sql<number>`count(*)` })
            .from(assetMarketInfo)
            .where(
              or(
                like(assetMarketInfo.title, likePattern),
                like(assetMarketInfo.summary, likePattern),
                like(assetMarketInfo.sourceName, likePattern),
              ),
            )
            .then((r) => r[0]?.count ?? 0),
          db
            .select({ count: sql<number>`count(*)` })
            .from(assetCompanyInfo)
            .where(
              or(
                like(assetCompanyInfo.title, likePattern),
                like(assetCompanyInfo.content, likePattern),
              ),
            )
            .then((r) => r[0]?.count ?? 0),
          accountId
            ? db
                .select({ count: sql<number>`count(*)` })
                .from(assetPositions)
                .where(
                  and(
                    eq(assetPositions.accountId, accountId),
                    isNull(assetPositions.deletedAt),
                    like(assetPositions.symbol, likePattern),
                  ),
                )
                .then((r) => r[0]?.count ?? 0)
            : Promise.resolve(0),
          accountId
            ? db
                .select({ count: sql<number>`count(*)` })
                .from(transactions)
                .where(
                  and(
                    eq(transactions.accountId, accountId),
                    or(
                      like(transactions.symbol, likePattern),
                      like(transactions.description, likePattern),
                    ),
                  ),
                )
                .then((r) => r[0]?.count ?? 0)
            : Promise.resolve(0),
        ]);

      const total = metaCount + marketCount + companyCount + positionCount + transactionCount;
      const totalPages = Math.ceil(total / pageSize);

      // 使用游标式分页：确定当前页应该从哪张表取数据
      const tableCounts = [
        { table: 'meta', count: metaCount },
        { table: 'market', count: marketCount },
        { table: 'company', count: companyCount },
        { table: 'position', count: positionCount },
        { table: 'transaction', count: transactionCount },
      ];

      const results: any[] = [];
      let remaining = pageSize;
      let skipRemaining = offset;

      for (const { table, count } of tableCounts) {
        if (remaining <= 0) break;
        if (skipRemaining >= count) {
          skipRemaining -= count;
          continue;
        }

        const tableOffset = skipRemaining;
        const tableLimit = Math.min(remaining, count - skipRemaining);
        skipRemaining = 0;

        const rows = await queryTable(table, likePattern, tableLimit, tableOffset, accountId);
        results.push(...rows);
        remaining -= rows.length;
      }

      return this.success({
        results,
        total,
        page,
        pageSize,
        totalPages,
      });
    } catch (error) {
      logger.error('[SearchController] 搜索失败:', error);
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      return this.error('搜索失败', 'search_error');
    }
  }
}

/**
 * 按表名查询指定范围的数据
 */
async function queryTable(
  table: string,
  likePattern: string,
  limit: number,
  offset: number,
  accountId: number | null,
) {
  switch (table) {
    case 'meta': {
      const rows = await db
        .select({
          id: assetMeta.id,
          symbol: assetMeta.symbol,
          chineseName: assetMeta.chineseName,
          investmentMemo: assetMeta.investmentMemo,
          createdAt: assetMeta.createdAt,
        })
        .from(assetMeta)
        .where(
          and(
            isNull(assetMeta.deletedAt),
            or(
              like(assetMeta.symbol, likePattern),
              like(assetMeta.chineseName, likePattern),
              like(assetMeta.investmentMemo, likePattern),
            ),
          ),
        )
        .limit(limit)
        .offset(offset);

      return rows.map((item) => ({
        id: `meta-${item.id}`,
        title: item.chineseName ? `${item.chineseName} (${item.symbol})` : item.symbol,
        description: item.investmentMemo || '资产投资笔记',
        type: 'local' as const,
        source: '资产信息',
        createdAt: item.createdAt,
      }));
    }

    case 'market': {
      const rows = await db
        .select({
          id: assetMarketInfo.id,
          title: assetMarketInfo.title,
          summary: assetMarketInfo.summary,
          sourceName: assetMarketInfo.sourceName,
          sourceUrl: assetMarketInfo.sourceUrl,
          createdAt: assetMarketInfo.createdAt,
        })
        .from(assetMarketInfo)
        .where(
          or(
            like(assetMarketInfo.title, likePattern),
            like(assetMarketInfo.summary, likePattern),
            like(assetMarketInfo.sourceName, likePattern),
          ),
        )
        .limit(limit)
        .offset(offset);

      return rows.map((item) => ({
        id: `market-${item.id}`,
        title: item.title,
        description: item.summary,
        url: item.sourceUrl || undefined,
        type: 'local' as const,
        source: item.sourceName || '市场信息',
        createdAt: item.createdAt,
      }));
    }

    case 'company': {
      const rows = await db
        .select({
          id: assetCompanyInfo.id,
          title: assetCompanyInfo.title,
          content: assetCompanyInfo.content,
          createdAt: assetCompanyInfo.createdAt,
        })
        .from(assetCompanyInfo)
        .where(
          or(
            like(assetCompanyInfo.title, likePattern),
            like(assetCompanyInfo.content, likePattern),
          ),
        )
        .limit(limit)
        .offset(offset);

      return rows.map((item) => ({
        id: `company-${item.id}`,
        title: item.title,
        description: item.content.substring(0, 200) + (item.content.length > 200 ? '...' : ''),
        type: 'local' as const,
        source: '公司信息',
        createdAt: item.createdAt,
      }));
    }

    case 'position': {
      if (!accountId) return [];
      const rows = await db
        .select({
          id: assetPositions.id,
          symbol: assetPositions.symbol,
          quantity: assetPositions.quantity,
          averagePriceCents: assetPositions.averagePriceCents,
          sector: assetPositions.sector,
          createdAt: assetPositions.createdAt,
        })
        .from(assetPositions)
        .where(
          and(
            eq(assetPositions.accountId, accountId),
            isNull(assetPositions.deletedAt),
            like(assetPositions.symbol, likePattern),
          ),
        )
        .limit(limit)
        .offset(offset);

      return rows.map((item) => ({
        id: `position-${item.id}`,
        title: `持仓: ${item.symbol}`,
        description: `数量: ${item.quantity}, 平均价格: ${(item.averagePriceCents / 100).toFixed(2)}, 类型: ${item.sector}`,
        type: 'local' as const,
        source: '持仓信息',
        createdAt: item.createdAt,
      }));
    }

    case 'transaction': {
      if (!accountId) return [];
      const rows = await db
        .select({
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
          and(
            eq(transactions.accountId, accountId),
            or(
              like(transactions.symbol, likePattern),
              like(transactions.description, likePattern),
            ),
          ),
        )
        .limit(limit)
        .offset(offset);

      return rows.map((item) => ({
        id: `transaction-${item.id}`,
        title: `交易: ${item.type} ${item.symbol || ''}`,
        description:
          item.description ||
          `数量: ${item.quantity || 'N/A'}, 金额: ${(item.totalAmountCents / 100).toFixed(2)}`,
        type: 'local' as const,
        source: '交易记录',
        createdAt: item.createdAt,
      }));
    }

    default:
      return [];
  }
}

export const GET = SearchController.GET;
