import type { HandoffAgentInput, KnowledgeAgentInput, TicketsAgentInput } from "../agents/types.js";
import type {
  KnowledgeCandidate,
  KnowledgeContext,
  SessionSnapshot,
  SharedAgentContext,
} from "../core/contracts.js";
import { createDefaultKnowledgeContextLoader } from "../context/knowledge-context-loader.js";
import { buildRouteEvidenceExamples } from "../context/route-evidence-library.js";
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
    const sharedKnowledgeContext = resolveKnowledgeContext(
      request,
      this.config,
      sharedCandidates,
    );
    const routeInput = buildRouteInput(request.session, this.config, sharedCandidates);
    const knowledgeInput = buildKnowledgeInput(
      request.session,
      this.config,
      sharedCandidates,
      sharedKnowledgeContext,
    );
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

    const sharedContext = buildSharedAgentContext(request);
    const session = await this.sessionStore.recordBusinessMessage({
      ...request,
      sharedContext,
    });
    const result = await this.handleMessage({
      session,
      knowledgeCandidates: request.knowledgeCandidates,
      knowledgeContext: request.knowledgeContext,
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
  const routeEvidenceExamples = buildRouteEvidenceExamples({
    latestUserMessage: session.latestUserMessage,
    sharedContext: session.sharedContext,
  });

  return {
    session,
    sharedContext: session.sharedContext,
    taskGoal: config.routeGoal,
    classificationExamples: [...config.routeExamples, ...routeEvidenceExamples],
    routeEvidenceExamples,
    knowledgeCandidates,
  };
}

export function buildKnowledgeInput(
  session: SessionSnapshot,
  config: GatewayConfig,
  knowledgeCandidates: KnowledgeCandidate[],
  knowledgeContext?: KnowledgeContext | null,
): KnowledgeAgentInput {
  const resolvedKnowledgeContext =
    knowledgeContext ??
    (config.knowledgeContextLoader ?? createDefaultKnowledgeContextLoader()).load({
      session,
      knowledgeCandidates,
      sharedContext: session.sharedContext,
    });

  return {
    session,
    sharedContext: session.sharedContext,
    taskGoal: config.knowledgeGoal,
    knowledgeCandidates,
    knowledgeContext: resolvedKnowledgeContext ?? undefined,
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
    sharedContext: session.sharedContext,
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
    sharedContext: session.sharedContext,
    taskGoal: config.handoffGoal,
    knowledgeCandidates,
    toolSummaries: config.handoffTools,
  };
}

function buildSharedAgentContext(request: GatewayBusinessMessageRequest): SharedAgentContext {
  const normalizedBatch = normalizeBatch(request.batch);
  const baseProfile = request.customerProfile ?? {
    customerId: request.customerId,
  };

  return {
    businessPolicy: request.businessPolicyContext,
    channelCapabilities:
      request.channelCapabilityContext ??
      buildDefaultChannelCapabilities(request.channel),
    customerProfile: {
      ...baseProfile,
      customerId: baseProfile.customerId ?? request.customerId,
      persona: baseProfile.persona ?? request.customerPersona,
      deviceModel: baseProfile.deviceModel ?? request.deviceModel,
      region: baseProfile.region ?? request.region,
      batch: baseProfile.batch ?? normalizedBatch,
      channelEdition: baseProfile.channelEdition ?? request.channelEdition,
    },
    operational:
      request.operationalContext ??
      {
        handoffEnabled: true,
        ticketingEnabled: true,
        knowledgeEnabled: true,
      },
    conversationSummary: request.conversationSummary,
  };
}

function normalizeBatch(value: GatewayBusinessMessageRequest["batch"]):
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  const integer = Math.trunc(numeric);
  if (integer < 0 || integer > 5) {
    return undefined;
  }

  return integer as 0 | 1 | 2 | 3 | 4 | 5;
}

function buildDefaultChannelCapabilities(channel: string) {
  return {
    channel,
    supportsAttachments: true,
    supportsRealtimeHandoff: true,
    supportsRichText: true,
    supportsButtons: false,
  };
}

function resolveKnowledgeCandidates(
  request: GatewayMessageRequest,
  config: GatewayConfig,
): KnowledgeCandidate[] {
  return request.knowledgeCandidates ?? config.knowledgeCandidates ?? [];
}

function resolveKnowledgeContext(
  request: GatewayMessageRequest,
  config: GatewayConfig,
  knowledgeCandidates: KnowledgeCandidate[],
): KnowledgeContext | null {
  if (request.knowledgeContext) {
    return request.knowledgeContext;
  }

  const loader = config.knowledgeContextLoader ?? createDefaultKnowledgeContextLoader();
  return loader.load({
    session: request.session,
    knowledgeCandidates,
    sharedContext: request.session.sharedContext,
  });
}

function validateGatewayRequest(request: GatewayMessageRequest): void {
  if (request.session.latestUserMessage.trim().length === 0) {
    throw new Error("Gateway requires a non-empty latest user message.");
  }
}
