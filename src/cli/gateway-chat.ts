#!/usr/bin/env node
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { AgentRoute } from "../core/contracts.js";
import { createGatewayChatRuntime } from "./gateway-chat-runtime.js";
import { loadDotEnv } from "./load-dotenv.js";

loadDotEnv();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const runtime = createGatewayChatRuntime(parseArgs(args));
  const session = runtime.getSessionInfo();
  const rl = readline.createInterface({ input, output, terminal: true });

  printWelcome(session);

  try {
    if (input.isTTY) {
      while (true) {
        let rawInput: string;
        try {
          rawInput = await rl.question("\nYou> ");
        } catch (error) {
          if (isReadlineClosedError(error)) {
            output.write("\nBye.\n");
            break;
          }
          throw error;
        }

        const shouldExit = await processChatLine(runtime, rawInput);
        if (shouldExit) {
          break;
        }
      }
    } else {
      let exited = false;
      for await (const rawInput of rl) {
        const shouldExit = await processChatLine(runtime, rawInput);
        if (shouldExit) {
          exited = true;
          break;
        }
      }

      if (!exited) {
        output.write("\nBye.\n");
      }
    }
  } finally {
    rl.close();
  }
}

async function processChatLine(
  runtime: ReturnType<typeof createGatewayChatRuntime>,
  rawInput: string,
): Promise<boolean> {
  const message = rawInput.trim();

  if (!message) {
    return false;
  }

  if (message.toLowerCase() === "exit") {
    output.write("\nBye.\n");
    return true;
  }

  try {
    const result = await runtime.sendMessage(message);
    output.write(`\nAssistant> ${result.reply}\n`);
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    output.write(`\nError> ${text}\n`);
  }

  return false;
}

function printWelcome(session: ReturnType<ReturnType<typeof createGatewayChatRuntime>["getSessionInfo"]>): void {
  output.write("\n=== Gateway Interactive CLI ===\n");
  output.write(`Conversation: ${session.conversationId}\n`);
  output.write(`Channel: ${session.channel}\n`);
  output.write(`Store: ${session.storeDir}\n`);
  output.write('Type a message and press Enter. Type "exit" to quit.\n');
}

function isReadlineClosedError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ERR_USE_AFTER_CLOSE";
}

function parseArgs(args: string[]): {
  route?: AgentRoute;
  llmMode?: "auto" | "mock" | "minimax";
  channel?: string;
  senderName?: string;
  senderId?: string;
  customerId?: string;
  conversationId?: string;
  storeDir?: string;
  minimaxBaseUrl?: string;
  minimaxModel?: string;
  minimaxApiKey?: string;
  minimaxMaxTokens?: number;
} {
  const parsed: {
    route?: AgentRoute;
    llmMode?: "auto" | "mock" | "minimax";
    channel?: string;
    senderName?: string;
    senderId?: string;
    customerId?: string;
    conversationId?: string;
    storeDir?: string;
    minimaxBaseUrl?: string;
    minimaxModel?: string;
    minimaxApiKey?: string;
    minimaxMaxTokens?: number;
  } = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--real") {
      parsed.llmMode = "minimax";
      continue;
    }
    if (arg === "--mock") {
      parsed.llmMode = "mock";
      continue;
    }
    if (arg === "--route") {
      const route = args[index + 1];
      if (route === "knowledge" || route === "tickets" || route === "handoff") {
        parsed.route = route;
      }
      index += 1;
      continue;
    }
    if (arg === "--channel") {
      parsed.channel = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--sender-name") {
      parsed.senderName = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--sender-id") {
      parsed.senderId = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--customer-id") {
      parsed.customerId = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--conversation-id") {
      parsed.conversationId = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--store-dir") {
      parsed.storeDir = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--minimax-base-url") {
      parsed.minimaxBaseUrl = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--minimax-model") {
      parsed.minimaxModel = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--minimax-api-key") {
      parsed.minimaxApiKey = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--minimax-max-tokens") {
      const rawValue = args[index + 1];
      const parsedValue = Number.parseInt(rawValue ?? "", 10);
      if (Number.isInteger(parsedValue) && parsedValue > 0) {
        parsed.minimaxMaxTokens = parsedValue;
      }
      index += 1;
    }
  }

  return parsed;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error("Gateway interactive CLI failed:\n" + message);
  process.exitCode = 1;
});
