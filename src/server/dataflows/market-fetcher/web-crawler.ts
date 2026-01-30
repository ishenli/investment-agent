import axios from 'axios';
import * as cheerio from 'cheerio';
import { Logger } from '@server/base/logger';
import logger from '@server/base/logger';
import {
  MarketInformation,
  DataSourceReference,
  DataSourceType,
  MarketInformationStatus,
} from '@typings/market';

/**
 * 网页抓取器类
 */
export class WebCrawler {
  private logger: Logger;

  constructor() {
    this.logger = logger.child({ service: 'WebCrawler' });
  }

  /**
   * 从URL抓取网页内容
   * @param url 要抓取的URL
   * @returns 抓取到的HTML内容
   */
  async crawlUrl(url: string): Promise<string> {
    try {
      this.logger.info('开始抓取URL: %s', url);

      // 验证URL格式
      if (!this.isValidUrl(url)) {
        throw new Error('无效的URL格式');
      }

      // 发送HTTP请求获取网页内容
      const response = await axios.get(url, {
        timeout: 10000, // 10秒超时
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      this.logger.info('成功抓取URL: %s, 状态码: %d', url, response.status);
      return response.data;
    } catch (error) {
      this.logger.error(
        '抓取URL失败: %s, 错误: %s',
        url,
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(`抓取URL失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从HTML内容中提取文本
   * @param html HTML内容
   * @returns 提取的文本内容
   */
  extractTextFromHtml(html: string): string {
    try {
      const $ = cheerio.load(html);

      // 移除script和style标签
      $('script, style').remove();

      // 提取文本内容
      const text = $('body').text();

      // 清理文本（移除多余的空白字符）
      return text.replace(/\s+/g, ' ').trim();
    } catch (error) {
      this.logger.error(
        '提取HTML文本失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `提取HTML文本失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 验证URL格式
   * @param url URL字符串
   * @returns 是否为有效的URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 创建市场信息对象
   * @param content 内容
   * @param url URL
   * @returns 市场信息对象
   */
  createMarketInformation(content: string, url: string): MarketInformation {
    const dataSource: DataSourceReference = {
      id: 'web-crawler',
      type: DataSourceType.WEB,
      name: 'Web Crawler',
    };

    return {
      id: this.generateId(),
      content,
      source: dataSource,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      metadata: {
        url,
        crawledAt: new Date().toISOString(),
      },
      status: MarketInformationStatus.PENDING,
      encrypted: false,
    };
  }

  /**
   * 生成唯一ID
   * @returns 唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// 导出默认实例
export default new WebCrawler();
