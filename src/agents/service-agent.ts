import type { LlmClient } from "../llm/llm-client.js";
import { createSectionBuilder } from "../section/section-builder.js";
import type { RoutePromptInput, SectionBuilder } from "../section/types.js";
import { runServiceAgent } from "./service-agent-run.js";
import type { ServiceAgentDeps, ServiceAgentResult } from "./types.js";

export class ServiceAgent {
  constructor(private readonly deps: ServiceAgentDeps) {}

  async run(input: RoutePromptInput): Promise<ServiceAgentResult> {
    validateRoutePromptInput(input);
    return runServiceAgent({ input, deps: this.deps });
  }
}

export function createServiceAgent(params: {
  llmClient: LlmClient;
  sectionBuilder?: SectionBuilder;
}): ServiceAgent {
  return new ServiceAgent({
    llmClient: params.llmClient,
    sectionBuilder: params.sectionBuilder ?? createSectionBuilder(),
  });
}

function validateRoutePromptInput(input: RoutePromptInput): void {
  if (input.session.latestUserMessage.trim().length === 0) {
    throw new Error("ServiceAgent requires a non-empty latest user message.");
  }

  if (input.classificationExamples.length === 0) {
    throw new Error("ServiceAgent requires at least one classification example.");
  }
}
