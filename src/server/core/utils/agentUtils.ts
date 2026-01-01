/* eslint-disable @typescript-eslint/ban-ts-comment */
import { HumanMessage, RemoveMessage } from '@langchain/core/messages';
import { StateAnnotation } from '../graph/tradeDecision/agentState';

export function create_msg_delete() {
  function delete_messages(state: typeof StateAnnotation.State) {
    // """Clear messages and add placeholder for Anthropic compatibility"""
    const messages = state.messages;

    // # Remove all messages
    const removal_operations = messages.map(
      (m: any) =>
        new RemoveMessage({
          id: m.id,
        }),
    );

    // Add a minimal placeholder message
    const placeholder = new HumanMessage('Continue');

    return { messages: [...removal_operations, placeholder] };
  }
  return delete_messages;
}
