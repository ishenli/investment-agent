import { WithRequestContext } from '@server/base/decorators';
import assetService from '@server/service/assetService';
import positionService from '@server/service/positionService';
import logger from '@server/base/logger';
import { z } from 'zod';
import authService from '@server/service/authService';
import { BaseBizController } from './base';
import { PortfolioService } from '../service/portfolioService';
import { RiskCalculatorService } from '../service/riskCalculatorService';
import { RiskInsights } from '@/app/store/position/types';

export class PositionBizController extends BaseBizController {
  @WithRequestContext()
  async getPositions(query: any) {
    try {
      // 1. 获取当前用户ID
      const accountInfo = await authService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 获取持仓信息
      const positions = await positionService.getCurrentPositions(accountInfo.id);

      // 3. 返回成功响应
      return this.success({ positions });
    } catch (error) {
      logger.error('[PositionBizController] 获取持仓信息失败:', error);
      return this.error('获取持仓信息失败', 'get_positions_error');
    }
  }

  @WithRequestContext()
  async updatePosition(body: { id: string; quantity?: number; averageCost?: number } & any) {
    try {
      // 1. 获取当前用户ID
      // Get the authenticated user's account ID
      const accountInfo = await authService.getCurrentUserAccount();

      if (!accountInfo) {
        return this.error('用户未认证', 'unauthorized');
      }

      // 2. 参数验证
      const updatePositionSchema = z.object({
        id: z.string(),
        quantity: z.number().positive().optional(),
        averageCost: z.number().positive().optional(),
      });

      const validationResult = updatePositionSchema.safeParse(body);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }
      const validatedBody = validationResult.data;

      // 3. 调用服务层更新持仓
      const updatedPosition = await positionService.updatePosition(parseInt(validatedBody.id), {
        quantity: validatedBody.quantity,
        averagePriceCents: validatedBody.averageCost
          ? Math.round(validatedBody.averageCost * 100)
          : undefined,
      });

      // 4. 返回成功响应
      return this.success({ position: updatedPosition });
    } catch (error) {
      logger.error('[PositionBizController] 更新持仓失败:', error);
      return this.error('更新持仓失败', 'update_position_error');
    }
  }

  @WithRequestContext()
  async getPortfolio(query: any) {
    try {
      // Get the authenticated user's account ID
      const accountInfo = await authService.getCurrentUserAccount();

      if (!accountInfo) {
        return this.error('用户未认证', 'unauthorized');
      }

      // 2. 获取投资组合数据
      const portfolio = await assetService.getAssetSummary(accountInfo.id);

      // 3. 返回成功响应
      return this.success(portfolio);
    } catch (error) {
      logger.error('[PositionBizController] 获取投资组合数据失败:', error);
      return this.error('获取投资组合数据失败', 'get_portfolio_error');
    }
  }

  @WithRequestContext()
  async getRiskInsights(query: any) {
    try {
      // Get the authenticated user's account ID
      const accountInfo = await authService.getCurrentUserAccount();

      if (!accountInfo) {
        return this.error('用户未认证', 'unauthorized');
      }

      // Try to get real portfolio data
      try {
        const portfolio = await PortfolioService.calculatePortfolio(accountInfo.id);
        const positions = await PortfolioService.getPositionsWithLivePrices(
          accountInfo.id,
          portfolio,
        );
        const riskInsights: RiskInsights = await RiskCalculatorService.generateRiskInsights(
          positions,
          portfolio,
        );
        return this.success(riskInsights);
      } catch (error) {
        console.error('Error calculating risk insights:', error);
        return this.error('计算风险洞察数据失败', 'calculate_risk_insights_error');
      }
    } catch (error) {
      return this.error('获取数据失败', 'get_data_error');
    }
  }
}
