import type {
  KnowledgeCandidate,
  KnowledgeContext,
  RouteDecision,
  SessionSnapshot,
  SharedAgentContext,
} from "../core/contracts.js";
import { createKnowledgeContextEntry } from "./knowledge-context.js";

export interface KnowledgeContextLoadParams {
  session: SessionSnapshot;
  knowledgeCandidates?: KnowledgeCandidate[];
  sharedContext?: SharedAgentContext;
  routeDecision?: RouteDecision;
}

export interface KnowledgeContextLoader {
  load(params: KnowledgeContextLoadParams): KnowledgeContext | null;
}

export function createDefaultKnowledgeContextLoader(): KnowledgeContextLoader {
  return {
    load: loadKnowledgeContext,
  };
}

export function loadKnowledgeContext(
  params: KnowledgeContextLoadParams,
): KnowledgeContext | null {
  const entries = (params.knowledgeCandidates ?? [])
    .map(createKnowledgeContextEntry)
    .filter((entry) => entry.id.trim().length > 0 && entry.content.trim().length > 0);

  if (entries.length === 0) {
    return null;
  }

  return {
    summary: buildKnowledgeContextSummary(params),
    entries,
  };
}

function buildKnowledgeContextSummary(params: KnowledgeContextLoadParams): string {
  const summaryParts: string[] = [
    `Latest request focus: ${params.session.latestUserMessage.trim()}`,
  ];

  const customerTier = params.sharedContext?.customerProfile?.tier;
  if (customerTier) {
    summaryParts.push(`Customer tier: ${customerTier}`);
  }

  const product = params.sharedContext?.customerProfile?.product;
  if (product) {
    summaryParts.push(`Product: ${product}`);
  }

  if (params.routeDecision) {
    summaryParts.push(
      `Service route intent: ${params.routeDecision.intent} (${params.routeDecision.route})`,
    );
  }

  const conversationSummary = params.sharedContext?.conversationSummary?.summary;
  if (conversationSummary) {
    summaryParts.push(`Conversation summary: ${conversationSummary}`);
  }

  return summaryParts.join(" | ");
}
