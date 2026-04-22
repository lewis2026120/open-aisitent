import { describe, expect, it } from "vitest";
import { MockLlmClient } from "../llm/mock-llm-client.js";
import { ticketsScenario } from "../section/test-scenarios.js";
import { MockTicketTools } from "../tools/mock-ticket-tools.js";
import { TicketsOutputParseError } from "./tickets-output.js";
import { createTicketsAgent } from "./tickets-agent.js";

describe("TicketsAgent", () => {
  it("queries an existing ticket", async () => {
    let queryCalls = 0;
    const agent = createTicketsAgent({
      ticketTools: new MockTicketTools(
        () => {
          queryCalls += 1;
          return {
            ticketId: "TK-20260307-01",
            status: "pending",
            priority: "high",
            summary: "用户反馈退款迟迟未到账。",
            lastUpdateAt: "2026-03-08T09:00:00Z",
          };
        },
        () => {
          throw new Error("create should not be called");
        },
        () => {
          throw new Error("update should not be called");
        },
      ),
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          action: "query",
          reason: "The user wants the latest ticket progress.",
          ticketFields: { ticketId: "TK-20260307-01" },
          userReplyDraft: "我来帮你查询当前工单进度。",
        }),
      ),
    });

    const result = await agent.run(ticketsScenario);

    expect(result.plan.action).toBe("query");
    expect(result.toolResult.action).toBe("query");
    expect(result.latestTicketState?.ticketId).toBe("TK-20260307-01");
    expect(queryCalls).toBe(2);
  });

  it("creates a new ticket when needed", async () => {
    let createdSummary = "";
    const agent = createTicketsAgent({
      ticketTools: new MockTicketTools(
        () => null,
        (params) => {
          createdSummary = params.summary;
          return {
            ticketId: "TK-NEW-01",
            status: "open",
            priority: params.priority ?? "medium",
            summary: params.summary,
            lastUpdateAt: "2026-03-08T10:00:00Z",
          };
        },
        () => {
          throw new Error("update should not be called");
        },
      ),
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          action: "create",
          reason: "The issue does not have an active ticket yet.",
          ticketFields: { summary: "用户要求创建退款工单", priority: "high" },
          userReplyDraft: "我会为你创建一个新的工单。",
        }),
      ),
    });

    const result = await agent.run({
      ...ticketsScenario,
      session: {
        ...ticketsScenario.session,
        ticketState: null,
      },
    });

    expect(result.toolResult.action).toBe("create");
    expect(result.latestTicketState?.ticketId).toBe("TK-NEW-01");
    expect(createdSummary).toBe("用户要求创建退款工单");
  });

  it("updates an existing ticket", async () => {
    let updatedStatus = "";
    const agent = createTicketsAgent({
      ticketTools: new MockTicketTools(
        () => ticketsScenario.session.ticketState ?? null,
        () => {
          throw new Error("create should not be called");
        },
        (params) => {
          updatedStatus = params.status ?? "";
          return {
            ticketId: params.ticketId,
            status: params.status ?? "pending",
            priority: params.priority ?? "high",
            summary: params.summary ?? "已更新",
            lastUpdateAt: "2026-03-08T11:00:00Z",
          };
        },
      ),
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          action: "update",
          reason: "The existing ticket needs new priority and status info.",
          ticketFields: { ticketId: "TK-20260307-01", status: "open", priority: "high" },
          userReplyDraft: "我已经为你更新工单状态。",
        }),
      ),
    });

    const result = await agent.run(ticketsScenario);

    expect(result.toolResult.action).toBe("update");
    expect(updatedStatus).toBe("open");
    expect(result.latestTicketState?.status).toBe("open");
  });

  it("fails on invalid JSON output", async () => {
    const agent = createTicketsAgent({
      ticketTools: MockTicketTools.fromState(ticketsScenario.session.ticketState ?? null),
      llmClient: MockLlmClient.fromText("not-json"),
    });

    await expect(agent.run(ticketsScenario)).rejects.toBeInstanceOf(TicketsOutputParseError);
  });

  it("fails on unsupported action", async () => {
    const agent = createTicketsAgent({
      ticketTools: MockTicketTools.fromState(ticketsScenario.session.ticketState ?? null),
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          action: "delete",
          reason: "unsupported",
          ticketFields: {},
          userReplyDraft: "草稿",
        }),
      ),
    });

    await expect(agent.run(ticketsScenario)).rejects.toBeInstanceOf(TicketsOutputParseError);
  });

  it("supports a ReAct tool loop before final action", async () => {
    let queryCalls = 0;
    const outputs = [
      JSON.stringify({
        thought: "先查一下现有工单状态。",
        toolCall: {
          name: "ticketsQuery",
          args: {
            ticketId: "TK-20260307-01",
          },
        },
      }),
      JSON.stringify({
        action: "query",
        reason: "已有查询结果，直接返回进度。",
        ticketFields: {
          ticketId: "TK-20260307-01",
        },
        userReplyDraft: "我已经查到你的工单进度。",
      }),
    ];

    const agent = createTicketsAgent({
      ticketTools: new MockTicketTools(
        () => {
          queryCalls += 1;
          return {
            ticketId: "TK-20260307-01",
            status: "pending",
            priority: "high",
            summary: "用户反馈退款迟迟未到账。",
            lastUpdateAt: "2026-03-08T09:00:00Z",
          };
        },
        () => {
          throw new Error("create should not be called");
        },
        () => {
          throw new Error("update should not be called");
        },
      ),
      llmClient: new MockLlmClient(() => outputs.shift() ?? outputs[1]),
    });

    const result = await agent.run(ticketsScenario);

    expect(result.plan.action).toBe("query");
    expect(result.toolCycles).toHaveLength(1);
    expect(result.toolCycles[0].toolName).toBe("ticketsQuery");
    expect(queryCalls).toBeGreaterThanOrEqual(2);
  });
});
