import { buildHandoffSections } from "./presets/handoff.js";
import { buildKnowledgeSections } from "./presets/knowledge.js";
import { buildRouteSections } from "./presets/route.js";
import { buildTicketsSections } from "./presets/tickets.js";
import { renderPrompt } from "./render-prompt.js";
import type {
  HandoffPromptInput,
  KnowledgePromptInput,
  PromptBundle,
  PromptSection,
  PromptVariant,
  RoutePromptInput,
  SectionBuilder,
  TicketsPromptInput,
} from "./types.js";

export class DefaultSectionBuilder implements SectionBuilder {
  buildRoutePrompt(input: RoutePromptInput): PromptBundle {
    const sections = buildRouteSections(input);
    return createPromptBundle("route", input.session.sessionId, input.session.history.length, {
      sections,
      hasTicketState: Boolean(input.session.ticketState),
      knowledgeCandidateCount: input.knowledgeCandidates?.length ?? 0,
    });
  }

  buildKnowledgePrompt(input: KnowledgePromptInput): PromptBundle {
    const sections = buildKnowledgeSections(input);
    return createPromptBundle("knowledge", input.session.sessionId, input.session.history.length, {
      sections,
      hasTicketState: Boolean(input.session.ticketState),
      knowledgeCandidateCount: input.knowledgeCandidates.length,
    });
  }

  buildTicketsPrompt(input: TicketsPromptInput): PromptBundle {
    const sections = buildTicketsSections(input);
    return createPromptBundle("tickets", input.session.sessionId, input.session.history.length, {
      sections,
      hasTicketState: Boolean(input.session.ticketState),
      knowledgeCandidateCount: input.knowledgeCandidates?.length ?? 0,
    });
  }

  buildHandoffPrompt(input: HandoffPromptInput): PromptBundle {
    const sections = buildHandoffSections(input);
    return createPromptBundle("handoff", input.session.sessionId, input.session.history.length, {
      sections,
      hasTicketState: Boolean(input.session.ticketState),
      knowledgeCandidateCount: input.knowledgeCandidates?.length ?? 0,
    });
  }
}

export function createSectionBuilder(): SectionBuilder {
  return new DefaultSectionBuilder();
}

function createPromptBundle(
  variant: PromptVariant,
  sessionId: string,
  historyCount: number,
  params: {
    sections: PromptSection[];
    hasTicketState: boolean;
    knowledgeCandidateCount: number;
  },
): PromptBundle {
  return {
    variant,
    sections: params.sections,
    systemPrompt: renderPrompt(variant, params.sections),
    metadata: {
      sessionId,
      historyCount,
      hasTicketState: params.hasTicketState,
      knowledgeCandidateCount: params.knowledgeCandidateCount,
    },
  };
}
