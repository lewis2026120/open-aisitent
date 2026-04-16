import type { GatewayBusinessMessageRequest } from "../gateway/types.js";

export interface RuntimeSessionIdentity {
  conversationId: string;
  customerId: string;
  senderId: string;
  senderName?: string;
  channel: string;
}

export interface CreateRuntimeBusinessMessageParams {
  session: RuntimeSessionIdentity;
  text: string;
  messageId: string;
  timestamp: string;
}

export function createRuntimeBusinessMessage(
  params: CreateRuntimeBusinessMessageParams,
): GatewayBusinessMessageRequest {
  return {
    channel: params.session.channel,
    conversationId: params.session.conversationId,
    customerId: params.session.customerId,
    senderId: params.session.senderId,
    senderName: params.session.senderName,
    messageId: params.messageId,
    text: params.text,
    timestamp: params.timestamp,
  };
}
