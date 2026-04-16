import { describe, expect, it } from "vitest";
import { handoffScenario } from "../section/test-scenarios.js";
import { renderHandoffConsoleView } from "./handoff-console-view.js";

describe("renderHandoffConsoleView", () => {
  it("renders a readable human handoff card from all major contexts", () => {
    const view = renderHandoffConsoleView({
      queueId: "handoff-001",
      acceptedAt: "2026-03-10T10:30:00Z",
      customerId: handoffScenario.session.customerId,
      sessionId: handoffScenario.session.sessionId,
      latestUserMessage: handoffScenario.session.latestUserMessage,
      summaryForHuman: "用户连续催促退款，并要求人工接入。",
      handoffReason: "客户情绪升级，且希望人工优先处理。",
      urgency: "urgent",
      attachmentPayload: "ticket=TK-20260307-01;sentiment=escalated",
      ticketState: handoffScenario.session.ticketState,
      escalationTag: "vip-escalation",
      history: handoffScenario.session.history,
      sharedContext: handoffScenario.sharedContext,
      routeDecision: handoffScenario.routeDecision,
      knowledgeCandidates: handoffScenario.knowledgeCandidates,
    });

    expect(view).toContain("Human Handoff View");
    expect(view).toContain("Queue ID: handoff-001");
    expect(view).toContain("Latest Customer Message");
    expect(view).toContain("Service Route Decision");
    expect(view).toContain("Shared Business Context");
    expect(view).toContain("Knowledge Signals");
    expect(view).toContain("vip-escalation");
  });
});
