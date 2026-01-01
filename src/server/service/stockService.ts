import { TradingAgentsGraph } from '../core/graph/tradeDecision/tradingGraph';
import {
  StockAnalysisRequestSchema,
  StockAnalysisRequestType,
  type StockAnalysisResult,
} from '@/types';
import { validateWithFormat } from '@/shared';
import fs from 'fs-extra';
import { defaultConfig, DefaultConfigType } from '@shared/config/config.default';
import logger, { Logger } from '../base/logger';
import { prepareStockData } from '../core/utils/stockUtils/validator';
import { AnalystType } from '../core/graph/tradeDecision/setup';
import { SSEEmitter } from '../base/sseEmitter';

export class StockService {
  logger: Logger;
  config: DefaultConfigType;
  constructor() {
    this.logger = logger;
    this.config = defaultConfig;
  }

  /**
   * 获取股票分析结果
   * @param options
   * @returns
   */
  async analysis({
    options,
    sessionId,
    emitter,
  }: {
    options: StockAnalysisRequestType;
    sessionId: string;
    emitter: SSEEmitter;
  }): Promise<StockAnalysisResult> {
    // 验证参数
    const validationResult = validateWithFormat(StockAnalysisRequestSchema, options);

    if (!validationResult.success) {
      this.logger.error(`参数验证失败: ${validationResult.errors.join(', ')}`);
      return {
        success: false,
        error: `参数验证失败: ${validationResult.errors.join(', ')}`,
        suggestion: '请检查请求参数是否符合要求',
        stock_symbol: '',
        analysis_date: '',
        analysts: [],
        state: null,
        decision: null,
        sessionId,
      };
    }

    const validatedOptions = validationResult.data;

    const preparation_result = await prepareStockData(
      validatedOptions.stockSymbol,
      validatedOptions.marketType,
      30,
      validatedOptions.analysisDate,
      this.logger,
    );

    if (!preparation_result.is_valid) {
      this.logger.error(`股票数据验证失败:${preparation_result.error_message}`);
      return {
        success: false,
        error: preparation_result.error_message,
        suggestion: preparation_result.suggestion,
        stock_symbol: validatedOptions.stockSymbol,
        analysis_date: validatedOptions.analysisDate,
        analysts: validatedOptions.analysts,
        state: null,
        decision: null,
        sessionId,
      };
    }

    this.logger.info(
      `股票数据验证成功:${preparation_result.stock_code} (${preparation_result.market_type}) - ${preparation_result.stock_name}`,
    );

    const graph = new TradingAgentsGraph({
      logger: this.logger,
      selectedAnalysts: validatedOptions.analysts as AnalystType[],
      config: {
        ...this.config,
        deep_think_llm: 'Kimi-K2-Instruct',
        quick_think_llm: 'Qwen3-Next-80B-A3B-Instruct',
      },
    });

    const [state, decision] = await graph.propagateStream({
      company_name: preparation_result.stock_code,
      trade_date: validatedOptions.analysisDate,
      emitter: emitter,
    });

    this.logger.info(`🔍decision内容: ${JSON.stringify(decision)}`);

    const results = {
      stock_symbol: validatedOptions.stockSymbol,
      analysis_date: validatedOptions.analysisDate,
      analysts: validatedOptions.analysts,
      state: state,
      decision: decision,
      success: true,
      error: null,
      sessionId,
    };

    fs.outputFile(
      `${this.config.project_dir}/report/${validatedOptions.stockSymbol}/${sessionId}.json`,
      JSON.stringify(results),
    );

    return results;
  }
}
const stockService = new StockService();

export default stockService;
