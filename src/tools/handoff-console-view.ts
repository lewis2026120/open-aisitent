import type {
  ConversationTurn,
  KnowledgeCandidate,
  RouteDecision,
  SharedAgentContext,
  TicketState,
} from "../core/contracts.js";

export interface HandoffConsoleViewData {
  queueId: string;
  acceptedAt: string;
  customerId: string;
  sessionId: string;
  latestUserMessage: string;
  summaryForHuman: string;
  handoffReason: string;
  urgency: "normal" | "urgent";
  attachmentPayload: string;
  ticketState?: TicketState | null;
  escalationTag?: string;
  history: ConversationTurn[];
  sharedContext?: SharedAgentContext;
  routeDecision?: RouteDecision;
  knowledgeCandidates?: KnowledgeCandidate[];
}

export function renderHandoffConsoleView(data: HandoffConsoleViewData): string {
  const sections = [
    [
      "=== Human Handoff View ===",
      `Queue ID: ${data.queueId}`,
      `Accepted At: ${data.acceptedAt}`,
      `Urgency: ${data.urgency}`,
      `Customer ID: ${data.customerId}`,
      `Session ID: ${data.sessionId}`,
      ...(data.escalationTag ? [`Escalation Tag: ${data.escalationTag}`] : []),
    ].join("\n"),
    ["Latest Customer Message", data.latestUserMessage].join("\n"),
    ["Handoff Reason", data.handoffReason].join("\n"),
    ["Summary For Human", data.summaryForHuman].join("\n"),
    formatRouteDecisionSection(data.routeDecision),
    formatTicketStateSection(data.ticketState),
    formatSharedContextSection(data.sharedContext),
    formatConversationSection(data.history),
    formatKnowledgeSection(data.knowledgeCandidates),
    ["Attachment Payload", data.attachmentPayload].join("\n"),
  ].filter((section): section is string => Boolean(section));

  return sections.join("\n\n");
}

function formatRouteDecisionSection(routeDecision?: RouteDecision): string | null {
  if (!routeDecision) {
    return null;
  }

  return [
    "Service Route Decision",
    `Route: ${routeDecision.route}`,
    `Intent: ${routeDecision.intent}`,
    `Confidence: ${routeDecision.confidence}`,
    `Reason: ${routeDecision.reason}`,
    `Entities: ${JSON.stringify(routeDecision.entities)}`,
  ].join("\n");
}

function formatTicketStateSection(ticketState?: TicketState | null): string {
  if (!ticketState || ticketState.status === "none") {
    return ["Current Ticket State", "No linked ticket."].join("\n");
  }

  return [
    "Current Ticket State",
    `Ticket ID: ${ticketState.ticketId ?? "unknown"}`,
    `Status: ${ticketState.status}`,
    `Priority: ${ticketState.priority ?? "unknown"}`,
    `Summary: ${ticketState.summary ?? "(no summary)"}`,
    `Last Update: ${ticketState.lastUpdateAt ?? "unknown"}`,
  ].join("\n");
}

function formatSharedContextSection(sharedContext?: SharedAgentContext): string | null {
  if (!sharedContext) {
    return null;
  }

  const lines: string[] = ["Shared Business Context"];

  if (sharedContext.customerProfile) {
    lines.push(`Customer Tier: ${sharedContext.customerProfile.tier ?? "standard"}`);
    if (sharedContext.customerProfile.product) {
      lines.push(`Product: ${sharedContext.customerProfile.product}`);
    }
    if (sharedContext.customerProfile.locale) {
      lines.push(`Locale: ${sharedContext.customerProfile.locale}`);
    }
    if (sharedContext.customerProfile.riskLevel) {
      lines.push(`Risk Level: ${sharedContext.customerProfile.riskLevel}`);
    }
    if (sharedContext.customerProfile.tags?.length) {
      lines.push(`Customer Tags: ${sharedContext.customerProfile.tags.join(", ")}`);
    }
  }

  if (sharedContext.channelCapabilities) {
    lines.push(`Channel: ${sharedContext.channelCapabilities.channel}`);
    lines.push(
      `Realtime Handoff: ${sharedContext.channelCapabilities.supportsRealtimeHandoff}`,
    );
  }

  if (sharedContext.conversationSummary) {
    lines.push(`Conversation Summary: ${sharedContext.conversationSummary.summary}`);
    if (sharedContext.conversationSummary.openIssues.length) {
      lines.push(`Open Issues: ${sharedContext.conversationSummary.openIssues.join(" | ")}`);
    }
  }

  if (sharedContext.businessPolicy?.notes?.length) {
    lines.push(`Policy Notes: ${sharedContext.businessPolicy.notes.join(" | ")}`);
  }

  if (sharedContext.operational) {
    lines.push(`In Business Hours: ${sharedContext.operational.nowInBusinessHours ?? "unknown"}`);
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

function formatConversationSection(history: ConversationTurn[]): string {
  const lines = history.length
    ? history.slice(-6).map((turn, index) => `${index + 1}. [${turn.role}] ${turn.text}`)
    : ["No earlier conversation history."];

  return ["Recent Conversation", ...lines].join("\n");
}

function formatKnowledgeSection(knowledgeCandidates?: KnowledgeCandidate[]): string | null {
  if (!knowledgeCandidates?.length) {
    return null;
  }

  return [
    "Knowledge Signals",
    ...knowledgeCandidates.slice(0, 3).map(
      (candidate, index) => `${index + 1}. ${candidate.title} [${candidate.id}]`,
    ),
  ].join("\n");
}
