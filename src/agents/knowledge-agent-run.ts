import type { KnowledgeCandidate } from "../core/contracts.js";
import { attemptKnowledgeAgent } from "./knowledge-agent-attempt.js";
import type { KnowledgeAgentResult, KnowledgeAgentRunParams } from "./types.js";

export async function runKnowledgeAgent(
  params: KnowledgeAgentRunParams,
): Promise<KnowledgeAgentResult> {
  const searchQuery = params.input.searchQuery?.trim() || params.input.session.latestUserMessage;
  const retrievedCandidates = await params.deps.knowledgeTools.knowledgeSearch({
    query: searchQuery,
    limit: params.input.searchLimit,
  });

  const mergedCandidates = mergeCandidates(retrievedCandidates, params.input.knowledgeCandidates);
  const promptBundle = params.deps.sectionBuilder.buildKnowledgePrompt({
    ...params.input,
    knowledgeCandidates: mergedCandidates,
  });

  const attemptResult = await attemptKnowledgeAgent({
    input: {
      ...params.input,
      knowledgeCandidates: mergedCandidates,
    },
    promptBundle,
    llmClient: params.deps.llmClient,
  });

  return {
    plan: attemptResult.plan,
    promptBundle,
    rawOutput: attemptResult.rawOutput,
    retrievedCandidates,
  };
}

function mergeCandidates(
  fromSearch: KnowledgeCandidate[],
  fromInput: KnowledgeCandidate[],
): KnowledgeCandidate[] {
  const merged: KnowledgeCandidate[] = [];
  const seen = new Set<string>();

  for (const candidate of [...fromSearch, ...fromInput]) {
    const id = candidate.id.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    merged.push(candidate);
  }

  return merged;
}
