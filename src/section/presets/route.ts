import {
  buildClassificationExamplesSection,
  buildCurrentMessageSection,
  buildHistorySection,
  buildKnowledgeCandidatesSection,
  buildOutputContractSection,
  buildSharedContextSection,
  buildTaskGoalSection,
  buildTextSection,
  buildTicketStateSection,
} from "../section-factories.js";
import type { PromptSection, RoutePromptInput } from "../types.js";

export function buildRouteSections(input: RoutePromptInput): PromptSection[] {
  return [
    buildTextSection({
      key: "role",
      title: "Agent Role",
      lines: [
        "You are ServiceAgent, the main router for a customer support MVP.",
        "Choose only one route: knowledge, tickets, or handoff.",
        "Do not solve the request directly. Only decide the best next agent.",
      ],
    }),
    buildTaskGoalSection(input.taskGoal),
    buildCurrentMessageSection(input.session.latestUserMessage),
    buildClassificationExamplesSection(input.classificationExamples),
    buildHistorySection(input.session.history),
    buildSharedContextSection(input.sharedContext ?? input.session.sharedContext),
    buildTicketStateSection(input.session.ticketState),
    buildKnowledgeCandidatesSection(input.knowledgeCandidates),
    buildOutputContractSection([
      "Reply with JSON only.",
      "Schema:",
      '{ "route": "knowledge|tickets|handoff", "intent": "string", "confidence": 0.0, "reason": "string", "entities": { "key": "value" } }',
      "Confidence should be a number from 0 to 1.",
    ]),
  ].filter((section): section is PromptSection => section !== null);
}
