import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createGatewayChatRuntime } from "./gateway-chat-runtime.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await fs.rm(dir, { recursive: true, force: true });
    }),
  );
});

describe("GatewayChatRuntime", () => {
  it("keeps a multi-turn session and returns replies for each input", async () => {
    const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), "gateway-chat-runtime-"));
    tempDirs.push(storeDir);

    const runtime = createGatewayChatRuntime({
      llmMode: "mock",
      storeDir,
    });

    const first = await runtime.sendMessage("请先帮我查一下退款工单进度");
    const second = await runtime.sendMessage("那退款规则一般多久到账？");

    expect(first.turnNumber).toBe(1);
    expect(first.trace.downstreamRoute).toBe("tickets");
    expect(first.reply).toContain("工单目前还在处理中");

    expect(second.turnNumber).toBe(2);
    expect(second.trace.downstreamRoute).toBe("knowledge");
    expect(second.reply).toContain("建议先按标准说明处理");
    expect(second.trace.sessionStore.transcriptCount).toBeGreaterThan(
      first.trace.sessionStore.transcriptCount,
    );
  });

  it("creates a unique default conversation id for interactive sessions", async () => {
    const runtimeA = createGatewayChatRuntime({ llmMode: "mock" });
    const runtimeB = createGatewayChatRuntime({ llmMode: "mock" });

    expect(runtimeA.getSessionInfo().conversationId).not.toBe(runtimeB.getSessionInfo().conversationId);
  });
});
