import { AIMessage } from 'langchain';
import { StateAnnotation } from './agentState';

export class ConditionalLogic {
  max_debate_rounds: number = 1;
  max_risk_discuss_rounds: number = 1;
  constructor(max_debate_rounds?: number, max_risk_discuss_rounds?: number) {
    this.max_debate_rounds = max_debate_rounds || 1;
    this.max_risk_discuss_rounds = max_risk_discuss_rounds || 1;
  }

  should_continue_market(state: typeof StateAnnotation.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    if (
      AIMessage.isInstance(lastMessage) &&
      lastMessage.tool_calls &&
      lastMessage.tool_calls.length > 0
    ) {
      return 'Tools_Market';
    }
    return 'Msg_Clear_Market';
  }

  should_continue_debate = (state: typeof StateAnnotation.State) => {
    if (state.investment_debate_state.count >= 2 * this.max_debate_rounds) {
      return 'Research Manager';
    }
    if (state.investment_debate_state.current_response.startsWith('Bull')) {
      return 'Bear Researcher';
    }
    return 'Bull Researcher';
  };

  should_continue_news(state: typeof StateAnnotation.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    if (
      AIMessage.isInstance(lastMessage) &&
      lastMessage.tool_calls &&
      lastMessage.tool_calls.length > 0
    ) {
      return 'Tools_News';
    }
    return 'Msg_Clear_News';
  }

  should_continue_social(state: typeof StateAnnotation.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    if (
      AIMessage.isInstance(lastMessage) &&
      lastMessage.tool_calls &&
      lastMessage.tool_calls.length > 0
    ) {
      return 'Tools_Social';
    }
    return 'Msg_Clear_Social';
  }

  should_continue_fundamentals(state: typeof StateAnnotation.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    if (
      AIMessage.isInstance(lastMessage) &&
      lastMessage.tool_calls &&
      lastMessage.tool_calls.length > 0
    ) {
      return 'Tools_Fundamentals';
    }
    return 'Msg_Clear_Fundamentals';
  }

  should_continue_risk_analysis = (state: typeof StateAnnotation.State) => {
    if (state['risk_debate_state']['count'] >= 3 * this.max_risk_discuss_rounds) {
      return 'Risk Judge';
    }
    if (state['risk_debate_state']['latest_speaker'].startsWith('Risky')) {
      return 'Safe Analyst';
    }
    if (state['risk_debate_state']['latest_speaker'].startsWith('Safe')) {
      return 'Neutral Analyst';
    }
    return 'Risky Analyst';
  };
}
