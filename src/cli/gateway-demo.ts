#!/usr/bin/env node
import { runGatewayDemo } from "../demo/gateway-demo.js";
import type { AgentRoute } from "../core/contracts.js";
import { loadDotEnv } from "./load-dotenv.js";

loadDotEnv();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  const trace = await runGatewayDemo(options);

  console.log("\n=== Gateway CLI Demo ===");
  console.log(JSON.stringify(trace, null, 2));
  console.log("\n=== Final Reply ===");
  console.log(trace.downstreamReply);
}

function parseArgs(args: string[]): {
  message?: string;
  route?: AgentRoute;
  llmMode?: "auto" | "mock" | "minimax";
  channel?: string;
  senderName?: string;
  minimaxBaseUrl?: string;
  minimaxModel?: string;
  minimaxApiKey?: string;
  minimaxMaxTokens?: number;
} {
  const parsed: {
    message?: string;
    route?: AgentRoute;
    llmMode?: "auto" | "mock" | "minimax";
    channel?: string;
    senderName?: string;
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
    if (arg === "--message") {
      parsed.message = args[index + 1];
      index += 1;
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
  console.error("Gateway CLI demo failed:\n" + message);
  process.exitCode = 1;
});
