import { RemoveMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from 'langchain';

export interface InvestDebateState {
  /**
   * Bullish Conversation history
   */
  bull_history: string;

  /**
   * Bearish Conversation history
   */
  bear_history: string;

  /**
   * Conversation history
   */
  history: string;

  /**
   * Latest response
   */
  current_response: string;

  /**
   * Final judge decision
   */
  judge_decision: string;

  /**
   * Length of the current conversation
   */
  count: number;
}

/**
 * Risk debate state interface
 * Represents the state of the debate between different risk assessment analysts
 */
export interface RiskDebateState {
  /**
   * Risky Agent's Conversation history
   */
  risky_history: string;

  /**
   * Safe Agent's Conversation history
   */
  safe_history: string;

  /**
   * Neutral Agent's Conversation history
   */
  neutral_history: string;

  /**
   * Conversation history
   */
  history: string;

  /**
   * Analyst that spoke last
   */
  latest_speaker: string;

  /**
   * Latest response by the risky analyst
   */
  current_risky_response: string;

  /**
   * Latest response by the safe analyst
   */
  current_safe_response: string;

  /**
   * Latest response by the neutral analyst
   */
  current_neutral_response: string;

  /**
   * Judge's decision
   */
  judge_decision: string;

  /**
   * Length of the current conversation
   */
  count: number;
}

export const StateAnnotation = Annotation.Root({
  company_of_interest: Annotation<string>,
  trade_date: Annotation<string>,

  messages: Annotation<BaseMessage[] | RemoveMessage[]>,
  sender: Annotation<string>,
  investment_debate_state: Annotation<InvestDebateState>,
  risk_debate_state: Annotation<RiskDebateState>,
  market_report: Annotation<string>,
  sentiment_report: Annotation<string>,
  news_report: Annotation<string>,
  fundamentals_report: Annotation<string>,
  investment_plan: Annotation<string>,
  trader_investment_plan: Annotation<string>,
  final_trade_decision: Annotation<string>,
});

export type TAgentState = typeof StateAnnotation.State;
