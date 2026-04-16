import type {
  ConversationTurn,
  KnowledgeCandidate,
  RouteDecision,
  SharedAgentContext,
  TicketState,
} from "../core/contracts.js";
import { renderHandoffConsoleView } from "./handoff-console-view.js";

export interface HandoffUploadParams {
  customerId: string;
  sessionId: string;
  latestUserMessage: string;
  summaryForHuman: string;
  handoffReason: string;
  urgency: "normal" | "urgent";
  attachmentPayload: string;
  ticketState?: TicketState | null;
  escalationTag?: string;
  history: ConversationTurn[];
  sharedContext?: SharedAgentContext;
  routeDecision?: RouteDecision;
  knowledgeCandidates?: KnowledgeCandidate[];
}

export interface HandoffUploadResult {
  queueId: string;
  acceptedAt: string;
  urgency: "normal" | "urgent";
  consoleView: string;
}

export interface HandoffTools {
  handoffUpload(params: HandoffUploadParams): Promise<HandoffUploadResult>;
}

export function createConsoleHandoffTools(params: {
  queueId?: string;
  now?: () => string;
} = {}): HandoffTools {
  return {
    async handoffUpload(uploadParams: HandoffUploadParams): Promise<HandoffUploadResult> {
      const acceptedAt = params.now?.() ?? new Date().toISOString();
      const queueId = params.queueId ?? `handoff-${acceptedAt.slice(0, 10).replaceAll("-", "")}`;

      return {
        queueId,
        acceptedAt,
        urgency: uploadParams.urgency,
        consoleView: renderHandoffConsoleView({
          queueId,
          acceptedAt,
          customerId: uploadParams.customerId,
          sessionId: uploadParams.sessionId,
          latestUserMessage: uploadParams.latestUserMessage,
          summaryForHuman: uploadParams.summaryForHuman,
          handoffReason: uploadParams.handoffReason,
          urgency: uploadParams.urgency,
          attachmentPayload: uploadParams.attachmentPayload,
          ticketState: uploadParams.ticketState,
          escalationTag: uploadParams.escalationTag,
          history: uploadParams.history,
          sharedContext: uploadParams.sharedContext,
          routeDecision: uploadParams.routeDecision,
          knowledgeCandidates: uploadParams.knowledgeCandidates,
        }),
      };
    },
  };
}
