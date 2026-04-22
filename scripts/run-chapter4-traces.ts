#!/usr/bin/env node
/**
 * 第四章运行结果演示脚本
 * 生成三条真实链路的 SupportRuntimeTrace JSON，用于论文展示
 */
import path from "node:path";
import fs from "node:fs/promises";
import { createSupportRuntime } from "../src/runtime/support-runtime.js";
import { createRuntimeBusinessMessage } from "../src/runtime/business-message-factory.js";
import { createFileSessionStore } from "../src/session/session-store.js";

// 统一输出目录
const OUT_DIR = path.join(process.cwd(), ".chapter4-trace");
await fs.mkdir(OUT_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// 场景一：tickets 全链路 Trace
// 用户输入："我的工单进展到哪里了？"
// 期望路由：tickets → ticketsQuery → 回复用户 → 写回 ticketState
// ─────────────────────────────────────────────────────────────────────────────
async function runTicketsTrace(): Promise<void> {
  console.log("\n=== 场景一：tickets 全链路 Trace ===");

  const runtime = createSupportRuntime({
    llmMode: "mock",
    storeDir: path.join(OUT_DIR, "tickets-store"),
  });

  const trace = await runtime.handleBusinessMessage(
    createRuntimeBusinessMessage({
      session: {
        conversationId: "trace-tickets-001",
        customerId: "cust-tickets-demo",
        senderId: "sender-001",
        senderName: "张三",
        channel: "wechat",
      },
      text: "我的工单进展到哪里了？",
      messageId: "msg-tickets-001",
      timestamp: new Date().toISOString(),
    }),
  );

  await fs.writeFile(
    path.join(OUT_DIR, "1-tickets-trace.json"),
    JSON.stringify(trace, null, 2),
    "utf8",
  );

  console.log("回复:", trace.downstreamReply);
  console.log("路由:", trace.routeDecision.route, "| 置信度:", trace.routeDecision.confidence);
  console.log("下游路由:", trace.downstreamRoute);
  console.log("工单结果:", JSON.stringify(trace.ticketToolResult, null, 2));
  console.log("历史条数:", trace.adaptedSession.historyCount);

  runtime.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// 场景二：handoff 升危判断 Trace
// 用户输入："我要投诉，已经等了三小时了！"
// 期望路由：handoff → urgency=urgent → uploadHandoff
// ─────────────────────────────────────────────────────────────────────────────
async function runHandoffTrace(): Promise<void> {
  console.log("\n=== 场景二：handoff 升危判断 Trace ===");

  const runtime = createSupportRuntime({
    llmMode: "mock",
    storeDir: path.join(OUT_DIR, "handoff-store"),
  });

  const trace = await runtime.handleBusinessMessage(
    createRuntimeBusinessMessage({
      session: {
        conversationId: "trace-handoff-001",
        customerId: "cust-handoff-demo",
        senderId: "sender-002",
        senderName: "李四",
        channel: "telegram",
      },
      text: "我要投诉，已经等了三小时了！",
      messageId: "msg-handoff-001",
      timestamp: new Date().toISOString(),
    }),
  );

  await fs.writeFile(
    path.join(OUT_DIR, "2-handoff-trace.json"),
    JSON.stringify(trace, null, 2),
    "utf8",
  );

  console.log("回复:", trace.downstreamReply);
  console.log("路由:", trace.routeDecision.route, "| 意图:", trace.routeDecision.intent);
  console.log("下游路由:", trace.downstreamRoute);
  console.log("转交结果:", JSON.stringify(trace.handoffToolResult, null, 2));

  runtime.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// 场景三：跨会话记忆注入（前后对比）
// 第1步：建立会话1，发2条消息，模拟跨会话记忆
// 第2步：建立会话2（同一 customerId），验证历史注入
// ─────────────────────────────────────────────────────────────────────────────
async function runMemoryTrace(): Promise<void> {
  console.log("\n=== 场景三：跨会话记忆注入 ===");

  const storeDir = path.join(OUT_DIR, "memory-store");

  // 会话1：建立基础会话历史
  const runtime1 = createSupportRuntime({
    llmMode: "mock",
    storeDir,
  });

  // 第1次输入（建立会话）
  await runtime1.handleBusinessMessage(
    createRuntimeBusinessMessage({
      session: {
        conversationId: "trace-memory-s1",
        customerId: "cust-memory-demo",
        senderId: "sender-003",
        senderName: "王五",
        channel: "whatsapp",
      },
      text: "我的退款申请还没处理。",
      messageId: "msg-mem-s1-001",
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), // 2天前
    }),
  );

  // 第2次输入（同一会话）
  await runtime1.handleBusinessMessage(
    createRuntimeBusinessMessage({
      session: {
        conversationId: "trace-memory-s1",
        customerId: "cust-memory-demo",
        senderId: "sender-003",
        senderName: "王五",
        channel: "whatsapp",
      },
      text: "大概什么时候能处理完？",
      messageId: "msg-mem-s1-002",
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1天前
    }),
  );

  console.log("会话1已建立，历史2条消息");

  // 会话2：新会话，同一 customerId，验证跨会话记忆
  const runtime2 = createSupportRuntime({
    llmMode: "mock",
    storeDir,
  });

  const trace2 = await runtime2.handleBusinessMessage(
    createRuntimeBusinessMessage({
      session: {
        conversationId: "trace-memory-s2",
        customerId: "cust-memory-demo",
        senderId: "sender-003",
        senderName: "王五",
        channel: "whatsapp",
      },
      text: "上次那个退款的问题处理得怎么样了？",
      messageId: "msg-mem-s2-001",
      timestamp: new Date().toISOString(),
    }),
  );

  await fs.writeFile(
    path.join(OUT_DIR, "3-memory-trace.json"),
    JSON.stringify(trace2, null, 2),
    "utf8",
  );

  console.log("会话2回复:", trace2.downstreamReply);
  console.log("会话2历史注入条数:", trace2.adaptedSession.historyCount);
  console.log("会话2 sessionId:", trace2.adaptedSession.sessionId);

  // 检查注入的 memory turns
  const sessionStore = createFileSessionStore(storeDir);
  const storedRecord = await sessionStore.getRecord("trace-memory-s2");

  if (storedRecord) {
    const memoryTurns = storedRecord.transcript.filter((t) => t.id.startsWith("mem-"));
    console.log("跨会话记忆注入条数:", memoryTurns.length);
    memoryTurns.forEach((t) => {
      console.log(`  [${t.role}] ${t.text.substring(0, 60)}...`);
    });
  }

  runtime1.close();
  runtime2.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// 主入口
// ─────────────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("第四章系统实现 — 运行结果链路追踪生成器");
  console.log("输出目录:", OUT_DIR);
  console.log("=".repeat(60));

  await runTicketsTrace();
  await runHandoffTrace();
  await runMemoryTrace();

  console.log("\n" + "=".repeat(60));
  console.log("生成完毕！文件列表：");
  const files = await fs.readdir(OUT_DIR);
  for (const f of files) {
    console.log(" -", f);
  }
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
