import type { AgentRoute, HandoffPlan, KnowledgeAnswerPlan, TicketActionPlan } from "../core/contracts.js";
import type { LlmClient, LlmGenerateRequest, LlmGenerateResponse } from "../llm/llm-client.js";

export interface HeuristicMockSupportLlmOptions {
  forcedRoute?: AgentRoute;
}

export class HeuristicMockSupportLlmClient implements LlmClient {
  constructor(private readonly options: HeuristicMockSupportLlmOptions = {}) {}

  async generate(request: LlmGenerateRequest): Promise<LlmGenerateResponse> {
    const variant = String(request.metadata?.variant ?? "route");

    if (variant === "route") {
      return {
        text: JSON.stringify(buildRouteDecision(request.inputText, this.options.forcedRoute)),
      };
    }

    if (variant === "knowledge") {
      return { text: JSON.stringify(buildKnowledgePlan(request)) };
    }

    if (variant === "tickets") {
      return { text: JSON.stringify(buildTicketPlan(request.inputText)) };
    }

    if (variant === "handoff") {
      return { text: JSON.stringify(buildHandoffPlan(request.inputText)) };
    }

    return { text: JSON.stringify(buildKnowledgePlan(request)) };
  }
}

function buildRouteDecision(inputText: string, forcedRoute?: AgentRoute) {
  const route = forcedRoute ?? inferRoute(inputText);

  if (route === "handoff") {
    return {
      route,
      intent: "escalate_to_human",
      confidence: 0.95,
      reason: "The user explicitly asks for a human handoff or urgent escalation.",
      entities: {},
    };
  }

  if (route === "tickets") {
    const ticketId = extractTicketId(inputText);
    return {
      route,
      intent: /创建|新建|提交/u.test(inputText) ? "create_ticket" : "check_ticket_progress",
      confidence: 0.91,
      reason: "The user is asking about a case workflow or ticket handling.",
      entities: ticketId ? { ticketId } : {},
    };
  }

  return {
    route,
    intent: /帮助|能做什么/u.test(inputText) ? "ask_general_help" : "ask_policy_or_howto",
    confidence: 0.9,
    reason: "The user is asking a knowledge or policy question.",
    entities: {},
  };
}

function buildKnowledgePlan(request: LlmGenerateRequest): KnowledgeAnswerPlan {
  const inputText = request.inputText.trim();
  const citedKnowledgeIds = extractKnowledgeIds(request.systemPrompt);

  if (/你是什么模型|你是谁/u.test(inputText)) {
    return {
      shouldAnswerDirectly: true,
      answerDraft: "我是这个客户支持 MVP 在 mock 模式下运行的知识助手，用来演示知识问答、工单处理和人工转接流程。",
      citedKnowledgeIds,
    };
  }

  if (/能提供什么帮助|做什么|帮助范围/u.test(inputText)) {
    return {
      shouldAnswerDirectly: true,
      answerDraft: "我可以解答常见政策问题、帮助查询/创建/更新工单，并在必要时把问题整理后转给人工处理。",
      citedKnowledgeIds,
    };
  }

  if (/服务|业务|产品|套餐/u.test(inputText)) {
    return {
      shouldAnswerDirectly: true,
      answerDraft:
        "我们主要有三种服务：基础版、进阶版、旗舰版。基础版适合刚起步团队，进阶版适合大多数企业，旗舰版适合对稳定性要求很高的公司。你告诉我公司大概人数和设备量，我可以直接帮你选。",
      citedKnowledgeIds,
    };
  }

  if (/性价比|最划算|最值|推荐.*套餐/u.test(inputText)) {
    return {
      shouldAnswerDirectly: true,
      answerDraft:
        "一般来说，进阶版最划算。它的价格和功能比较平衡，常见问题基本都能覆盖。参考价格：基础版约 699 元/月，进阶版约 1299 元/月，旗舰版约 2999 元/月。大多数公司先选进阶版就够用。",
      citedKnowledgeIds,
    };
  }

  if (/办理需要多久|多久.*开通|开通时长|办理时长|生效时间/u.test(inputText)) {
    return {
      shouldAnswerDirectly: true,
      answerDraft:
        "开通时间不长：基础版一般 10 到 30 分钟，进阶版一般 2 到 4 小时，旗舰版一般 1 个工作日。资料齐全的话，通常当天就能用上。",
      citedKnowledgeIds,
    };
  }

  if (/设备.*不能用|不能用|用不了|故障|异常/u.test(inputText)) {
    return {
      shouldAnswerDirectly: true,
      answerDraft:
        "我先帮你排查。你告诉我三件事就行：设备型号、具体现象（开不了机/老掉线/某功能不能用）、大概什么时候开始的。常见原因有四个：系统版本太旧、接口接触不好、电源不稳定、早期批次系统小问题。你把型号发我，我一步一步带你查。",
      citedKnowledgeIds,
    };
  }

  if (/退款/u.test(inputText)) {
    return {
      shouldAnswerDirectly: true,
      answerDraft: `根据当前知识，${inputText}通常可以按 1 到 3 个工作日的退款处理时效来说明，若遇支付渠道异常可能延迟。`,
      citedKnowledgeIds,
    };
  }

  return {
    shouldAnswerDirectly: true,
    answerDraft: `这个问题我可以先给你一个简单说法：${inputText}。如果你愿意，我再按你的实际情况一步步细讲。`,
    citedKnowledgeIds,
  };
}

