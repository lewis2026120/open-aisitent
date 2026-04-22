import type { KnowledgeCandidate } from "../core/contracts.js";

const DEVICE_MODELS = [
  "OC-A100",
  "OC-A200",
  "OC-PRO300",
  "OC-MINI110",
  "OC-EDGE500",
  "OC-LITE210",
];

const REGIONS = ["华中", "华东", "华南"] as const;

const CHANNEL_EDITIONS = ["专供", "普通版"] as const;

const BATCHES = [0, 1, 2, 3, 4, 5] as const;

export function buildSimulatedSupportKnowledgeCandidates(): KnowledgeCandidate[] {
  const base: KnowledgeCandidate[] = [
    {
      id: "kb-company-profile",
      title: "企业定位与简介",
      snippet: "中国智联科技是一家专注于提供企业级『云网融合』与智能IT基础设施的一站式服务商。我们深耕智能网络终端、自研路由器（OC系列设备）、云端安全管控和自动化IT运维，致力于为中小企业及大型机构打通网络瓶颈。我们的核心使命是通过『设备即插即用、网络分钟级开通、服务全天候看护』，大幅度降低企业的IT部署和运营成本，提升数字化协作效率。我们的客群横跨互联网初创、零售连锁集团、智能制造等多行业。",
      source: "knowledge/company/profile.md",
      score: 0.98,
    },
    {
      id: "kb-company-services",
      title: "企业服务介绍",
      snippet: "我们主要有三种服务：基础版、进阶版、旗舰版。基础版适合刚起步团队，进阶版适合大多数企业，旗舰版适合对稳定性要求很高的公司。你告诉我公司大概人数和设备量，我可以直接帮你选。",
      source: "knowledge/company/services.md",
      score: 0.95,
    },
    {
      id: "kb-company-cost-effective",
      title: "产品性价比与推荐",
      snippet: "一般来说，进阶版最划算。它的价格和功能比较平衡，常见问题基本都能覆盖。参考价格：基础版约 699 元/月，进阶版约 1299 元/月，旗舰版约 2999 元/月。大多数公司先选进阶版就够用。",
      source: "knowledge/company/cost-effective.md",
      score: 0.94,
    },
    {
      id: "kb-company-processing-time",
      title: "业务办理与开通时效",
      snippet: "开通时间不长：基础版一般 10 到 30 分钟，进阶版一般 2 到 4 小时，旗舰版一般 1 个工作日。资料齐全的话，通常当天就能用上。",
      source: "knowledge/company/processing-time.md",
      score: 0.96,
    },
    {
      id: "kb-support-hours-sla",
      title: "售后服务时间与SLA保障",
      snippet: "我们提供7x24小时系统级看护。售后支持按套餐划分：基础版享受5x8小时在线支持；进阶版享受7x24小时在线及电话支持（2小时响应）；旗舰版配备1对1专属技术专员（15分钟响应）。全线提供99.9%网络可用性SLA承诺。",
      source: "knowledge/company/support-sla.md",
      score: 0.92,
    },
    {
      id: "kb-refund-cancellation",
      title: "退换货与设备解约政策",
      snippet: "支持签订后7天无理由退款（仅扣除基础硬件寄送费）。若在合同期内提前解约，需提前30天线上提交申请，将收取未履行期租金的10%作为设备折旧违约金。租赁期内设备非人为损坏一律免费换新。",
      source: "knowledge/company/refund-cancellation.md",
      score: 0.93,
    },
    {
      id: "kb-security-compliance",
      title: "安全防护与隐私合规",
      snippet: "我们采用银行级AES-256数据通讯加密。设备内置企业级防火墙，支持基础防DDoS攻击和非法流量拦截。我们绝不收集客户内网业务数据，系统架构符合等保三级基线要求及ISO27001标准。",
      source: "knowledge/company/security-compliance.md",
      score: 0.91,
    },
    {
      id: "kb-billing-invoicing",
      title: "开票流程与支付方式",
      snippet: "我们支持对公网银转账、企业支付宝微信等主流企业支付。全线服务均可开具增值税专用发票（含6%技术服务费或13%硬件租赁费）。您在后台提交开票申请后，电子发票通常在3个工作日内发放至预留邮箱。",
      source: "knowledge/company/billing-invoicing.md",
      score: 0.94,
    },
    {
      id: "kb-profile-new-customer",
      title: "客户画像-新客户应答策略",
      snippet:
        "新客户常见诉求集中在开通流程、设备功能边界和基础操作，优先提供步骤化说明与首次使用提醒。",
      source: "knowledge/customer-profile/new-customer.md",
      score: 0.92,
    },
    {
      id: "kb-profile-existing-customer",
      title: "客户画像-老客户应答策略",
      snippet:
        "老客户更关注稳定性、历史问题复现与处理时效，优先引用历史工单和已知修复路径。",
      source: "knowledge/customer-profile/existing-customer.md",
      score: 0.9,
    },
    {
      id: "kb-region-huazhong",
      title: "地区画像-华中",
      snippet: "华中地区网络波动投诉在高峰期更常见，建议先排查运营商和局域网拥塞。",
      source: "knowledge/regions/huazhong.md",
      score: 0.83,
    },
    {
      id: "kb-region-huadong",
      title: "地区画像-华东",
      snippet: "华东地区高并发业务较多，设备温控与固件版本兼容问题反馈比例较高。",
      source: "knowledge/regions/huadong.md",
      score: 0.84,
    },
    {
      id: "kb-region-huanan",
      title: "地区画像-华南",
      snippet: "华南地区潮湿环境下接口氧化相关故障比例偏高，建议优先检查连接稳定性。",
      source: "knowledge/regions/huanan.md",
      score: 0.82,
    },
    {
      id: "kb-channel-zhuan-gong",
      title: "渠道特性-专供版",
      snippet:
        "专供版设备通常带有定制固件与白名单功能，回答前需确认功能是否在渠道合同范围内。",
      source: "knowledge/channel/zhuan-gong.md",
      score: 0.89,
    },
    {
      id: "kb-channel-normal",
      title: "渠道特性-普通版",
      snippet: "普通版设备遵循标准功能集，若用户诉求涉及专供能力需明确说明版本差异。",
      source: "knowledge/channel/normal.md",
      score: 0.87,
    },
  ];

  const modelEntries = DEVICE_MODELS.map((model, index) => ({
    id: `kb-device-${model.toLowerCase()}`,
    title: `设备型号-${model}`,
    snippet:
      index % 2 === 0
        ? `${model} 支持远程诊断、基础日志导出与标准告警。`
        : `${model} 适用于轻量部署场景，建议在并发较高时开启性能保护模式。`,
    source: `knowledge/device/${model.toLowerCase()}.md`,
    score: 0.8 + (index % 4) * 0.03,
  }));

  const batchEntries = BATCHES.map((batch) => ({
    id: `kb-batch-${batch}`,
    title: `批次画像-第${batch}批次`,
    snippet:
      batch <= 1
        ? `第${batch}批次设备在首次激活阶段偶发初始化失败，建议优先执行固件自检。`
        : `第${batch}批次设备整体稳定，但在高负载场景可能出现短时延迟，可通过工单跟踪复现条件。`,
    source: `knowledge/batch/batch-${batch}.md`,
    score: 0.78 + batch * 0.02,
  }));

  const mappingEntries: KnowledgeCandidate[] = [];
  for (const region of REGIONS) {
    for (const edition of CHANNEL_EDITIONS) {
      mappingEntries.push({
        id: `kb-map-${region}-${edition}`,
        title: `地区与渠道联动策略-${region}-${edition}`,
        snippet:
          `${region} ${edition} 客户若反馈稳定性问题，优先判断是否属于批次问题并决定走工单还是知识答复。`,
        source: `knowledge/mapping/${region}-${edition}.md`,
        score: 0.79,
      });
    }
  }

  return [...base, ...modelEntries, ...batchEntries, ...mappingEntries];
}

export function listSimulatedDeviceModels(): string[] {
  return [...DEVICE_MODELS];
}
