import path from "node:path";
import type { AgentRoute } from "../core/contracts.js";
import { runGatewayDemo, type GatewayDemoOptions, type GatewayDemoTrace } from "../demo/gateway-demo.js";

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
  trace: GatewayDemoTrace;
}

export interface GatewayChatRuntime {
  sendMessage(text: string): Promise<GatewayChatTurnResult>;
  getSessionInfo(): {
    conversationId: string;
    customerId: string;
    senderId: string;
    senderName: string;
    channel: string;
    storeDir: string;
  };
}

export function createGatewayChatRuntime(
  options: GatewayChatRuntimeOptions = {},
): GatewayChatRuntime {
  const sessionOptions = createSessionOptions(options);
  let turnNumber = 0;

  return {
    async sendMessage(text: string): Promise<GatewayChatTurnResult> {
      const userText = text.trim();
      if (!userText) {
        throw new Error("Chat message cannot be empty.");
      }

      turnNumber += 1;
      const now = new Date().toISOString();
      const trace = await runGatewayDemo({
        ...sessionOptions,
        message: userText,
        messageId: buildMessageId(turnNumber),
        timestamp: now,
      });

      return {
        turnNumber,
        userText,
        reply: trace.downstreamReply,
        trace,
      };
    },

    getSessionInfo() {
      return {
        conversationId: sessionOptions.conversationId!,
        customerId: sessionOptions.customerId!,
        senderId: sessionOptions.senderId!,
        senderName: sessionOptions.senderName!,
        channel: sessionOptions.channel!,
        storeDir: sessionOptions.storeDir!,
      };
    },
  };
}

function createSessionOptions(options: GatewayChatRuntimeOptions): GatewayDemoOptions {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    ...options,
    // Use a unique default conversation id so each interactive CLI run starts a fresh session.
    conversationId: options.conversationId ?? `cli-session-${seed}`,
    customerId: options.customerId ?? "cust-cli-001",
    senderId: options.senderId ?? "cli-user-001",
    senderName: options.senderName ?? "CLI User",
    channel: options.channel ?? "terminal",
    storeDir: options.storeDir ?? path.join(process.cwd(), ".demo-session-store"),
  };
}

function buildMessageId(turnNumber: number): string {
  return `msg-${Date.now()}-${turnNumber}`;
}
