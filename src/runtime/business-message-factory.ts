import type { GatewayBusinessMessageRequest } from "../gateway/types.js";
import type { ChannelEdition, CustomerPersona, SupportRegion } from "../core/contracts.js";

export interface RuntimeSessionIdentity {
  conversationId: string;
  customerId: string;
  senderId: string;
  senderName?: string;
  channel: string;
  customerPersona?: CustomerPersona;
  deviceModel?: string;
  region?: SupportRegion;
  batch?: 0 | 1 | 2 | 3 | 4 | 5 | number;
  channelEdition?: ChannelEdition;
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
    customerPersona: params.session.customerPersona,
    deviceModel: params.session.deviceModel,
    region: params.session.region,
    batch: params.session.batch,
    channelEdition: params.session.channelEdition,
    messageId: params.messageId,
    text: params.text,
    timestamp: params.timestamp,
  };
}
