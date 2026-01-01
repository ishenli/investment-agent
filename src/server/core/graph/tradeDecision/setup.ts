/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ChatOpenAI } from '@langchain/openai';
import { StateAnnotation } from './agentState';
import { create_msg_delete } from '../../utils/agentUtils';
import { create_market_analyst } from '../../agents/analysts/market_analyst';
import { create_news_analyst } from '../../agents/analysts/news_analyst';
import {
  create_research_manager,
  RESEARCHER_MANAGER_NODE,
} from '../../agents/managers/research_manager';
import { create_risk_manager, RISK_MANAGER_NODE } from '../../agents/managers/risk_manager';
import {
  BEAR_RESEARCHER_NODE,
  create_bear_researcher,
} from '../../agents/researchers/bear_researcher';
import {
  BULL_RESEARCHER_NODE,
  create_bull_researcher,
} from '../../agents/researchers/bull_researcher';
import { create_risky_analyst, RISKY_ANALYST_NODE } from '../../agents/risk/aggresive_debator';
import { create_neutral_analyst, NEUTRAL_ANALYST_NODE } from '../../agents/risk/neutral_debator';
import { create_safe_debator, SAFE_ANALYST_NODE } from '../../agents/risk/safe_debator';
import { create_trader, TRADE_NODE } from '../../agents/trader/trader';
import { FinancialSituationMemory } from '../../memory/index';
import { ConditionalLogic } from './conditionalLogic';
import { Tool } from '@langchain/core/tools';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { Logger } from '@server/base/logger';

export type GraphSetupOptionsType = {
  logger: Logger;
  quick_thinking_llm: ChatOpenAI;
  deep_thinking_llm: ChatOpenAI;
  tool_nodes: Record<string, Tool>;
  bull_memory: FinancialSituationMemory;
  bear_memory: FinancialSituationMemory;
  invest_judge_memory: FinancialSituationMemory;
  trader_memory: FinancialSituationMemory;
  risk_manager_memory: FinancialSituationMemory;
  conditional_logic: ConditionalLogic;
};

