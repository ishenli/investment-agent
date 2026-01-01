import { WithRequestContext } from '@server/base/decorators';
import assetService from '@server/service/assetService';
import positionService from '@server/service/positionService';
import logger from '@server/base/logger';
import { z } from 'zod';
import { AuthService } from '@server/service/authService';
import { BaseBizController } from './base';
import { AIInsightsService } from '../service/aiInsightsService';
import { PortfolioService } from '../service/portfolioService';
import { RiskCalculatorService } from '../service/riskCalculatorService';
import { RiskInsights } from '@/app/store/position/types';

export class PositionBizController extends BaseBizController {
  @WithRequestContext()
  async getPositions(query: any) {
    try {
      // 1. 获取当前用户ID
      const accountInfo = await AuthService.getCurrentUserAccount();
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
      const accountInfo = await AuthService.getCurrentUserAccount();

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
  async getAIInsights(query: any) {
    try {
      // 1. 获取当前用户ID
      const accountInfo = await AuthService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'unauthorized');
      }

      const accountId = accountInfo.id;

      // 2. 获取投资组合和持仓数据
      const portfolio = await PortfolioService.calculatePortfolio(accountId);
      const positions = await PortfolioService.getPositions(accountId, portfolio.totalValue);

      const insights = await AIInsightsService.generateAIInsights(positions, portfolio);

      // 4. 返回成功响应
      return this.success({
        insights: insights,
        generatedAt: new Date().toISOString(),
        modelVersion: 'v1.0',
      });
    } catch (error) {
      logger.error('[PositionBizController] 获取AI洞察失败:', error);
      return this.error('获取AI洞察失败', 'get_ai_insights_error');
    }
  }

  @WithRequestContext()
  async generateAIInsights(body: any) {
    try {
      // 1. 获取当前用户ID
      const accountInfo = await AuthService.getCurrentUserAccount();

      if (!accountInfo) {
        return this.error('用户未认证', 'unauthorized');
      }

      // 2. 获取请求参数
      const { positions, portfolio, marketContext } = body;

      if (!positions || !portfolio) {
        return this.error('缺少必要参数', 'missing_parameters');
      }

      // 3. 生成AI洞察
      // 注意：这里需要根据实际的AIInsightsService实现来调整
      // 暂时返回模拟数据
      const mockInsights = {
        recommendations: ['根据您提供的数据，建议关注市场趋势', '考虑根据风险偏好调整投资组合'],
        riskAssessment: '基于输入数据的风险评估',
        opportunities: ['基于输入数据识别的投资机会'],
      };

      // 4. 返回成功响应
      return this.success({
        insights: mockInsights,
        generatedAt: new Date().toISOString(),
        modelVersion: 'v1.0',
      });
    } catch (error) {
      logger.error('[PositionBizController] 生成AI洞察失败:', error);
      return this.error('生成AI洞察失败', 'generate_ai_insights_error');
    }
  }

  @WithRequestContext()
  async getPortfolio(query: any) {
    try {
      // Get the authenticated user's account ID
      const accountInfo = await AuthService.getCurrentUserAccount();

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
  async getDiversificationRecommendations(query: any) {
        try {
      // Get the authenticated user's account ID
      const accountId = await AuthService.getCurrentUserId();

      if (!accountId) {
        return this.error('用户未认证', 'unauthorized');
      }

      try {
        // Get portfolio and positions data
        const portfolio = await PortfolioService.calculatePortfolio(accountId);
        const positions = await PortfolioService.getPositions(accountId, portfolio.totalValue);

        // Generate diversification recommendations
        const recommendations = await AIInsightsService.generateDiversificationRecommendations(
          positions,
          portfolio,
        );

        return this.success({
          recommendations,
          generatedAt: new Date().toISOString(),
          modelVersion: 'v1.0',
        });
      } catch (error) {
        logger.error('Error generating diversification recommendations:', error);

        // Return fallback recommendations as fallback
        const fallbackRecommendations =
          await AIInsightsService.generateDiversificationRecommendations([], {
            totalValue: 0,
            cashValue: 0,
          } as any);
        return this.success({
          recommendations: fallbackRecommendations,
          generatedAt: new Date().toISOString(),
          modelVersion: 'fallback-v1.0',
          fallback: true,
        });
      }
    } catch (error) {
      logger.error('Error in diversification recommendations API:', error);
      return this.error('获取分散投资建议失败', 'get_diversification_recommendations_error');
    }
  }

  @WithRequestContext()
  async generateDiversificationRecommendations(body: any) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 获取请求参数
      const { positions, portfolio } = body;

      if (!positions || !portfolio) {
        return this.error('缺少必要参数', 'missing_parameters');
      }

      // 3. 生成分散投资建议
      // 注意：这里需要根据实际的AIInsightsService实现来调整
      // 暂时返回模拟数据
      const mockRecommendations = {
        diversification: ['根据您提供的数据，建议关注资产配置', '考虑根据投资目标调整分散策略'],
        allocation: {
          stocks: '基于输入数据的建议',
          bonds: '基于输入数据的建议',
          cash: '基于输入数据的建议',
        },
      };

      // 4. 返回成功响应
      return this.success({
        recommendations: mockRecommendations,
        generatedAt: new Date().toISOString(),
        modelVersion: 'v1.0',
      });
    } catch (error) {
      logger.error('[PositionBizController] 生成分散投资建议失败:', error);
      return this.error('生成分散投资建议失败', 'generate_diversification_recommendations_error');
    }
  }

