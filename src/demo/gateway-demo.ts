import path from "node:path";
import { createHandoffToHumanAgent } from "../agents/handoff-agent.js";
import { createKnowledgeAgent } from "../agents/knowledge-agent.js";
import { createServiceAgent } from "../agents/service-agent.js";
import { createTicketsAgent } from "../agents/tickets-agent.js";
import type { AgentRoute, KnowledgeCandidate, TicketState } from "../core/contracts.js";
import type { LlmClient } from "../llm/llm-client.js";
import {
  createMinimaxClientFromEnv,
  type MinimaxEnvConfig,
} from "../llm/minimax-client.js";
import { MockLlmClient } from "../llm/mock-llm-client.js";
import { createSupportOrchestrator } from "../orchestration/support-orchestrator.js";
import {
  handoffScenario,
  knowledgeScenario,
  routeScenario,
  ticketsScenario,
} from "../section/test-scenarios.js";
import { MockHandoffTools } from "../tools/mock-handoff-tools.js";
import { MockKnowledgeTools } from "../tools/mock-knowledge-tools.js";
import { MockTicketTools } from "../tools/mock-ticket-tools.js";
import { createGateway } from "../gateway/gateway.js";
import type { GatewayBusinessMessageRequest, GatewayConfig } from "../gateway/types.js";
import { createFileSessionStore } from "../session/session-store.js";

export interface GatewayDemoOptions {
  message?: string;
  route?: AgentRoute;
  llmMode?: "auto" | "mock" | "minimax";
  channel?: string;
  senderName?: string;
  senderId?: string;
  customerId?: string;
  conversationId?: string;
  messageId?: string;
  timestamp?: string;
  history?: GatewayBusinessMessageRequest["history"];
  ticketState?: TicketState | null;
  knowledgeCandidates?: KnowledgeCandidate[];
  storeDir?: string;
  minimaxApiKey?: string;
  minimaxBaseUrl?: string;
  minimaxModel?: string;
  minimaxMaxTokens?: number;
}

export interface GatewayDemoTrace {
  llm: {
    mode: "mock" | "minimax";
    model: string;
    baseUrl?: string;
    configuredFromEnv: boolean;
  };
  ingress: {
    channel: string;
    conversationId: string;
    senderId: string;
    senderName?: string;
    messageId: string;
    text: string;
  };
  adaptedSession: {
    sessionId: string;
    customerId: string;
    latestUserMessage: string;
    historyCount: number;
    ticketId?: string;
  };
  sessionStore: {
    storeDir: string;
    sessionFilePath: string;
    transcriptCount: number;
  };
  routeDecision: {
    route: AgentRoute;
    intent: string;
    confidence: number;
    reason: string;
    entities: Record<string, string>;
  };
  downstreamRoute: AgentRoute;
  downstreamReply: string;
  knowledgeToolResult: KnowledgeCandidate[] | null;
  ticketToolResult:
    | {
        action: "query" | "create" | "update";
        ticketState: TicketState | null;
      }
    | null;
  handoffToolResult:
    | {
        queueId: string;
        acceptedAt: string;
        urgency: "normal" | "urgent";
      }
    | null;
}

