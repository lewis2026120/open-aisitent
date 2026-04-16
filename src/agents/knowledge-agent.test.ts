import { describe, expect, it } from "vitest";
import { MockLlmClient } from "../llm/mock-llm-client.js";
import { knowledgeScenario } from "../section/test-scenarios.js";
import { KnowledgeOutputParseError } from "./knowledge-output.js";
import { createKnowledgeAgent } from "./knowledge-agent.js";

describe("KnowledgeAgent", () => {
  it("runs the knowledge execution chain and returns a plan", async () => {
    const agent = createKnowledgeAgent({
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          shouldAnswerDirectly: true,
          answerDraft: "你的退款通常会在 1 到 3 个工作日内完成。",
          citedKnowledgeIds: ["kb-refund-01"],
        }),
      ),
    });

    const result = await agent.run(knowledgeScenario);

    expect(result.plan.shouldAnswerDirectly).toBe(true);
    expect(result.plan.citedKnowledgeIds).toContain("kb-refund-01");
    expect(result.promptBundle.systemPrompt).toContain("Prepared Knowledge Context");
    expect(result.usedKnowledgeContext?.entries).toHaveLength(2);
  });

  it("renders prepared knowledge context into the prompt", async () => {
    let capturedPrompt = "";
    const agent = createKnowledgeAgent({
      llmClient: new MockLlmClient((request) => {
        capturedPrompt = request.systemPrompt;
        return JSON.stringify({
          shouldAnswerDirectly: false,
          answerDraft: "我先进一步检索更精确的退款进度说明。",
          citedKnowledgeIds: ["kb-extra-1"],
          missingKnowledge: "缺少支付渠道的实时退款处理状态。",
        });
      }),
    });

    await agent.run({
      ...knowledgeScenario,
      knowledgeCandidates: [
        {
          id: "kb-extra-1",
          title: "特殊退款场景",
          snippet: "如遇支付渠道延迟，处理会延长。",
          source: "knowledge/refund-edge.md",
        },
      ],
      knowledgeContext: undefined,
    });

    expect(capturedPrompt).toContain("特殊退款场景");
    expect(capturedPrompt).toContain("Prepared Knowledge Context");
    expect(capturedPrompt).not.toContain("knowledgeSearch");
  });

  it("fails on invalid JSON output", async () => {
    const agent = createKnowledgeAgent({
      llmClient: MockLlmClient.fromText("not-json"),
    });

    await expect(agent.run(knowledgeScenario)).rejects.toBeInstanceOf(KnowledgeOutputParseError);
  });

  it("fails on invalid shouldAnswerDirectly type", async () => {
    const agent = createKnowledgeAgent({
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          shouldAnswerDirectly: "yes",
          answerDraft: "草稿",
          citedKnowledgeIds: ["kb-refund-01"],
        }),
      ),
    });

    await expect(agent.run(knowledgeScenario)).rejects.toBeInstanceOf(KnowledgeOutputParseError);
  });

  it("fails when latest user message is empty", async () => {
    const agent = createKnowledgeAgent({
      llmClient: MockLlmClient.fromText(
        JSON.stringify({
          shouldAnswerDirectly: true,
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
