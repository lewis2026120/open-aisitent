import type { ConversationTurn, SessionSnapshot } from "../core/contracts.js";
import type {
  GatewayBusinessMessageRequest,
  GatewayBusinessRequestAdapterResult,
  GatewayHistoryMessage,
  GatewayMessageRequest,
} from "./types.js";

export function buildGatewayRequestFromBusinessMessage(
  input: GatewayBusinessMessageRequest,
): GatewayBusinessRequestAdapterResult {
  const session = createSessionSnapshotFromBusinessMessage(input);
  const request: GatewayMessageRequest = {
    session,
    knowledgeCandidates: input.knowledgeCandidates,
  };

  return {
    session,
    request,
  };
}

export function createSessionSnapshotFromBusinessMessage(
  input: GatewayBusinessMessageRequest,
): SessionSnapshot {
  return {
    sessionId: input.conversationId,
    customerId: input.customerId,
    latestUserMessage: input.text,
    history: (input.history ?? []).map(convertHistoryMessage),
    ticketState: input.ticketState,
  };
}

function convertHistoryMessage(message: GatewayHistoryMessage): ConversationTurn {
  return {
    id: message.messageId,
    role: message.direction === "inbound" ? "user" : "assistant",
    text: message.text,
    createdAt: message.timestamp,
  };
}
