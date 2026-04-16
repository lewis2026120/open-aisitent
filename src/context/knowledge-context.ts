import type { KnowledgeCandidate, KnowledgeContextEntry } from "../core/contracts.js";

export function createKnowledgeContextEntry(
  candidate: KnowledgeCandidate,
): KnowledgeContextEntry {
  return {
    id: candidate.id,
    title: candidate.title,
    content: candidate.snippet,
    source: candidate.source,
    relevanceScore: candidate.score,
  };
}
