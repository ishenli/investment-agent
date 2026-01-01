import {
  MarketInformation,
  DataSource,
  CrawlRequest,
  ManualInputRequest,
  DataSourceType,
  ContentFormat,
} from '@typings/market';
import { WebCrawler } from '@server/lib/market-fetcher/web-crawler';
import { StorageService } from '@server/lib/market-fetcher/storage';
import logger from '@server/base/logger';

/**
 * 市场信息抓取服务接口
 */
export interface IMarketFetcherService {
  /**
   * 通过URL抓取市场信息
   * @param request 抓取请求
   * @returns 抓取到的市场信息
   */
  crawl(request: CrawlRequest): Promise<MarketInformation>;

  /**
   * 手动录入市场信息
   * @param request 手动录入请求
   * @returns 保存的市场信息
   */
  saveManualInput(request: ManualInputRequest): Promise<MarketInformation>;

  /**
   * 获取所有数据源
   * @returns 数据源列表
   */
  getDataSources(): Promise<DataSource[]>;

  /**
   * 根据ID获取市场信息
   * @param id 市场信息ID
   * @returns 市场信息
   */
  getMarketInformationById(id: string): Promise<MarketInformation | null>;

  /**
   * 获取市场信息列表
   * @param limit 限制数量
   * @param offset 偏移量
   * @param sourceType 数据源类型（可选）
   * @returns 市场信息列表和总数
   */
  getMarketInformationList(
    limit: number,
    offset: number,
    sourceType?: DataSourceType,
  ): Promise<{ data: MarketInformation[]; total: number }>;

  /**
   * 删除市场信息
   * @param id 市场信息ID
   * @returns 是否删除成功
   */
  deleteMarketInformation(id: string): Promise<boolean>;
}

/**
 * 市场信息抓取服务实现类
 */
export class MarketFetcherService implements IMarketFetcherService {
  private webCrawler: WebCrawler;
  private storageService: StorageService;

  constructor() {
    this.webCrawler = new WebCrawler();
    this.storageService = new StorageService();
  }

  /**
   * 通过URL抓取市场信息
   * @param request 抓取请求
   * @returns 抓取到的市场信息
   */
  async crawl(request: CrawlRequest): Promise<MarketInformation> {
    logger.info('开始抓取市场信息: %s', request.url);

    try {
      // 1. 使用网页抓取器抓取网页内容
      const htmlContent = await this.webCrawler.crawlUrl(request.url);

      // 2. 从HTML中提取文本内容
      const textContent = this.webCrawler.extractTextFromHtml(htmlContent);

      // 3. 创建市场信息对象
      let marketInfo = this.webCrawler.createMarketInformation(textContent, request.url);

      // 4. 保存市场信息到存储服务
      marketInfo = await this.storageService.saveMarketInformation(marketInfo);

      logger.info('成功抓取并保存市场信息: %s', marketInfo.id);
      return marketInfo;
    } catch (error) {
      logger.error(
        '抓取市场信息失败: %s, 错误: %s',
        request.url,
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `抓取市场信息失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 手动录入市场信息
   * @param request 手动录入请求
   * @returns 保存的市场信息
   */
  async saveManualInput(request: ManualInputRequest): Promise<MarketInformation> {
    logger.info('开始保存手动输入的市场信息');

    try {
      // 保存手动输入的市场信息
      const marketInfo = await this.storageService.saveManualInput(
        request.content,
        request.format,
        request.tags || [],
      );

      logger.info('成功保存手动输入的市场信息: %s', marketInfo.id);
      return marketInfo;
    } catch (error) {
      logger.error(
        '保存手动输入的市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `保存手动输入的市场信息失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 获取所有数据源
   * @returns 数据源列表
   */
  async getDataSources(): Promise<DataSource[]> {
    // TODO: 实现获取数据源逻辑
    throw new Error('Method not implemented.');
  }

  /**
   * 根据ID获取市场信息
   * @param id 市场信息ID
   * @returns 市场信息
   */
  async getMarketInformationById(id: string): Promise<MarketInformation | null> {
    return await this.storageService.getMarketInformationById(id);
  }

  /**
   * 获取市场信息列表
   * @param limit 限制数量
   * @param offset 偏移量
   * @param sourceType 数据源类型（可选）
   * @returns 市场信息列表和总数
   */
  async getMarketInformationList(
    limit: number,
    offset: number,
    sourceType?: DataSourceType,
  ): Promise<{ data: MarketInformation[]; total: number }> {
    return await this.storageService.getMarketInformationList(limit, offset);
  }

  /**
   * 删除市场信息
   * @param id 市场信息ID
   * @returns 是否删除成功
   */
  async deleteMarketInformation(id: string): Promise<boolean> {
    return await this.storageService.deleteMarketInformation(id);
  }
}
