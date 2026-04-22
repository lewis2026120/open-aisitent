import type { ClassificationExample, SharedAgentContext } from "../core/contracts.js";

export function buildRouteEvidenceExamples(params: {
  latestUserMessage: string;
  sharedContext?: SharedAgentContext;
}): ClassificationExample[] {
  const examples: ClassificationExample[] = [];
  const profile = params.sharedContext?.customerProfile;

  if (profile?.persona === "new_customer") {
    examples.push({
      intent: "new_customer_onboarding",
      route: "knowledge",
      example: "我是新客户，刚收到设备，怎么完成第一次配置？",
      reason: "新客户的首次配置、功能范围、基础说明优先进入 knowledge。",
    });
  }

  if (profile?.persona === "existing_customer") {
    examples.push({
      intent: "existing_customer_ticket_followup",
      route: "tickets",
      example: "我是老客户，上周工单还没结论，帮我继续跟进。",
      reason: "老客户复现问题与进度追踪优先进入 tickets。",
    });
  }

  if (profile?.region && profile?.batch !== undefined && profile?.deviceModel) {
    examples.push({
      intent: "region_batch_device_issue",
      route: "tickets",
      example: `我在${profile.region}，第${profile.batch}批次的${profile.deviceModel}最近频繁掉线。`,
      reason: "地区 + 批次 + 设备型号联动问题通常需要进入 tickets 做可追踪处理。",
    });
  }

  if (profile?.channelEdition === "专供") {
    examples.push({
      intent: "edition_specific_capability",
      route: "knowledge",
      example: "专供版是否支持普通版没有的定制功能？",
      reason: "渠道版本差异说明优先通过 knowledge 进行规则澄清。",
    });
  }

  if (profile?.channelEdition === "普通版") {
    examples.push({
      intent: "normal_edition_limit",
      route: "knowledge",
      example: "普通版为什么没有专供版的高级开关？",
      reason: "普通版能力边界属于知识解释场景。",
    });
  }

  if (/投诉|人工|升级|马上|紧急/u.test(params.latestUserMessage)) {
    examples.push({
      intent: "escalation_from_emotion",
      route: "handoff",
      example: "我现在就要人工处理，马上升级。",
      reason: "高情绪或强升级诉求优先 handoff。",
    });
  }

  if (/工单|进度|状态|批次问题/u.test(params.latestUserMessage)) {
    examples.push({
      intent: "ticket_tracking_signal",
      route: "tickets",
      example: "帮我查下这个批次问题的处理进度。",
      reason: "含工单进度/批次故障排查信号，优先 tickets。",
    });
  }

  if (/能不能|怎么|为什么|功能/u.test(params.latestUserMessage)) {
    examples.push({
      intent: "knowledge_how_to_signal",
      route: "knowledge",
      example: "这个设备为什么不能开启某个功能？",
      reason: "功能解释类问题通常先走 knowledge。",
    });
  }

  return dedupeExamples(examples);
}

function dedupeExamples(examples: ClassificationExample[]): ClassificationExample[] {
  const map = new Map<string, ClassificationExample>();
  for (const item of examples) {
    const key = `${item.route}|${item.intent}|${item.example}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return [...map.values()];
}
