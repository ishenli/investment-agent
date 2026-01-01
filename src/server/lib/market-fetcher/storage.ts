import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from '@server/base/logger';
import logger from '@server/base/logger';
import {
  MarketInformation,
  MarketInformationStatus,
  ContentFormat,
  DataSourceType,
} from '@typings/market';
import { getProjectRoot } from '@server/base/env';
import dayjs from 'dayjs';

/**
 * 存储服务类
 */
export class StorageService {
  private logger: Logger;
  private storagePath: string;

  constructor() {
    this.logger = logger.child({ service: 'StorageService' });
    this.storagePath = path.join(getProjectRoot(), 'data_cache', 'asset_market_info');

    // 确保存储目录存在
    this.ensureStorageDirectory();
  }

  /**
   * 确保存储目录存在
   */
  private ensureStorageDirectory(): void {
    try {
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
        this.logger.info('创建存储目录: %s', this.storagePath);
      }
    } catch (error) {
      this.logger.error(
        '创建存储目录失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `创建存储目录失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 保存市场信息
   * @param marketInfo 市场信息
   * @returns 保存后的市场信息
   */
  async saveMarketInformation(marketInfo: MarketInformation): Promise<MarketInformation> {
    try {
      this.logger.info('开始保存市场信息: %s', marketInfo.id);

      // 加密内容（如果需要）
      const contentToSave = marketInfo.encrypted
        ? this.encryptContent(marketInfo.content)
        : marketInfo.content;

      // 创建文件名
      const filename = `${marketInfo.id}.json`;
      const filePath = path.join(this.storagePath, filename);

      // 更新市场信息状态
      const updatedMarketInfo: MarketInformation = {
        ...marketInfo,
        content: contentToSave,
        status: MarketInformationStatus.PROCESSED,
        updatedAt: new Date(),
      };

      // 保存到文件
      await fs.promises.writeFile(filePath, JSON.stringify(updatedMarketInfo, null, 2));

      this.logger.info('成功保存市场信息: %s', marketInfo.id);
      return updatedMarketInfo;
    } catch (error) {
      this.logger.error(
        '保存市场信息失败: %s, 错误: %s',
        marketInfo.id,
        error instanceof Error ? error.message : String(error),
      );

      // 更新市场信息状态为失败
      const failedMarketInfo: MarketInformation = {
        ...marketInfo,
        status: MarketInformationStatus.FAILED,
        updatedAt: new Date(),
      };

      return failedMarketInfo;
    }
  }

  /**
   * 保存手动输入的市场信息
   * @param content 内容
   * @param format 内容格式
   * @param tags 标签
   * @returns 保存后的市场信息
   */
  async saveManualInput(
    content: string,
    format: ContentFormat,
    tags: string[] = [],
  ): Promise<MarketInformation> {
    try {
      this.logger.info('开始保存手动输入的市场信息');

      // 创建市场信息对象
      const marketInfo: MarketInformation = {
        id: this.generateId() + dayjs().format('YYYYMMDD'),
        content,
        source: {
          id: 'manual-input',
          type: DataSourceType.WEB, // 手动输入也归类为WEB类型
          name: 'Manual Input',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        tags,
        metadata: {
          inputType: 'manual',
          format,
          inputAt: new Date().toISOString(),
        },
        status: MarketInformationStatus.PENDING,
        encrypted: false,
        format,
      };

      // 保存市场信息
      const savedMarketInfo = await this.saveMarketInformation(marketInfo);

      this.logger.info('成功保存手动输入的市场信息: %s', savedMarketInfo.id);
      return savedMarketInfo;
    } catch (error) {
      this.logger.error(
        '保存手动输入的市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `保存手动输入的市场信息失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 根据ID获取市场信息
   * @param id 市场信息ID
   * @returns 市场信息
   */
  async getMarketInformationById(id: string): Promise<MarketInformation | null> {
    try {
      this.logger.info('开始获取市场信息: %s', id);

      const filename = `${id}.json`;
      const filePath = path.join(this.storagePath, filename);

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        this.logger.warn('市场信息文件不存在: %s', id);
        return null;
      }

      // 读取文件内容
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      const marketInfo: MarketInformation = JSON.parse(fileContent);

      // 解密内容（如果需要）
      if (marketInfo.encrypted) {
        marketInfo.content = this.decryptContent(marketInfo.content);
      }

      this.logger.info('成功获取市场信息: %s', id);
      return marketInfo;
    } catch (error) {
      this.logger.error(
        '获取市场信息失败: %s, 错误: %s',
        id,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * 获取市场信息列表
   * @param limit 限制数量
   * @param offset 偏移量
   * @returns 市场信息列表和总数
   */
  async getMarketInformationList(
    limit: number,
    offset: number,
  ): Promise<{ data: MarketInformation[]; total: number }> {
    try {
      this.logger.info('开始获取市场信息列表: limit=%d, offset=%d', limit, offset);

      // 读取目录中的所有文件
      const files = await fs.promises.readdir(this.storagePath);

      // 过滤出JSON文件
      const jsonFiles = files.filter((file) => file.endsWith('.json'));
      const total = jsonFiles.length;

      // 应用分页
      const paginatedFiles = jsonFiles.slice(offset, offset + limit);

      // 读取每个文件的内容
      const marketInfoList: MarketInformation[] = [];
      for (const file of paginatedFiles) {
        try {
          const filePath = path.join(this.storagePath, file);
          const fileContent = await fs.promises.readFile(filePath, 'utf8');
          const marketInfo: MarketInformation = JSON.parse(fileContent);

          // 解密内容（如果需要）
          if (marketInfo.encrypted) {
            marketInfo.content = this.decryptContent(marketInfo.content);
          }

          marketInfoList.push(marketInfo);
        } catch (error) {
          this.logger.warn(
            '读取市场信息文件失败: %s, 错误: %s',
            file,
            error instanceof Error ? error.message : String(error),
          );
          // 继续处理其他文件
        }
      }

      this.logger.info('成功获取市场信息列表: %d条记录', marketInfoList.length);
      return { data: marketInfoList, total };
    } catch (error) {
      this.logger.error(
        '获取市场信息列表失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      return { data: [], total: 0 };
    }
  }

  /**
   * 删除市场信息
   * @param id 市场信息ID
   * @returns 是否删除成功
   */
  async deleteMarketInformation(id: string): Promise<boolean> {
    try {
      this.logger.info('开始删除市场信息: %s', id);

      const filename = `${id}.json`;
      const filePath = path.join(this.storagePath, filename);

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        this.logger.warn('市场信息文件不存在: %s', id);
        return false;
      }

      // 删除文件
      await fs.promises.unlink(filePath);

      this.logger.info('成功删除市场信息: %s', id);
      return true;
    } catch (error) {
      this.logger.error(
        '删除市场信息失败: %s, 错误: %s',
        id,
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  /**
   * 加密内容
   * @param content 原始内容
   * @returns 加密后的内容
   */
  private encryptContent(content: string): string {
    try {
      // 使用简单的加密方法（在实际应用中应该使用更安全的方法）
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync('market-fetcher-key', 'salt', 32);
      const iv = Buffer.alloc(16, 0);

      const cipher = crypto.createCipher(algorithm, key);
      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return encrypted;
    } catch (error) {
      this.logger.error('加密内容失败: %s', error instanceof Error ? error.message : String(error));
      return content; // 返回原始内容作为后备
    }
  }

  /**
   * 解密内容
   * @param encryptedContent 加密的内容
   * @returns 解密后的内容
   */
  private decryptContent(encryptedContent: string): string {
    try {
      // 使用简单的解密方法（在实际应用中应该使用更安全的方法）
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync('market-fetcher-key', 'salt', 32);
      const iv = Buffer.alloc(16, 0);

      const decipher = crypto.createDecipher(algorithm, key);
      let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('解密内容失败: %s', error instanceof Error ? error.message : String(error));
      return encryptedContent; // 返回加密内容作为后备
    }
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
export default new StorageService();
