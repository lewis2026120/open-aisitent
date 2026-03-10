import { parseHandoffPlan } from "./handoff-output.js";
import type { HandoffAgentAttemptParams, HandoffAgentAttemptResult } from "./types.js";

export async function attemptHandoffAgent(
  params: HandoffAgentAttemptParams,
): Promise<HandoffAgentAttemptResult> {
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
    plan: parseHandoffPlan(response.text),
    rawOutput: response.text,
  };
}
