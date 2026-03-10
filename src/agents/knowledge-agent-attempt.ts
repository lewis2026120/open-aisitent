import { parseKnowledgeAnswerPlan } from "./knowledge-output.js";
import type { KnowledgeAgentAttemptParams, KnowledgeAgentAttemptResult } from "./types.js";

export async function attemptKnowledgeAgent(
  params: KnowledgeAgentAttemptParams,
): Promise<KnowledgeAgentAttemptResult> {
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
    plan: parseKnowledgeAnswerPlan(response.text),
    rawOutput: response.text,
  };
}
