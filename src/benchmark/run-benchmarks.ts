import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServiceAgent } from "../agents/service-agent.js";
import type { SessionSnapshot } from "../core/contracts.js";
import { createHeuristicMockSupportLlmClient } from "../runtime/heuristic-mock-support-llm.js";
import { createRuntimeBusinessMessage } from "../runtime/business-message-factory.js";
import { createDefaultGatewayConfig } from "../runtime/default-support-config.js";
import { createSupportRuntime } from "../runtime/support-runtime.js";
import type { AgentRoute } from "../core/contracts.js";

interface RouteCase {
  id: string;
  message: string;
  expected: AgentRoute;
}

interface RouteBenchmarkResult {
  total: number;
  correct: number;
  accuracy: number;
  confusion: Record<AgentRoute, Record<AgentRoute, number>>;
  perClass: Record<AgentRoute, { precision: number; recall: number; f1: number }>;
}

interface TicketBenchmarkResult {
  backend: "native" | "bash";
  totalOps: number;
  successOps: number;
  successRate: number;
  byAction: Record<"create" | "update" | "query", { total: number; success: number; rate: number }>;
}

interface MemoryWindowResult {
  name: "window0" | "window2" | "window8";
  factCoverage: number;
  historicalTurnCount: number;
  qualityScore: number;
}

interface FullBenchmarkReport {
  generatedAt: string;
  routeAccuracy: {
    full: RouteBenchmarkResult;
    ablationNoContextInjection: RouteBenchmarkResult;
  };
  ticketExecution: {
    bash: TicketBenchmarkResult;
    native: TicketBenchmarkResult;
  };
  memoryWindowImpact: {
    window0: MemoryWindowResult;
    window2: MemoryWindowResult;
    window8: MemoryWindowResult;
    deltas: {
      window2Vs0: number;
      window8Vs0: number;
    };
  };
}

const ROUTES: AgentRoute[] = ["knowledge", "tickets", "handoff"];

async function main(): Promise<void> {
  const routeFull = await runRouteAccuracyBenchmark({ contextInjection: true });
  const routeAblation = await runRouteAccuracyBenchmark({ contextInjection: false });
  const ticketBash = await runTicketExecutionBenchmark("bash");
  const ticketNative = await runTicketExecutionBenchmark("native");
  const memoryImpact = await runMemoryWindowBenchmark();

  const report: FullBenchmarkReport = {
    generatedAt: new Date().toISOString(),
    routeAccuracy: {
      full: routeFull,
      ablationNoContextInjection: routeAblation,
    },
    ticketExecution: {
      bash: ticketBash,
      native: ticketNative,
    },
    memoryWindowImpact: {
      ...memoryImpact,
      deltas: {
        window2Vs0: round(memoryImpact.window2.qualityScore - memoryImpact.window0.qualityScore),
        window8Vs0: round(memoryImpact.window8.qualityScore - memoryImpact.window0.qualityScore),
      },
    },
  };

  tsx src/benchmark/run-benchmarks.ts
  console.log(JSON.stringify(report, null, 2));
}

async function runRouteAccuracyBenchmark(args: {
  contextInjection: boolean;
}): Promise<RouteBenchmarkResult> {
  const serviceAgent = createServiceAgent({
    llmClient: createHeuristicMockSupportLlmClient(),
  });
  const gatewayConfig = createDefaultGatewayConfig();

  const confusion: RouteBenchmarkResult["confusion"] = {
    knowledge: { knowledge: 0, tickets: 0, handoff: 0 },
    tickets: { knowledge: 0, tickets: 0, handoff: 0 },
    handoff: { knowledge: 0, tickets: 0, handoff: 0 },
  };

  let correct = 0;
  const dataset = buildRouteDataset();

  for (const testCase of dataset) {
    const session = buildRouteSession({
      id: testCase.id,
      message: testCase.message,
      contextInjection: args.contextInjection,
    });

    const result = await serviceAgent.run({
      session,
      taskGoal: gatewayConfig.routeGoal,
      classificationExamples: gatewayConfig.routeExamples,
      knowledgeCandidates: gatewayConfig.knowledgeCandidates,
      sharedContext: session.sharedContext,
      routeEvidenceExamples: [],
    });

    const predicted = result.decision.route;
    confusion[testCase.expected][predicted] += 1;
    if (predicted === testCase.expected) {
      correct += 1;
    }
  }

  const total = dataset.length;
  const perClass = computePerClassMetrics(confusion);

  return {
    total,
    correct,
    accuracy: round(correct / total),
    confusion,
    perClass,
  };
}

