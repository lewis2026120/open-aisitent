import type {
  HandoffAgentInput,
  HandoffAgentResult,
  KnowledgeAgentInput,
  KnowledgeAgentResult,
  ServiceAgentResult,
  TicketsAgentInput,
  TicketsAgentResult,
} from "../agents/types.js";
import type { AgentRoute } from "../core/contracts.js";
import type { RoutePromptInput } from "../section/types.js";

export interface RouteAgentRunner {
  run(input: RoutePromptInput): Promise<ServiceAgentResult>;
}

export interface KnowledgeAgentRunner {
  run(input: KnowledgeAgentInput): Promise<KnowledgeAgentResult>;
}

export interface TicketsAgentRunner {
  run(input: TicketsAgentInput): Promise<TicketsAgentResult>;
}

export interface HandoffAgentRunner {
  run(input: HandoffAgentInput): Promise<HandoffAgentResult>;
}

export interface SupportOrchestratorDeps {
  serviceAgent: RouteAgentRunner;
  knowledgeAgent: KnowledgeAgentRunner;
  ticketsAgent: TicketsAgentRunner;
  handoffAgent: HandoffAgentRunner;
}

export interface SupportOrchestratorInput {
  routeInput: RoutePromptInput;
  knowledgeInput: KnowledgeAgentInput;
  ticketsInput: TicketsAgentInput;
  handoffInput: HandoffAgentInput;
}

export type SupportOrchestratorBranchResult =
  | {
      route: "knowledge";
      finalReply: string;
      result: KnowledgeAgentResult;
    }
  | {
      route: "tickets";
      finalReply: string;
      result: TicketsAgentResult;
    }
  | {
      route: "handoff";
      finalReply: string;
      result: HandoffAgentResult;
    };

export interface SupportOrchestratorResult {
  route: AgentRoute;
  routeResult: ServiceAgentResult;
  downstream: SupportOrchestratorBranchResult;
}
