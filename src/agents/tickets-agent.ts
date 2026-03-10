import type { LlmClient } from "../llm/llm-client.js";
import { createSectionBuilder } from "../section/section-builder.js";
import type { SectionBuilder } from "../section/types.js";
import type { TicketTools } from "../tools/ticket-tools.js";
import { runTicketsAgent } from "./tickets-agent-run.js";
import type { TicketsAgentDeps, TicketsAgentInput, TicketsAgentResult } from "./types.js";

export class TicketsAgent {
  constructor(private readonly deps: TicketsAgentDeps) {}

  async run(input: TicketsAgentInput): Promise<TicketsAgentResult> {
    validateTicketsAgentInput(input);
    return runTicketsAgent({ input, deps: this.deps });
  }
}

export function createTicketsAgent(params: {
  llmClient: LlmClient;
  ticketTools: TicketTools;
  sectionBuilder?: SectionBuilder;
}): TicketsAgent {
  return new TicketsAgent({
    llmClient: params.llmClient,
    ticketTools: params.ticketTools,
    sectionBuilder: params.sectionBuilder ?? createSectionBuilder(),
  });
}

function validateTicketsAgentInput(input: TicketsAgentInput): void {
  if (input.session.latestUserMessage.trim().length === 0) {
    throw new Error("TicketsAgent requires a non-empty latest user message.");
  }
}
