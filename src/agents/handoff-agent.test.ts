import { describe, expect, it } from "vitest";
import { MockLlmClient } from "../llm/mock-llm-client.js";
import { handoffScenario } from "../section/test-scenarios.js";
import { MockHandoffTools } from "../tools/mock-handoff-tools.js";
import { createHandoffToHumanAgent } from "./handoff-agent.js";
import { HandoffOutputParseError } from "./handoff-output.js";

describe("HandoffToHumanAgent", () => {
  it("uploads a human escalation package", async () => {
    let uploadedSummary = "";
    const agent = createHandoffToHumanAgent({
      handoffTools: new MockHandoffTools((params) => {
        uploadedSummary = params.summaryForHuman;
        return {
          queueId: "handoff-001",
          acceptedAt: "2026-03-08T13:00:00Z",
          urgency: params.urgency,
        };
      }),
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          handoffReason: "The customer is frustrated and explicitly wants a human.",
          urgency: "urgent",
          summaryForHuman: "用户连续催促退款处理，并明确要求人工接管。",
          attachmentPayload: "ticket=TK-20260307-01;sentiment=angry",
          userReplyDraft: "我已经为你转交人工客服优先处理。",
        }),
      ),
    });

    const result = await agent.run(handoffScenario);

    expect(result.plan.urgency).toBe("urgent");
    expect(result.uploadResult.queueId).toBe("handoff-001");
    expect(uploadedSummary).toContain("人工");
    expect(result.promptBundle.variant).toBe("handoff");
  });

  it("passes escalationTag through upload params", async () => {
    let receivedTag = "";
    const agent = createHandoffToHumanAgent({
      handoffTools: new MockHandoffTools((params) => {
        receivedTag = params.escalationTag ?? "";
        return {
          queueId: "handoff-002",
          acceptedAt: "2026-03-08T13:10:00Z",
          urgency: params.urgency,
        };
      }),
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          handoffReason: "VIP customer requested escalation.",
          urgency: "normal",
          summaryForHuman: "VIP 用户希望尽快由人工跟进。",
          attachmentPayload: "vip=true",
          userReplyDraft: "我已经为你提交人工处理请求。",
        }),
      ),
    });

    await agent.run({
      ...handoffScenario,
      escalationTag: "vip-escalation",
    });

    expect(receivedTag).toBe("vip-escalation");
  });

  it("fails on invalid JSON output", async () => {
    const agent = createHandoffToHumanAgent({
      handoffTools: MockHandoffTools.accepted(),
      llmClient: MockLlmClient.fromText("not-json"),
    });

    await expect(agent.run(handoffScenario)).rejects.toBeInstanceOf(HandoffOutputParseError);
  });

  it("fails on invalid urgency", async () => {
    const agent = createHandoffToHumanAgent({
      handoffTools: MockHandoffTools.accepted(),
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          handoffReason: "Need human",
          urgency: "critical",
          summaryForHuman: "summary",
          attachmentPayload: "payload",
          userReplyDraft: "draft",
        }),
      ),
    });

    await expect(agent.run(handoffScenario)).rejects.toBeInstanceOf(HandoffOutputParseError);
  });

  it("fails when latest user message is empty", async () => {
    const agent = createHandoffToHumanAgent({
      handoffTools: MockHandoffTools.accepted(),
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          handoffReason: "Need human",
          urgency: "urgent",
          summaryForHuman: "summary",
          attachmentPayload: "payload",
          userReplyDraft: "draft",
        }),
      ),
    });

    await expect(
      agent.run({
        ...handoffScenario,
        session: {
          ...handoffScenario.session,
          latestUserMessage: "   ",
        },
      }),
    ).rejects.toThrow("HandoffToHumanAgent requires a non-empty latest user message.");
  });
});