function buildRouteSession(args: {
  id: string;
  message: string;
  contextInjection: boolean;
}): SessionSnapshot {
  return {
    sessionId: `route-${args.id}`,
    customerId: `route-customer-${args.id}`,
    latestUserMessage: args.message,
    history: [],
    ticketState: null,
    sharedContext: args.contextInjection
      ? {
          customerProfile: {
            customerId: `route-customer-${args.id}`,
            persona: "new_customer",
            deviceModel: "OC-PRO300",
            region: "华东",
            batch: 2,
            channelEdition: "专供",
          },
          channelCapabilities: {
            channel: "terminal",
            supportsAttachments: true,
            supportsRealtimeHandoff: true,
            supportsRichText: true,
            supportsButtons: false,
          },
          operational: {
            handoffEnabled: true,
            knowledgeEnabled: true,
            ticketingEnabled: true,
          },
        }
      : undefined,
  };
}

async function runTicketExecutionBenchmark(
  backend: "native" | "bash",
): Promise<TicketBenchmarkResult> {
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), `ticket-bench-${backend}-`));
  const runtime = createSupportRuntime({
    llmMode: "mock",
    ticketToolMode: backend,
    storeDir,
  });

  const byAction: TicketBenchmarkResult["byAction"] = {
    create: { total: 0, success: 0, rate: 0 },
    update: { total: 0, success: 0, rate: 0 },
    query: { total: 0, success: 0, rate: 0 },
  };

  let totalOps = 0;
  let successOps = 0;

  try {
    for (let i = 0; i < 8; i += 1) {
      const conversationId = `ticket-conv-${backend}-${i}`;
      const customerId = `ticket-customer-${backend}-${i}`;

      const createTrace = await runtime.handleBusinessMessage(
        createRuntimeBusinessMessage({
          session: {
            channel: "terminal",
            conversationId,
            customerId,
            senderId: `ticket-sender-${i}`,
          },
          text: "请帮我新建一个工单，设备总是离线。",
          messageId: `ticket-create-${i}`,
          timestamp: `2026-04-16T10:0${i}:00Z`,
        }),
      );

      totalOps += 1;
      byAction.create.total += 1;
      if (isTicketOpSuccess(createTrace, "create")) {
        successOps += 1;
        byAction.create.success += 1;
      }

      const updateTrace = await runtime.handleBusinessMessage(
        createRuntimeBusinessMessage({
          session: {
            channel: "terminal",
            conversationId,
            customerId,
            senderId: `ticket-sender-${i}`,
          },
          text: "请更新这个工单，优先级提高，状态改为处理中。",
          messageId: `ticket-update-${i}`,
          timestamp: `2026-04-16T10:1${i}:00Z`,
        }),
      );

      totalOps += 1;
      byAction.update.total += 1;
      if (isTicketOpSuccess(updateTrace, "update")) {
        successOps += 1;
        byAction.update.success += 1;
      }

      const queryTrace = await runtime.handleBusinessMessage(
        createRuntimeBusinessMessage({
          session: {
            channel: "terminal",
            conversationId,
            customerId,
            senderId: `ticket-sender-${i}`,
          },
          text: "请帮我查询当前工单进度。",
          messageId: `ticket-query-${i}`,
          timestamp: `2026-04-16T10:2${i}:00Z`,
        }),
      );

      totalOps += 1;
      byAction.query.total += 1;
      if (isTicketOpSuccess(queryTrace, "query")) {
        successOps += 1;
        byAction.query.success += 1;
      }
    }
  } finally {
    runtime.close();
    await fs.rm(storeDir, { recursive: true, force: true });
  }

  for (const key of Object.keys(byAction) as Array<keyof typeof byAction>) {
    const item = byAction[key];
    item.rate = round(item.success / Math.max(item.total, 1));
  }

  return {
    backend,
    totalOps,
    successOps,
    successRate: round(successOps / totalOps),
    byAction,
  };
}

