import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRuntimeBusinessMessage } from "../runtime/business-message-factory.js";
import { createSupportRuntime } from "../runtime/support-runtime.js";

interface DemoOptions {
  ticketToolMode: "native" | "bash";
  llmMode: "mock" | "auto";
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-terminal-chain-"));
  const runtime = createSupportRuntime({
    llmMode: options.llmMode,
    ticketToolMode: options.ticketToolMode,
    storeDir,
  });

  const baseSession = {
    channel: "terminal",
    conversationId: "conv-full-chain-001",
    customerId: "cust-full-001",
    senderId: "user-full-001",
    senderName: "测试用户",
    customerPersona: "new_customer" as const,
    deviceModel: "OC-PRO300",
    region: "华东" as const,
    batch: 2,
    channelEdition: "专供" as const,
  };

  const turns = [
    "我是新客户，这个设备第一次怎么配置？",
    "请帮我新建一个工单，设备总是离线。",
    "请更新这个工单，优先级提高，状态改为处理中。",
    "现在就给我转人工，我要投诉并升级。",
  ];

  try {
    for (let index = 0; index < turns.length; index += 1) {
      const trace = await runtime.handleBusinessMessage(
        createRuntimeBusinessMessage({
          session: baseSession,
          text: turns[index],
          messageId: `msg-full-${index + 1}`,
          timestamp: `2026-04-16T10:0${index}:00Z`,
        }),
      );

      console.log(`\n========== TURN ${index + 1} ==========`);
      console.log(JSON.stringify(trace, null, 2));
    }

    console.log("\nSTORE_DIR=" + storeDir);
    console.log("SESSION_FILE=" + path.join(storeDir, "conv-full-chain-001.json"));
    console.log("DB_PATH=" + path.join(storeDir, "tickets.sqlite"));
  } finally {
    runtime.close();
  }
}

function parseArgs(args: string[]): DemoOptions {
  const parsed: DemoOptions = {
    ticketToolMode: "bash",
    llmMode: "mock",
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--ticket-tool-mode") {
      const value = args[i + 1];
      if (value === "native" || value === "bash") {
        parsed.ticketToolMode = value;
      }
      i += 1;
      continue;
    }

    if (arg === "--llm-mode") {
      const value = args[i + 1];
      if (value === "mock" || value === "auto") {
        parsed.llmMode = value;
      }
      i += 1;
    }
  }

  return parsed;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
