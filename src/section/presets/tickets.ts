import {
  buildCurrentMessageSection,
  buildHistorySection,
  buildKnowledgeCandidatesSection,
  buildOutputContractSection,
  buildRouteDecisionSection,
  buildSharedContextSection,
  buildTaskGoalSection,
  buildTextSection,
  buildTicketStateSection,
  buildToolSummarySection,
} from "../section-factories.js";
import type { PromptSection, TicketsPromptInput } from "../types.js";

export function buildTicketsSections(input: TicketsPromptInput): PromptSection[] {
  return [
    buildTextSection({
      key: "role",
      title: "Agent Role",
      lines: [
        "You are TicketsAgent for a customer support MVP.",
        "Use a ReAct loop when needed: think, call one allowed tool, observe result, then continue.",
        "Decide whether the user needs a ticket query, ticket creation, or ticket update.",
        "You may only use ticketsQuery, ticketsCreate, and ticketsUpdate.",
      ],
    }),
    buildTaskGoalSection(input.taskGoal),
    buildCurrentMessageSection(input.session.latestUserMessage),
    buildHistorySection(input.session.history),
    buildSharedContextSection(input.sharedContext ?? input.session.sharedContext),
    buildRouteDecisionSection(input.routeDecision),
    buildTicketStateSection(input.session.ticketState),
    buildKnowledgeCandidatesSection(input.knowledgeCandidates),
    buildToolSummarySection(input.toolSummaries),
    buildOutputContractSection([
      "Reply with JSON only.",
      "For intermediate tool steps, use schema:",
      '{ "thought": "string", "toolCall": { "name": "ticketsQuery|ticketsCreate|ticketsUpdate", "args": { "key": "value" } } }',
      "For final answer, use schema:",
      '{ "action": "query|create|update", "reason": "string", "ticketFields": { "key": "value" }, "userReplyDraft": "string" }',
      "ticketFields should contain only the fields needed by the chosen action.",
      "After receiving tool observations, either call another tool or output final action JSON.",
    ]),
  ].filter((section): section is PromptSection => section !== null);
}
