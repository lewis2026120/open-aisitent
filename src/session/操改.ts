export interface GatewayBusinessMessageRequest {
  channel: string;                  // 消息来源渠道：wechat | telegram | http
  conversationId: string;           // 会话唯一ID，跨轮对话以此为标识
  customerId: string;               // 用户唯一标识
  senderId: string;                 // 发送者ID（渠道本地标识）
  senderName?: string;              // 发送者昵称
  messageId: string;                // 消息唯一ID，用于防重放
  text: string;                     // 消息文本内容
  timestamp: string;                // ISO8601 时间戳
  history?: GatewayHistoryMessage[];  // 历史消息（部分渠道传入）
  ticketState?: TicketState | null;    // 当前工单状态（会话级存储）
  knowledgeCandidates?: KnowledgeCandidate[]; // 知识库候选检索结果
  knowledgeContext?: KnowledgeContext;          // 已解析的知识上下文
  businessPolicyContext?: BusinessPolicyContext; // 业务策略（折扣/地域政策）
  channelCapabilityContext?: ChannelCapabilityContext; // 渠道能力（媒体类型/字符限制）
  customerProfile?: CustomerProfile; // 用户画像（等级/地域/批次）
  customerPersona?: CustomerPersona; // 用户人设（新客/老客/投诉用户）
  deviceModel?: string;            // 设备型号
  region?: SupportRegion;          // 地域（影响工单路由）
  batch?: number;                  // 批次（0-5离散值）
  channelEdition?: ChannelEdition; // 渠道版本（专供版/普通版）
  operationalContext?: OperationalContext; // 运营开关（转人工/工单功能是否开启）
  conversationSummary?: ConversationSummary; // 对话摘要（跨会话）
}