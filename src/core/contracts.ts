export type AgentRoute = "knowledge" | "tickets" | "handoff";

export type TicketStatus = "none" | "open" | "pending" | "resolved" | "closed";

export type TicketPriority = "low" | "medium" | "high";

export type CustomerTier = "standard" | "vip" | "enterprise";

export type RiskLevel = "low" | "medium" | "high";

export interface CustomerProfile {
  customerId: string;
  tier?: CustomerTier;
  locale?: string;
  product?: string;
  tags?: string[];
  riskLevel?: RiskLevel;
}

export interface BusinessPolicyContext {
  prioritizeHandoffIntents?: string[];
  prioritizeTicketIntents?: string[];
  highRiskTags?: string[];
  preferKnowledgeForHowTo?: boolean;
  notes?: string[];
}

export interface ChannelCapabilityContext {
  channel: string;
  supportsAttachments: boolean;
  supportsRealtimeHandoff: boolean;
  supportsRichText: boolean;
  supportsButtons: boolean;
}

export interface OperationalContext {
  handoffEnabled: boolean;
  ticketingEnabled: boolean;
  knowledgeEnabled: boolean;
  businessHours?: string;
  nowInBusinessHours?: boolean;
}

export interface ConversationSummary {
  summary: string;
  openIssues: string[];
  lastResolvedIssue?: string;
}

export interface SharedAgentContext {
  businessPolicy?: BusinessPolicyContext;
  channelCapabilities?: ChannelCapabilityContext;
  customerProfile?: CustomerProfile;
  operational?: OperationalContext;
  conversationSummary?: ConversationSummary;
}

export interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}

export interface TicketState {
  ticketId?: string;
  status: TicketStatus;
  priority?: TicketPriority;
  summary?: string;
  lastUpdateAt?: string;
}

export interface KnowledgeCandidate {
  id: string;
  title: string;
  snippet: string;
  source?: string;
  score?: number;
}

export interface KnowledgeContextEntry {
  id: string;
  title: string;
  content: string;
  source?: string;
  relevanceScore?: number;
}

export interface KnowledgeContext {
  summary: string;
  entries: KnowledgeContextEntry[];
}

export interface ClassificationExample {
  intent: string;
  route: AgentRoute;
  example: string;
  reason?: string;
}

export interface TaskGoal {
  name: string;
  instruction: string;
  successCriteria?: string[];
}

export interface ToolSummary {
  name: string;
  description: string;
}

export interface SessionSnapshot {
  sessionId: string;
  customerId: string;
  latestUserMessage: string;
  history: ConversationTurn[];
  ticketState?: TicketState | null;
  sharedContext?: SharedAgentContext;
}

export interface RouteDecision {
  route: AgentRoute;
  intent: string;
  confidence: number;
  reason: string;
  entities: Record<string, string>;
}

export interface KnowledgeAnswerPlan {
  shouldAnswerDirectly: boolean;
  answerDraft: string;
  citedKnowledgeIds: string[];
  missingKnowledge?: string;
}

export interface TicketActionPlan {
  action: "query" | "create" | "update";
  reason: string;
  ticketFields: Record<string, string>;
  userReplyDraft: string;
}

export interface HandoffPlan {
  handoffReason: string;
  urgency: "normal" | "urgent";
  summaryForHuman: string;
  attachmentPayload: string;
  userReplyDraft: string;
}
