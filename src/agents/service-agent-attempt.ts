import { parseRouteDecision } from "./route-output.js";
import type { ServiceAgentAttemptParams, ServiceAgentAttemptResult } from "./types.js";

export async function attemptServiceAgent(
  params: ServiceAgentAttemptParams,
): Promise<ServiceAgentAttemptResult> {
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
    decision: parseRouteDecision(response.text),
    rawOutput: response.text,
  };
}