  @WithRequestContext()
  async getRiskInsights(query: any) {
        try {
      // Get the authenticated user's account ID
      const accountInfo = await AuthService.getCurrentUserAccount();

      if (!accountInfo) {
        return this.error('用户未认证', 'unauthorized');
      }

      // Try to get real portfolio data
      try {
        const portfolio = await PortfolioService.calculatePortfolio(accountInfo.id);
        const positions = await PortfolioService.getPositionsWithLivePrices(accountInfo.id, portfolio);
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

  @WithRequestContext()
  async analyzeScenario(body: any) {
    try {
            // Get the authenticated user's account ID
      const accountInfo = await AuthService.getCurrentUserAccount();

      if (!accountInfo) {
        return this.error('用户未认证', 'unauthorized');
      }

      // 2. 获取请求参数
      const { scenario } = body;

      if (!scenario) {
        return this.error('缺少必要参数', 'missing_parameters');
      }

      // 3. 获取投资组合和持仓数据
      const portfolio = await assetService.getAssetSummary(accountInfo.id);
      const positions = await positionService.getCurrentPositions(accountInfo.id);

      // 4. 分析场景
      // 注意：这里需要根据实际的AIInsightsService实现来调整
      // 暂时返回模拟数据
      const mockAnalysisResults = {
        impact: '基于场景的潜在影响分析',
        recommendations: ['根据场景分析的建议', '风险缓解策略'],
        expectedReturns: '预期收益变化',
      };

      // 5. 返回成功响应
      return this.success({
        results: mockAnalysisResults,
        generatedAt: new Date().toISOString(),
        modelVersion: 'v1.0',
      });
    } catch (error) {
      logger.error('[PositionBizController] 场景分析失败:', error);
      return this.error('场景分析失败', 'analyze_scenario_error');
    }
  }

  @WithRequestContext()
  async getStrategyAdvice(query: any) {
    try {
            // Get the authenticated user's account ID
      const accountInfo = await AuthService.getCurrentUserAccount();

      if (!accountInfo) {
        return this.error('账户未认证', 'unauthorized');
      }

      try {
        // Get portfolio and positions data
        const portfolio = await PortfolioService.calculatePortfolio(accountInfo.id);
        const positions = await PortfolioService.getPositions(accountInfo.id, portfolio.totalValue);

        // Generate strategy advice
        const advice = await AIInsightsService.generateStrategyAdvice(positions, portfolio);

        return this.success({
          advice,
          generatedAt: new Date().toISOString(),
          modelVersion: 'v1.0',
        });
      } catch (error) {
        logger.error('Error generating strategy advice:', error);

        // Return fallback advice as fallback
        const fallbackAdvice = await AIInsightsService.generateStrategyAdvice([], {
          totalValue: 0,
          cashValue: 0,
        } as any);
        return this.success({
          advice: fallbackAdvice,
          generatedAt: new Date().toISOString(),
          modelVersion: 'fallback-v1.0',
          fallback: true,
        });
      }
    } catch (error) {
      logger.error('Error in strategy advice API:', error);
      return this.error('获取策略建议失败', 'get_strategy_advice_error');
    }
  }

  @WithRequestContext()
  async generateStrategyAdvice(body: any) {
    try {
      // Get the authenticated user's account ID
      const accountInfo = await AuthService.getCurrentUserAccount();

      if (!accountInfo) {
        return this.error('账户未认证', 'unauthorized');
      }
      // 2. 获取请求参数
      const { positions, portfolio } = body;

      if (!positions || !portfolio) {
        return this.error('缺少必要参数', 'missing_parameters');
      }

      // 3. 生成策略建议
      // 注意：这里需要根据实际的AIInsightsService实现来调整
      // 暂时返回模拟数据
      const mockAdvice = {
        investmentStrategy: '基于输入数据的投资策略',
        rebalancing: '基于输入数据的再平衡建议',
        timing: '基于输入数据的时机建议',
      };

      // 4. 返回成功响应
      return this.success({
        advice: mockAdvice,
        generatedAt: new Date().toISOString(),
        modelVersion: 'v1.0',
      });
    } catch (error) {
      logger.error('[PositionBizController] 生成策略建议失败:', error);
      return this.error('生成策略建议失败', 'generate_strategy_advice_error');
    }
  }
}
