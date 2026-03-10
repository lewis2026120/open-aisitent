import type { ConversationTurn, SessionSnapshot, TicketState } from "../core/contracts.js";

export interface SessionStoreHistoryMessage {
  messageId: string;
  direction: "inbound" | "outbound";
  text: string;
  timestamp: string;
}

export interface SessionStoreBusinessMessage {
  channel: string;
  conversationId: string;
  customerId: string;
  senderId: string;
  senderName?: string;
  messageId: string;
  text: string;
  timestamp: string;
  history?: SessionStoreHistoryMessage[];
  ticketState?: TicketState | null;
}

export interface SessionAssistantReply {
  sessionId: string;
  text: string;
  timestamp: string;
  messageId?: string;
}

export interface SessionRecord {
  sessionId: string;
  customerId: string;
  channel: string;
  senderId: string;
  senderName?: string;
  transcript: ConversationTurn[];
  ticketState?: TicketState | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionStore {
  recordBusinessMessage(input: SessionStoreBusinessMessage): Promise<SessionSnapshot>;
  appendAssistantReply(input: SessionAssistantReply): Promise<SessionSnapshot>;
  updateTicketState(sessionId: string, ticketState: TicketState | null): Promise<SessionSnapshot | null>;
  getSnapshot(sessionId: string): Promise<SessionSnapshot | null>;
  getRecord(sessionId: string): Promise<SessionRecord | null>;
  resolveSessionFilePath(sessionId: string): string;
}
