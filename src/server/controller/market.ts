import { WithRequestContext } from '@server/base/decorators';
import { BaseBizController } from './base';
import assetMarketInfoService from '@server/service/assetMarketInfoService';
import { z } from 'zod';
import logger from '@server/base/logger';
import assetMetaService from '@server/service/assetMetaService';
import { AuthService } from '@server/service/authService';
import { ContentFormat, DataSourceType } from '@/types/market';
import { MarketFetcherService } from '../service/marketFetcherService';
import { MarketAIService } from '../service/marketAIService';

// 定义请求参数验证模式
const GetMarketInfoListSchema = z.object({
  type: z.enum(['latest', 'dateRange']).optional().default('latest'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().int().positive().optional().default(20),
});

const DeleteMarketInfoSchema = z.object({
  id: z.number().int().positive(),
});

const SummarizeContentSchema = z.object({
  content: z.string(),
  title: z.string().optional(),
  symbol: z.string().optional(),
});

const AnalyzeContentSchema = z.object({
  content: z.string(),
  title: z.string().optional(),
  symbol: z.string().optional(),
});

const CrawlMarketInfoSchema = z.object({
  url: z.string().url(),
  dataSourceType: z.string().optional(),
});

const SaveMarketInfoSchema = z.object({
  assetMetaIds: z.array(z.number().int().positive()),
  title: z.string(),
  symbol: z.string(),
  sentiment: z.string(),
  importance: z.string(),
  summary: z.string(),
  keyTopics: z.string().optional(),
  marketImpact: z.string(),
  keyDataPoints: z.string().optional(),
  sourceUrl: z.string().optional(),
  sourceName: z.string().optional(),
});

const GetAssetMarketInfoSchema = z.object({
  assetMetaId: z.string().optional(),
  type: z.enum(['latest', 'detail']).optional().default('latest'),
  id: z.string().optional(),
});

const GetAssetMarketInfoListSchema = z.object({
  assetMetaId: z.string(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
});

// 定义请求体验证模式
const CrawlRequestSchema = z.object({
  url: z.url(),
  dataSourceType: z.enum(DataSourceType).optional(),
});

const ManualInputRequestSchema = z.object({
  content: z.string(),
  format: z.enum(ContentFormat),
  tags: z.array(z.string()).optional(),
});


// 定义请求体验证模式
const SummarizeContentRequestSchema = z.object({
  content: z.string().min(1, '内容不能为空'),
  title: z.string().optional(),
  language: z.string().optional().default('zh'),
});


export class MarketBizController extends BaseBizController {
  marketFetcherService: MarketFetcherService;
  marketAIService: MarketAIService;

  constructor() {
    super();
    this.marketFetcherService = new MarketFetcherService();
    this.marketAIService = new MarketAIService();
  }

  @WithRequestContext()
  async getMarketInfoList(query: any) {
    try {
      logger.info('[MarketBizController] 收到获取资产市场信息列表请求');

      // 验证查询参数
      const validationResult = GetMarketInfoListSchema.safeParse(query);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const { type, startDate, endDate, limit } = validationResult.data;

      if (type === 'dateRange') {
        if (!startDate || !endDate) {
          return this.error(
            '日期范围查询需要提供 startDate 和 endDate 参数',
            'missing_date_params_error',
          );
        }

        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
          return this.error('无效的日期格式', 'invalid_date_format_error');
        }

        if (startDateObj > endDateObj) {
          return this.error('startDate 不能晚于 endDate', 'invalid_date_range_error');
        }

        // 获取时间范围内的资产市场信息
        const assetMarketInfos = await assetMarketInfoService.getAssetMarketInfosByDateRange(
          startDateObj,
          endDateObj,
          limit,
        );

        return this.success({
          type: 'dateRange',
          startDate: startDateObj.toISOString(),
          endDate: endDateObj.toISOString(),
          data: assetMarketInfos,
        });
      } else {
        // 获取最新的资产市场信息
        const assetMarketInfos = await assetMarketInfoService.getLatestAssetMarketInfos(limit);

        return this.success({
          type: 'latest',
          data: assetMarketInfos,
        });
      }
    } catch (error) {
      logger.error('[MarketBizController] 获取资产市场信息列表失败:', error);
      return this.error('获取资产市场信息列表失败', 'get_asset_market_infos_error');
    }
  }

  @WithRequestContext()
  async deleteMarketInfo(query: {
    id: string
  }) {
    try {
      logger.info('[MarketBizController] 收到删除资产市场信息请求', query);

      // 验证查询参数
      const idInt = parseInt(query.id);
      const validationResult = DeleteMarketInfoSchema.safeParse({
        id: idInt,
      });

      // 验证失败
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const { id } = validationResult.data;

      // 删除资产市场信息
      const result = await assetMarketInfoService.deleteAssetMarketInfoById(id);

      if (!result) {
        return this.error('未找到指定的资产市场信息', 'asset_market_info_not_found_error');
      }

      return this.success({
        message: '资产市场信息删除成功',
      });
    } catch (error) {
      logger.error('[MarketBizController] 删除资产市场信息失败:', error);
      return this.error('删除资产市场信息失败', 'delete_asset_market_info_error');
    }
  }

  @WithRequestContext()
  async summarizeContent(body: any) {
    try {
      logger.info('[MarketBizController] 收到内容总结请求');

      // 验证请求体
      const validationResult = SummarizeContentRequestSchema.safeParse(body);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const { content, title, language } = validationResult.data;

      const summary = await this.marketAIService.summarizeContent(content, title, language);

      return this.success({
        message: '内容总结成功',
        data: summary,
      });
    } catch (error) {
      logger.error('[MarketBizController] 内容总结失败:', error);
      return this.error('内容总结失败', 'summarize_content_error');
    }
  }

  @WithRequestContext()
  async analyzeContent(body: any) {
    try {
      logger.info('[MarketBizController] 收到内容分析请求');

      // 验证请求体
      const validationResult = SummarizeContentRequestSchema.safeParse(body);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const { content, title, language } = validationResult.data;

      // 模拟 AI 分析内容的逻辑
      const analysis = await this.marketAIService.analyzeContent(content, title, language);

          // 返回成功响应
      return this.success({
        message: 'AI分析内容成功',
        data: analysis,
      });

    } catch (error) {
      logger.error('[MarketBizController] 内容分析失败:', error);
      return this.error('内容分析失败', 'analyze_content_error');
    }
  }

  @WithRequestContext()
  async crawlMarketInfo(body: any) {
        try {
      logger.info('[MarketFetcherController] 收到抓取市场信息请求');

      // 检查是否是手动输入请求
      if (body.content && body.format) {
        // 处理手动输入请求
        return await this.handleManualInput(body);
      }

      // 验证URL请求参数
      const validationResult = CrawlRequestSchema.safeParse(body);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const crawlRequest = validationResult.data;

      // 调用服务抓取市场信息
      const marketInfo = await this.marketFetcherService.crawl(crawlRequest);

      // 返回成功响应
      return this.success({
        message: '抓取市场信息成功',
        data: marketInfo,
      });
    } catch (error) {
      logger.error(
        '[MarketFetcherController] 抓取市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      return this.error('抓取市场信息失败', 'crawl_market_info_error');
    }
  }

  private async handleManualInput(body: any) {
    try {
      logger.info('[MarketFetcherController] 收到手动输入市场信息请求');

      // 验证手动输入请求参数
      const validationResult = ManualInputRequestSchema.safeParse(body);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const manualInputRequest = validationResult.data;

      // 调用服务保存手动输入的市场信息
      const marketInfo = await this.marketFetcherService.saveManualInput(manualInputRequest);

      // 返回成功响应
      return this.success({
        message: '保存手动输入的市场信息成功',
        data: marketInfo,
      });
    } catch (error) {
      logger.error(
        '[MarketFetcherController] 保存手动输入的市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      return this.error('保存手动输入的市场信息失败', 'save_manual_input_error');
    }
  }


  @WithRequestContext()
  async getDataSources(query: any) {
    try {
      logger.info('[MarketBizController] 收到获取数据源列表请求');

      // 模拟获取数据源列表的逻辑
      const dataSources = [
        { id: '1', type: 'WEB', name: '网页抓取', enabled: true },
        { id: '2', type: 'WECHAT_MP', name: '微信公众号', enabled: true },
        { id: '3', type: 'FUTU_NEWS', name: '富途新闻', enabled: false },
      ];

      return this.success({
        data: dataSources,
      });
    } catch (error) {
      logger.error('[MarketBizController] 获取数据源列表失败:', error);
      return this.error('获取数据源列表失败', 'get_data_sources_error');
    }
  }

  @WithRequestContext()
  async saveMarketInfo(body: any) {
    try {
      logger.info('[MarketBizController] 收到保存市场信息请求');

      // 验证请求体
      const validationResult = SaveMarketInfoSchema.safeParse(body);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const requestData = validationResult.data;

      // 保存资产市场信息
      const assetMarketInfo = await assetMarketInfoService.createAssetMarketInfo(requestData);

      return this.success({
        message: '市场信息保存成功',
        data: assetMarketInfo,
      });
    } catch (error) {
      logger.error('[MarketBizController] 保存市场信息失败:', error);
      return this.error('保存市场信息失败', 'save_market_info_error');
    }
  }

  @WithRequestContext()
  async getAssetMarketInfo(query: { assetMetaId?: string; type?: string; id?: string }) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 验证查询参数
      const validationResult = GetAssetMarketInfoSchema.safeParse(query);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }
      const { assetMetaId, type, id } = validationResult.data;

      // 3. 如果是详情查询
      if (type === 'detail') {
        if (!id) {
          return this.error('详情查询需要提供 id 参数', 'missing_id_error');
        }

        const idNum = parseInt(id);
        if (isNaN(idNum) || idNum <= 0) {
          return this.error('id 必须为正整数', 'invalid_id_error');
        }

        // 获取指定的 assetMarketInfo 记录
        const assetMarketInfo = await assetMarketInfoService.getAssetMarketInfoById(idNum);

        if (!assetMarketInfo) {
          return this.error('未找到指定的资产市场信息', 'asset_market_info_not_found');
        }

        return this.success(assetMarketInfo);
      }

      // 4. 默认为最新信息查询
      if (!assetMetaId) {
        return this.error('缺少必需的 assetMetaId 参数', 'missing_asset_meta_id_error');
      }

      const assetMetaIdNum = parseInt(assetMetaId);
      if (isNaN(assetMetaIdNum) || assetMetaIdNum <= 0) {
        return this.error('assetMetaId 必须为正整数', 'invalid_asset_meta_id_error');
      }

      // 5. 检查 assetMeta 是否存在
      const assetMeta = await assetMetaService.getAssetMetaById(assetMetaIdNum);
      if (!assetMeta) {
        return this.error('未找到指定的资产元数据', 'asset_meta_not_found');
      }

      // 6. 获取最新的 assetMarketInfo 记录
      const assetMarketInfo =
        await assetMarketInfoService.getLatestAssetMarketInfoByAssetMetaId(assetMetaIdNum);

      if (!assetMarketInfo) {
        return this.success({
          message: '未找到指定资产的市场信息',
          assetMarketInfo: null,
        });
      }

      return this.success({
        assetMarketInfo,
      });
    } catch (error) {
      logger.error('[MarketBizController] 获取资产市场信息失败:', error);
      return this.error('获取资产市场信息失败', 'get_asset_market_info_error');
    }
  }

  @WithRequestContext()
  async getAssetMarketInfoList(query: { assetMetaId?: string; page?: string; limit?: string }) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 验证查询参数
      const validationResult = GetAssetMarketInfoListSchema.safeParse(query);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }
      const { assetMetaId, page, limit } = validationResult.data;

      // 3. 验证 assetMetaId
      if (!assetMetaId) {
        return this.error('缺少必需的 assetMetaId 参数', 'missing_asset_meta_id_error');
      }

      const assetMetaIdNum = parseInt(assetMetaId);
      if (isNaN(assetMetaIdNum) || assetMetaIdNum <= 0) {
        return this.error('assetMetaId 必须为正整数', 'invalid_asset_meta_id_error');
      }

      // 4. 验证分页参数
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      if (isNaN(pageNum) || pageNum <= 0) {
        return this.error('page 必须为正整数', 'invalid_page_error');
      }
      if (isNaN(limitNum) || limitNum <= 0) {
        return this.error('limit 必须为正整数', 'invalid_limit_error');
      }

      // 5. 计算偏移量
      const offset = (pageNum - 1) * limitNum;

      // 6. 获取资产市场信息列表
      const assetMarketInfos = await assetMarketInfoService.getAssetMarketInfosByAssetMetaId(
        assetMetaIdNum,
        limitNum,
        offset,
      );

      // 7. 获取总记录数
      const total =
        await assetMarketInfoService.getAssetMarketInfoCountByAssetMetaId(assetMetaIdNum);

      // 8. 计算总页数
      const totalPages = Math.ceil(total / limitNum);

      // 9. 返回成功响应
      return this.success({
        data: assetMarketInfos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      });
    } catch (error) {
      logger.error('[MarketBizController] 获取资产市场信息列表失败:', error);
      return this.error('获取资产市场信息列表失败', 'get_asset_market_info_list_error');
    }
  }
}