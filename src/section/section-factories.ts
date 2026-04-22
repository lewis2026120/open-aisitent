import type {
  ClassificationExample,
  ConversationTurn,
  KnowledgeCandidate,
  KnowledgeContext,
  RouteDecision,
  SharedAgentContext,
  TaskGoal,
  TicketState,
  ToolSummary,
} from "../core/contracts.js";
import type { PromptSection } from "./types.js";

export function buildTextSection(params: {
  key: PromptSection["key"];
  title: string;
  lines: string[];
  required?: boolean;
}): PromptSection {
  return {
    key: params.key,
    title: params.title,
    body: params.lines.map((line) => line.trim()).filter(Boolean).join("\n"),
    required: params.required ?? true,
  };
}

export function buildTaskGoalSection(goal: TaskGoal): PromptSection {
  return buildTextSection({
    key: "task-goal",
    title: "Current Task Goal",
    lines: [
      `Task: ${goal.name}`,
      `Instruction: ${goal.instruction}`,
      ...(goal.successCriteria?.length
        ? ["Success criteria:", ...goal.successCriteria.map((item, index) => `${index + 1}. ${item}`)]
        : []),
    ],
  });
}

export function buildCurrentMessageSection(message: string): PromptSection {
  return buildTextSection({
    key: "current-message",
    title: "Current Customer Message",
    lines: [message || "(empty message)"],
  });
}

export function buildClassificationExamplesSection(
  examples: ClassificationExample[],
): PromptSection | null {
  if (examples.length === 0) {
    return null;
  }
  return buildTextSection({
    key: "classification-examples",
    title: "Classification Examples",
    lines: examples.flatMap((example, index) => [
      `${index + 1}. Route=${example.route}; Intent=${example.intent}`,
      `   Example: ${example.example}`,
      ...(example.reason ? [`   Why: ${example.reason}`] : []),
    ]),
  });
}

export function buildRouteEvidenceSection(
  examples: ClassificationExample[],
): PromptSection | null {
  if (examples.length === 0) {
    return null;
  }

  return buildTextSection({
    key: "route-evidence",
    title: "Route Evidence Library",
    lines: examples.flatMap((example, index) => [
      `${index + 1}. Route=${example.route}; Intent=${example.intent}`,
      `   Case: ${example.example}`,
      ...(example.reason ? [`   Evidence: ${example.reason}`] : []),
    ]),
    required: false,
  });
}

export function buildHistorySection(
  history: ConversationTurn[],
  options: { maxTurns?: number } = {},
): PromptSection {
  const maxTurns = options.maxTurns ?? 6;
  const recentTurns = history.slice(-maxTurns);
  if (recentTurns.length === 0) {
    return buildTextSection({
      key: "history",
      title: "Recent Conversation History",
      lines: ["No earlier conversation was provided."],
    });
  }
  return buildTextSection({
    key: "history",
    title: "Recent Conversation History",
    lines: recentTurns.map(
      (turn, index) => `${index + 1}. [${turn.role}] ${turn.text} (${turn.createdAt})`,
    ),
  });
}

export function buildTicketStateSection(ticketState?: TicketState | null): PromptSection {
  if (!ticketState || ticketState.status === "none") {
    return buildTextSection({
      key: "ticket-state",
      title: "Current Ticket State",
      lines: ["No active ticket is linked to this session."],
    });
  }

  return buildTextSection({
    key: "ticket-state",
    title: "Current Ticket State",
    lines: [
      `Ticket ID: ${ticketState.ticketId ?? "not-created-yet"}`,
      `Status: ${ticketState.status}`,
      `Priority: ${ticketState.priority ?? "unknown"}`,
      `Summary: ${ticketState.summary ?? "(no summary)"}`,
      `Last update: ${ticketState.lastUpdateAt ?? "unknown"}`,
    ],
  });
}

export function buildKnowledgeCandidatesSection(
  candidates: KnowledgeCandidate[] = [],
): PromptSection | null {
  if (candidates.length === 0) {
    return null;
  }
  return buildTextSection({
    key: "knowledge-candidates",
    title: "Knowledge Candidates",
    lines: candidates.flatMap((candidate, index) => [
      `${index + 1}. ${candidate.title} [id=${candidate.id}]`,
      `   Snippet: ${candidate.snippet}`,
      ...(candidate.source ? [`   Source: ${candidate.source}`] : []),
      ...(candidate.score === undefined ? [] : [`   Score: ${candidate.score}`]),
    ]),
    required: false,
  });
}

export function buildKnowledgeContextSection(
  knowledgeContext?: KnowledgeContext | null,
): PromptSection | null {
  if (!knowledgeContext || knowledgeContext.entries.length === 0) {
    return null;
  }

  return buildTextSection({
    key: "knowledge-context",
    title: "Prepared Knowledge Context",
    lines: [
      `Summary: ${knowledgeContext.summary}`,
      ...knowledgeContext.entries.flatMap((entry, index) => [
        `${index + 1}. ${entry.title} [id=${entry.id}]`,
        `   Content: ${entry.content}`,
        ...(entry.source ? [`   Source: ${entry.source}`] : []),
        ...(entry.relevanceScore === undefined
          ? []
          : [`   Relevance: ${entry.relevanceScore}`]),
      ]),
    ],
    required: false,
  });
}

