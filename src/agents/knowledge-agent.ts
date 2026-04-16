import type { LlmClient } from "../llm/llm-client.js";
import { createSectionBuilder } from "../section/section-builder.js";
import type { SectionBuilder } from "../section/types.js";
import { runKnowledgeAgent } from "./knowledge-agent-run.js";
import type { KnowledgeAgentDeps, KnowledgeAgentInput, KnowledgeAgentResult } from "./types.js";

export class KnowledgeAgent {
  constructor(private readonly deps: KnowledgeAgentDeps) {}

  async run(input: KnowledgeAgentInput): Promise<KnowledgeAgentResult> {
    validateKnowledgeAgentInput(input);
    return runKnowledgeAgent({ input, deps: this.deps });
  }
}

export function createKnowledgeAgent(params: {
  llmClient: LlmClient;
  sectionBuilder?: SectionBuilder;
}): KnowledgeAgent {
  return new KnowledgeAgent({
    llmClient: params.llmClient,
    sectionBuilder: params.sectionBuilder ?? createSectionBuilder(),
  });
}

function validateKnowledgeAgentInput(input: KnowledgeAgentInput): void {
  if (input.session.latestUserMessage.trim().length === 0) {
    throw new Error("KnowledgeAgent requires a non-empty latest user message.");
  }
}
