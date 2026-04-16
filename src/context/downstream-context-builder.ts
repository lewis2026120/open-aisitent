import type {
  HandoffAgentInput,
  KnowledgeAgentInput,
  TicketsAgentInput,
} from "../agents/types.js";
import type { RouteDecision, SharedAgentContext } from "../core/contracts.js";

export function buildKnowledgeInputWithRouteContext(params: {
  input: KnowledgeAgentInput;
  routeDecision: RouteDecision;
  sharedContext?: SharedAgentContext;
}): KnowledgeAgentInput {
  return {
    ...params.input,
    routeDecision: params.routeDecision,
    sharedContext: params.input.sharedContext ?? params.sharedContext,
  };
}

export function buildTicketsInputWithRouteContext(params: {
  input: TicketsAgentInput;
  routeDecision: RouteDecision;
  sharedContext?: SharedAgentContext;
}): TicketsAgentInput {
  return {
    ...params.input,
    routeDecision: params.routeDecision,
    sharedContext: params.input.sharedContext ?? params.sharedContext,
  };
}

export function buildHandoffInputWithRouteContext(params: {
  input: HandoffAgentInput;
  routeDecision: RouteDecision;
  sharedContext?: SharedAgentContext;
}): HandoffAgentInput {
  return {
    ...params.input,
    routeDecision: params.routeDecision,
    sharedContext: params.input.sharedContext ?? params.sharedContext,
  };
}
