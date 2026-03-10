import { attemptServiceAgent } from "./service-agent-attempt.js";
import type { ServiceAgentResult, ServiceAgentRunParams } from "./types.js";

export async function runServiceAgent(
  params: ServiceAgentRunParams,
): Promise<ServiceAgentResult> {
  const promptBundle = params.deps.sectionBuilder.buildRoutePrompt(params.input);
  const attemptResult = await attemptServiceAgent({
    input: params.input,
    promptBundle,
    llmClient: params.deps.llmClient,
  });

  return {
    decision: attemptResult.decision,
    promptBundle,
    rawOutput: attemptResult.rawOutput,
  };
}