export async function runGatewayDemo(options: GatewayDemoOptions = {}): Promise<GatewayDemoTrace> {
  const incomingMessage = createDemoBusinessMessage(options);
  const selectedRoute = options.route ?? inferRouteFromMessage(incomingMessage.text);
  const knowledgeCandidates =
    options.knowledgeCandidates ?? knowledgeScenario.knowledgeCandidates;
  const llmSelection = createDemoLlmSelection({
    selectedRoute,
    incomingMessage,
    knowledgeCandidates,
    options,
  });

  const gatewayConfig: GatewayConfig = {
    routeExamples: routeScenario.classificationExamples,
    routeGoal: routeScenario.taskGoal,
    knowledgeGoal: knowledgeScenario.taskGoal,
    ticketsGoal: ticketsScenario.taskGoal,
    handoffGoal: handoffScenario.taskGoal,
    knowledgeTools: knowledgeScenario.toolSummaries ?? [],
    ticketTools: ticketsScenario.toolSummaries ?? [],
    handoffTools: handoffScenario.toolSummaries ?? [],
    knowledgeCandidates,
  };

  const serviceAgent = createServiceAgent({
    llmClient: llmSelection.serviceLlmClient,
  });

  const retrievedKnowledge = buildKnowledgeCandidatesForDemo(incomingMessage.text, knowledgeCandidates);
  const knowledgeAgent = createKnowledgeAgent({
    llmClient: llmSelection.knowledgeLlmClient,
    knowledgeTools: MockKnowledgeTools.fromCandidates(retrievedKnowledge),
  });

  const ticketsAgent = createTicketsAgent({
    llmClient: llmSelection.ticketsLlmClient,
    ticketTools: new MockTicketTools(
      () =>
        incomingMessage.ticketState ?? {
          ticketId: "TK-20260307-01",
          status: "pending",
          priority: "high",
          summary: "用户反馈退款迟迟未到账。",
          lastUpdateAt: "2026-03-10T09:30:00Z",
        },
      () => ({
        ticketId: "TK-NEW-01",
        status: "open",
        priority: "medium",
        summary: incomingMessage.text,
        lastUpdateAt: "2026-03-10T10:05:00Z",
      }),
      (params) => ({
        ticketId: params.ticketId,
        status: params.status ?? "pending",
        priority: params.priority ?? "high",
        summary: params.summary ?? incomingMessage.text,
        lastUpdateAt: "2026-03-10T10:06:00Z",
      }),
    ),
  });

  const handoffAgent = createHandoffToHumanAgent({
    llmClient: llmSelection.handoffLlmClient,
    handoffTools: new MockHandoffTools((params) => ({
      queueId: "queue-001",
      acceptedAt: "2026-03-08T12:00:00Z",
      urgency: params.urgency,
    })),
  });

  const orchestrator = createSupportOrchestrator({
    serviceAgent,
    knowledgeAgent,
    ticketsAgent,
    handoffAgent,
  });

  const storeDir = options.storeDir ?? path.join(process.cwd(), ".demo-session-store");
  const sessionStore = createFileSessionStore(storeDir);
  const gateway = createGateway({
    config: gatewayConfig,
    runner: orchestrator,
    sessionStore,
  });

  const result = await gateway.handleBusinessMessage(incomingMessage);
  const storedRecord = await sessionStore.getRecord(incomingMessage.conversationId);

  return {
    llm: llmSelection.trace,
    ingress: {
      channel: incomingMessage.channel,
      conversationId: incomingMessage.conversationId,
      senderId: incomingMessage.senderId,
      senderName: incomingMessage.senderName,
      messageId: incomingMessage.messageId,
      text: incomingMessage.text,
    },
    adaptedSession: {
      sessionId: result.session.sessionId,
      customerId: result.session.customerId,
      latestUserMessage: result.session.latestUserMessage,
      historyCount: result.session.history.length,
      ticketId: result.session.ticketState?.ticketId,
    },
    sessionStore: {
      storeDir,
      sessionFilePath: sessionStore.resolveSessionFilePath(incomingMessage.conversationId),
      transcriptCount: storedRecord?.transcript.length ?? 0,
    },
    routeDecision: result.orchestratorResult.routeResult.decision,
    downstreamRoute: result.orchestratorResult.downstream.route,
    downstreamReply: result.reply,
    knowledgeToolResult:
      result.orchestratorResult.downstream.route === "knowledge"
        ? result.orchestratorResult.downstream.result.retrievedCandidates
        : null,
    ticketToolResult:
      result.orchestratorResult.downstream.route === "tickets"
        ? result.orchestratorResult.downstream.result.toolResult
        : null,
    handoffToolResult:
      result.orchestratorResult.downstream.route === "handoff"
        ? result.orchestratorResult.downstream.result.uploadResult
        : null,
  };
}

function createDemoLlmSelection(params: {
  selectedRoute: AgentRoute;
  incomingMessage: GatewayBusinessMessageRequest;
  knowledgeCandidates: KnowledgeCandidate[];
  options: GatewayDemoOptions;
}): {
  serviceLlmClient: LlmClient;
  knowledgeLlmClient: LlmClient;
  ticketsLlmClient: LlmClient;
  handoffLlmClient: LlmClient;
  trace: GatewayDemoTrace["llm"];
} {
  const mode = resolveLlmMode(params.options);
  if (mode === "minimax") {
    const minimaxClient = createMinimaxClientFromEnv(resolveMinimaxEnvConfig(params.options));
    const minimaxConfig = minimaxClient.getConfig();
    return {
      serviceLlmClient: minimaxClient,
      knowledgeLlmClient: minimaxClient,
      ticketsLlmClient: minimaxClient,
      handoffLlmClient: minimaxClient,
      trace: {
        mode: "minimax",
        model: minimaxConfig.model,
        baseUrl: minimaxConfig.baseUrl,
        configuredFromEnv: !params.options.minimaxApiKey,
      },
    };
  }

  const retrievedKnowledge = buildKnowledgeCandidatesForDemo(
    params.incomingMessage.text,
    params.knowledgeCandidates,
  );

  return {
    serviceLlmClient: MockLlmClient.fromText(
      JSON.stringify(buildRouteDecision(params.selectedRoute, params.incomingMessage.channel)),
    ),
    knowledgeLlmClient: MockLlmClient.fromText(
      JSON.stringify({
        shouldAnswerDirectly: true,
        suggestedSearchQuery: inferKnowledgeQuery(params.incomingMessage.text),
        answerDraft: `根据当前知识库，关于“${params.incomingMessage.text}”，建议先按标准说明处理。`,
        citedKnowledgeIds: retrievedKnowledge.map((item) => item.id),
      }),
    ),
    ticketsLlmClient: MockLlmClient.fromText(
      JSON.stringify({
        action: "query",
        reason: "The customer first wants the latest status of an existing ticket.",
        ticketFields: {
          ticketId: params.incomingMessage.ticketState?.ticketId ?? "TK-20260307-01",
        },
        userReplyDraft: "我已经帮你查到工单目前还在处理中，我继续为你跟进。",
      }),
    ),
    handoffLlmClient: MockLlmClient.fromText(
      JSON.stringify({
        handoffReason: "The customer explicitly requests human support or the issue looks urgent.",
        urgency: params.selectedRoute === "handoff" ? "urgent" : "normal",
        summaryForHuman: `客户 ${params.incomingMessage.senderName ?? params.incomingMessage.senderId} 反馈：${params.incomingMessage.text}`,
        attachmentPayload: `channel=${params.incomingMessage.channel};conversation=${params.incomingMessage.conversationId}`,
        userReplyDraft: "我已经为你转交人工处理。",
      }),
    ),
    trace: {
      mode: "mock",
      model: "mock-json-responder",
      configuredFromEnv: false,
    },
  };
}

