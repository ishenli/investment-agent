import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService, type ChatRequest, type GraphType } from '../chatService';

// 导入实际模块
import { SSEEmitter } from '../../base/sseEmitter';
import { investmentAdvisorAgent } from '../../core/deepagents/investmentAdvisorAgent';
import { MarketInformationGraph } from '../../core/graph/marketInformationGraph';
import { ScenarioAnalyzerGraph } from '../../core/graph/scenarioAnalyzerGraph';
import { DiversificationGraph } from '../../core/graph/diversificationGraph';
import { AIInsightsGraph } from '../../core/graph/aiInsightsGraph';
import authService from '../authService';
import portfolioAnalysisService from '../portfolioAnalysisService';
import logger from '../../base/logger';
import { chatModelOpenAI } from '../../core/provider/chatModel';

// Mock 依赖模块
vi.mock('@server/base/sseEmitter', () => ({
  SSEEmitter: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
    sendError: vi.fn(),
    sendOpenAICompatibleMessage: vi.fn(),
    close: vi.fn(),
  })),
}));

vi.mock('@server/core/deepagents/investmentAdvisorAgent', () => ({
  investmentAdvisorAgent: {
    chat: vi.fn(),
  },
}));

vi.mock('@server/core/graph/marketInformationGraph', () => ({
  MarketInformationGraph: vi.fn().mockImplementation(() => ({
    setup: vi.fn(),
    createInitialState: vi.fn(() => ({})),
    invoke: vi.fn(() => ({ marketAnalysis: '市场分析结果' })),
  })),
}));

vi.mock('@server/core/graph/scenarioAnalyzerGraph', () => ({
  ScenarioAnalyzerGraph: {
    create: vi.fn().mockResolvedValue({
      analyzeScenario: vi.fn().mockResolvedValue({ result: '场景分析结果' }),
    }),
  },
}));

vi.mock('@server/core/graph/diversificationGraph', () => ({
  DiversificationGraph: {
    create: vi.fn().mockResolvedValue({
      generateRecommendations: vi.fn().mockResolvedValue({ recommendations: '分散投资建议' }),
    }),
  },
}));

vi.mock('@server/core/graph/aiInsightsGraph', () => ({
  AIInsightsGraph: {
    create: vi.fn().mockResolvedValue({
      generateInsights: vi.fn().mockResolvedValue([{ insight: 'AI洞察结果' }]),
    }),
  },
}));

vi.mock('@server/service/authService', () => ({
  default: {
    getCurrentUserAccount: vi.fn()
  }
}));

vi.mock('@server/service/portfolioAnalysisService', () => ({
  default: {
    getPortfolioAnalysis: vi.fn(),
  },
}));

vi.mock('@server/base/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@server/core/provider/chatModel', () => ({
  chatModelOpenAI: vi.fn().mockResolvedValue({
    stream: vi.fn().mockResolvedValue([{
      content: 'LLM响应内容'
    }]),
  }),
}));


// Mock 数据
const mockAccountInfo = { id: '1', name: 'Test Account' };
const mockPortfolioAnalysis = {
  holdingsSummary: [
    {
      id: '1',
      symbol: 'AAPL',
      chineseName: '苹果公司',
      quantity: 10,
      averageCost: 150,
      currentPrice: 180,
      marketValue: 1800,
      unrealizedPnL: 300,
      positionRatio: 0.5,
    },
  ],
  portfolioMetrics: {
    totalAssetsValue: 2000,
    totalMarketValue: 1800,
  },
  cashAsset: {
    amount: 200,
  },
};

