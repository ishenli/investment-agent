/* eslint-disable @typescript-eslint/ban-ts-comment */
import { chatModelOpenAI, ModelNameType } from '../../provider/chatModel';
import { ChatOpenAI } from '@langchain/openai';
import { StockMarketDataUnifiedTool } from '../../tools/stock/stockGetPrice';
import { ConditionalLogic } from './conditionalLogic';
import { type AnalystType, GraphSetup } from './setup';
import { FinancialSituationMemory } from '../../memory/index';
import { stockSearchNewsTool } from '../../tools/index';
import { Propagator } from './propagation';
import { Reflector } from './reflection';
import { CompiledStateGraph } from '@langchain/langgraph';
import type { StateAnnotation } from './agentState';
import { SignalProcessor } from './signalProcessor';
import fs from 'fs-extra';
import type { DefaultConfigType } from '@shared/config/config.default';
import type { Logger } from '@server/base/logger';
import { RISK_MANAGER_NODE } from '../../agents/managers/risk_manager';
import { SSEEmitter } from '@server/base/sseEmitter';
import { StructuredTool, Tool } from 'langchain';

export type TradingGraphOptionsType = {
  logger: Logger;
  selectedAnalysts: AnalystType[];
  config: Partial<DefaultConfigType>;
};

export class TradingAgentsGraph {
  deepThinkLLM: ChatOpenAI;
  quickThinkLLM: ChatOpenAI;
  conditional_logic: ConditionalLogic;
  graph_setup: GraphSetup;
  bull_memory: FinancialSituationMemory;
  bear_memory: FinancialSituationMemory;
  invest_judge_memory: FinancialSituationMemory;
  trader_memory: FinancialSituationMemory;
  risk_manager_memory: FinancialSituationMemory;
  propagator: Propagator;
  reflector: Reflector;
  graph: CompiledStateGraph<typeof StateAnnotation, unknown, string>;
  ticker: string = '';
  signal_processor: SignalProcessor;
  curr_state: object = {};
  config: Partial<DefaultConfigType>;
  logger: Logger;
  toolNodes: any;
  constructor(options: TradingGraphOptionsType) {
    this.config = options.config;
    this.logger = options.logger;
    this.deepThinkLLM = chatModelOpenAI(this.config.deep_think_llm as unknown as ModelNameType);
    this.quickThinkLLM = chatModelOpenAI(this.config.quick_think_llm as unknown as ModelNameType);
    this.toolNodes = this.createToolNodes();
    this.conditional_logic = new ConditionalLogic();
    this.bull_memory = new FinancialSituationMemory('bull_memory', this.config);
    this.bear_memory = new FinancialSituationMemory('bear_memory', this.config);
    this.invest_judge_memory = new FinancialSituationMemory('invest_judge_memory', this.config);
    this.trader_memory = new FinancialSituationMemory('trader_memory', this.config);
    this.risk_manager_memory = new FinancialSituationMemory('risk_manager_memory', this.config);

    this.graph_setup = new GraphSetup({
      logger: this.logger,
      quick_thinking_llm: this.quickThinkLLM,
      deep_thinking_llm: this.deepThinkLLM,
      tool_nodes: this.toolNodes,
      bull_memory: this.bull_memory,
      bear_memory: this.bear_memory,
      invest_judge_memory: this.invest_judge_memory,
      trader_memory: this.trader_memory,
      risk_manager_memory: this.risk_manager_memory,
      conditional_logic: this.conditional_logic,
    });
    this.propagator = new Propagator(100);
    this.reflector = new Reflector(this.quickThinkLLM);
    this.signal_processor = new SignalProcessor(this.quickThinkLLM, this.logger);
    // @ts-expect-error
    this.graph = this.graph_setup.setupGraph(options.selectedAnalysts);
  }
  createToolNodes() {
    return {
      market: new StockMarketDataUnifiedTool(this.logger),
      news: stockSearchNewsTool,
    };
  }

  async propagate({ company_name, trade_date }: { company_name: string; trade_date: string }) {
    this.ticker = company_name;
    const init_agent_state = this.propagator.create_initial_state(company_name, trade_date);
    const args = this.propagator.get_graph_args();
    const graphArgs = {
      ...init_agent_state,
      ...args,
    };

    this.dumpGraphArgs(graphArgs);
    const final_state = await this.graph.invoke(graphArgs, {
      recursionLimit: 50,
    });

    this.curr_state = final_state;
    // @ts-expect-error
    const decision = await this.process_signal(final_state['final_trade_decision'], company_name);
    return [final_state, decision];
  }

  async propagateStream({
    company_name,
    trade_date,
    emitter,
  }: {
    company_name: string;
    trade_date: string;
    emitter: SSEEmitter;
  }) {
    this.ticker = company_name;
    const init_agent_state = this.propagator.create_initial_state(company_name, trade_date);
    const args = this.propagator.get_graph_args();
    const graphArgs = {
      ...init_agent_state,
      ...args,
    };

    this.dumpGraphArgs(graphArgs);

    let final_state: Record<string, object> = {};
    for await (const state of await this.graph.stream(graphArgs, {
      recursionLimit: 50,
    })) {
      emitter.send(state);
      final_state = state;
    }

    const risk_manager_state = final_state[RISK_MANAGER_NODE] as Record<string, object>;
    const decision = await this.process_signal(
      risk_manager_state['final_trade_decision'],
      company_name,
    );
    emitter.send({
      Trade_Decision_Maker: decision,
    });
    return [final_state, decision];
  }

  dumpGraphArgs(graphArgs: object) {
    fs.outputFile(
      `${this.config.project_dir}/run/graph_args.json`,
      JSON.stringify(graphArgs, null, 2),
    );
  }

  async process_signal(full_signal: string | object, company_name: string) {
    return await this.signal_processor.process_signal(full_signal, company_name);
  }
}
