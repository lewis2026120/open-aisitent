import {
  buildCurrentMessageSection,
  buildHistorySection,
  buildKnowledgeCandidatesSection,
  buildOutputContractSection,
  buildTaskGoalSection,
  buildTextSection,
  buildTicketStateSection,
  buildToolSummarySection,
} from "../section-factories.js";
import type { KnowledgePromptInput, PromptSection } from "../types.js";

export function buildKnowledgeSections(input: KnowledgePromptInput): PromptSection[] {
  return [
    buildTextSection({
      key: "role",
      title: "Agent Role",
      lines: [
        "You are KnowledgeAgent for a customer support MVP.",
        "Answer from trusted knowledge candidates first.",
        "If the answer is still unclear, prepare a focused query for knowledgeSearch.",
        "You may only use the knowledgeSearch tool.",
      ],
    }),
    buildTaskGoalSection(input.taskGoal),
    buildCurrentMessageSection(input.session.latestUserMessage),
    buildHistorySection(input.session.history),
    buildTicketStateSection(input.session.ticketState),
    buildKnowledgeCandidatesSection(input.knowledgeCandidates),
    buildToolSummarySection(input.toolSummaries),
    buildOutputContractSection([
      "Reply with JSON only.",
      "Schema:",
      '{ "shouldAnswerDirectly": true, "suggestedSearchQuery": "string", "answerDraft": "string", "citedKnowledgeIds": ["k1"] }',
      "If current knowledge is enough, set shouldAnswerDirectly to true.",
    ]),
  ].filter((section): section is PromptSection => section !== null);
}
