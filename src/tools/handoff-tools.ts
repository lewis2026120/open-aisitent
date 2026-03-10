import type { TicketState } from "../core/contracts.js";

export interface HandoffUploadParams {
  customerId: string;
  sessionId: string;
  summaryForHuman: string;
  handoffReason: string;
  urgency: "normal" | "urgent";
  attachmentPayload: string;
  ticketState?: TicketState | null;
  escalationTag?: string;
}

export interface HandoffUploadResult {
  queueId: string;
  acceptedAt: string;
  urgency: "normal" | "urgent";
}

export interface HandoffTools {
  handoffUpload(params: HandoffUploadParams): Promise<HandoffUploadResult>;
}
