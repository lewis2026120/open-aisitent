import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createRuntimeBusinessMessage } from "./business-message-factory.js";
import { createSupportRuntime } from "./support-runtime.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await fs.rm(dir, { recursive: true, force: true });
    }),
  );
});

describe("SupportRuntime", () => {
  it("handles a fresh inbound message without demo history or ticket state", async () => {
    const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), "support-runtime-fresh-"));
    tempDirs.push(storeDir);

    const runtime = createSupportRuntime({
      llmMode: "mock",
      storeDir,
    });

    try {
      const trace = await runtime.handleBusinessMessage(
        createRuntimeBusinessMessage({
          session: {
            channel: "terminal",
            conversationId: "conv-fresh-001",
            customerId: "cust-fresh-001",
            senderId: "sender-fresh-001",
            senderName: "Fresh User",
          },
          text: "退款一般多久到账？",
          messageId: "msg-fresh-001",
          timestamp: "2026-03-10T10:00:00Z",
        }),
      );

      expect(trace.downstreamRoute).toBe("knowledge");
      expect(trace.routeDecision.entities).toEqual({});
      expect(trace.adaptedSession.ticketId).toBeUndefined();
      expect(trace.sessionStore.transcriptCount).toBe(2);
      expect(trace.knowledgeContextResult?.entryIds.length).toBeGreaterThan(0);
    } finally {
      runtime.close();
    }
  });

  it("persists the conversation and reuses real session state on the next turn", async () => {
    const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), "support-runtime-stateful-"));
    tempDirs.push(storeDir);

    const runtime = createSupportRuntime({
      llmMode: "mock",
      storeDir,
    });

    try {
      const first = await runtime.handleBusinessMessage(
        createRuntimeBusinessMessage({
          session: {
            channel: "terminal",
            conversationId: "conv-stateful-001",
            customerId: "cust-9001",
            senderId: "sender-stateful-001",
          },
          text: "请帮我查一下退款工单进度",
          messageId: "msg-stateful-001",
          timestamp: "2026-03-10T10:00:00Z",
        }),
      );

      const second = await runtime.handleBusinessMessage(
        createRuntimeBusinessMessage({
          session: {
            channel: "terminal",
            conversationId: "conv-stateful-001",
            customerId: "cust-9001",
            senderId: "sender-stateful-001",
          },
          text: "现在转人工处理吧，我要投诉",
          messageId: "msg-stateful-002",
          timestamp: "2026-03-10T10:05:00Z",
        }),
      );

      expect(first.downstreamRoute).toBe("tickets");
      expect(first.ticketToolResult?.ticketState?.ticketId).toBe("TK-20260307-01");
      expect(second.downstreamRoute).toBe("handoff");
      expect(second.sessionStore.transcriptCount).toBeGreaterThan(first.sessionStore.transcriptCount);
      expect(second.handoffToolResult?.consoleView).toContain("Human Handoff View");
      expect(second.adaptedSession.historyCount).toBeGreaterThan(first.adaptedSession.historyCount);
    } finally {
      runtime.close();
    }
  });

  it("asks for order or ticket details when a tickets query cannot locate a record", async () => {
    const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), "support-runtime-missing-ticket-"));
    tempDirs.push(storeDir);

    const runtime = createSupportRuntime({
      llmMode: "mock",
      route: "tickets",
      storeDir,
    });

    try {
      const trace = await runtime.handleBusinessMessage(
        createRuntimeBusinessMessage({
          session: {
            channel: "terminal",
            conversationId: "conv-missing-ticket-001",
            customerId: "cust-no-ticket-001",
            senderId: "sender-no-ticket-001",
          },
          text: "今天我的订单处理的如何",
          messageId: "msg-missing-ticket-001",
          timestamp: "2026-03-10T10:00:00Z",
        }),
      );

      expect(trace.downstreamRoute).toBe("tickets");
      expect(trace.ticketToolResult?.ticketState).toBeNull();
      expect(trace.downstreamReply).toContain("订单号");
      expect(trace.downstreamReply).toContain("工单号");
    } finally {
      runtime.close();
    }
  });
});
