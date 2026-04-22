import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFileSessionStore } from "./session-store.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("FileSessionStore", () => {
  it("creates a session from a business message and persists it", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "open-assistant-session-"));
    tempDirs.push(dir);
    const store = createFileSessionStore(dir);

    const snapshot = await store.recordBusinessMessage({
      channel: "whatsapp",
      conversationId: "conv-001",
      customerId: "cust-001",
      senderId: "user-001",
      senderName: "李雷",
      messageId: "msg-001",
      text: "请帮我查一下退款工单进度。",
      timestamp: "2026-03-10T10:00:00Z",
      history: [
        {
          messageId: "msg-old-001",
          direction: "outbound",
          text: "你好，请问需要什么帮助？",
          timestamp: "2026-03-10T09:00:00Z",
        },
      ],
      ticketState: {
        ticketId: "TK-001",
        status: "pending",
        priority: "high",
        summary: "退款工单",
        lastUpdateAt: "2026-03-10T09:30:00Z",
      },
    });

    const record = await store.getRecord("conv-001");

    expect(snapshot.latestUserMessage).toContain("退款工单进度");
    expect(record?.transcript).toHaveLength(2);
    expect(record?.ticketState?.ticketId).toBe("TK-001");
  });

  it("appends assistant replies and keeps them in snapshot history", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "open-assistant-session-"));
    tempDirs.push(dir);
    const store = createFileSessionStore(dir);

    await store.recordBusinessMessage({
      channel: "telegram",
      conversationId: "conv-002",
      customerId: "cust-002",
      senderId: "user-002",
      messageId: "msg-002",
      text: "退款多久到账？",
      timestamp: "2026-03-10T10:10:00Z",
    });

    const snapshot = await store.appendAssistantReply({
      sessionId: "conv-002",
      text: "退款通常会在 1 到 3 个工作日内完成。",
      timestamp: "2026-03-10T10:10:30Z",
      messageId: "reply-002",
    });

    expect(snapshot.latestUserMessage).toBe("退款多久到账？");
    expect(snapshot.history.some((turn) => turn.role === "assistant")).toBe(true);
  });

  it("updates ticket state for an existing session", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "open-assistant-session-"));
    tempDirs.push(dir);
    const store = createFileSessionStore(dir);

    await store.recordBusinessMessage({
      channel: "whatsapp",
      conversationId: "conv-003",
      customerId: "cust-003",
      senderId: "user-003",
      messageId: "msg-003",
      text: "帮我看看工单状态",
      timestamp: "2026-03-10T10:20:00Z",
    });

    const snapshot = await store.updateTicketState("conv-003", {
      ticketId: "TK-003",
      status: "open",
      priority: "medium",
      summary: "新工单",
      lastUpdateAt: "2026-03-10T10:21:00Z",
    });

    expect(snapshot?.ticketState?.status).toBe("open");
  });

  it("hydrates a new session with recent memory from the same customer", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "open-assistant-session-"));
    tempDirs.push(dir);
    const store = createFileSessionStore(dir);

    await store.recordBusinessMessage({
      channel: "whatsapp",
      conversationId: "conv-memory-001",
      customerId: "cust-memory-001",
      senderId: "user-memory-001",
      messageId: "msg-memory-001",
      text: "我的设备这两天频繁断线。",
      timestamp: "2026-03-10T10:00:00Z",
    });

    await store.appendAssistantReply({
      sessionId: "conv-memory-001",
      text: "我先帮你排查网络与固件版本。",
      timestamp: "2026-03-10T10:00:20Z",
      messageId: "reply-memory-001",
    });

    const snapshot = await store.recordBusinessMessage({
      channel: "whatsapp",
      conversationId: "conv-memory-002",
      customerId: "cust-memory-001",
      senderId: "user-memory-001",
      messageId: "msg-memory-002",
      text: "我换了环境还是有问题，继续帮我看。",
      timestamp: "2026-03-10T11:00:00Z",
    });

    expect(snapshot.history.some((turn) => turn.id.startsWith("mem-conv-memory-001"))).toBe(true);
  });
});
