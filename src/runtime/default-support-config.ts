import type { ClassificationExample, KnowledgeCandidate, TaskGoal, ToolSummary } from "../core/contracts.js";
import { buildSimulatedSupportKnowledgeCandidates } from "../context/simulated-support-knowledge.js";
import type { GatewayConfig } from "../gateway/types.js";

const routeExamples: ClassificationExample[] = [
  {
    intent: "ask_general_help",
    route: "knowledge",
    example: "你能提供什么帮助？",
    reason: "The user is asking for general help or capability information.",
  },
  {
    intent: "ask_refund_time",
    route: "knowledge",
    example: "退款一般多久到账？",
    reason: "This is a standard policy or knowledge question.",
  },
  {
    intent: "check_ticket_progress",
    route: "tickets",
    example: "帮我查一下工单进度。",
    reason: "The user wants the latest status of an existing case.",
  },
  {
    intent: "create_ticket",
    route: "tickets",
    example: "请帮我新建一个退款工单。",
    reason: "The user wants to create a new support case.",
  },
  {
    intent: "escalate_to_human",
    route: "handoff",
    example: "现在就给我转人工，我要投诉。",
    reason: "The user explicitly requests a human handoff or escalation.",
  },
  {
    intent: "new_customer_device_setup",
    route: "knowledge",
    example: "我是新客户，设备第一次开机该怎么配置？",
    reason: "New-customer onboarding and capability questions should go to knowledge first.",
  },
  {
    intent: "batch_fault_followup",
    route: "tickets",
    example: "我是华东第2批次设备，最近频繁掉线，帮我跟进处理。",
    reason: "Batch and device fault tracking requires ticket-based handling.",
  },
  {
    intent: "edition_capability_gap",
    route: "knowledge",
    example: "普通版为什么没有专供版的那个功能？",
    reason: "Edition capability differences should be answered through policy knowledge.",
  },
  {
    intent: "high_emotion_escalation",
    route: "handoff",
    example: "这个问题我已经反馈很多次了，马上转人工主管。",
    reason: "Strong emotional escalation should be routed to handoff.",
  },
];

const knowledgeCandidates: KnowledgeCandidate[] = [
  {
    id: "kb-general-01",
    title: "客服助手能力说明",
    snippet: "助手可以回答常见政策问题、查询工单状态、帮助创建或更新工单，并在必要时转人工。",
    source: "knowledge/general-capabilities.md",
    score: 0.84,
  },
  {
    id: "kb-refund-01",
    title: "退款处理时效说明",
    snippet: "退款通常在 1 到 3 个工作日内完成，节假日或支付渠道异常时可能延迟。",
    source: "knowledge/refund-time.md",
    score: 0.91,
  },
  {
    id: "kb-ticket-01",
    title: "工单处理说明",
    snippet: "如果用户需要查询已有问题的处理进度，应优先检查是否已有工单，再决定查询、创建或更新。",
    source: "knowledge/ticket-process.md",
    score: 0.8,
  },
  {
    id: "kb-escalation-01",
    title: "人工升级规则",
    snippet: "当用户明确要求人工、投诉、情绪升级或问题超出标准流程时，应转给人工处理。",
    source: "knowledge/handoff.md",
    score: 0.86,
  },
  ...buildSimulatedSupportKnowledgeCandidates(),
];

const routeGoal: TaskGoal = {
  name: "Route the incoming support request",
  instruction: "Decide whether the latest message should go to knowledge, tickets, or handoff.",
  successCriteria: [
    "Choose exactly one route.",
    "Keep the reasoning concise.",
    "Extract useful entities when possible.",
  ],
};

const knowledgeGoal: TaskGoal = {
  name: "Answer from prepared knowledge",
  instruction: "Use prepared knowledge context to answer clearly and safely.",
  successCriteria: [
    "Answer directly when the current knowledge is enough.",
    "Cite the knowledge ids used.",
    "Explain missing knowledge only when the answer is incomplete.",
  ],
};

const ticketsGoal: TaskGoal = {
  name: "Plan the ticket action",
  instruction: "Choose whether to query, create, or update a ticket based on the latest message.",
  successCriteria: [
    "Pick the correct ticket action.",
    "Include only the required fields.",
    "Draft a short user-facing reply.",
  ],
};

const handoffGoal: TaskGoal = {
  name: "Prepare a human handoff package",
  instruction: "Summarize the case so a human teammate can continue without rereading the whole chat.",
  successCriteria: [
    "Summarize the request and urgency clearly.",
    "Include the most relevant context only.",
    "Draft a user-facing acknowledgement.",
  ],
};

const ticketTools: ToolSummary[] = [
  {
    name: "ticketsQuery",
    description: "Look up an existing support ticket (SQL backend, supports bash execution mode).",
  },
  {
    name: "ticketsCreate",
    description: "Create a new support ticket and persist it into SQL with success confirmation.",
  },
  {
    name: "ticketsUpdate",
    description: "Update an existing support ticket in SQL and return the latest ticket state.",
  },
];

const handoffTools: ToolSummary[] = [
  {
    name: "handoffUpload",
    description: "Generate a readable escalation package for the human support queue.",
  },
];

export function createDefaultGatewayConfig(): GatewayConfig {
  return {
    routeExamples,
    routeGoal,
    knowledgeGoal,
    ticketsGoal,
    handoffGoal,
    knowledgeTools: [],
    ticketTools,
    handoffTools,
    knowledgeCandidates,
  };
}
