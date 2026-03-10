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
import type { HandoffPromptInput, PromptSection } from "../types.js";

export function buildHandoffSections(input: HandoffPromptInput): PromptSection[] {
  return [
    buildTextSection({
      key: "role",
      title: "Agent Role",
      lines: [
        "You are HandoffToHumanAgent for a customer support MVP.",
        "Prepare a clean escalation package for a human teammate.",
        "Summarize the issue, urgency, and what has already been tried.",
        "You may only use the handoffUpload tool.",
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
      '{ "handoffReason": "string", "urgency": "normal|urgent", "summaryForHuman": "string", "attachmentPayload": "string", "userReplyDraft": "string" }',
      "The summary should help a human continue the case without rereading the whole chat.",
    ]),
  ].filter((section): section is PromptSection => section !== null);
}
