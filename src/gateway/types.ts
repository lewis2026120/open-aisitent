import type {
  BusinessPolicyContext,
  ChannelEdition,
  ChannelCapabilityContext,
  ClassificationExample,
  ConversationSummary,
  CustomerPersona,
  CustomerProfile,
  KnowledgeCandidate,
  KnowledgeContext,
  OperationalContext,
  SessionSnapshot,
  SupportRegion,
  TaskGoal,
  TicketState,
  ToolSummary,
} from "../core/contracts.js";
import type { KnowledgeContextLoader } from "../context/knowledge-context-loader.js";
import type { SupportOrchestratorResult } from "../orchestration/types.js";
import type { SessionStore } from "../session/types.js";

export interface GatewayConfig {
  routeExamples: ClassificationExample[];
  routeGoal: TaskGoal;
  knowledgeGoal: TaskGoal;
  ticketsGoal: TaskGoal;
  handoffGoal: TaskGoal;
  knowledgeTools: ToolSummary[];
  ticketTools: ToolSummary[];
  handoffTools: ToolSummary[];
  knowledgeCandidates?: KnowledgeCandidate[];
  knowledgeContextLoader?: KnowledgeContextLoader;
}

export interface GatewayMessageRequest {
  session: SessionSnapshot;
  knowledgeCandidates?: KnowledgeCandidate[];
  knowledgeContext?: KnowledgeContext;
}

export interface GatewayHistoryMessage {
  messageId: string;
  direction: "inbound" | "outbound";
  text: string;
  timestamp: string;
}

export interface GatewayBusinessMessageRequest {
  channel: string;
  conversationId: string;
  customerId: string;
  senderId: string;
  senderName?: string;
  messageId: string;
  text: string;
  timestamp: string;
  history?: GatewayHistoryMessage[];
  ticketState?: TicketState | null;
  knowledgeCandidates?: KnowledgeCandidate[];
  knowledgeContext?: KnowledgeContext;
  businessPolicyContext?: BusinessPolicyContext;
  channelCapabilityContext?: ChannelCapabilityContext;
  customerProfile?: CustomerProfile;
  customerPersona?: CustomerPersona;
  deviceModel?: string;
  region?: SupportRegion;
  batch?: 0 | 1 | 2 | 3 | 4 | 5 | number;
  channelEdition?: ChannelEdition;
  operationalContext?: OperationalContext;
  conversationSummary?: ConversationSummary;
}

export interface GatewayBusinessRequestAdapterResult {
  session: SessionSnapshot;
  request: GatewayMessageRequest;
}

export interface GatewayHandleResult {
  session: SessionSnapshot;
  orchestratorResult: SupportOrchestratorResult;
  reply: string;
}

export interface GatewayRunner {
  run(input: {
    routeInput: import("../section/types.js").RoutePromptInput;
    knowledgeInput: import("../agents/types.js").KnowledgeAgentInput;
    ticketsInput: import("../agents/types.js").TicketsAgentInput;
    handoffInput: import("../agents/types.js").HandoffAgentInput;
  }): Promise<SupportOrchestratorResult>;
}

export interface GatewayDeps {
  config: GatewayConfig;
  runner: GatewayRunner;
  sessionStore?: SessionStore;
}
