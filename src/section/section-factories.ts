import type {
  ClassificationExample,
  ConversationTurn,
  KnowledgeCandidate,
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
