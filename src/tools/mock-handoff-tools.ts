import { renderHandoffConsoleView } from "./handoff-console-view.js";
import type { HandoffTools, HandoffUploadParams, HandoffUploadResult } from "./handoff-tools.js";

export type MockHandoffResolver = (
  params: HandoffUploadParams,
) =>
  | Promise<Omit<HandoffUploadResult, "consoleView"> & { consoleView?: string }>
  | (Omit<HandoffUploadResult, "consoleView"> & { consoleView?: string });

export class MockHandoffTools implements HandoffTools {
  constructor(private readonly resolver: MockHandoffResolver) {}

  async handoffUpload(params: HandoffUploadParams): Promise<HandoffUploadResult> {
    const result = await this.resolver(params);
    return {
      ...result,
      consoleView:
        result.consoleView ??
        renderHandoffConsoleView({
          queueId: result.queueId,
          acceptedAt: result.acceptedAt,
          customerId: params.customerId,
          sessionId: params.sessionId,
          latestUserMessage: params.latestUserMessage,
          summaryForHuman: params.summaryForHuman,
          handoffReason: params.handoffReason,
          urgency: params.urgency,
          attachmentPayload: params.attachmentPayload,
          ticketState: params.ticketState,
          escalationTag: params.escalationTag,
          history: params.history,
          sharedContext: params.sharedContext,
          routeDecision: params.routeDecision,
          knowledgeCandidates: params.knowledgeCandidates,
        }),
    };
  }

  static accepted(result?: Partial<HandoffUploadResult>): MockHandoffTools {
    return new MockHandoffTools(() => ({
      queueId: result?.queueId ?? "queue-001",
      acceptedAt: result?.acceptedAt ?? "2026-03-08T12:00:00Z",
      urgency: result?.urgency ?? "urgent",
    }));
  }
}
