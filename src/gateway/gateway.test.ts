import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CustomerProfile } from "../core/contracts.js";
import type { SupportOrchestratorResult } from "../orchestration/types.js";
import {
  handoffScenario,
  knowledgeScenario,
  routeScenario,
  ticketsScenario,
} from "../section/test-scenarios.js";
import { createFileSessionStore } from "../session/session-store.js";
import { buildHandoffInput, buildKnowledgeInput, buildRouteInput, buildTicketsInput, createGateway } from "./gateway.js";
import type { GatewayConfig } from "./types.js";

const gatewayConfig: GatewayConfig = {
  routeExamples: routeScenario.classificationExamples,
  routeGoal: routeScenario.taskGoal,
  knowledgeGoal: knowledgeScenario.taskGoal,
  ticketsGoal: ticketsScenario.taskGoal,
  handoffGoal: handoffScenario.taskGoal,
  knowledgeTools: knowledgeScenario.toolSummaries ?? [],
  ticketTools: ticketsScenario.toolSummaries ?? [],
  handoffTools: handoffScenario.toolSummaries ?? [],
  knowledgeCandidates: knowledgeScenario.knowledgeCandidates,
};

describe("Gateway", () => {
  it("builds all agent inputs and returns the final reply", async () => {
    let capturedSessionId = "";
    const gateway = createGateway({
      config: gatewayConfig,
      runner: {
        run: async (input): Promise<SupportOrchestratorResult> => {
          capturedSessionId = input.routeInput.session.sessionId;
          return {
            route: "knowledge",
            routeResult: {
              decision: {
                route: "knowledge",
                intent: "ask_refund_time",
                confidence: 0.9,
                reason: "knowledge answer",
                entities: {},
              },
              promptBundle: {
                variant: "route",
                sections: [],
                systemPrompt: "prompt",
                metadata: {
                  sessionId: routeScenario.session.sessionId,
                  historyCount: routeScenario.session.history.length,
                  hasTicketState: true,
                  knowledgeCandidateCount: routeScenario.knowledgeCandidates?.length ?? 0,
                },
              },
              rawOutput: "{}",
            },
            downstream: {
              route: "knowledge",
              finalReply: "退款通常会在 1 到 3 个工作日内完成。",
              result: {
                plan: {
                  shouldAnswerDirectly: true,
                  answerDraft: "退款通常会在 1 到 3 个工作日内完成。",
                  citedKnowledgeIds: ["kb-refund-01"],
                },
                promptBundle: {
                  variant: "knowledge",
                  sections: [],
                  systemPrompt: "prompt",
                  metadata: {
                    sessionId: knowledgeScenario.session.sessionId,
                    historyCount: knowledgeScenario.session.history.length,
                    hasTicketState: true,
                    knowledgeCandidateCount: knowledgeScenario.knowledgeCandidates.length,
                  },
                },
                rawOutput: "{}",
                usedKnowledgeContext: knowledgeScenario.knowledgeContext ?? null,
              },
            },
          };
        },
      },
    });

    const result = await gateway.handleMessage({
      session: routeScenario.session,
    });

    expect(capturedSessionId).toBe(routeScenario.session.sessionId);
    expect(result.reply).toContain("1 到 3");
    expect(result.orchestratorResult.route).toBe("knowledge");
  });

  it("prefers request knowledge candidates over config defaults", async () => {
    let candidateCount = 0;
    const gateway = createGateway({
      config: gatewayConfig,
      runner: {
        run: async (input): Promise<SupportOrchestratorResult> => {
          candidateCount = input.knowledgeInput.knowledgeCandidates.length;
          return {
            route: "handoff",
            routeResult: {
              decision: {
                route: "handoff",
                intent: "escalate_to_human",
                confidence: 0.95,
                reason: "handoff requested",
                entities: {},
              },
              promptBundle: {
                variant: "route",
                sections: [],
                systemPrompt: "prompt",
                metadata: {
                  sessionId: routeScenario.session.sessionId,
                  historyCount: routeScenario.session.history.length,
                  hasTicketState: true,
                  knowledgeCandidateCount: 1,
                },
              },
              rawOutput: "{}",
            },
            downstream: {
              route: "handoff",
              finalReply: "我已经为你转交人工。",
              result: {
                plan: {
                  handoffReason: "customer requested human",
                  urgency: "urgent",
                  summaryForHuman: "summary",
                  attachmentPayload: "payload",
                  userReplyDraft: "我已经为你转交人工。",
                },
                promptBundle: {
                  variant: "handoff",
                  sections: [],
                  systemPrompt: "prompt",
                  metadata: {
                    sessionId: handoffScenario.session.sessionId,
                    historyCount: handoffScenario.session.history.length,
                    hasTicketState: true,
                    knowledgeCandidateCount: 1,
                  },
                },
                rawOutput: "{}",
                uploadResult: {
                  queueId: "queue-1",
                  acceptedAt: "2026-03-08T13:00:00Z",
                  urgency: "urgent",
                  consoleView: "=== Human Handoff View ===",
                },
              },
            },
          };
        },
      },
    });

    await gateway.handleMessage({
      session: routeScenario.session,
      knowledgeCandidates: [
        {
          id: "kb-custom-01",
          title: "自定义候选",
          snippet: "这是网关层注入的知识候选。",
        },
      ],
    });

    expect(candidateCount).toBe(1);
  });

  it("fails when latest user message is empty", async () => {
    const gateway = createGateway({
      config: gatewayConfig,
      runner: {
        run: async (): Promise<SupportOrchestratorResult> => {
          throw new Error("runner should not be called");
        },
      },
    });

    await expect(
      gateway.handleMessage({
        session: {
          ...routeScenario.session,
          latestUserMessage: "   ",
        },
      }),
    ).rejects.toThrow("Gateway requires a non-empty latest user message.");
  });

  it("build helper functions keep shared session data", () => {
    const session = routeScenario.session;
    const candidates = gatewayConfig.knowledgeCandidates ?? [];

    const routeInput = buildRouteInput(session, gatewayConfig, candidates);
    const knowledgeInput = buildKnowledgeInput(session, gatewayConfig, candidates);
    const ticketsInput = buildTicketsInput(session, gatewayConfig, candidates);
    const handoffInput = buildHandoffInput(session, gatewayConfig, candidates);

    expect(routeInput.session.sessionId).toBe(session.sessionId);
    expect(knowledgeInput.knowledgeContext?.entries[0]?.id).toBe("kb-refund-01");
    expect(ticketsInput.toolSummaries?.[0]?.name).toBe("ticketsQuery");
    expect(handoffInput.toolSummaries?.[0]?.name).toBe("handoffUpload");
  });

  it("handles a business-style message through SessionStore", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "open-assistant-gateway-"));
    const sessionStore = createFileSessionStore(tempDir);

    try {
      const gateway = createGateway({
        config: gatewayConfig,
        sessionStore,
        runner: {
          run: async (input): Promise<SupportOrchestratorResult> => ({
            route: "tickets",
            routeResult: {
              decision: {
                route: "tickets",
                intent: "check_ticket_progress",
                confidence: 0.93,
                reason: "ticket progress requested",
                entities: {
                  ticketId: "TK-20260307-01",
                },
              },
              promptBundle: {
                variant: "route",
                sections: [],
                systemPrompt: "prompt",
                metadata: {
                  sessionId: input.routeInput.session.sessionId,
                  historyCount: input.routeInput.session.history.length,
                  hasTicketState: true,
                  knowledgeCandidateCount: input.routeInput.knowledgeCandidates?.length ?? 0,
                },
              },
              rawOutput: "{}",
            },
            downstream: {
              route: "tickets",
              finalReply: "我已经帮你查到工单目前还在处理中，我继续为你跟进。",
              result: {
                plan: {
                  action: "query",
                  reason: "query ticket",
                  ticketFields: {
                    ticketId: "TK-20260307-01",
                  },
                  userReplyDraft: "我已经帮你查到工单目前还在处理中，我继续为你跟进。",
                },
                promptBundle: {
                  variant: "tickets",
                  sections: [],
                  systemPrompt: "prompt",
                  metadata: {
                    sessionId: input.ticketsInput.session.sessionId,
                    historyCount: input.ticketsInput.session.history.length,
                    hasTicketState: true,
                    knowledgeCandidateCount: input.ticketsInput.knowledgeCandidates?.length ?? 0,
                  },
                },
                rawOutput: "{}",
                rawCycleOutputs: ["{}"],
                latestTicketState: {
                  ticketId: "TK-20260307-01",
                  status: "pending",
                  priority: "high",
                  summary: "用户反馈退款迟迟未到账。",
                  lastUpdateAt: "2026-03-10T09:30:00Z",
                },
                toolResult: {
                  action: "query",
                  ticketState: {
                    ticketId: "TK-20260307-01",
                    status: "pending",
                    priority: "high",
                    summary: "用户反馈退款迟迟未到账。",
                    lastUpdateAt: "2026-03-10T09:30:00Z",
                  },
                },
                toolCycles: [],
              },
            },
          }),
        },
      });

      const result = await gateway.handleBusinessMessage({
        channel: "whatsapp",
        conversationId: "conv-gateway-001",
        customerId: "cust-001",
        senderId: "wx-001",
        senderName: "李雷",
        messageId: "msg-001",
        text: "请帮我查一下退款工单进度。",
        timestamp: "2026-03-10T10:00:00Z",
        history: [
          {
            messageId: "msg-old-001",
            direction: "outbound",
            text: "好的，我来帮你看看。",
            timestamp: "2026-03-10T09:50:00Z",
          },
        ],
        ticketState: {
          ticketId: "TK-20260307-01",
          status: "pending",
          priority: "high",
          summary: "用户反馈退款迟迟未到账。",
          lastUpdateAt: "2026-03-10T09:30:00Z",
        },
      });

      const stored = await sessionStore.getRecord("conv-gateway-001");

      expect(result.reply).toContain("工单目前还在处理中");
      expect(result.session.history.some((turn) => turn.role === "assistant")).toBe(true);
      expect(stored?.transcript).toHaveLength(3);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("injects persona/device/region/batch/channel context into route input", async () => {
    let capturedProfile: CustomerProfile | undefined;
    let capturedRouteEvidenceCount = 0;
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "open-assistant-gateway-inject-"));

    try {
      const gateway = createGateway({
        config: gatewayConfig,
        runner: {
          run: async (input): Promise<SupportOrchestratorResult> => {
            capturedProfile = input.routeInput.sharedContext?.customerProfile;
            capturedRouteEvidenceCount = input.routeInput.routeEvidenceExamples?.length ?? 0;
            return {
              route: "knowledge",
              routeResult: {
                decision: {
                  route: "knowledge",
                  intent: "ask_refund_time",
                  confidence: 0.9,
                  reason: "knowledge answer",
                  entities: {},
                },
                promptBundle: {
                  variant: "route",
                  sections: [],
                  systemPrompt: "prompt",
                  metadata: {
                    sessionId: routeScenario.session.sessionId,
                    historyCount: routeScenario.session.history.length,
                    hasTicketState: true,
                    knowledgeCandidateCount: routeScenario.knowledgeCandidates?.length ?? 0,
                  },
                },
                rawOutput: "{}",
              },
              downstream: {
                route: "knowledge",
                finalReply: "好的，我来说明。",
                result: {
                  plan: {
                    shouldAnswerDirectly: true,
                    answerDraft: "好的，我来说明。",
                    citedKnowledgeIds: ["kb-refund-01"],
                  },
                  promptBundle: {
                    variant: "knowledge",
                    sections: [],
                    systemPrompt: "prompt",
                    metadata: {
                      sessionId: knowledgeScenario.session.sessionId,
                      historyCount: knowledgeScenario.session.history.length,
                      hasTicketState: true,
                      knowledgeCandidateCount: knowledgeScenario.knowledgeCandidates.length,
                    },
                  },
                  rawOutput: "{}",
                  usedKnowledgeContext: knowledgeScenario.knowledgeContext ?? null,
                },
              },
            };
          },
        },
        sessionStore: createFileSessionStore(tempDir),
      });

      await gateway.handleBusinessMessage({
        channel: "whatsapp",
        conversationId: "conv-gateway-inject-001",
        customerId: "cust-ctx-001",
        senderId: "wx-ctx-001",
        messageId: "msg-ctx-001",
        text: "我是华东第2批次设备，最近频繁掉线。",
        timestamp: "2026-03-10T10:00:00Z",
        customerPersona: "new_customer",
        deviceModel: "OC-PRO300",
        region: "华东",
        batch: 2,
        channelEdition: "专供",
      });

      expect(capturedProfile?.persona).toBe("new_customer");
      expect(capturedProfile?.deviceModel).toBe("OC-PRO300");
      expect(capturedProfile?.region).toBe("华东");
      expect(capturedProfile?.batch).toBe(2);
      expect(capturedProfile?.channelEdition).toBe("专供");
      expect(capturedRouteEvidenceCount).toBeGreaterThan(0);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