function buildTicketPlan(inputText: string): TicketActionPlan {
  const ticketId = extractTicketId(inputText);

  if (/创建|新建|提交/u.test(inputText)) {
    return {
      action: "create",
      reason: "The user is asking to open a new case.",
      ticketFields: {
        summary: inputText,
        priority: /紧急|马上|立即/u.test(inputText) ? "high" : "medium",
      },
      userReplyDraft: "我会先为你创建一个新的工单，并继续帮你跟进。",
    };
  }

  if (/更新|修改|补充/u.test(inputText)) {
    return {
      action: "update",
      reason: "The user is adding new information to an existing case.",
      ticketFields: {
        ...(ticketId ? { ticketId } : {}),
        summary: inputText,
        priority: /紧急|投诉/u.test(inputText) ? "high" : "medium",
        status: /已解决|完成/u.test(inputText) ? "resolved" : "pending",
      },
      userReplyDraft: "我已经记录你的补充信息，并帮你更新到工单里。",
    };
  }

  return {
    action: "query",
    reason: "The user wants the latest status of an existing ticket.",
    ticketFields: ticketId ? { ticketId } : {},
    userReplyDraft: "我来帮你查询当前工单进度。",
  };
}

function buildHandoffPlan(inputText: string): HandoffPlan {
  return {
    handoffReason: "The user explicitly asks for escalation or the issue appears urgent.",
    urgency: /紧急|马上|投诉|人工|升级/u.test(inputText) ? "urgent" : "normal",
    summaryForHuman: `客户反馈：${inputText}`,
    attachmentPayload: `source=mock-runtime;topic=${inferRoute(inputText)}`,
    userReplyDraft: "我已经为你整理好情况，并转交人工继续处理。",
  };
}

function inferRoute(inputText: string): AgentRoute {
  if (/人工|投诉|升级|紧急|马上/u.test(inputText)) {
    return "handoff";
  }

  if (/工单|进度|状态|查询|创建|新建|提交|更新|补充/u.test(inputText)) {
    return "tickets";
  }

  return "knowledge";
}

function extractKnowledgeIds(systemPrompt: string): string[] {
  const matches = [...systemPrompt.matchAll(/\[id=([^\]]+)\]/g)];
  return matches.map((match) => match[1]).filter(Boolean);
}

function extractTicketId(inputText: string): string | undefined {
  const match = inputText.match(/TK-[0-9-]+/i);
  return match?.[0];
}

export function createHeuristicMockSupportLlmClient(
  options: HeuristicMockSupportLlmOptions = {},
): LlmClient {
  return new HeuristicMockSupportLlmClient(options);
}
