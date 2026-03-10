import type {
  ClassificationExample,
  KnowledgeCandidate,
  SessionSnapshot,
  TaskGoal,
  ToolSummary,
} from "../core/contracts.js";

export type PromptVariant = "route" | "knowledge" | "tickets" | "handoff";

export type SectionKey =
  | "role"
  | "task-goal"
  | "current-message"
  | "classification-examples"
  | "history"
  | "ticket-state"
  | "knowledge-candidates"
  | "tool-summary"
  | "output-contract";

export interface PromptSection {
  key: SectionKey | (string & {});
  title: string;
  body: string;
  required: boolean;
}

export interface PromptBundle {
  variant: PromptVariant;
  sections: PromptSection[];
  systemPrompt: string;
  metadata: {
    sessionId: string;
    historyCount: number;
    hasTicketState: boolean;
    knowledgeCandidateCount: number;
  };
}

export interface BasePromptInput {
  session: SessionSnapshot;
  taskGoal: TaskGoal;
  toolSummaries?: ToolSummary[];
}

export interface RoutePromptInput extends BasePromptInput {
  classificationExamples: ClassificationExample[];
  knowledgeCandidates?: KnowledgeCandidate[];
}

export interface KnowledgePromptInput extends BasePromptInput {
  knowledgeCandidates: KnowledgeCandidate[];
}

export interface TicketsPromptInput extends BasePromptInput {
  knowledgeCandidates?: KnowledgeCandidate[];
}

export interface HandoffPromptInput extends BasePromptInput {
  knowledgeCandidates?: KnowledgeCandidate[];
}

export interface SectionBuilder {
  buildRoutePrompt(input: RoutePromptInput): PromptBundle;
  buildKnowledgePrompt(input: KnowledgePromptInput): PromptBundle;
  buildTicketsPrompt(input: TicketsPromptInput): PromptBundle;
  buildHandoffPrompt(input: HandoffPromptInput): PromptBundle;
}
