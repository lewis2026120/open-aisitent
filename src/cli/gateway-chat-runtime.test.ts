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
      customerId: "cust-9001",
      storeDir,
    });

    try {
      const first = await runtime.sendMessage("请先帮我查一下退款工单进度");
      const second = await runtime.sendMessage("那退款规则一般多久到账？");

      expect(first.turnNumber).toBe(1);
      expect(first.trace.downstreamRoute).toBe("tickets");
      expect(first.reply).toContain("TK-20260307-01");
      expect(first.reply).toContain("处理中");
      expect(first.trace.ticketToolResult?.ticketState?.ticketId).toBe("TK-20260307-01");
      expect(first.trace.routeDecision.entities).toEqual({});

      expect(second.turnNumber).toBe(2);
      expect(second.trace.downstreamRoute).toBe("knowledge");
      expect(second.reply).toContain("1 到 3 个工作日");
      expect(second.trace.sessionStore.transcriptCount).toBeGreaterThan(
        first.trace.sessionStore.transcriptCount,
      );
    } finally {
      runtime.close();
    }
  });

  it("creates a unique default conversation id for interactive sessions", async () => {
    const runtimeA = createGatewayChatRuntime({ llmMode: "mock" });
    const runtimeB = createGatewayChatRuntime({ llmMode: "mock" });

    try {
      expect(runtimeA.getSessionInfo().conversationId).not.toBe(
        runtimeB.getSessionInfo().conversationId,
      );
    } finally {
      runtimeA.close();
      runtimeB.close();
    }
  });

  it("returns a readable handoff console view when the route escalates", async () => {
    const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), "gateway-chat-handoff-"));
    tempDirs.push(storeDir);

    const runtime = createGatewayChatRuntime({
      llmMode: "mock",
      storeDir,
    });

    try {
      const result = await runtime.sendMessage("现在就给我转人工，我要投诉并要求马上处理");

      expect(result.trace.downstreamRoute).toBe("handoff");
      expect(result.trace.handoffToolResult?.consoleView).toContain("Human Handoff View");
      expect(result.trace.handoffToolResult?.consoleView).toContain("Latest Customer Message");
    } finally {
      runtime.close();
    }
  });

  it("opens a new session and resets the turn counter", async () => {
    const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), "gateway-chat-new-session-"));
    tempDirs.push(storeDir);

    const runtime = createGatewayChatRuntime({
      llmMode: "mock",
      storeDir,
    });

    try {
      const firstSession = runtime.getSessionInfo();
      const firstTurn = await runtime.sendMessage("请帮我查一下退款进度");
      const nextSession = runtime.openNewSession();
      const secondTurn = await runtime.sendMessage("退款一般多久到账？");

      expect(firstTurn.turnNumber).toBe(1);
      expect(nextSession.conversationId).not.toBe(firstSession.conversationId);
      expect(secondTurn.turnNumber).toBe(1);
      expect(secondTurn.trace.ingress.conversationId).toBe(nextSession.conversationId);
      expect(secondTurn.trace.sessionStore.transcriptCount).toBeGreaterThanOrEqual(2);
      expect(secondTurn.trace.adaptedSession.ticketId).toBeUndefined();
    } finally {
      runtime.close();
    }
  });

  it("keeps an explicit initial conversation id until a new session is opened", async () => {
    const runtime = createGatewayChatRuntime({
      llmMode: "mock",
      conversationId: "fixed-conversation-id",
    });

    try {
      expect(runtime.getSessionInfo().conversationId).toBe("fixed-conversation-id");
      expect(runtime.openNewSession().conversationId).not.toBe("fixed-conversation-id");
    } finally {
      runtime.close();
    }
  });
});