export function capitalize(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export type AnalystType = 'market' | 'news';

export type AnalystTypeArray = AnalystType[];

export class GraphSetup {
  quick_thinking_llm: ChatOpenAI;
  deep_thinking_llm: ChatOpenAI;
  tool_nodes: Record<string, Tool>;
  bull_memory: FinancialSituationMemory;
  bear_memory: FinancialSituationMemory;
  invest_judge_memory: FinancialSituationMemory;
  trader_memory: FinancialSituationMemory;
  risk_manager_memory: FinancialSituationMemory;
  conditional_logic: ConditionalLogic;
  logger: Logger;
  constructor(options: GraphSetupOptionsType) {
    this.logger = options.logger;
    this.quick_thinking_llm = options.quick_thinking_llm;
    this.deep_thinking_llm = options.deep_thinking_llm;
    this.tool_nodes = options.tool_nodes;
    this.bull_memory = options.bull_memory;
    this.bear_memory = options.bear_memory;
    this.invest_judge_memory = options.invest_judge_memory;
    this.trader_memory = options.trader_memory;
    this.risk_manager_memory = options.risk_manager_memory;
    this.conditional_logic = options.conditional_logic;
  }

  getAnalystNodeName(analyst_type: AnalystType) {
    return `${capitalize(analyst_type)}_Analyst`;
  }

  getToolNodeName(tool_name: string) {
    return `Tools_${capitalize(tool_name)}`;
  }

  getDelegateNodeName(delegate_name: string) {
    return `Msg_Clear_${capitalize(delegate_name)}`;
  }

  setupGraph(selected_analysts: AnalystType[] = ['market', 'news']) {
    if (selected_analysts.length === 0) {
      throw new Error('No analysts selected');
    }
    // Replace 'any' types with specific types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analyst_nodes = {} as Record<AnalystType, any>;
    const delete_nodes = {} as Record<AnalystType, ReturnType<typeof create_msg_delete>>;
    const tool_nodes = {} as Record<AnalystType, Tool>;

    if (selected_analysts.includes('market')) {
      analyst_nodes['market'] = create_market_analyst(this.quick_thinking_llm, this.logger);
      delete_nodes['market'] = create_msg_delete();
      tool_nodes['market'] = this.tool_nodes['market'];
    }

    if (selected_analysts.includes('news')) {
      analyst_nodes['news'] = create_news_analyst(this.quick_thinking_llm, this.logger);
      delete_nodes['news'] = create_msg_delete();
      tool_nodes['news'] = this.tool_nodes['news'];
    }

    const workflow = new StateGraph(StateAnnotation);

    // Keep track of node names for edge creation
    for (const [analyst_type, node] of Object.entries(analyst_nodes)) {
      const analystNodeName = this.getAnalystNodeName(analyst_type as AnalystType);
      const clearNodeName = this.getDelegateNodeName(analyst_type as AnalystType);
      const toolNodeName = this.getToolNodeName(analyst_type as AnalystType);
      workflow.addNode(analystNodeName, node);
      workflow.addNode(clearNodeName, delete_nodes[analyst_type as AnalystType]);
      workflow.addNode(toolNodeName, tool_nodes[analyst_type as AnalystType]);
    }

    // add other nodes
    workflow.addNode(
      BULL_RESEARCHER_NODE,
      create_bull_researcher(this.quick_thinking_llm, this.bull_memory, this.logger),
    );
    workflow.addNode(
      BEAR_RESEARCHER_NODE,
      create_bear_researcher(this.quick_thinking_llm, this.bear_memory, this.logger),
    );
    workflow.addNode(
      RESEARCHER_MANAGER_NODE,
      create_research_manager(this.deep_thinking_llm, this.invest_judge_memory, this.logger),
    );
    workflow.addNode(
      TRADE_NODE,
      create_trader(this.quick_thinking_llm, this.trader_memory, this.logger),
    );
    workflow.addNode(
      RISKY_ANALYST_NODE,
      create_risky_analyst(this.quick_thinking_llm, this.logger),
    );
    workflow.addNode(
      NEUTRAL_ANALYST_NODE,
      create_neutral_analyst(this.quick_thinking_llm, this.logger),
    );
    workflow.addNode(SAFE_ANALYST_NODE, create_safe_debator(this.quick_thinking_llm, this.logger));
    workflow.addNode(
      RISK_MANAGER_NODE,
      create_risk_manager(this.deep_thinking_llm, this.risk_manager_memory, this.logger),
    );

    // define the edge
    const first_analyst = selected_analysts[0];
    // @ts-expect-error
    workflow.addEdge(START, this.getAnalystNodeName(first_analyst)); // Changed from 'Market Analyst' to 'Market_Analyst'

    for (let i = 0; i < selected_analysts.length; i++) {
      const current_analyst = this.getAnalystNodeName(selected_analysts[i]);
      const current_clear = this.getDelegateNodeName(selected_analysts[i]);
      const current_tools = this.getToolNodeName(selected_analysts[i]);
      workflow.addConditionalEdges(
        // @ts-expect-error
        current_analyst,
        this.conditional_logic[`should_continue_${selected_analysts[i]}`],
        {
          [current_tools]: current_tools,
          [current_clear]: current_clear,
        },
      );
      // @ts-expect-error
      workflow.addEdge(current_tools, current_analyst);

      if (i < selected_analysts.length - 1) {
        const nextAnalyst = selected_analysts[i + 1];
        // @ts-expect-error
        workflow.addEdge(current_clear, this.getAnalystNodeName(nextAnalyst));
      } else {
        // @ts-expect-error
        workflow.addEdge(current_clear, BULL_RESEARCHER_NODE);
      }
    }

    workflow.addConditionalEdges(
      // @ts-expect-error
      BULL_RESEARCHER_NODE,
      this.conditional_logic.should_continue_debate,
      {
        'Bear Researcher': BEAR_RESEARCHER_NODE,
        'Research Manager': RESEARCHER_MANAGER_NODE,
      },
    );
    workflow.addConditionalEdges(
      // @ts-expect-error
      BEAR_RESEARCHER_NODE,
      this.conditional_logic.should_continue_debate,
      {
        'Bull Researcher': BULL_RESEARCHER_NODE,
        'Research Manager': RESEARCHER_MANAGER_NODE,
      },
    );
    // @ts-expect-error
    workflow.addEdge(RESEARCHER_MANAGER_NODE, TRADE_NODE);
    // @ts-expect-error
    workflow.addEdge(TRADE_NODE, RISKY_ANALYST_NODE);

    workflow.addConditionalEdges(
      // @ts-expect-error
      RISKY_ANALYST_NODE,
      this.conditional_logic.should_continue_risk_analysis,
      {
        'Safe Analyst': SAFE_ANALYST_NODE,
        'Risk Judge': RISK_MANAGER_NODE,
      },
    );
    workflow.addConditionalEdges(
      SAFE_ANALYST_NODE as any,
      this.conditional_logic.should_continue_risk_analysis,
      {
        'Neutral Analyst': NEUTRAL_ANALYST_NODE,
        'Risk Judge': RISK_MANAGER_NODE,
      } as any,
    );
    workflow.addConditionalEdges(
      // @ts-expect-error
      NEUTRAL_ANALYST_NODE,
      this.conditional_logic.should_continue_risk_analysis,
      {
        'Risky Analyst': RISKY_ANALYST_NODE,
        'Risk Judge': RISK_MANAGER_NODE,
      },
    );
    // @ts-expect-error
    workflow.addEdge(RISK_MANAGER_NODE, END);

    return workflow.compile();
  }
}
