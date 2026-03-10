import type { TicketPriority, TicketState, TicketStatus } from "../core/contracts.js";
import type { TicketOperationResult } from "../tools/ticket-tools.js";
import { attemptTicketsAgent } from "./tickets-agent-attempt.js";
import type { TicketsAgentResult, TicketsAgentRunParams } from "./types.js";

export async function runTicketsAgent(
  params: TicketsAgentRunParams,
): Promise<TicketsAgentResult> {
  const latestTicketState = await resolveLatestTicketState(params);
  const promptBundle = params.deps.sectionBuilder.buildTicketsPrompt({
    ...params.input,
    session: {
      ...params.input.session,
      ticketState: latestTicketState,
    },
  });

  const attemptResult = await attemptTicketsAgent({
    input: params.input,
    promptBundle,
    llmClient: params.deps.llmClient,
  });

  const toolResult = await executeTicketPlan({
    params,
    latestTicketState,
    plan: attemptResult.plan,
  });

  return {
    plan: attemptResult.plan,
    promptBundle,
    rawOutput: attemptResult.rawOutput,
    latestTicketState: toolResult.ticketState,
    toolResult,
  };
}

async function resolveLatestTicketState(params: TicketsAgentRunParams): Promise<TicketState | null> {
  const ticketId =
    params.input.preferredTicketId ?? params.input.session.ticketState?.ticketId ?? undefined;
  if (!ticketId) {
    return params.input.session.ticketState ?? null;
  }

  const queried = await params.deps.ticketTools.ticketsQuery({
    ticketId,
    customerId: params.input.session.customerId,
    sessionId: params.input.session.sessionId,
  });

  return queried ?? params.input.session.ticketState ?? null;
}

async function executeTicketPlan(args: {
  params: TicketsAgentRunParams;
  latestTicketState: TicketState | null;
  plan: TicketsAgentResult["plan"];
}): Promise<TicketOperationResult> {
  const { params, latestTicketState, plan } = args;

  if (plan.action === "query") {
    const ticketState = await params.deps.ticketTools.ticketsQuery({
      ticketId:
        plan.ticketFields.ticketId ??
        latestTicketState?.ticketId ??
        params.input.preferredTicketId,
      customerId: params.input.session.customerId,
      sessionId: params.input.session.sessionId,
    });
    return { action: "query", ticketState };
  }

  if (plan.action === "create") {
    const ticketState = await params.deps.ticketTools.ticketsCreate({
      customerId: params.input.session.customerId,
      sessionId: params.input.session.sessionId,
      summary: plan.ticketFields.summary ?? params.input.session.latestUserMessage,
      message: params.input.session.latestUserMessage,
      priority: parsePriority(plan.ticketFields.priority),
    });
    return { action: "create", ticketState };
  }

  const ticketId =
    plan.ticketFields.ticketId ?? latestTicketState?.ticketId ?? params.input.preferredTicketId;
  if (!ticketId) {
    throw new Error("TicketsAgent cannot update a ticket without a ticketId.");
  }

  const ticketState = await params.deps.ticketTools.ticketsUpdate({
    ticketId,
    message: params.input.session.latestUserMessage,
    summary: plan.ticketFields.summary,
    priority: parsePriority(plan.ticketFields.priority),
    status: parseStatus(plan.ticketFields.status),
  });
  return { action: "update", ticketState };
}

function parsePriority(value: string | undefined): TicketPriority | undefined {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return undefined;
}

function parseStatus(value: string | undefined): TicketStatus | undefined {
  if (
    value === "none" ||
    value === "open" ||
    value === "pending" ||
    value === "resolved" ||
    value === "closed"
  ) {
    return value;
  }
  return undefined;
}
