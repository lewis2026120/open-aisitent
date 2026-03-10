import { parseTicketActionPlan } from "./tickets-output.js";
import type { TicketsAgentAttemptParams, TicketsAgentAttemptResult } from "./types.js";

export async function attemptTicketsAgent(
  params: TicketsAgentAttemptParams,
): Promise<TicketsAgentAttemptResult> {
  const response = await params.llmClient.generate({
    systemPrompt: params.promptBundle.systemPrompt,
    inputText: params.input.session.latestUserMessage,
    metadata: {
      variant: params.promptBundle.variant,
      sessionId: params.input.session.sessionId,
      customerId: params.input.session.customerId,
    },
  });

  return {
    plan: parseTicketActionPlan(response.text),
    rawOutput: response.text,
  };
}
