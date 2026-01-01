import { WithRequestContext } from '@server/base/decorators';
import { BaseBizController } from './base';
import logger from '@server/base/logger';
import { z } from 'zod';
import assetMetaService from '@server/service/assetMetaService';
import { AuthService } from '@server/service/authService';

export class AssetMetaBizController extends BaseBizController {
  @WithRequestContext()
  async getAllAssetMetas(query: { symbol?: string; id?: string }) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 处理查询参数
      let result;
      if (query.id) {
        const idNum = parseInt(query.id);
        if (isNaN(idNum) || idNum <= 0) {
          return this.error('ID 必须为正整数', 'invalid_id_error');
        }
        const assetMeta = await assetMetaService.getAssetMetaById(idNum);
        if (!assetMeta) {
          return this.error('未找到指定的资产元数据', 'asset_meta_not_found');
        }
        return this.success(assetMeta);
      } else if (query.symbol) {
        // 如果提供了 symbol 参数，搜索匹配的记录
        result = await assetMetaService.searchAssetMetasBySymbol(query.symbol);
      } else {
        // 否则获取所有记录
        result = await assetMetaService.getAllAssetMetas();
      }

      // 3. 返回成功响应
      return this.success(result);
    } catch (error) {
      logger.error('[AssetMetaBizController] 获取资产元数据失败:', error);
      return this.error('获取资产元数据失败', 'get_asset_meta_error');
    }
  }

  @WithRequestContext()
  async createAssetMeta(body: {
    symbol: string;
    priceCents: number;
    assetType: 'stock' | 'etf' | 'fund' | 'crypto';
    currency: string;
    timestamp?: string;
    source: string;
    market: 'CN' | 'US' | 'HK';
    chineseName: string | null;
    investmentMemo: string | null;
  }) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 定义 assetMeta 数据的 Zod 验证模式
      const AssetMetaSchema = z.object({
        symbol: z.string().min(1, '股票代码不能为空'),
        priceCents: z.number().int().positive('价格必须为正整数'),
        assetType: z.enum(['stock', 'etf', 'fund', 'crypto']),
        currency: z.string().min(1, '货币不能为空'),
        timestamp: z.string().datetime().optional(),
        source: z.string().min(1, '数据来源不能为空'),
        market: z.enum(['CN', 'US', 'HK']),
        chineseName: z.string().nullable(),
        investmentMemo: z.string().nullable(),
      });

      // 3. 参数验证
      const param = AssetMetaSchema.safeParse(body);
      if (!param.success) {
        return this.responseValidateError(param.error);
      }
      const data = param.data;

      // 4. 创建新的 assetMeta 记录
      const newAssetMeta = await assetMetaService.createAssetMeta({
        symbol: data.symbol,
        priceCents: data.priceCents,
        assetType: data.assetType,
        currency: data.currency,
        source: data.source,
        market: data.market,
        chineseName: data.chineseName,
        investmentMemo: data.investmentMemo,
        updatedAt: new Date(),
      });

      // 5. 返回成功响应
      return this.success(newAssetMeta);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }

      logger.error('[AssetMetaBizController] 创建资产元数据失败:', error);
      return this.error('创建资产元数据失败', 'create_asset_meta_error');
    }
  }

  @WithRequestContext()
  async updateAssetMeta(body: {
    id: number;
    symbol?: string;
    priceCents?: number;
    assetType?: 'stock' | 'etf' | 'fund' | 'crypto';
    currency?: string;
    timestamp?: string;
    source?: string;
    market?: 'CN' | 'US' | 'HK';
    chineseName?: string | null;
    investmentMemo?: string | null;
  }) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 定义 assetMeta 更新数据的 Zod 验证模式
      const AssetMetaUpdateSchema = z.object({
        id: z.number().int().positive('ID 必须为正整数'),
        symbol: z.string().min(1, '股票代码不能为空').optional(),
        priceCents: z.number().int().positive('价格必须为正整数').optional(),
        assetType: z.enum(['stock', 'etf', 'fund', 'crypto']).optional(),
        currency: z.string().min(1, '货币不能为空').optional(),
        timestamp: z.string().datetime().optional(),
        source: z.string().min(1, '数据来源不能为空').optional(),
        market: z.enum(['CN', 'US', 'HK']).optional(),
        chineseName: z.string().nullable().optional(),
        investmentMemo: z.string().nullable().optional(),
      });

      // 3. 参数验证
      const param = AssetMetaUpdateSchema.safeParse(body);
      if (!param.success) {
        return this.responseValidateError(param.error);
      }
      const data = param.data;

      if (!data.id) {
        return this.error('缺少必需的 ID 字段', 'missing_id_error');
      }

      // 4. 更新 assetMeta 记录
      const updatedAssetMeta = await assetMetaService.updateAssetMeta(data.id, {
        symbol: data.symbol,
        priceCents: data.priceCents,
        assetType: data.assetType,
        currency: data.currency,
        createdAt: data.timestamp ? new Date(data.timestamp) : undefined,
        source: data.source,
        market: data.market,
        chineseName: data.chineseName,
        investmentMemo: data.investmentMemo,
      });

      if (!updatedAssetMeta) {
        return this.error('未找到指定的资产元数据', 'asset_meta_not_found');
      }

      // 5. 返回成功响应
      return this.success(updatedAssetMeta);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }

      logger.error('[AssetMetaBizController] 更新资产元数据失败:', error);
      return this.error('更新资产元数据失败', 'update_asset_meta_error');
    }
  }

  @WithRequestContext()
  async deleteAssetMeta(query: { id: string }) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 验证查询参数
      if (!query.id) {
        return this.error('缺少必需的 ID 参数', 'missing_id_error');
      }

      const idNum = parseInt(query.id);
      if (isNaN(idNum) || idNum <= 0) {
        return this.error('ID 必须为正整数', 'invalid_id_error');
      }

      // 3. 删除 assetMeta 记录
      const deleted = await assetMetaService.deleteAssetMeta(idNum);

      if (!deleted) {
        return this.error('未找到指定的资产元数据', 'asset_meta_not_found');
      }

      // 4. 返回成功响应
      return this.success({ message: '资产元数据删除成功' });
    } catch (error) {
      logger.error('[AssetMetaBizController] 删除资产元数据失败:', error);
      return this.error('删除资产元数据失败', 'delete_asset_meta_error');
    }
  }
}