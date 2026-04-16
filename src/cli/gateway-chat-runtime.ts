import path from "node:path";
import type { AgentRoute } from "../core/contracts.js";
import {
  createRuntimeBusinessMessage,
  type RuntimeSessionIdentity,
} from "../runtime/business-message-factory.js";
import {
  createSupportRuntime,
  type SupportRuntime,
  type SupportRuntimeTrace,
} from "../runtime/support-runtime.js";

export interface GatewayChatRuntimeOptions {
  route?: AgentRoute;
  llmMode?: "auto" | "mock" | "minimax";
  channel?: string;
  senderName?: string;
  senderId?: string;
  customerId?: string;
  conversationId?: string;
  storeDir?: string;
  minimaxApiKey?: string;
  minimaxBaseUrl?: string;
  minimaxModel?: string;
  minimaxMaxTokens?: number;
}

export interface GatewayChatTurnResult {
  turnNumber: number;
  userText: string;
  reply: string;
  trace: SupportRuntimeTrace;
}

export interface GatewayChatSessionInfo {
  conversationId: string;
  customerId: string;
  senderId: string;
  senderName: string;
  channel: string;
  storeDir: string;
}

export interface GatewayChatRuntime {
  sendMessage(text: string): Promise<GatewayChatTurnResult>;
  openNewSession(): GatewayChatSessionInfo;
  getSessionInfo(): GatewayChatSessionInfo;
  close(): void;
}

interface GatewayChatSessionOptions {
  route?: AgentRoute;
  llmMode?: "auto" | "mock" | "minimax";
  channel?: string;
  senderName?: string;
  senderId?: string;
  customerId?: string;
  conversationId?: string;
  storeDir?: string;
  minimaxApiKey?: string;
  minimaxBaseUrl?: string;
  minimaxModel?: string;
  minimaxMaxTokens?: number;
}

export function createGatewayChatRuntime(
  options: GatewayChatRuntimeOptions = {},
): GatewayChatRuntime {
  const baseOptions = createBaseSessionOptions(options);
  let sessionOptions = createSessionOptions(baseOptions, false);
  let turnNumber = 0;
  const supportRuntime = createSupportRuntime({
    llmMode: options.llmMode,
    route: options.route,
    storeDir: baseOptions.storeDir,
    minimaxApiKey: options.minimaxApiKey,
    minimaxBaseUrl: options.minimaxBaseUrl,
    minimaxModel: options.minimaxModel,
    minimaxMaxTokens: options.minimaxMaxTokens,
  });

  return {
    async sendMessage(text: string): Promise<GatewayChatTurnResult> {
      const userText = text.trim();
      if (!userText) {
        throw new Error("Chat message cannot be empty.");
      }

      turnNumber += 1;
      const now = new Date().toISOString();
      const trace = await supportRuntime.handleBusinessMessage(
        createRuntimeBusinessMessage({
          session: toSessionIdentity(sessionOptions),
          text: userText,
          messageId: buildMessageId(turnNumber),
          timestamp: now,
        }),
      );

      return {
        turnNumber,
        userText,
        reply: trace.downstreamReply,
        trace,
      };
    },

    openNewSession(): GatewayChatSessionInfo {
      sessionOptions = createSessionOptions(baseOptions, true);
      turnNumber = 0;
      return toSessionInfo(sessionOptions);
    },

    getSessionInfo(): GatewayChatSessionInfo {
      return toSessionInfo(sessionOptions);
    },

    close(): void {
      supportRuntime.close();
    },
  };
}

function createBaseSessionOptions(options: GatewayChatRuntimeOptions): GatewayChatSessionOptions {
  return {
    ...options,
    customerId: options.customerId ?? "cust-cli-001",
    senderId: options.senderId ?? "cli-user-001",
    senderName: options.senderName ?? "CLI User",
    channel: options.channel ?? "terminal",
    storeDir: options.storeDir ?? path.join(process.cwd(), ".support-session-store"),
  };
}

function createSessionOptions(
  options: GatewayChatSessionOptions,
  forceNewConversationId: boolean,
): GatewayChatSessionOptions {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    ...options,
    conversationId:
      forceNewConversationId || !options.conversationId
        ? `cli-session-${seed}`
        : options.conversationId,
  };
}

function toSessionInfo(options: GatewayChatSessionOptions): GatewayChatSessionInfo {
  return {
    conversationId: options.conversationId!,
    customerId: options.customerId!,
    senderId: options.senderId!,
    senderName: options.senderName!,
    channel: options.channel!,
    storeDir: options.storeDir!,
  };
}

function toSessionIdentity(options: GatewayChatSessionOptions): RuntimeSessionIdentity {
  return {
    conversationId: options.conversationId!,
    customerId: options.customerId!,
    senderId: options.senderId!,
    senderName: options.senderName,
    channel: options.channel!,
  };
}

function buildMessageId(turnNumber: number): string {
  return `msg-${Date.now()}-${turnNumber}`;
}
