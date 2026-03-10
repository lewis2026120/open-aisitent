import type { SupportOrchestratorDeps, SupportOrchestratorInput, SupportOrchestratorResult } from "./types.js";

export class SupportOrchestrator {
  constructor(private readonly deps: SupportOrchestratorDeps) {}

  async run(input: SupportOrchestratorInput): Promise<SupportOrchestratorResult> {
    validateOrchestrationInput(input);

    const routeResult = await this.deps.serviceAgent.run(input.routeInput);

    if (routeResult.decision.route === "knowledge") {
      const result = await this.deps.knowledgeAgent.run(input.knowledgeInput);
      return {
        route: "knowledge",
        routeResult,
        downstream: {
          route: "knowledge",
          finalReply: result.plan.answerDraft,
          result,
        },
      };
    }

    if (routeResult.decision.route === "tickets") {
      const result = await this.deps.ticketsAgent.run(input.ticketsInput);
      return {
        route: "tickets",
        routeResult,
        downstream: {
          route: "tickets",
          finalReply: result.plan.userReplyDraft,
          result,
        },
      };
    }

    const result = await this.deps.handoffAgent.run(input.handoffInput);
    return {
      route: "handoff",
      routeResult,
      downstream: {
        route: "handoff",
        finalReply: result.plan.userReplyDraft,
        result,
      },
    };
  }
}

export function createSupportOrchestrator(
  deps: SupportOrchestratorDeps,
): SupportOrchestrator {
  return new SupportOrchestrator(deps);
}

function validateOrchestrationInput(input: SupportOrchestratorInput): void {
  const sessionIds = [
    input.routeInput.session.sessionId,
    input.knowledgeInput.session.sessionId,
    input.ticketsInput.session.sessionId,
    input.handoffInput.session.sessionId,
  ];

  const customerIds = [
    input.routeInput.session.customerId,
    input.knowledgeInput.session.customerId,
    input.ticketsInput.session.customerId,
    input.handoffInput.session.customerId,
  ];

  if (new Set(sessionIds).size !== 1) {
    throw new Error("SupportOrchestrator requires all agent inputs to share the same sessionId.");
  }

  if (new Set(customerIds).size !== 1) {
    throw new Error("SupportOrchestrator requires all agent inputs to share the same customerId.");
  }
}
