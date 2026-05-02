import { HumanMessage } from 'langchain';

export class Propagator {
  max_recur_limit: number;
  constructor(max_recur_limit: number = 100) {
    this.max_recur_limit = max_recur_limit;
  }
  create_initial_state(company_name: string, trade_date: string) {
    // """Create the initial state for the agent graph."""
    return {
      messages: [new HumanMessage(company_name)],
      company_of_interest: company_name,
      trade_date: trade_date,
      investment_debate_state: { history: '', current_response: '', count: 0 },
      risk_debate_state: {
        history: '',
        current_risky_response: '',
        current_safe_response: '',
        current_neutral_response: '',
        count: 0,
      },
      market_report: '',
      fundamentals_report: '',
      sentiment_report: '',
      news_report: '',
    };
  }

  get_graph_args() {
    // """Get arguments for the graph invocation."""
    return {
      stream_mode: 'values',
      config: { recursionLimit: this.max_recur_limit },
    };
  }
}
