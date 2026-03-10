import { describe, expect, it } from "vitest";
import { MockLlmClient } from "../llm/mock-llm-client.js";
import { knowledgeScenario } from "../section/test-scenarios.js";
import { MockKnowledgeTools } from "../tools/mock-knowledge-tools.js";
import { KnowledgeOutputParseError } from "./knowledge-output.js";
import { createKnowledgeAgent } from "./knowledge-agent.js";

describe("KnowledgeAgent", () => {
  it("runs the knowledge execution chain and returns a plan", async () => {
    let receivedQuery = "";
    const knowledgeTools = new MockKnowledgeTools((params) => {
      receivedQuery = params.query;
      return [
        {
          id: "kb-policy-01",
          title: "退款政策",
          snippet: "标准退款会在 1-3 个工作日完成。",
          source: "knowledge/refund-policy.md",
        },
      ];
    });

    const agent = createKnowledgeAgent({
      knowledgeTools,
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          shouldAnswerDirectly: true,
          suggestedSearchQuery: "退款时效",
          answerDraft: "你的退款通常会在 1 到 3 个工作日内完成。",
          citedKnowledgeIds: ["kb-policy-01"],
        }),
      ),
    });

    const result = await agent.run(knowledgeScenario);

    expect(receivedQuery).toContain("工单为什么还没有处理");
    expect(result.plan.shouldAnswerDirectly).toBe(true);
    expect(result.plan.citedKnowledgeIds).toContain("kb-policy-01");
    expect(result.promptBundle.systemPrompt).toContain("Knowledge Candidates");
  });

  it("adds tool-retrieved candidates into the prompt context", async () => {
    let capturedPrompt = "";
    const agent = createKnowledgeAgent({
      knowledgeTools: MockKnowledgeTools.fromCandidates([
        {
          id: "kb-extra-1",
          title: "特殊退款场景",
          snippet: "如遇支付渠道延迟，处理会延长。",
          source: "knowledge/refund-edge.md",
        },
      ]),
      llmClient: new MockLlmClient((request) => {
        capturedPrompt = request.systemPrompt;
        return JSON.stringify({
          shouldAnswerDirectly: false,
          suggestedSearchQuery: "退款 支付渠道 延迟",
          answerDraft: "我先进一步检索更精确的退款进度说明。",
          citedKnowledgeIds: ["kb-extra-1"],
        });
      }),
    });

    await agent.run(knowledgeScenario);

    expect(capturedPrompt).toContain("特殊退款场景");
    expect(capturedPrompt).toContain("knowledgeSearch");
  });

  it("fails on invalid JSON output", async () => {
    const agent = createKnowledgeAgent({
      knowledgeTools: MockKnowledgeTools.fromCandidates(knowledgeScenario.knowledgeCandidates),
      llmClient: MockLlmClient.fromText("not-json"),
    });

    await expect(agent.run(knowledgeScenario)).rejects.toBeInstanceOf(KnowledgeOutputParseError);
  });

  it("fails on invalid shouldAnswerDirectly type", async () => {
    const agent = createKnowledgeAgent({
      knowledgeTools: MockKnowledgeTools.fromCandidates(knowledgeScenario.knowledgeCandidates),
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          shouldAnswerDirectly: "yes",
          suggestedSearchQuery: "退款",
          answerDraft: "草稿",
          citedKnowledgeIds: ["kb-refund-01"],
        }),
      ),
    });

    await expect(agent.run(knowledgeScenario)).rejects.toBeInstanceOf(KnowledgeOutputParseError);
  });

  it("fails when latest user message is empty", async () => {
    const agent = createKnowledgeAgent({
      knowledgeTools: MockKnowledgeTools.fromCandidates(knowledgeScenario.knowledgeCandidates),
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          shouldAnswerDirectly: true,
          suggestedSearchQuery: "退款",
          answerDraft: "草稿",
          citedKnowledgeIds: ["kb-refund-01"],
        }),
      ),
    });

    await expect(
      agent.run({
        ...knowledgeScenario,
        session: {
          ...knowledgeScenario.session,
          latestUserMessage: "  ",
        },
      }),
    ).rejects.toThrow("KnowledgeAgent requires a non-empty latest user message.");
  });
});
