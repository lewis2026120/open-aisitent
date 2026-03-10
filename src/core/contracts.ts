export type AgentRoute = "knowledge" | "tickets" | "handoff";

export type TicketStatus = "none" | "open" | "pending" | "resolved" | "closed";

export type TicketPriority = "low" | "medium" | "high";

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
  suggestedSearchQuery: string;
  answerDraft: string;
  citedKnowledgeIds: string[];
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
