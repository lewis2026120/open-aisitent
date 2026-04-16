import {
  buildCurrentMessageSection,
  buildHistorySection,
  buildKnowledgeContextSection,
  buildOutputContractSection,
  buildRouteDecisionSection,
  buildSharedContextSection,
  buildTaskGoalSection,
  buildTextSection,
  buildTicketStateSection,
} from "../section-factories.js";
import type { KnowledgePromptInput, PromptSection } from "../types.js";

export function buildKnowledgeSections(input: KnowledgePromptInput): PromptSection[] {
  return [
    buildTextSection({
      key: "role",
      title: "Agent Role",
      lines: [
        "You are KnowledgeAgent for a customer support MVP.",
        "Answer from the prepared knowledge context first.",
        "Do not rely on runtime search or other external tools.",
        "If the knowledge is incomplete, acknowledge the limit and give the safest next step.",
      ],
    }),
    buildTaskGoalSection(input.taskGoal),
    buildCurrentMessageSection(input.session.latestUserMessage),
    buildHistorySection(input.session.history),
    buildSharedContextSection(input.sharedContext ?? input.session.sharedContext),
    buildRouteDecisionSection(input.routeDecision),
    buildTicketStateSection(input.session.ticketState),
    buildKnowledgeContextSection(input.knowledgeContext),
    buildOutputContractSection([
      "Reply with JSON only.",
      "Schema:",
      '{ "shouldAnswerDirectly": true, "answerDraft": "string", "citedKnowledgeIds": ["k1"], "missingKnowledge": "string" }',
      "If current knowledge is enough, keep missingKnowledge empty or omit it.",
    ]),
  ].filter((section): section is PromptSection => section !== null);
}
