import type { HandoffAgentInput, KnowledgeAgentInput, TicketsAgentInput } from "../agents/types.js";
import type { KnowledgeCandidate, SessionSnapshot } from "../core/contracts.js";
import type { RoutePromptInput } from "../section/types.js";
import type { SessionStore } from "../session/types.js";
import type {
  GatewayConfig,
  GatewayDeps,
  GatewayHandleResult,
  GatewayMessageRequest,
  GatewayRunner,
  GatewayBusinessMessageRequest,
} from "./types.js";

export class Gateway {
  private readonly sessionStore?: SessionStore;

  constructor(
    private readonly config: GatewayConfig,
    private readonly runner: GatewayRunner,
    sessionStore?: SessionStore,
  ) {
    this.sessionStore = sessionStore;
  }

  async handleMessage(request: GatewayMessageRequest): Promise<GatewayHandleResult> {
    validateGatewayRequest(request);

    const sharedCandidates = resolveKnowledgeCandidates(request, this.config);
    const routeInput = buildRouteInput(request.session, this.config, sharedCandidates);
    const knowledgeInput = buildKnowledgeInput(request.session, this.config, sharedCandidates);
    const ticketsInput = buildTicketsInput(request.session, this.config, sharedCandidates);
    const handoffInput = buildHandoffInput(request.session, this.config, sharedCandidates);

    const orchestratorResult = await this.runner.run({
      routeInput,
      knowledgeInput,
      ticketsInput,
      handoffInput,
    });

    return {
      session: request.session,
      orchestratorResult,
      reply: orchestratorResult.downstream.finalReply,
    };
  }

  async handleBusinessMessage(
    request: GatewayBusinessMessageRequest,
  ): Promise<GatewayHandleResult> {
    if (!this.sessionStore) {
      throw new Error("Gateway handleBusinessMessage() requires a SessionStore.");
    }

    const session = await this.sessionStore.recordBusinessMessage(request);
    const result = await this.handleMessage({
      session,
      knowledgeCandidates: request.knowledgeCandidates,
    });

    if (result.orchestratorResult.downstream.route === "tickets") {
      await this.sessionStore.updateTicketState(
        session.sessionId,
        result.orchestratorResult.downstream.result.latestTicketState,
      );
    }

    const updatedSession = await this.sessionStore.appendAssistantReply({
      sessionId: session.sessionId,
      text: result.reply,
      timestamp: new Date().toISOString(),
    });

    return {
      ...result,
      session: updatedSession,
    };
  }
}

export function createGateway(params: GatewayDeps): Gateway {
  return new Gateway(params.config, params.runner, params.sessionStore);
}

export function buildRouteInput(
  session: SessionSnapshot,
  config: GatewayConfig,
  knowledgeCandidates: KnowledgeCandidate[],
): RoutePromptInput {
  return {
    session,
    taskGoal: config.routeGoal,
    classificationExamples: config.routeExamples,
    knowledgeCandidates,
  };
}

export function buildKnowledgeInput(
  session: SessionSnapshot,
  config: GatewayConfig,
  knowledgeCandidates: KnowledgeCandidate[],
): KnowledgeAgentInput {
  return {
    session,
    taskGoal: config.knowledgeGoal,
    knowledgeCandidates,
    toolSummaries: config.knowledgeTools,
  };
}

export function buildTicketsInput(
  session: SessionSnapshot,
  config: GatewayConfig,
  knowledgeCandidates: KnowledgeCandidate[],
): TicketsAgentInput {
  return {
    session,
    taskGoal: config.ticketsGoal,
    knowledgeCandidates,
    toolSummaries: config.ticketTools,
  };
}

export function buildHandoffInput(
  session: SessionSnapshot,
  config: GatewayConfig,
  knowledgeCandidates: KnowledgeCandidate[],
): HandoffAgentInput {
  return {
    session,
    taskGoal: config.handoffGoal,
    knowledgeCandidates,
    toolSummaries: config.handoffTools,
  };
}

function resolveKnowledgeCandidates(
  request: GatewayMessageRequest,
  config: GatewayConfig,
): KnowledgeCandidate[] {
  return request.knowledgeCandidates ?? config.knowledgeCandidates ?? [];
}

function validateGatewayRequest(request: GatewayMessageRequest): void {
  if (request.session.latestUserMessage.trim().length === 0) {
    throw new Error("Gateway requires a non-empty latest user message.");
  }
}
