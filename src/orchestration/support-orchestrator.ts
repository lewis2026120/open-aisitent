import {
  buildHandoffInputWithRouteContext,
  buildKnowledgeInputWithRouteContext,
  buildTicketsInputWithRouteContext,
} from "../context/downstream-context-builder.js";
import type { TicketState } from "../core/contracts.js";
import type { TicketsAgentResult } from "../agents/types.js";
import type { SupportOrchestratorDeps, SupportOrchestratorInput, SupportOrchestratorResult } from "./types.js";

export class SupportOrchestrator {
  constructor(private readonly deps: SupportOrchestratorDeps) {}

  async run(input: SupportOrchestratorInput): Promise<SupportOrchestratorResult> {
    validateOrchestrationInput(input);

    const routeResult = await this.deps.serviceAgent.run(input.routeInput);
    const sharedContext =
      input.routeInput.sharedContext ??
      input.routeInput.session.sharedContext;

    if (routeResult.decision.route === "knowledge") {
      const result = await this.deps.knowledgeAgent.run(
        buildKnowledgeInputWithRouteContext({
          input: input.knowledgeInput,
          routeDecision: routeResult.decision,
          sharedContext,
        }),
      );
      return {
        route: "knowledge",
        routeResult,
        downstream: {
          route: "knowledge",
          finalReply: result.plan.answerDraft,
          result,
        },
      };
    }

    if (routeResult.decision.route === "tickets") {
      const result = await this.deps.ticketsAgent.run(
        buildTicketsInputWithRouteContext({
          input: input.ticketsInput,
          routeDecision: routeResult.decision,
          sharedContext,
        }),
      );
      return {
        route: "tickets",
        routeResult,
        downstream: {
          route: "tickets",
          finalReply: buildTicketsFinalReply(result),
          result,
        },
      };
    }

    const result = await this.deps.handoffAgent.run(
      buildHandoffInputWithRouteContext({
        input: input.handoffInput,
        routeDecision: routeResult.decision,
        sharedContext,
      }),
    );
    return {
      route: "handoff",
      routeResult,
      downstream: {
        route: "handoff",
        finalReply: result.plan.userReplyDraft,
        result,
      },
    };
  }
}

function buildTicketsFinalReply(result: TicketsAgentResult): string {
  const ticketState = result.toolResult.ticketState;

  if (result.plan.action === "query") {
    if (!ticketState) {
      return "我可以帮你查询订单或工单的处理进度，但当前还缺少可定位的记录。请提供订单号、工单号，或更具体的下单信息。";
    }

    return formatTicketStatusReply(ticketState);
  }

  if (result.plan.action === "create") {
    if (ticketState?.ticketId) {
      return `我已经为你创建工单 ${ticketState.ticketId}，当前状态是${formatTicketStatus(ticketState.status)}。我会继续帮你跟进。`;
    }

    return result.plan.userReplyDraft;
  }

  if (ticketState?.ticketId) {
    return `我已经更新工单 ${ticketState.ticketId}，当前状态是${formatTicketStatus(ticketState.status)}。如有新进展我会继续同步给你。`;
  }

  return "我已经记录你的补充信息，并更新了处理记录。";
}

function formatTicketStatusReply(ticketState: TicketState): string {
  const priorityText = ticketState.priority ? `，优先级${formatTicketPriority(ticketState.priority)}` : "";
  const updateText = ticketState.lastUpdateAt ? ` 最近更新时间是 ${ticketState.lastUpdateAt}。` : "。";
  const ticketIdText = ticketState.ticketId ? `工单 ${ticketState.ticketId}` : "相关工单";

  return `我查到${ticketIdText}当前状态是${formatTicketStatus(ticketState.status)}${priorityText}${updateText}`;
}

function formatTicketStatus(status: TicketState["status"]): string {
  switch (status) {
    case "open":
      return "已受理";
    case "pending":
      return "处理中";
    case "resolved":
      return "已解决";
    case "closed":
      return "已关闭";
    case "none":
    default:
      return "暂无状态";
  }
}

function formatTicketPriority(priority: NonNullable<TicketState["priority"]>): string {
  switch (priority) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
    default:
      return "低";
  }
}

export function createSupportOrchestrator(
  deps: SupportOrchestratorDeps,
): SupportOrchestrator {
  return new SupportOrchestrator(deps);
}

function validateOrchestrationInput(input: SupportOrchestratorInput): void {
  const sessionIds = [
    input.routeInput.session.sessionId,
    input.knowledgeInput.session.sessionId,
    input.ticketsInput.session.sessionId,
    input.handoffInput.session.sessionId,
  ];

  const customerIds = [
    input.routeInput.session.customerId,
    input.knowledgeInput.session.customerId,
    input.ticketsInput.session.customerId,
    input.handoffInput.session.customerId,
  ];

  if (new Set(sessionIds).size !== 1) {
    throw new Error("SupportOrchestrator requires all agent inputs to share the same sessionId.");
  }

  if (new Set(customerIds).size !== 1) {
    throw new Error("SupportOrchestrator requires all agent inputs to share the same customerId.");
  }
}
