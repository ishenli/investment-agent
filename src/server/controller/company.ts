import { WithRequestContext } from '@server/base/decorators';
import { BaseBizController } from './base';
import { AssetCompanyInfoService } from '@server/service/assetCompanyInfoService';
import { AssetMetaService } from '@server/service/assetMetaService';
import { z } from 'zod';
import logger from '@server/base/logger';
import { AuthService } from '@server/service/authService';

const ListCompanyInfoRequestSchema = z.object({
  assetMetaId: z.string().transform((val) => parseInt(val, 10)),
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 20),
});

const SaveCompanyInfoRequestSchema = z.object({
  id: z.number().optional(),
  assetMetaId: z.number(),
  title: z.string().min(1, "标题不能为空"),
  content: z.string().min(1, "内容不能为空"),
});

const DeleteCompanyInfoRequestSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10)),
});

export class CompanyBizController extends BaseBizController {
  private static assetCompanyInfoService = new AssetCompanyInfoService();
  private static assetMetaService = new AssetMetaService();

  @WithRequestContext()
  async getCompanyInfoList(query: { assetMetaId?: string; page?: string; limit?: string }) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 验证查询参数
      const validationResult = ListCompanyInfoRequestSchema.safeParse(query);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      // 3. 解析参数
      const { assetMetaId, page, limit } = validationResult.data;
      const offset = (page - 1) * limit;

      logger.info(
        '[CompanyBizController] Listing company info for assetMetaId: %d, page: %d, limit: %d',
        assetMetaId,
        page,
        limit,
      );

      // 4. 获取公司信息列表
      const companyInfos = await CompanyBizController.assetCompanyInfoService.getAssetCompanyInfosByAssetMetaId(
        assetMetaId,
        limit,
        offset,
      );

      // 5. 获取总记录数
      const total = await CompanyBizController.assetCompanyInfoService.getAssetCompanyInfoCountByAssetMetaId(assetMetaId);

      // 6. 计算总页数
      const totalPages = Math.ceil(total / limit);

      // 7. 返回成功响应
      return this.success({
        data: companyInfos,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        }
      });

    } catch (error) {
      logger.error(
        '[CompanyBizController] Failed to list company info: %s',
        error instanceof Error ? error.message : String(error),
      );
      return this.error('Failed to list company info', 'list_company_info_error');
    }
  }

  @WithRequestContext()
  async saveCompanyInfo(body: { id?: number; assetMetaId: number; title: string; content: string }) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 验证请求体
      const validationResult = SaveCompanyInfoRequestSchema.safeParse(body);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const saveRequest = validationResult.data;

      // 3. 查找 assetMeta 以验证其存在
      const assetMeta = await CompanyBizController.assetMetaService.getAssetMetaById(saveRequest.assetMetaId);
      
      if (!assetMeta) {
        return this.error('AssetMeta not found', 'asset_meta_not_found');
      }

      // 4. 保存公司信息
      let assetCompanyInfo;
      if ('id' in saveRequest && typeof saveRequest.id === 'number') {
        // 更新现有记录
        assetCompanyInfo = await CompanyBizController.assetCompanyInfoService.updateAssetCompanyInfo({
          id: saveRequest.id,
          title: saveRequest.title,
          content: saveRequest.content,
        });
      } else {
        // 创建新记录
        assetCompanyInfo = await CompanyBizController.assetCompanyInfoService.createAssetCompanyInfo({
          assetMetaId: assetMeta.id,
          title: saveRequest.title,
          content: saveRequest.content,
        });
      }

      // 5. 返回成功响应
      return this.success({
        message: 'Successfully saved company info',
        data: assetCompanyInfo,
      });
    } catch (error) {
      logger.error(
        '[CompanyBizController] Failed to save company info: %s',
        error instanceof Error ? error.message : String(error),
      );
      return this.error('Failed to save company info', 'save_company_info_error');
    }
  }

  @WithRequestContext()
  async deleteCompanyInfo(query: { id: string }) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 验证查询参数
      const validationResult = DeleteCompanyInfoRequestSchema.safeParse(query);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const { id } = validationResult.data;

      logger.info('[CompanyBizController] Received delete company info request for id: %d', id);

      const success = await CompanyBizController.assetCompanyInfoService.deleteAssetCompanyInfoById(id);

      if (!success) {
        return this.error('Failed to delete company info or not found', 'delete_failed');
      }

      // 3. 返回成功响应
      return this.success({
        message: 'Successfully deleted company info',
      });
    } catch (error) {
      logger.error(
        '[CompanyBizController] Failed to delete company info: %s',
        error instanceof Error ? error.message : String(error),
      );
      return this.error('Failed to delete company info', 'delete_company_info_error');
    }
  }
}