export function buildSharedContextSection(
  sharedContext?: SharedAgentContext,
): PromptSection | null {
  if (!sharedContext) {
    return null;
  }

  const lines: string[] = [];
  if (sharedContext.customerProfile) {
    lines.push(`Customer id: ${sharedContext.customerProfile.customerId}`);
    lines.push(`Customer tier: ${sharedContext.customerProfile.tier ?? "standard"}`);
    if (sharedContext.customerProfile.persona) {
      lines.push(`Customer persona: ${sharedContext.customerProfile.persona}`);
    }
    if (sharedContext.customerProfile.locale) {
      lines.push(`Locale: ${sharedContext.customerProfile.locale}`);
    }
    if (sharedContext.customerProfile.product) {
      lines.push(`Product: ${sharedContext.customerProfile.product}`);
    }
    if (sharedContext.customerProfile.riskLevel) {
      lines.push(`Risk level: ${sharedContext.customerProfile.riskLevel}`);
    }
    if (sharedContext.customerProfile.deviceModel) {
      lines.push(`Device model: ${sharedContext.customerProfile.deviceModel}`);
    }
    if (sharedContext.customerProfile.region) {
      lines.push(`Region: ${sharedContext.customerProfile.region}`);
    }
    if (sharedContext.customerProfile.batch !== undefined) {
      lines.push(`Batch: ${sharedContext.customerProfile.batch}`);
    }
    if (sharedContext.customerProfile.channelEdition) {
      lines.push(`Channel edition: ${sharedContext.customerProfile.channelEdition}`);
    }
    if (sharedContext.customerProfile.tags?.length) {
      lines.push(`Customer tags: ${sharedContext.customerProfile.tags.join(", ")}`);
    }
  }

  if (sharedContext.channelCapabilities) {
    lines.push(`Channel: ${sharedContext.channelCapabilities.channel}`);
    lines.push(`Supports attachments: ${sharedContext.channelCapabilities.supportsAttachments}`);
    lines.push(
      `Supports realtime handoff: ${sharedContext.channelCapabilities.supportsRealtimeHandoff}`,
    );
    lines.push(`Supports rich text: ${sharedContext.channelCapabilities.supportsRichText}`);
    lines.push(`Supports buttons: ${sharedContext.channelCapabilities.supportsButtons}`);
  }

  if (sharedContext.businessPolicy) {
    if (sharedContext.businessPolicy.prioritizeHandoffIntents?.length) {
      lines.push(
        `Prioritized handoff intents: ${sharedContext.businessPolicy.prioritizeHandoffIntents.join(", ")}`,
      );
    }
    if (sharedContext.businessPolicy.prioritizeTicketIntents?.length) {
      lines.push(
        `Prioritized ticket intents: ${sharedContext.businessPolicy.prioritizeTicketIntents.join(", ")}`,
      );
    }
    if (sharedContext.businessPolicy.highRiskTags?.length) {
      lines.push(`High-risk tags: ${sharedContext.businessPolicy.highRiskTags.join(", ")}`);
    }
    if (sharedContext.businessPolicy.preferKnowledgeForHowTo !== undefined) {
      lines.push(
        `Prefer knowledge for how-to: ${sharedContext.businessPolicy.preferKnowledgeForHowTo}`,
      );
    }
    if (sharedContext.businessPolicy.notes?.length) {
      lines.push(`Policy notes: ${sharedContext.businessPolicy.notes.join(" | ")}`);
    }
  }

  if (sharedContext.operational) {
    lines.push(`Handoff enabled: ${sharedContext.operational.handoffEnabled}`);
    lines.push(`Ticketing enabled: ${sharedContext.operational.ticketingEnabled}`);
    lines.push(`Knowledge enabled: ${sharedContext.operational.knowledgeEnabled}`);
    if (sharedContext.operational.businessHours) {
      lines.push(`Business hours: ${sharedContext.operational.businessHours}`);
    }
    if (sharedContext.operational.nowInBusinessHours !== undefined) {
      lines.push(`In business hours now: ${sharedContext.operational.nowInBusinessHours}`);
    }
  }

  if (sharedContext.conversationSummary) {
    lines.push(`Conversation summary: ${sharedContext.conversationSummary.summary}`);
    if (sharedContext.conversationSummary.openIssues.length) {
      lines.push(`Open issues: ${sharedContext.conversationSummary.openIssues.join("; ")}`);
    }
    if (sharedContext.conversationSummary.lastResolvedIssue) {
      lines.push(`Last resolved issue: ${sharedContext.conversationSummary.lastResolvedIssue}`);
    }
  }

  if (lines.length === 0) {
    return null;
  }

  return buildTextSection({
    key: "shared-context",
    title: "Shared Business Context",
    lines,
    required: false,
  });
}

export function buildRouteDecisionSection(routeDecision?: RouteDecision): PromptSection | null {
  if (!routeDecision) {
    return null;
  }

  return buildTextSection({
    key: "route-decision",
    title: "Service Route Decision",
    lines: [
      `Route: ${routeDecision.route}`,
      `Intent: ${routeDecision.intent}`,
      `Confidence: ${routeDecision.confidence}`,
      `Reason: ${routeDecision.reason}`,
      `Entities: ${JSON.stringify(routeDecision.entities)}`,
    ],
    required: false,
  });
}

export function buildToolSummarySection(tools: ToolSummary[] = []): PromptSection | null {
  if (tools.length === 0) {
    return null;
  }
  return buildTextSection({
    key: "tool-summary",
    title: "Allowed Tools",
    lines: tools.map((tool) => `- ${tool.name}: ${tool.description}`),
    required: false,
  });
}

export function buildOutputContractSection(lines: string[]): PromptSection {
  return buildTextSection({
    key: "output-contract",
    title: "Required Output Format",
    lines,
  });
}
