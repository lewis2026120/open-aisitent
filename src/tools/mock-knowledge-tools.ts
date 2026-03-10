import type { KnowledgeCandidate } from "../core/contracts.js";
import type { KnowledgeSearchParams, KnowledgeTools } from "./knowledge-tools.js";

export type MockKnowledgeSearchResolver = (
  params: KnowledgeSearchParams,
) => Promise<KnowledgeCandidate[]> | KnowledgeCandidate[];

export class MockKnowledgeTools implements KnowledgeTools {
  constructor(private readonly resolver: MockKnowledgeSearchResolver) {}

  async knowledgeSearch(params: KnowledgeSearchParams): Promise<KnowledgeCandidate[]> {
    return this.resolver(params);
  }

  static fromCandidates(candidates: KnowledgeCandidate[]): MockKnowledgeTools {
    return new MockKnowledgeTools(() => candidates);
  }
}
