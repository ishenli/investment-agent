import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import { z } from 'zod';
import logger from '@server/base/logger';
import settingService from '@server/service/settingService';
import * as TavilyCore from '@tavily/core';

const WebSearchQuerySchema = z.object({
  query: z.string().min(1, '搜索关键词不能为空'),
  page: z.string().optional().default('1'),
  pageSize: z.string().optional().default('10'),
});

class WebSearchController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request) {
    try {
      const params = await this.validateParams(request, WebSearchQuerySchema);
      const query = params.query;
      const page = parseInt(params.page, 10);
      const pageSize = parseInt(params.pageSize, 10);

      // 尝试使用 Tavily API 搜索
      const tavilyApiKey = await settingService.getConfigValueByKey('TAVILY_API_KEY').catch(() => null);

      if (tavilyApiKey) {
        return await this.searchWithTavily(tavilyApiKey, query, page, pageSize);
      }

      // 无 API Key 时返回空结果并提示
      logger.warn('[WebSearchController] TAVILY_API_KEY not configured, returning empty results');
      return this.success({
        results: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        hint: '请在设置中配置 TAVILY_API_KEY 以启用网络搜索',
      });
    } catch (error) {
      logger.error('[WebSearchController] 网络搜索失败:', error);
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      return this.error('网络搜索失败', 'web_search_error');
    }
  }

  private static async searchWithTavily(apiKey: string, query: string, page: number, pageSize: number) {
    try {
      const tavilyClient = TavilyCore.tavily({ apiKey });
      const result = await tavilyClient.search(query, {
        maxResults: pageSize,
      });

      logger.info(`[WebSearchController] Tavily returned ${result?.results?.length ?? 0} results`);

      const results = (result?.results ?? []).map((item, index) => ({
        id: `web-${page}-${index}`,
        title: item.title || query,
        description: item.content || '',
        url: item.url || undefined,
        type: 'web' as const,
        source: extractDomain(item.url) || 'Web',
      }));

      return this.success({
        results,
        total: results.length,
        page,
        pageSize,
        totalPages: 1,
      });
    } catch (error) {
      logger.error('[WebSearchController] Tavily search failed:', error);
      return this.success({
        results: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        hint: '网络搜索暂时不可用，请检查 TAVILY_API_KEY 配置',
      });
    }
  }
}

/** 从 URL 中提取域名作为来源 */
function extractDomain(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return null;
  }
}

export const GET = WebSearchController.GET;
