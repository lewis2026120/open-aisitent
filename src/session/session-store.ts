import fs from "node:fs/promises";
import path from "node:path";
import type { ConversationTurn, SessionSnapshot, TicketState } from "../core/contracts.js";
import type {
  SessionAssistantReply,
  SessionRecord,
  SessionStore,
  SessionStoreBusinessMessage,
  SessionStoreHistoryMessage,
} from "./types.js";

export class FileSessionStore implements SessionStore {
  constructor(private readonly rootDir: string) {}

  async recordBusinessMessage(input: SessionStoreBusinessMessage): Promise<SessionSnapshot> {
    validateBusinessMessage(input);

    const existing = await this.readRecord(input.conversationId);
    const record =
      existing ??
      createRecord({
        input,
        history: (input.history ?? []).map(convertHistoryMessageToTurn),
      });

    record.channel = input.channel;
    record.customerId = input.customerId;
    record.senderId = input.senderId;
    record.senderName = input.senderName;
    record.updatedAt = input.timestamp;
    if (input.ticketState !== undefined) {
      record.ticketState = input.ticketState;
    }

    upsertTurn(record.transcript, {
      id: input.messageId,
      role: "user",
      text: input.text,
      createdAt: input.timestamp,
    });

    await this.writeRecord(record);
    return toSessionSnapshot(record);
  }

  async appendAssistantReply(input: SessionAssistantReply): Promise<SessionSnapshot> {
    if (input.text.trim().length === 0) {
      throw new Error("SessionStore assistant reply text cannot be empty.");
    }

    const record = await this.requireRecord(input.sessionId);
    upsertTurn(record.transcript, {
      id: input.messageId ?? `assistant-${Date.now()}`,
      role: "assistant",
      text: input.text,
      createdAt: input.timestamp,
    });
    record.updatedAt = input.timestamp;

    await this.writeRecord(record);
    return toSessionSnapshot(record);
  }

  async updateTicketState(
    sessionId: string,
    ticketState: TicketState | null,
  ): Promise<SessionSnapshot | null> {
    const record = await this.readRecord(sessionId);
    if (!record) {
      return null;
    }

    record.ticketState = ticketState;
    record.updatedAt = new Date().toISOString();
    await this.writeRecord(record);
    return toSessionSnapshot(record);
  }

  async getSnapshot(sessionId: string): Promise<SessionSnapshot | null> {
    const record = await this.readRecord(sessionId);
    return record ? toSessionSnapshot(record) : null;
  }

  async getRecord(sessionId: string): Promise<SessionRecord | null> {
    return this.readRecord(sessionId);
  }

  resolveSessionFilePath(sessionId: string): string {
    return path.join(this.rootDir, `${encodeURIComponent(sessionId)}.json`);
  }

  private async requireRecord(sessionId: string): Promise<SessionRecord> {
    const record = await this.readRecord(sessionId);
    if (!record) {
      throw new Error(`SessionStore could not find session "${sessionId}".`);
    }
    return record;
  }

  private async readRecord(sessionId: string): Promise<SessionRecord | null> {
    const filePath = this.resolveSessionFilePath(sessionId);
    try {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content) as SessionRecord;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  private async writeRecord(record: SessionRecord): Promise<void> {
    await fs.mkdir(this.rootDir, { recursive: true });
    const filePath = this.resolveSessionFilePath(record.sessionId);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf8");
  }
}

export function createFileSessionStore(rootDir: string): SessionStore {
  return new FileSessionStore(rootDir);
}

function createRecord(params: {
  input: SessionStoreBusinessMessage;
  history: ConversationTurn[];
}): SessionRecord {
  return {
    sessionId: params.input.conversationId,
    customerId: params.input.customerId,
    channel: params.input.channel,
    senderId: params.input.senderId,
    senderName: params.input.senderName,
    transcript: params.history,
    ticketState: params.input.ticketState,
    createdAt: params.input.timestamp,
    updatedAt: params.input.timestamp,
  };
}

function toSessionSnapshot(record: SessionRecord): SessionSnapshot {
  const latestUserIndex = findLatestUserTurnIndex(record.transcript);
  const latestUserMessage = latestUserIndex >= 0 ? record.transcript[latestUserIndex].text : "";

  return {
    sessionId: record.sessionId,
    customerId: record.customerId,
    latestUserMessage,
    history:
      latestUserIndex >= 0
        ? record.transcript.filter((_, index) => index !== latestUserIndex)
        : [...record.transcript],
    ticketState: record.ticketState,
  };
}

function findLatestUserTurnIndex(transcript: ConversationTurn[]): number {
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    if (transcript[index]?.role === "user") {
      return index;
    }
  }
  return -1;
}

function upsertTurn(transcript: ConversationTurn[], turn: ConversationTurn): void {
  const existingIndex = transcript.findIndex((item) => item.id === turn.id);
  if (existingIndex >= 0) {
    transcript[existingIndex] = turn;
    return;
  }
  transcript.push(turn);
}

function convertHistoryMessageToTurn(message: SessionStoreHistoryMessage): ConversationTurn {
  return {
    id: message.messageId,
    role: message.direction === "inbound" ? "user" : "assistant",
    text: message.text,
    createdAt: message.timestamp,
  };
}

function validateBusinessMessage(input: SessionStoreBusinessMessage): void {
  if (input.text.trim().length === 0) {
    throw new Error("SessionStore business message text cannot be empty.");
  }
}
