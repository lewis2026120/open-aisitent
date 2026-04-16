import type { DatabaseSync } from "node:sqlite";

export interface SeedTicketEvent {
  eventId: string;
  eventType: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface SeedTicketRecord {
  ticketId: string;
  customerId: string;
  sessionId: string;
  sourceChannel: string;
  category: string;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  summary: string;
  latestMessage: string;
  escalationLevel: number;
  createdAt: string;
  updatedAt: string;
  events: SeedTicketEvent[];
}

export const defaultSeedTickets: SeedTicketRecord[] = [
  {
    ticketId: "TK-20260307-01",
    customerId: "cust-9001",
    sessionId: "conv-whatsapp-001",
    sourceChannel: "whatsapp",
    category: "refund",
    status: "pending",
    priority: "high",
    summary: "用户反馈退款迟迟未到账。",
    latestMessage: "我昨天提交的退款工单怎么还没处理？先帮我查一下进度。",
    escalationLevel: 1,
    createdAt: "2026-03-07T09:30:00Z",
    updatedAt: "2026-03-09T11:00:00Z",
    events: [
      {
        eventId: "evt-tk-20260307-01-1",
        eventType: "ticket_created",
        message: "用户提交退款迟迟未到账问题。",
        createdAt: "2026-03-07T09:30:00Z",
      },
      {
        eventId: "evt-tk-20260307-01-2",
        eventType: "agent_note",
        message: "已转交退款队列核对支付渠道回执。",
        createdAt: "2026-03-08T08:00:00Z",
      },
      {
        eventId: "evt-tk-20260307-01-3",
        eventType: "status_changed",
        message: "等待支付渠道返回最终结果。",
        createdAt: "2026-03-09T11:00:00Z",
        metadata: {
          status: "pending",
        },
      },
    ],
  },
  {
    ticketId: "TK-20260305-02",
    customerId: "cust-4002",
    sessionId: "conv-wechat-002",
    sourceChannel: "wechat",
    category: "refund",
    status: "resolved",
    priority: "medium",
    summary: "退款已到账确认。",
    latestMessage: "退款在银行侧延迟后已成功到账。",
    escalationLevel: 0,
    createdAt: "2026-03-05T07:20:00Z",
    updatedAt: "2026-03-06T13:10:00Z",
    events: [
      {
        eventId: "evt-tk-20260305-02-1",
        eventType: "ticket_created",
        message: "客户反馈退款到账缓慢。",
        createdAt: "2026-03-05T07:20:00Z",
      },
      {
        eventId: "evt-tk-20260305-02-2",
        eventType: "status_changed",
        message: "银行已确认退款入账。",
        createdAt: "2026-03-06T13:10:00Z",
        metadata: {
          status: "resolved",
        },
      },
    ],
  },
  {
    ticketId: "TK-20260306-03",
    customerId: "cust-5010",
    sessionId: "conv-app-003",
    sourceChannel: "app",
    category: "logistics",
    status: "open",
    priority: "medium",
    summary: "物流轨迹长时间未更新。",
    latestMessage: "包裹已经两天没有物流更新。",
    escalationLevel: 0,
    createdAt: "2026-03-06T05:10:00Z",
    updatedAt: "2026-03-08T06:20:00Z",
    events: [
      {
        eventId: "evt-tk-20260306-03-1",
        eventType: "ticket_created",
        message: "用户反馈物流停滞。",
        createdAt: "2026-03-06T05:10:00Z",
      },
      {
        eventId: "evt-tk-20260306-03-2",
        eventType: "carrier_follow_up",
        message: "已向承运商发起轨迹核查。",
        createdAt: "2026-03-07T15:40:00Z",
      },
      {
        eventId: "evt-tk-20260306-03-3",
        eventType: "agent_note",
        message: "客户要求在今天内回电说明。",
        createdAt: "2026-03-08T06:20:00Z",
      },
    ],
  },
  {
    ticketId: "TK-20260304-04",
    customerId: "cust-7788",
    sessionId: "conv-web-004",
    sourceChannel: "web",
    category: "account",
    status: "pending",
    priority: "high",
    summary: "账号异常登录触发限制。",
    latestMessage: "账号突然被限制登录，需要尽快恢复。",
    escalationLevel: 1,
    createdAt: "2026-03-04T12:00:00Z",
    updatedAt: "2026-03-09T04:00:00Z",
    events: [
      {
        eventId: "evt-tk-20260304-04-1",
        eventType: "ticket_created",
        message: "客户报告账号异常登录限制。",
        createdAt: "2026-03-04T12:00:00Z",
      },
      {
        eventId: "evt-tk-20260304-04-2",
        eventType: "security_review",
        message: "已提交风控复核并等待结果。",
        createdAt: "2026-03-07T18:30:00Z",
      },
      {
        eventId: "evt-tk-20260304-04-3",
        eventType: "status_changed",
        message: "等待客户补充身份校验材料。",
        createdAt: "2026-03-09T04:00:00Z",
        metadata: {
          status: "pending",
        },
      },
    ],
  },
  {
    ticketId: "TK-20260303-05",
    customerId: "cust-6600",
    sessionId: "conv-email-005",
    sourceChannel: "email",
    category: "complaint",
    status: "open",
    priority: "high",
    summary: "客户投诉重复扣费且要求主管介入。",
    latestMessage: "如果今天不给明确答复，我会继续投诉。",
    escalationLevel: 2,
    createdAt: "2026-03-03T03:00:00Z",
    updatedAt: "2026-03-09T16:45:00Z",
    events: [
      {
        eventId: "evt-tk-20260303-05-1",
        eventType: "ticket_created",
        message: "客户投诉重复扣费。",
        createdAt: "2026-03-03T03:00:00Z",
      },
      {
        eventId: "evt-tk-20260303-05-2",
        eventType: "priority_changed",
        message: "投诉升级为高优先级处理。",
        createdAt: "2026-03-08T09:15:00Z",
        metadata: {
          priority: "high",
        },
      },
      {
        eventId: "evt-tk-20260303-05-3",
        eventType: "escalated_to_human",
        message: "已升级至主管队列。",
        createdAt: "2026-03-09T16:45:00Z",
      },
    ],
  },
  {
    ticketId: "TK-20260302-06",
    customerId: "cust-3201",
    sessionId: "conv-whatsapp-006",
    sourceChannel: "whatsapp",
    category: "refund",
    status: "closed",
    priority: "low",
    summary: "退款工单已完结归档。",
    latestMessage: "客户确认问题已经解决。",
    escalationLevel: 0,
    createdAt: "2026-03-02T01:10:00Z",
    updatedAt: "2026-03-05T10:10:00Z",
    events: [
      {
        eventId: "evt-tk-20260302-06-1",
        eventType: "ticket_created",
        message: "客户咨询退款进度。",
        createdAt: "2026-03-02T01:10:00Z",
      },
      {
        eventId: "evt-tk-20260302-06-2",
        eventType: "status_changed",
        message: "退款成功到账。",
        createdAt: "2026-03-04T08:30:00Z",
        metadata: {
          status: "resolved",
        },
      },
      {
        eventId: "evt-tk-20260302-06-3",
        eventType: "ticket_closed",
        message: "客户确认关闭工单。",
        createdAt: "2026-03-05T10:10:00Z",
      },
    ],
  },
];

export function seedFakeTicketSqlDatabase(
  database: DatabaseSync,
  records: SeedTicketRecord[] = defaultSeedTickets,
): void {
  const insertTicket = database.prepare(`
    INSERT OR IGNORE INTO tickets (
      ticket_id,
      customer_id,
      session_id,
      source_channel,
      category,
      status,
      priority,
      summary,
      latest_message,
      escalation_level,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertEvent = database.prepare(`
    INSERT OR IGNORE INTO ticket_events (
      event_id,
      ticket_id,
      event_type,
      message,
      metadata_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const record of records) {
    insertTicket.run(
      record.ticketId,
      record.customerId,
      record.sessionId,
      record.sourceChannel,
      record.category,
      record.status,
      record.priority,
      record.summary,
      record.latestMessage,
      record.escalationLevel,
      record.createdAt,
      record.updatedAt,
    );

    for (const event of record.events) {
      insertEvent.run(
        event.eventId,
        record.ticketId,
        event.eventType,
        event.message,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.createdAt,
      );
    }
  }
}
