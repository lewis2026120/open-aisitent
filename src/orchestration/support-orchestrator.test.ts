import { describe, expect, it } from "vitest";
import type {
  HandoffAgentInput,
  HandoffAgentResult,
  KnowledgeAgentInput,
  KnowledgeAgentResult,
  ServiceAgentResult,
  TicketsAgentInput,
  TicketsAgentResult,
} from "../agents/types.js";
import {
  handoffScenario,
  knowledgeScenario,
  routeScenario,
  ticketsScenario,
} from "../section/test-scenarios.js";
import { createSupportOrchestrator } from "./support-orchestrator.js";

function createRouteResult(route: ServiceAgentResult["decision"]["route"]): ServiceAgentResult {
  return {
    decision: {
      route,
      intent: `intent_${route}`,
      confidence: 0.9,
      reason: `route to ${route}`,
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
  };
}

describe("SupportOrchestrator", () => {
  it("dispatches to KnowledgeAgent when route is knowledge", async () => {
    let knowledgeCalls = 0;
    const orchestrator = createSupportOrchestrator({
      serviceAgent: {
        run: async () => createRouteResult("knowledge"),
      },
      knowledgeAgent: {
        run: async (_input: KnowledgeAgentInput): Promise<KnowledgeAgentResult> => {
          knowledgeCalls += 1;
          return {
            plan: {
              shouldAnswerDirectly: true,
              suggestedSearchQuery: "退款时效",
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
            retrievedCandidates: knowledgeScenario.knowledgeCandidates,
          };
        },
      },
      ticketsAgent: {
        run: async (_input: TicketsAgentInput): Promise<TicketsAgentResult> => {
          throw new Error("tickets agent should not be called");
        },
      },
      handoffAgent: {
        run: async (_input: HandoffAgentInput): Promise<HandoffAgentResult> => {
          throw new Error("handoff agent should not be called");
        },
      },
    });

    const result = await orchestrator.run({
      routeInput: routeScenario,
      knowledgeInput: knowledgeScenario,
      ticketsInput: ticketsScenario,
      handoffInput: handoffScenario,
    });

    expect(result.route).toBe("knowledge");
    expect(result.downstream.route).toBe("knowledge");
    expect(result.downstream.finalReply).toContain("1 到 3");
    expect(knowledgeCalls).toBe(1);
  });

  it("dispatches to TicketsAgent when route is tickets", async () => {
    let ticketsCalls = 0;
    const orchestrator = createSupportOrchestrator({
      serviceAgent: {
        run: async () => createRouteResult("tickets"),
      },
      knowledgeAgent: {
        run: async (_input: KnowledgeAgentInput): Promise<KnowledgeAgentResult> => {
          throw new Error("knowledge agent should not be called");
        },
      },
      ticketsAgent: {
        run: async (_input: TicketsAgentInput): Promise<TicketsAgentResult> => {
          ticketsCalls += 1;
          return {
            plan: {
              action: "query",
              reason: "query existing ticket",
              ticketFields: { ticketId: "TK-20260307-01" },
              userReplyDraft: "我正在为你查询工单进度。",
            },
            promptBundle: {
              variant: "tickets",
              sections: [],
              systemPrompt: "prompt",
              metadata: {
                sessionId: ticketsScenario.session.sessionId,
                historyCount: ticketsScenario.session.history.length,
                hasTicketState: true,
                knowledgeCandidateCount: ticketsScenario.knowledgeCandidates?.length ?? 0,
              },
            },
            rawOutput: "{}",
            latestTicketState: ticketsScenario.session.ticketState ?? null,
            toolResult: {
              action: "query",
              ticketState: ticketsScenario.session.ticketState ?? null,
            },
          };
        },
      },
      handoffAgent: {
        run: async (_input: HandoffAgentInput): Promise<HandoffAgentResult> => {
          throw new Error("handoff agent should not be called");
        },
      },
    });

    const result = await orchestrator.run({
      routeInput: routeScenario,
      knowledgeInput: knowledgeScenario,
      ticketsInput: ticketsScenario,
      handoffInput: handoffScenario,
    });

    expect(result.route).toBe("tickets");
    expect(result.downstream.route).toBe("tickets");
    expect(result.downstream.finalReply).toContain("查询工单");
    expect(ticketsCalls).toBe(1);
  });

  it("dispatches to HandoffToHumanAgent when route is handoff", async () => {
    let handoffCalls = 0;
    const orchestrator = createSupportOrchestrator({
      serviceAgent: {
        run: async () => createRouteResult("handoff"),
      },
      knowledgeAgent: {
        run: async (_input: KnowledgeAgentInput): Promise<KnowledgeAgentResult> => {
          throw new Error("knowledge agent should not be called");
        },
      },
      ticketsAgent: {
        run: async (_input: TicketsAgentInput): Promise<TicketsAgentResult> => {
          throw new Error("tickets agent should not be called");
        },
      },
      handoffAgent: {
        run: async (_input: HandoffAgentInput): Promise<HandoffAgentResult> => {
          handoffCalls += 1;
          return {
            plan: {
              handoffReason: "Customer explicitly asked for a human.",
              urgency: "urgent",
              summaryForHuman: "用户要求人工介入。",
              attachmentPayload: "ticket=TK-20260307-01",
              userReplyDraft: "我已经为你转交人工处理。",
            },
            promptBundle: {
              variant: "handoff",
              sections: [],
              systemPrompt: "prompt",
              metadata: {
                sessionId: handoffScenario.session.sessionId,
                historyCount: handoffScenario.session.history.length,
                hasTicketState: true,
                knowledgeCandidateCount: handoffScenario.knowledgeCandidates?.length ?? 0,
              },
            },
            rawOutput: "{}",
            uploadResult: {
              queueId: "queue-001",
              acceptedAt: "2026-03-08T13:00:00Z",
              urgency: "urgent",
            },
          };
        },
      },
    });

    const result = await orchestrator.run({
      routeInput: routeScenario,
      knowledgeInput: knowledgeScenario,
      ticketsInput: ticketsScenario,
      handoffInput: handoffScenario,
    });

    expect(result.route).toBe("handoff");
    expect(result.downstream.route).toBe("handoff");
    expect(result.downstream.finalReply).toContain("人工处理");
    expect(handoffCalls).toBe(1);
  });

  it("fails when session ids do not match", async () => {
    const orchestrator = createSupportOrchestrator({
      serviceAgent: { run: async () => createRouteResult("knowledge") },
      knowledgeAgent: { run: async () => { throw new Error("should not run"); } },
      ticketsAgent: { run: async () => { throw new Error("should not run"); } },
      handoffAgent: { run: async () => { throw new Error("should not run"); } },
    });

    await expect(
      orchestrator.run({
        routeInput: routeScenario,
        knowledgeInput: {
          ...knowledgeScenario,
          session: {
            ...knowledgeScenario.session,
            sessionId: "another-session",
          },
        },
        ticketsInput: ticketsScenario,
        handoffInput: handoffScenario,
      }),
    ).rejects.toThrow("SupportOrchestrator requires all agent inputs to share the same sessionId.");
  });
});
