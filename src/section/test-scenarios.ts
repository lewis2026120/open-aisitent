import type {
  ClassificationExample,
  KnowledgeCandidate,
  RouteDecision,
  SessionSnapshot,
  TaskGoal,
  ToolSummary,
} from "../core/contracts.js";
import { loadKnowledgeContext } from "../context/knowledge-context-loader.js";
import type {
  HandoffPromptInput,
  KnowledgePromptInput,
  RoutePromptInput,
  TicketsPromptInput,
} from "./types.js";

const demoSession: SessionSnapshot = {
  sessionId: "sess-1001",
  customerId: "cust-9001",
  latestUserMessage: "我的工单为什么还没有处理？如果再不解决我就要找人工客服了。",
  history: [
    {
      id: "1",
      role: "user",
      text: "我昨天提交了一个退款问题。",
      createdAt: "2026-03-07T10:00:00Z",
    },
    {
      id: "2",
      role: "assistant",
      text: "好的，我可以帮你查看退款状态。",
      createdAt: "2026-03-07T10:00:20Z",
    },
  ],
  ticketState: {
    ticketId: "TK-20260307-01",
    status: "pending",
    priority: "high",
    summary: "用户反馈退款迟迟未到账。",
    lastUpdateAt: "2026-03-07T12:00:00Z",
  },
  sharedContext: {
    customerProfile: {
      customerId: "cust-9001",
      tier: "vip",
      locale: "zh-CN",
      product: "refund-service",
      tags: ["vip", "refund-risk"],
      riskLevel: "medium",
    },
    channelCapabilities: {
      channel: "whatsapp",
      supportsAttachments: true,
      supportsRealtimeHandoff: true,
      supportsRichText: true,
      supportsButtons: false,
    },
    businessPolicy: {
      prioritizeHandoffIntents: ["escalate_to_human"],
      prioritizeTicketIntents: ["check_ticket_progress"],
      preferKnowledgeForHowTo: true,
      notes: ["退款争议优先查单", "高风险标签时可直接建议转人工"],
    },
    operational: {
      handoffEnabled: true,
      ticketingEnabled: true,
      knowledgeEnabled: true,
      businessHours: "09:00-21:00 Asia/Shanghai",
      nowInBusinessHours: true,
    },
    conversationSummary: {
      summary: "用户连续两天反馈退款未到账，情绪上升。",
      openIssues: ["退款工单处理慢", "用户希望明确完成时间"],
      lastResolvedIssue: "首次身份校验问题",
    },
  },
};

const defaultRouteDecision: RouteDecision = {
  route: "tickets",
  intent: "check_ticket_progress",
  confidence: 0.94,
  reason: "用户优先要求查询工单进度。",
  entities: {
    ticketId: "TK-20260307-01",
    channel: "whatsapp",
  },
};

const commonKnowledgeCandidates: KnowledgeCandidate[] = [
  {
    id: "kb-refund-01",
    title: "退款处理时效说明",
    snippet: "退款通常在 1 到 3 个工作日内完成，节假日可能延迟。",
    source: "knowledge/refund-time.md",
    score: 0.91,
  },
  {
    id: "kb-escalation-01",
    title: "何时转人工",
    snippet: "当用户情绪升级、问题高优先级且超出标准处理时，需要升级给人工客服。",
    source: "knowledge/handoff.md",
    score: 0.82,
  },
];

const routeExamples: ClassificationExample[] = [
  {
    intent: "ask_refund_time",
    route: "knowledge",
    example: "退款一般多久到账？",
    reason: "这是标准知识问答。",
  },
  {
    intent: "check_ticket_progress",
    route: "tickets",
    example: "帮我查下工单处理到哪一步了。",
    reason: "用户在查询已有工单。",
  },
  {
    intent: "escalate_to_human",
    route: "handoff",
    example: "这个问题太急了，帮我转人工。",
    reason: "用户明确要求升级到人工。",
  },
];

const ticketTools: ToolSummary[] = [
  {
    name: "ticketsQuery",
    description: "Look up an existing support ticket.",
  },
  {
    name: "ticketsCreate",
    description: "Create a new support ticket.",
  },
  {
    name: "ticketsUpdate",
    description: "Update an existing support ticket.",
  },
];

const handoffTools: ToolSummary[] = [
  {
    name: "handoffUpload",
    description: "Generate a readable escalation package for the human support queue.",
  },
];

const routeGoal: TaskGoal = {
  name: "Route the request",
  instruction: "Decide which downstream agent should handle the latest customer message.",
  successCriteria: [
    "Choose exactly one route.",
    "Explain the reason briefly.",
    "Extract any useful entities.",
  ],
};

const knowledgeGoal: TaskGoal = {
  name: "Answer from knowledge",
  instruction: "Use the available knowledge candidates to draft the most helpful answer.",
  successCriteria: [
    "Prefer direct answers when evidence is enough.",
    "Otherwise prepare a focused search query.",
  ],
};

const ticketsGoal: TaskGoal = {
  name: "Plan ticket action",
  instruction: "Determine whether to query, create, or update a ticket.",
  successCriteria: [
    "Choose the right ticket action.",
    "Draft a user-facing reply.",
  ],
};

const handoffGoal: TaskGoal = {
  name: "Prepare human escalation",
  instruction: "Summarize the case for a human teammate and mark urgency.",
  successCriteria: [
    "Write a concise handoff summary.",
    "Decide whether the case is urgent.",
  ],
};

export const routeScenario: RoutePromptInput = {
  session: demoSession,
  taskGoal: routeGoal,
  classificationExamples: routeExamples,
  knowledgeCandidates: commonKnowledgeCandidates,
};

export const knowledgeScenario: KnowledgePromptInput = {
  session: demoSession,
  routeDecision: defaultRouteDecision,
  sharedContext: demoSession.sharedContext,
  taskGoal: knowledgeGoal,
  knowledgeCandidates: commonKnowledgeCandidates,
  knowledgeContext: loadKnowledgeContext({
    session: demoSession,
    knowledgeCandidates: commonKnowledgeCandidates,
    routeDecision: defaultRouteDecision,
    sharedContext: demoSession.sharedContext,
  }) ?? undefined,
};

export const ticketsScenario: TicketsPromptInput = {
  session: demoSession,
  routeDecision: defaultRouteDecision,
  sharedContext: demoSession.sharedContext,
  taskGoal: ticketsGoal,
  knowledgeCandidates: commonKnowledgeCandidates,
  toolSummaries: ticketTools,
};

export const handoffScenario: HandoffPromptInput = {
  session: demoSession,
  routeDecision: {
    ...defaultRouteDecision,
    route: "handoff",
    intent: "escalate_to_human",
    reason: "用户明确表达需要人工接入。",
  },
  sharedContext: demoSession.sharedContext,
  taskGoal: handoffGoal,
  knowledgeCandidates: commonKnowledgeCandidates,
  toolSummaries: handoffTools,
};

export const sectionSelfCheckList = [
  "Route prompt contains classification examples.",
  "All prompts contain the latest user message.",
  "Knowledge prompt contains prepared knowledge context.",
  "Tickets prompt contains ticket state and ticket tools.",
  "Handoff prompt contains escalation output schema and handoffUpload.",
];
