import { attemptHandoffAgent } from "./handoff-agent-attempt.js";
import type { HandoffAgentResult, HandoffAgentRunParams } from "./types.js";

export async function runHandoffAgent(
  params: HandoffAgentRunParams,
): Promise<HandoffAgentResult> {
  const promptBundle = params.deps.sectionBuilder.buildHandoffPrompt(params.input);
  const attemptResult = await attemptHandoffAgent({
    input: params.input,
    promptBundle,
    llmClient: params.deps.llmClient,
  });

  const uploadResult = await params.deps.handoffTools.handoffUpload({
    customerId: params.input.session.customerId,
    sessionId: params.input.session.sessionId,
    summaryForHuman: attemptResult.plan.summaryForHuman,
    handoffReason: attemptResult.plan.handoffReason,
    urgency: attemptResult.plan.urgency,
    attachmentPayload: attemptResult.plan.attachmentPayload,
    ticketState: params.input.session.ticketState,
    escalationTag: params.input.escalationTag,
  });

  return {
    plan: attemptResult.plan,
    promptBundle,
    rawOutput: attemptResult.rawOutput,
    uploadResult,
  };
}