describe('ChatService', () => {
  let chatService: ChatService;
  let mockEmitter: any;

  beforeEach(() => {
    chatService = new ChatService();
    mockEmitter = new SSEEmitter();
    
    // 重置所有 mocks
    vi.clearAllMocks();
    
    // 设置默认 mock 返回值
    (authService.getCurrentUserAccount as jest.Mock).mockResolvedValue(mockAccountInfo);
    (portfolioAnalysisService.getPortfolioAnalysis as jest.Mock).mockResolvedValue(mockPortfolioAnalysis);
  });

  describe('chat', () => {
    it('应该成功处理投资顾问聊天请求', async () => {
      const request: ChatRequest = {
        query: '我想了解投资建议',
        agentId: 'investment_advisor',
        model: 'Kimi-K2-Instruct',
      };

      await chatService.chat(request, mockEmitter);

      expect(investmentAdvisorAgent.chat).toHaveBeenCalledWith({
        userQuery: '我想了解投资建议',
        accountId: '1',
        emitter: mockEmitter,
        model: 'Kimi-K2-Instruct',
      });
      expect(logger.info).toHaveBeenCalledWith(
        '[ChatService] 开始处理聊天请求: 我想了解投资建议, Graph类型: investment_advisor'
      );
    });

    it('应该成功处理市场信息聊天请求', async () => {
      const request: ChatRequest = {
        query: '分析当前市场状况',
        agentId: 'market_information',
        model: 'Kimi-K2-Instruct',
      };

      await chatService.chat(request, mockEmitter);

      expect(MarketInformationGraph).toHaveBeenCalledWith({
        logger: expect.any(Object),
        modelCode: 'Kimi-K2-Instruct',
      });
      expect(mockEmitter.sendOpenAICompatibleMessage).toHaveBeenCalledWith({
        id: 'market_info_result',
        type: 'text',
        content: '市场分析结果',
      });
    });

    it('应该成功处理场景分析聊天请求', async () => {
      const request: ChatRequest = {
        query: '如果买入更多AAPL会怎样',
        agentId: 'scenario_analyzer',
        model: 'Kimi-K2-Instruct',
        extraParams: {
          scenario: {
            asset: 'AAPL',
            action: 'buy',
            quantity: 5,
            price: 180,
          },
        },
      };

      await chatService.chat(request, mockEmitter);

      expect(ScenarioAnalyzerGraph.create).toHaveBeenCalled();
      expect(mockEmitter.send).toHaveBeenCalledWith({
        type: 'scenario_analysis_result',
        data: { result: '场景分析结果' },
      });
    });

    it('应该在场景参数缺失时报错', async () => {
      const request: ChatRequest = {
        query: '分析场景',
        agentId: 'scenario_analyzer',
        model: 'Kimi-K2-Instruct',
        extraParams: {}, // 缺少 scenario 参数
      };

      // 由于错误是在 handleScenarioAnalyzerChat 中抛出的，我们需要直接测试那个方法
      // 或者修改测试策略来捕获这个特定的错误
      const chatPromise = chatService.chat(request, mockEmitter);
      
      // 由于 chat 方法会捕获所有错误并发送给 emitter，所以我们验证错误处理行为
      await chatPromise;
      
      // 验证错误被正确发送
      expect(mockEmitter.sendError).toHaveBeenCalled();
    });

    it('应该成功处理分散投资聊天请求', async () => {
      const request: ChatRequest = {
        query: '如何优化我的投资组合',
        agentId: 'diversification',
        model: 'Kimi-K2-Instruct',
      };

      await chatService.chat(request, mockEmitter);

      expect(DiversificationGraph.create).toHaveBeenCalled();
      expect(mockEmitter.send).toHaveBeenCalledWith({
        type: 'diversification_result',
        data: { recommendations: '分散投资建议' },
      });
    });

    it('应该成功处理AI洞察聊天请求', async () => {
      const request: ChatRequest = {
        query: '给我一些投资洞察',
        agentId: 'ai_insights',
        model: 'Kimi-K2-Instruct',
      };

      await chatService.chat(request, mockEmitter);

      expect(AIInsightsGraph.create).toHaveBeenCalled();
      expect(mockEmitter.send).toHaveBeenCalledWith({
        type: 'ai_insights_result',
        data: [{ insight: 'AI洞察结果' }],
      });
    });

    it('应该成功处理默认聊天请求', async () => {
      const request: ChatRequest = {
        query: '你好',
        agentId: 'default',
        model: 'Qwen3-Next-80B-A3B-Instruct',
      };

      await chatService.chat(request, mockEmitter);

      expect(chatModelOpenAI).toHaveBeenCalledWith('Qwen3-Next-80B-A3B-Instruct');
      expect(mockEmitter.sendOpenAICompatibleMessage).toHaveBeenCalledWith({
        id: 'default_llm_result',
        type: 'text',
        content: 'LLM响应内容',
      });
    });

    it('应该在账户信息获取失败时报错', async () => {
      (authService.getCurrentUserAccount as jest.Mock).mockResolvedValue(null);
      
      const request: ChatRequest = {
        query: '测试',
        agentId: 'default',
        model: 'Kimi-K2-Instruct',
      };

      const chatPromise = chatService.chat(request, mockEmitter);
      await chatPromise;
      
      // 验证错误被正确发送
      expect(mockEmitter.sendError).toHaveBeenCalledWith('获取账户信息失败');
    });

    it('应该在发生错误时发送错误信息并关闭连接', async () => {
      (investmentAdvisorAgent.chat as jest.Mock).mockRejectedValue(new Error('测试错误'));
      
      const request: ChatRequest = {
        query: '测试',
        agentId: 'investment_advisor',
        model: 'Kimi-K2-Instruct',
      };

      await chatService.chat(request, mockEmitter);

      expect(mockEmitter.sendError).toHaveBeenCalledWith('测试错误');
      expect(mockEmitter.close).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('私有方法测试', () => {
    // 由于这些是私有方法，我们可以通过主方法间接测试它们的行为
    it('handleInvestmentAdvisorChat 应该正确调用 DeepAgents', async () => {
      const request: ChatRequest = {
        query: '投资建议',
        agentId: 'investment_advisor',
        model: 'Kimi-K2-Instruct',
      };

      await chatService.chat(request, mockEmitter);
      
      expect(logger.info).toHaveBeenCalledWith('[ChatService] 使用 DeepAgents 处理投资顾问聊天');
    });

    it('handleDefaultChat 应该正确处理默认聊天', async () => {
      const request: ChatRequest = {
        query: '默认聊天',
        agentId: 'default',
        model: 'Qwen3-Next-80B-A3B-Instruct',
      };

      await chatService.chat(request, mockEmitter);
      
      // 验证日志被调用（使用更宽松的匹配）
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('处理默认聊天请求'),
        expect.any(String)
      );
    });
  });
});