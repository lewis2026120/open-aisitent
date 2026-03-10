import type { KnowledgeCandidate } from "../core/contracts.js";

export interface KnowledgeSearchParams {
  query: string;
  limit?: number;
}

export interface KnowledgeTools {
  knowledgeSearch(params: KnowledgeSearchParams): Promise<KnowledgeCandidate[]>;
}