async function runMemoryWindowBenchmark(): Promise<{
  window0: MemoryWindowResult;
  window2: MemoryWindowResult;
  window8: MemoryWindowResult;
}> {
  const window0 = await evaluateMemoryCondition({
    name: "window0",
    preloadSessions: [],
    customerId: "memory-customer-0",
  });

  const window2 = await evaluateMemoryCondition({
    name: "window2",
    preloadSessions: [
      {
        conversationId: "memory-preload-2-a",
        turns: [
          "我上次反馈的是 OC-PRO300 的掉线问题，请帮我记录。",
        ],
      },
    ],
    customerId: "memory-customer-2",
  });

  const window8 = await evaluateMemoryCondition({
    name: "window8",
    preloadSessions: [
      {
        conversationId: "memory-preload-8-a",
        turns: [
          "设备是 OC-PRO300。",
          "属于第2批次。",
        ],
      },
      {
        conversationId: "memory-preload-8-b",
        turns: [
          "地区是华东。",
          "渠道是专供版，问题是连续掉线。",
        ],
      },
    ],
    customerId: "memory-customer-8",
  });

  return {
    window0,
    window2,
    window8,
  };
}

async function evaluateMemoryCondition(args: {
  name: MemoryWindowResult["name"];
  preloadSessions: Array<{ conversationId: string; turns: string[] }>;
  customerId: string;
}): Promise<MemoryWindowResult> {
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), `memory-bench-${args.name}-`));
  const runtime = createSupportRuntime({
    llmMode: "mock",
    ticketToolMode: "native",
    storeDir,
  });

  try {
    for (const preload of args.preloadSessions) {
      for (let i = 0; i < preload.turns.length; i += 1) {
        await runtime.handleBusinessMessage(
          createRuntimeBusinessMessage({
            session: {
              channel: "terminal",
              conversationId: preload.conversationId,
              customerId: args.customerId,
              senderId: `memory-preload-sender-${args.name}`,
            },
            text: preload.turns[i],
            messageId: `${preload.conversationId}-msg-${i}`,
            timestamp: `2026-04-16T11:${String(i).padStart(2, "0")}:00Z`,
          }),
        );
      }
    }

    const finalTrace = await runtime.handleBusinessMessage(
      createRuntimeBusinessMessage({
        session: {
          channel: "terminal",
          conversationId: `memory-query-${args.name}`,
          customerId: args.customerId,
          senderId: `memory-query-sender-${args.name}`,
        },
        text: "把我上次那个问题直接转人工处理。",
        messageId: `memory-query-msg-${args.name}`,
        timestamp: "2026-04-16T12:00:00Z",
      }),
    );

    const consoleView = finalTrace.handoffToolResult?.consoleView ?? "";
    const factCoverage = computeFactCoverage(consoleView, [
      "OC-PRO300",
      "第2批次",
      "华东",
      "专供",
      "掉线",
    ]);

    const historicalTurnCount =
      consoleView.match(/\n\d+\. \[(user|assistant)\]/g)?.length ?? 0;

    const qualityScore = round(
      Math.min(1, factCoverage) * 0.7 +
        Math.min(1, historicalTurnCount / 6) * 0.3,
    );

    return {
      name: args.name,
      factCoverage: round(factCoverage),
      historicalTurnCount,
      qualityScore,
    };
  } finally {
    runtime.close();
    await fs.rm(storeDir, { recursive: true, force: true });
  }
}

