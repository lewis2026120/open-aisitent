import type {
  HandoffPlan,
  KnowledgeAnswerPlan,
  KnowledgeCandidate,
  KnowledgeContext,
  RouteDecision,
  SharedAgentContext,
  TicketActionPlan,
  TicketState,
} from "../core/contracts.js";
import type { LlmClient } from "../llm/llm-client.js";
import type {
  KnowledgePromptInput,
  PromptBundle,
  RoutePromptInput,
  SectionBuilder,
  HandoffPromptInput,
  TicketsPromptInput,
} from "../section/types.js";
import type { HandoffUploadResult, HandoffTools } from "../tools/handoff-tools.js";
import type { TicketOperationResult, TicketTools } from "../tools/ticket-tools.js";

export interface ServiceAgentDeps {
  sectionBuilder: SectionBuilder;
  llmClient: LlmClient;
}

export interface ServiceAgentRunParams {
  input: RoutePromptInput;
  deps: ServiceAgentDeps;
}

export interface ServiceAgentAttemptParams {
  input: RoutePromptInput;
  promptBundle: PromptBundle;
  llmClient: LlmClient;
}

export interface ServiceAgentAttemptResult {
  decision: RouteDecision;
  rawOutput: string;
}

export interface ServiceAgentResult {
  decision: RouteDecision;
  promptBundle: PromptBundle;
  rawOutput: string;
}

export interface KnowledgeAgentDeps {
  sectionBuilder: SectionBuilder;
  llmClient: LlmClient;
}

export interface KnowledgeAgentInput extends KnowledgePromptInput {
  routeDecision?: RouteDecision;
  sharedContext?: SharedAgentContext;
}

export interface KnowledgeAgentRunParams {
  input: KnowledgeAgentInput;
  deps: KnowledgeAgentDeps;
}

export interface KnowledgeAgentAttemptParams {
  input: KnowledgeAgentInput;
  promptBundle: PromptBundle;
  llmClient: LlmClient;
}

export interface KnowledgeAgentAttemptResult {
  plan: KnowledgeAnswerPlan;
  rawOutput: string;
}

export interface KnowledgeAgentResult {
  plan: KnowledgeAnswerPlan;
  promptBundle: PromptBundle;
  rawOutput: string;
  usedKnowledgeContext: KnowledgeContext | null;
}

export interface TicketsAgentDeps {
  sectionBuilder: SectionBuilder;
  llmClient: LlmClient;
  ticketTools: TicketTools;
}

export interface TicketsAgentInput extends TicketsPromptInput {
  preferredTicketId?: string;
  routeDecision?: RouteDecision;
  sharedContext?: SharedAgentContext;
}

export interface TicketsAgentRunParams {
  input: TicketsAgentInput;
  deps: TicketsAgentDeps;
}

export interface TicketsAgentAttemptParams {
  input: TicketsAgentInput;
  promptBundle: PromptBundle;
  llmClient: LlmClient;
}

export interface TicketsAgentAttemptResult {
  plan: TicketActionPlan;
  rawOutput: string;
}

export interface TicketsAgentResult {
  plan: TicketActionPlan;
  promptBundle: PromptBundle;
  rawOutput: string;
  latestTicketState: TicketState | null;
  toolResult: TicketOperationResult;
}

export interface HandoffAgentDeps {
  sectionBuilder: SectionBuilder;
  llmClient: LlmClient;
  handoffTools: HandoffTools;
}

export interface HandoffAgentInput extends HandoffPromptInput {
  escalationTag?: string;
  routeDecision?: RouteDecision;
  sharedContext?: SharedAgentContext;
}

export interface HandoffAgentRunParams {
  input: HandoffAgentInput;
  deps: HandoffAgentDeps;
}

export interface HandoffAgentAttemptParams {
  input: HandoffAgentInput;
  promptBundle: PromptBundle;
  llmClient: LlmClient;
}

export interface HandoffAgentAttemptResult {
  plan: HandoffPlan;
  rawOutput: string;
}

export interface HandoffAgentResult {
  plan: HandoffPlan;
  promptBundle: PromptBundle;
  rawOutput: string;
  uploadResult: HandoffUploadResult;
}
