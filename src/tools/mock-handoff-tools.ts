import type { HandoffTools, HandoffUploadParams, HandoffUploadResult } from "./handoff-tools.js";

export type MockHandoffResolver = (
  params: HandoffUploadParams,
) => Promise<HandoffUploadResult> | HandoffUploadResult;

export class MockHandoffTools implements HandoffTools {
  constructor(private readonly resolver: MockHandoffResolver) {}

  async handoffUpload(params: HandoffUploadParams): Promise<HandoffUploadResult> {
    return this.resolver(params);
  }

  static accepted(result?: Partial<HandoffUploadResult>): MockHandoffTools {
    return new MockHandoffTools(() => ({
      queueId: result?.queueId ?? "queue-001",
      acceptedAt: result?.acceptedAt ?? "2026-03-08T12:00:00Z",
      urgency: result?.urgency ?? "urgent",
    }));
  }
}
