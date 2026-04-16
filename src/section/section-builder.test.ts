import { describe, expect, it } from "vitest";
import { createSectionBuilder } from "./section-builder.js";
import {
  handoffScenario,
  knowledgeScenario,
  routeScenario,
  sectionSelfCheckList,
  ticketsScenario,
} from "./test-scenarios.js";

const builder = createSectionBuilder();

describe("DefaultSectionBuilder", () => {
  it("builds a route prompt with examples and routing schema", () => {
    const result = builder.buildRoutePrompt(routeScenario);

    expect(result.variant).toBe("route");
    expect(result.metadata.knowledgeCandidateCount).toBe(2);
    expect(result.systemPrompt).toContain("Classification Examples");
    expect(result.systemPrompt).toContain('"route": "knowledge|tickets|handoff"');
    expect(result.systemPrompt).toContain("Current Customer Message");
  });

  it("builds a knowledge prompt with prepared context and knowledge ids", () => {
    const result = builder.buildKnowledgePrompt(knowledgeScenario);

    expect(result.variant).toBe("knowledge");
    expect(result.systemPrompt).toContain("Shared Business Context");
    expect(result.systemPrompt).toContain("Service Route Decision");
    expect(result.systemPrompt).toContain("Prepared Knowledge Context");
    expect(result.systemPrompt).toContain("missingKnowledge");
    expect(result.systemPrompt).toContain("citedKnowledgeIds");
  });

  it("builds a tickets prompt with ticket tools and action schema", () => {
    const result = builder.buildTicketsPrompt(ticketsScenario);

    expect(result.variant).toBe("tickets");
    expect(result.systemPrompt).toContain("Shared Business Context");
    expect(result.systemPrompt).toContain("Service Route Decision");
    expect(result.systemPrompt).toContain("Current Ticket State");
    expect(result.systemPrompt).toContain("ticketsCreate");
    expect(result.systemPrompt).toContain('"action": "query|create|update"');
  });

  it("builds a handoff prompt with escalation schema", () => {
    const result = builder.buildHandoffPrompt(handoffScenario);

    expect(result.variant).toBe("handoff");
    expect(result.systemPrompt).toContain("Shared Business Context");
    expect(result.systemPrompt).toContain("Service Route Decision");
    expect(result.systemPrompt).toContain("handoffUpload");
    expect(result.systemPrompt).toContain('"urgency": "normal|urgent"');
    expect(result.systemPrompt).toContain("summaryForHuman");
  });

  it("keeps the self-check list aligned with the MVP", () => {
    expect(sectionSelfCheckList).toHaveLength(5);
  });
});
