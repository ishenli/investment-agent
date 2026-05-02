/**
 * think — Internal reasoning scratchpad.
 *
 * Allows the agent to think through complex problems step by step
 * without producing any side effects. The thinking is returned as
 * a tool result for the model to use in subsequent reasoning.
 */

import { Type } from '@sinclair/typebox';
import type { TextContent } from '@mariozechner/pi-ai';

export const thinkSchema = Type.Object({
  thought: Type.String({
    description: 'Your internal reasoning, analysis, or plan. Use this to think through complex problems step by step before taking action.',
  }),
});

export async function thinkHandler(
  _toolCallId: string,
  args: Record<string, unknown>,
): Promise<{ content: TextContent[]; isError?: boolean }> {
  const thought = String(args.thought ?? '');

  if (!thought) {
    return { content: [{ type: 'text', text: 'Error: thought is required' }], isError: true };
  }

  // Return the thought as acknowledgment — no side effects
  return {
    content: [{
      type: 'text',
      text: `[Thinking noted. Continue with your next action.]`,
    }],
  };
}
