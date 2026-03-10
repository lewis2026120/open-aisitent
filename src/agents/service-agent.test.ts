import { describe, expect, it } from "vitest";
import { routeScenario } from "../section/test-scenarios.js";
import type { RoutePromptInput } from "../section/types.js";
import { RouteOutputParseError } from "./route-output.js";
import { createServiceAgent } from "./service-agent.js";
import { MockLlmClient } from "../llm/mock-llm-client.js";

function createRouteInput(message: string): RoutePromptInput {
  return {
    ...routeScenario,
    session: {
      ...routeScenario.session,
      latestUserMessage: message,
    },
  };
}

describe("ServiceAgent", () => {
  it("routes a knowledge request through the execution chain", async () => {
    let capturedPrompt = "";
    const agent = createServiceAgent({
      llmClient: new MockLlmClient((request) => {
        capturedPrompt = request.systemPrompt;
        return JSON.stringify({
          route: "knowledge",
          intent: "ask_refund_time",
          confidence: 0.93,
          reason: "The user is asking for a standard policy answer.",
          entities: { topic: "refund" },
        });
      }),
    });

    const result = await agent.run(createRouteInput("退款多久到账？"));

    expect(result.decision.route).toBe("knowledge");
    expect(result.decision.intent).toBe("ask_refund_time");
    expect(capturedPrompt).toContain("Classification Examples");
    expect(result.promptBundle.variant).toBe("route");
  });

  it("routes a ticket status request", async () => {
    const agent = createServiceAgent({
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          route: "tickets",
          intent: "check_ticket_progress",
          confidence: 0.88,
          reason: "The customer wants an update on an existing ticket.",
          entities: { ticketId: "TK-20260307-01" },
        }),
      ),
    });

    const result = await agent.run(createRouteInput("帮我查一下工单现在到哪了？"));

    expect(result.decision.route).toBe("tickets");
    expect(result.decision.entities.ticketId).toBe("TK-20260307-01");
  });

  it("routes a handoff request", async () => {
    const agent = createServiceAgent({
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          route: "handoff",
          intent: "escalate_to_human",
          confidence: 0.97,
          reason: "The customer is explicitly asking for human support.",
          entities: { urgency: "high" },
        }),
      ),
    });

    const result = await agent.run(createRouteInput("这个问题很急，马上帮我转人工。"));

    expect(result.decision.route).toBe("handoff");
    expect(result.decision.reason).toContain("human support");
  });

  it("fails when the model output is not valid JSON", async () => {
    const agent = createServiceAgent({
      llmClient: MockLlmClient.fromText("not-json"),
    });

    await expect(agent.run(routeScenario)).rejects.toBeInstanceOf(RouteOutputParseError);
  });

  it("fails when the model returns an unsupported route", async () => {
    const agent = createServiceAgent({
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          route: "billing",
          intent: "wrong_route",
          confidence: 0.5,
          reason: "Unsupported route.",
          entities: {},
        }),
      ),
    });

    await expect(agent.run(routeScenario)).rejects.toBeInstanceOf(RouteOutputParseError);
  });
});
