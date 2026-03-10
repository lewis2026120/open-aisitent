import type { LlmClient } from "../llm/llm-client.js";
import { createSectionBuilder } from "../section/section-builder.js";
import type { SectionBuilder } from "../section/types.js";
import type { HandoffTools } from "../tools/handoff-tools.js";
import { runHandoffAgent } from "./handoff-agent-run.js";
import type { HandoffAgentDeps, HandoffAgentInput, HandoffAgentResult } from "./types.js";

export class HandoffToHumanAgent {
  constructor(private readonly deps: HandoffAgentDeps) {}

  async run(input: HandoffAgentInput): Promise<HandoffAgentResult> {
    validateHandoffAgentInput(input);
    return runHandoffAgent({ input, deps: this.deps });
  }
}

export function createHandoffToHumanAgent(params: {
  llmClient: LlmClient;
  handoffTools: HandoffTools;
  sectionBuilder?: SectionBuilder;
}): HandoffToHumanAgent {
  return new HandoffToHumanAgent({
    llmClient: params.llmClient,
    handoffTools: params.handoffTools,
    sectionBuilder: params.sectionBuilder ?? createSectionBuilder(),
  });
}

function validateHandoffAgentInput(input: HandoffAgentInput): void {
  if (input.session.latestUserMessage.trim().length === 0) {
    throw new Error("HandoffToHumanAgent requires a non-empty latest user message.");
  }
}