function isTicketOpSuccess(
  trace: Awaited<ReturnType<ReturnType<typeof createSupportRuntime>["handleBusinessMessage"]>>,
  action: "create" | "update" | "query",
): boolean {
  if (trace.downstreamRoute !== "tickets") {
    return false;
  }

  if (!trace.ticketToolResult || trace.ticketToolResult.action !== action) {
    return false;
  }

  return Boolean(trace.ticketToolResult.ticketState?.ticketId);
}

function buildRouteDataset(): RouteCase[] {
  return [
    { id: "k1", message: "退款一般多久到账？", expected: "knowledge" },
    { id: "k2", message: "这个设备第一次怎么配置？", expected: "knowledge" },
    { id: "k3", message: "普通版和专供版有什么区别？", expected: "knowledge" },
    { id: "k4", message: "我想了解你可以提供什么帮助", expected: "knowledge" },
    { id: "k5", message: "为什么这个功能不能开启？", expected: "knowledge" },
    { id: "k6", message: "华东地区这批设备有已知问题吗？", expected: "knowledge" },
    { id: "k7", message: "新客户首次激活步骤是什么？", expected: "knowledge" },
    { id: "k8", message: "老客户复购后功能权限会变吗？", expected: "knowledge" },
    { id: "t1", message: "请帮我新建一个工单，设备离线", expected: "tickets" },
    { id: "t2", message: "我想查询工单进度", expected: "tickets" },
    { id: "t3", message: "帮我更新这个工单状态", expected: "tickets" },
    { id: "t4", message: "这个批次问题请记录并跟进", expected: "tickets" },
    { id: "t5", message: "请提交一个售后处理单", expected: "tickets" },
    { id: "t6", message: "查询下我当前工单状态", expected: "tickets" },
    { id: "t7", message: "补充下我的工单信息", expected: "tickets" },
    { id: "t8", message: "帮我看下这个case处理到哪了", expected: "tickets" },
    { id: "h1", message: "现在就给我转人工", expected: "handoff" },
    { id: "h2", message: "我要投诉，马上升级处理", expected: "handoff" },
    { id: "h3", message: "这个问题很紧急，立刻人工介入", expected: "handoff" },
    { id: "h4", message: "请升级到人工主管", expected: "handoff" },
    { id: "h5", message: "继续这样我会投诉，马上转人工", expected: "handoff" },
    { id: "h6", message: "我不接受机器人答复，马上人工", expected: "handoff" },
  ];
}

function computePerClassMetrics(
  confusion: RouteBenchmarkResult["confusion"],
): RouteBenchmarkResult["perClass"] {
  const output = {
    knowledge: { precision: 0, recall: 0, f1: 0 },
    tickets: { precision: 0, recall: 0, f1: 0 },
    handoff: { precision: 0, recall: 0, f1: 0 },
  };

  for (const route of ROUTES) {
    const tp = confusion[route][route];
    const fp = ROUTES.reduce((sum, actual) => sum + (actual === route ? 0 : confusion[actual][route]), 0);
    const fn = ROUTES.reduce((sum, predicted) => sum + (predicted === route ? 0 : confusion[route][predicted]), 0);

    const precision = tp / Math.max(tp + fp, 1);
    const recall = tp / Math.max(tp + fn, 1);
    const f1 = (2 * precision * recall) / Math.max(precision + recall, 1e-9);

    output[route] = {
      precision: round(precision),
      recall: round(recall),
      f1: round(f1),
    };
  }

  return output;
}

function computeFactCoverage(text: string, facts: string[]): number {
  const hit = facts.filter((fact) => text.includes(fact)).length;
  return hit / Math.max(facts.length, 1);
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
