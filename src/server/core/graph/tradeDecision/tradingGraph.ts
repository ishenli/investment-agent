/* eslint-disable @typescript-eslint/ban-ts-comment */
import { chatModelOpenAI } from '../../provider/chatModel';
import { ChatOpenAI } from '@langchain/openai';
import { ConditionalLogic } from './conditionalLogic';
import { type AnalystType, GraphSetup } from './setup';
import { FinancialSituationMemory } from '../../memory/index';
import { stockGetPriceTool, stockSearchNewsTool } from '../../tools/index';
import { Propagator } from './propagation';
import { Reflector } from './reflection';
import { CompiledStateGraph } from '@langchain/langgraph';
import type { StateAnnotation } from './agentState';
import { SignalProcessor } from './signalProcessor';
import fs from 'fs-extra';
import type { Logger } from '@server/base/logger';
import { RISK_MANAGER_NODE } from '../../agents/managers/risk_manager';
import { SSEEmitter } from '@server/base/sseEmitter';

export type TradingGraphOptionsType = {
  logger: Logger;
  selectedAnalysts: AnalystType[];
  projectDir: string;
};

export class TradingAgentsGraph {
  deepThinkLLM!: ChatOpenAI;
  quickThinkLLM!: ChatOpenAI;
  conditional_logic: ConditionalLogic;
  graph_setup!: GraphSetup;
  bull_memory: FinancialSituationMemory;
  bear_memory: FinancialSituationMemory;
  invest_judge_memory: FinancialSituationMemory;
  trader_memory: FinancialSituationMemory;
  risk_manager_memory: FinancialSituationMemory;
  propagator!: Propagator;
  reflector!: Reflector;
  graph!: CompiledStateGraph<typeof StateAnnotation, unknown, string>;
  ticker: string = '';
  signal_processor!: SignalProcessor;
  curr_state: object = {};
  projectDir: string;
  logger: Logger;
  toolNodes: any;
  selectedAnalysts: AnalystType[];

  private constructor(options: TradingGraphOptionsType) {
    this.projectDir = options.projectDir;
    this.logger = options.logger;
    this.selectedAnalysts = options.selectedAnalysts;

    // Initialize synchronous properties
    this.conditional_logic = new ConditionalLogic();
    this.bull_memory = new FinancialSituationMemory('bull_memory');
    this.bear_memory = new FinancialSituationMemory('bear_memory');
    this.invest_judge_memory = new FinancialSituationMemory('invest_judge_memory');
    this.trader_memory = new FinancialSituationMemory('trader_memory');
    this.risk_manager_memory = new FinancialSituationMemory('risk_manager_memory');
  }

  /**
   * Factory method to create and initialize TradingAgentsGraph asynchronously
   * This handles the async initialization of LLM models that can't be done in constructor
   */
  static async create(options: TradingGraphOptionsType): Promise<TradingAgentsGraph> {
    const instance = new TradingAgentsGraph(options);
    await instance.initialize();
    return instance;
  }

  /**
   * Async initialization - sets up LLMs and graph components
   */
  private async initialize(): Promise<void> {
    this.deepThinkLLM = await chatModelOpenAI();
    this.quickThinkLLM = await chatModelOpenAI();
    this.toolNodes = this.createToolNodes();

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
    this.graph = this.graph_setup.setupGraph(this.selectedAnalysts);
  }
  createToolNodes() {
    return {
      market: stockGetPriceTool,
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

    let nodeIndex = 0;
    let final_state: Record<string, object> = {};
    for await (const state of await this.graph.stream(graphArgs, {
      recursionLimit: 50,
    })) {
      // AgentStreamEvent: status - 反映节点推进进度
      const nodeNames = Object.keys(state);
      const nodeName = nodeNames[0] ?? `step_${nodeIndex}`;
      emitter.sendStatus(`执行节点: ${nodeName}`, { step: nodeName });
      final_state = state;
      nodeIndex++;
    }
    
    const risk_manager_state = final_state[RISK_MANAGER_NODE] as Record<string, object>;
    const decision = await this.process_signal(
      risk_manager_state['final_trade_decision'],
      company_name,
    );
    // AgentStreamEvent: result - 最终交易决策
    emitter.sendResult(company_name, { decision, state: final_state });
    emitter.sendDone();
    return [final_state, decision];
  }

  dumpGraphArgs(graphArgs: object) {
    fs.outputFile(
      `${this.projectDir}/run/graph_args.json`,
      JSON.stringify(graphArgs, null, 2),
    );
  }

  async process_signal(full_signal: string | object, company_name: string) {
    return await this.signal_processor.process_signal(full_signal, company_name);
  }
}