function resolveLlmMode(options: GatewayDemoOptions): "mock" | "minimax" {
  if (options.llmMode === "mock") {
    return "mock";
  }
  if (options.llmMode === "minimax") {
    if (!(options.minimaxApiKey ?? process.env.MINIMAX_API_KEY)?.trim()) {
      throw new Error("MiniMax mode requires MINIMAX_API_KEY or options.minimaxApiKey.");
    }
    return "minimax";
  }

  return (options.minimaxApiKey ?? process.env.MINIMAX_API_KEY)?.trim() ? "minimax" : "mock";
}

function resolveMinimaxEnvConfig(options: GatewayDemoOptions): MinimaxEnvConfig {
  return {
    apiKey: options.minimaxApiKey,
    baseUrl: options.minimaxBaseUrl,
    model: options.minimaxModel,
    maxTokens: options.minimaxMaxTokens,
  };
}

export function createDemoBusinessMessage(
  options: GatewayDemoOptions = {},
): GatewayBusinessMessageRequest {
  return {
    channel: options.channel ?? "whatsapp",
    conversationId: options.conversationId ?? "conv-whatsapp-001",
    customerId: options.customerId ?? "cust-9001",
    senderId: options.senderId ?? "wx-user-7788",
    senderName: options.senderName ?? "李雷",
    messageId: options.messageId ?? "msg-20260310-001",
    text:
      options.message ??
      "我昨天提交的退款工单怎么还没处理？先帮我查一下进度，如果还是不行我再找人工。",
    timestamp: options.timestamp ?? "2026-03-10T10:00:00Z",
    history: options.history ?? [
      {
        messageId: "msg-20260309-001",
        direction: "inbound",
        text: "我昨天提交了退款申请。",
        timestamp: "2026-03-09T09:00:00Z",
      },
      {
        messageId: "msg-20260309-002",
        direction: "outbound",
        text: "好的，我来帮你查看退款工单。",
        timestamp: "2026-03-09T09:00:20Z",
      },
    ],
    ticketState: options.ticketState ?? {
      ticketId: "TK-20260307-01",
      status: "pending",
      priority: "high",
      summary: "用户反馈退款迟迟未到账。",
      lastUpdateAt: "2026-03-09T11:00:00Z",
    },
    knowledgeCandidates: options.knowledgeCandidates,
  };
}

function inferRouteFromMessage(message: string): AgentRoute {
  if (/工单|进度|处理到哪|查一下/u.test(message)) {
    return "tickets";
  }
  if (/马上转人工|立即转人工|现在转人工|必须人工|人工处理|升级|投诉|紧急/u.test(message)) {
    return "handoff";
  }
  return "knowledge";
}

function buildRouteDecision(route: AgentRoute, channel: string) {
  if (route === "knowledge") {
    return {
      route,
      intent: "ask_policy_or_howto",
      confidence: 0.9,
      reason: "The customer is mainly asking for a policy or how-to answer.",
      entities: { channel },
    };
  }

  if (route === "handoff") {
    return {
      route,
      intent: "escalate_to_human",
      confidence: 0.95,
      reason: "The customer explicitly asks for escalation or the message sounds urgent.",
      entities: { channel },
    };
  }

  return {
    route,
    intent: "check_ticket_progress",
    confidence: 0.94,
    reason: "The customer asks for ticket progress first.",
    entities: {
      ticketId: "TK-20260307-01",
      channel,
    },
  };
}

function inferKnowledgeQuery(message: string): string {
  if (/退款/u.test(message)) {
    return "退款时效";
  }
  return "客服常见问题";
}

function buildKnowledgeCandidatesForDemo(
  message: string,
  baseCandidates: KnowledgeCandidate[],
): KnowledgeCandidate[] {
  if (/退款/u.test(message)) {
    return baseCandidates;
  }
  return [
    {
      id: "kb-general-01",
      title: "客服通用处理说明",
      snippet: "先确认用户问题，再给出标准说明或引导下一步操作。",
      source: "knowledge/general-support.md",
      score: 0.77,
    },
  ];
}
