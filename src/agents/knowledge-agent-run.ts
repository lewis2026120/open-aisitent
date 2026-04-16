import { loadKnowledgeContext } from "../context/knowledge-context-loader.js";
import { attemptKnowledgeAgent } from "./knowledge-agent-attempt.js";
import type { KnowledgeAgentResult, KnowledgeAgentRunParams } from "./types.js";

export async function runKnowledgeAgent(
  params: KnowledgeAgentRunParams,
): Promise<KnowledgeAgentResult> {
  const knowledgeContext =
    params.input.knowledgeContext ??
    loadKnowledgeContext({
      session: params.input.session,
      knowledgeCandidates: params.input.knowledgeCandidates,
      routeDecision: params.input.routeDecision,
      sharedContext: params.input.sharedContext ?? params.input.session.sharedContext,
    });

  const promptBundle = params.deps.sectionBuilder.buildKnowledgePrompt({
    ...params.input,
    knowledgeContext: knowledgeContext ?? undefined,
  });

  const attemptResult = await attemptKnowledgeAgent({
    input: {
      ...params.input,
      knowledgeContext: knowledgeContext ?? undefined,
    },
    promptBundle,
    llmClient: params.deps.llmClient,
  });

  return {
    plan: attemptResult.plan,
    promptBundle,
    rawOutput: attemptResult.rawOutput,
    usedKnowledgeContext: knowledgeContext,
  };
}
