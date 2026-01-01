import { WithRequestContext, WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import { z } from 'zod';
import logger from '@server/base/logger';

// 定义搜索请求参数的验证模式
const WebSearchQuerySchema = z.object({
  query: z.string().min(1, '搜索关键词不能为空'),
  page: z.string().optional().default('1'),
  pageSize: z.string().optional().default('10'),
});

class WebSearchController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request) {
    try {
      // 验证查询参数
      const params = await this.validateParams(request, WebSearchQuerySchema);
      const query = params.query;
      const page = parseInt(params.page, 10);
      const pageSize = parseInt(params.pageSize, 10);
      
      // 模拟网络搜索结果
      // 在实际应用中，这里应该调用真实的搜索引擎API
      const mockWebResults = [
        {
          id: 'web1',
          title: '最新股市动态 - 投资者日报',
          description: '今日股市收盘情况，主要指数表现及热门股票分析。',
          type: 'web' as const,
          source: '投资者日报',
          url: 'https://example.com/stock-news-1',
        },
        {
          id: 'web2',
          title: '美联储货币政策对全球市场的影响分析',
          description: '深度分析美联储最新货币政策决定对全球金融市场的影响。',
          type: 'web' as const,
          source: '财经观察网',
          url: 'https://example.com/fed-policy-impact',
        },
        {
          id: 'web3',
          title: '人工智能在金融领域的应用前景',
          description: '探讨AI技术如何改变金融服务行业，提高效率和准确性。',
          type: 'web' as const,
          source: '科技财经',
          url: 'https://example.com/ai-finance-future',
        },
        {
          id: 'web4',
          title: '绿色能源投资趋势报告',
          description: '分析绿色能源行业的投资机会和未来发展趋势。',
          type: 'web' as const,
          source: '可持续发展投资',
          url: 'https://example.com/green-energy-investment',
        },
        {
          id: 'web5',
          title: '数字货币市场波动性研究',
          description: '研究主要数字货币的价格波动特征和影响因素。',
          type: 'web' as const,
          source: '区块链研究',
          url: 'https://example.com/crypto-volatility',
        },
      ];

      // 过滤结果（简单匹配标题和描述）
      const filteredResults = mockWebResults.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) || 
        item.description.toLowerCase().includes(query.toLowerCase()) ||
        item.source.toLowerCase().includes(query.toLowerCase())
      );

      // 计算分页
      const total = filteredResults.length;
      const totalPages = Math.ceil(total / pageSize);
      const startIndex = (page - 1) * pageSize;
      const paginatedResults = filteredResults.slice(startIndex, startIndex + pageSize);

      // 构造响应数据
      const responseData = {
        results: paginatedResults,
        total,
        page,
        pageSize,
        totalPages,
      };

      return this.success(responseData);
    } catch (error) {
      logger.error('[WebSearchController] 网络搜索失败:', error);
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      return this.error('网络搜索失败', 'web_search_error');
    }
  }
}

export const GET = WebSearchController.GET;