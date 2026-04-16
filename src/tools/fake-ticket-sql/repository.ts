import type { DatabaseSync } from "node:sqlite";
import type { TicketPriority, TicketState, TicketStatus } from "../../core/contracts.js";
import type {
  TicketsCreateParams,
  TicketsQueryParams,
  TicketsUpdateParams,
} from "../ticket-tools.js";

export interface FakeSqlTicketEvent {
  eventId: string;
  ticketId: string;
  eventType: string;
  message: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

export interface FakeSqlTicketRecord {
  ticketId: string;
  customerId: string;
  sessionId: string;
  sourceChannel: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  summary: string;
  latestMessage: string;
  escalationLevel: number;
  createdAt: string;
  updatedAt: string;
  events: FakeSqlTicketEvent[];
}

export interface FakeSqlTicketRepository {
  queryTicket(params: TicketsQueryParams): FakeSqlTicketRecord | null;
  createTicket(params: TicketsCreateParams): FakeSqlTicketRecord;
  updateTicket(params: TicketsUpdateParams): FakeSqlTicketRecord;
  listTicketEvents(ticketId: string): FakeSqlTicketEvent[];
  toTicketState(record: FakeSqlTicketRecord | null): TicketState | null;
}

type TicketRow = {
  ticket_id: string;
  customer_id: string;
  session_id: string;
  source_channel: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  summary: string;
  latest_message: string;
  escalation_level: number;
  created_at: string;
  updated_at: string;
};

type TicketEventRow = {
  event_id: string;
  ticket_id: string;
  event_type: string;
  message: string;
  metadata_json: string | null;
  created_at: string;
};

export function createFakeSqlTicketRepository(
  database: DatabaseSync,
): FakeSqlTicketRepository {
  return {
    queryTicket(params) {
      const row = selectTicketRow(database, params);
      return row ? mapTicketRecord(database, row) : null;
    },
    createTicket(params) {
      const now = new Date().toISOString();
      const ticketId = createTicketId(database, now);
      const priority = params.priority ?? "medium";
      const summary = params.summary.trim();
      const category = inferCategory(`${summary} ${params.message}`);

      database.prepare(`
        INSERT INTO tickets (
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
      `).run(
        ticketId,
        params.customerId,
        params.sessionId,
        "mvp-cli",
        category,
        "open",
        priority,
        summary,
        params.message,
        0,
        now,
        now,
      );

      insertTicketEvent(database, {
        eventId: `${ticketId}-evt-1`,
        ticketId,
        eventType: "ticket_created",
        message: params.message,
        metadata: {
          summary,
          priority,
        },
        createdAt: now,
      });

      return mapTicketRecord(
        database,
        requireTicketRow(database, { ticketId, customerId: params.customerId, sessionId: params.sessionId }),
      );
    },
    updateTicket(params) {
      const existingRow = requireTicketRow(database, {
        ticketId: params.ticketId,
        customerId: "",
        sessionId: "",
      }, true);
      const now = new Date().toISOString();
      const nextStatus = params.status ?? existingRow.status;
      const nextPriority = params.priority ?? existingRow.priority;
      const nextSummary = params.summary?.trim() || existingRow.summary;
      const escalationLevel =
        nextPriority === "high" || nextStatus === "open"
          ? Math.max(existingRow.escalation_level, 1)
          : existingRow.escalation_level;

      database.prepare(`
        UPDATE tickets
        SET status = ?,
            priority = ?,
            summary = ?,
            latest_message = ?,
            escalation_level = ?,
            updated_at = ?
        WHERE ticket_id = ?
      `).run(
        nextStatus,
        nextPriority,
        nextSummary,
        params.message,
        escalationLevel,
        now,
        params.ticketId,
      );

      insertTicketEvent(database, {
        eventId: `${params.ticketId}-evt-${countTicketEvents(database, params.ticketId) + 1}`,
        ticketId: params.ticketId,
        eventType: inferUpdateEventType(existingRow, nextStatus, nextPriority, nextSummary),
        message: params.message,
        metadata: {
          status: nextStatus,
          priority: nextPriority,
          summary: nextSummary,
        },
        createdAt: now,
      });

      return mapTicketRecord(
        database,
        requireTicketRow(database, {
          ticketId: params.ticketId,
          customerId: "",
          sessionId: "",
        }, true),
      );
    },
    listTicketEvents(ticketId) {
      const rows = database
        .prepare(`
          SELECT event_id, ticket_id, event_type, message, metadata_json, created_at
          FROM ticket_events
          WHERE ticket_id = ?
          ORDER BY created_at ASC
        `)
        .all(ticketId) as TicketEventRow[];

      return rows.map(mapTicketEventRow);
    },
    toTicketState(record) {
      return record ? mapTicketState(record) : null;
    },
  };
}

function selectTicketRow(
  database: DatabaseSync,
  params: TicketsQueryParams,
): TicketRow | null {
  if (params.ticketId?.trim()) {
    const directMatch = database
      .prepare(`
        SELECT * FROM tickets
        WHERE ticket_id = ?
          AND (? = '' OR customer_id = ?)
        LIMIT 1
      `)
      .get(params.ticketId.trim(), params.customerId, params.customerId) as TicketRow | undefined;

    if (directMatch) {
      return directMatch;
    }
  }

  const sessionMatch = database
    .prepare(`
      SELECT * FROM tickets
      WHERE customer_id = ?
        AND session_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `)
    .get(params.customerId, params.sessionId) as TicketRow | undefined;

  if (sessionMatch) {
    return sessionMatch;
  }

  const customerMatch = database
    .prepare(`
      SELECT * FROM tickets
      WHERE customer_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `)
    .get(params.customerId) as TicketRow | undefined;

  return customerMatch ?? null;
}

function requireTicketRow(
  database: DatabaseSync,
  params: TicketsQueryParams,
  allowLooseLookup = false,
): TicketRow {
  const row = allowLooseLookup && params.ticketId?.trim()
    ? (database.prepare(`SELECT * FROM tickets WHERE ticket_id = ? LIMIT 1`).get(params.ticketId.trim()) as TicketRow | undefined)
    : selectTicketRow(database, params) ?? undefined;

  if (!row) {
    throw new Error(`Fake SQL ticket repository could not find ticket "${params.ticketId ?? 'unknown'}".`);
  }

  return row;
}

function mapTicketRecord(database: DatabaseSync, row: TicketRow): FakeSqlTicketRecord {
  return {
    ticketId: row.ticket_id,
    customerId: row.customer_id,
    sessionId: row.session_id,
    sourceChannel: row.source_channel,
    category: row.category,
    status: row.status,
    priority: row.priority,
    summary: row.summary,
    latestMessage: row.latest_message,
    escalationLevel: row.escalation_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events: database
      .prepare(`
        SELECT event_id, ticket_id, event_type, message, metadata_json, created_at
        FROM ticket_events
        WHERE ticket_id = ?
        ORDER BY created_at ASC
      `)
      .all(row.ticket_id)
      .map((event) => mapTicketEventRow(event as TicketEventRow)),
  };
}

function mapTicketEventRow(row: TicketEventRow): FakeSqlTicketEvent {
  return {
    eventId: row.event_id,
    ticketId: row.ticket_id,
    eventType: row.event_type,
    message: row.message,
    metadata: row.metadata_json ? parseMetadata(row.metadata_json) : undefined,
    createdAt: row.created_at,
  };
}

function parseMetadata(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, String(value)]),
    );
  } catch {
    return {};
  }
}

function mapTicketState(record: FakeSqlTicketRecord): TicketState {
  return {
    ticketId: record.ticketId,
    status: record.status,
    priority: record.priority,
    summary: record.summary,
    lastUpdateAt: record.updatedAt,
  };
}

function createTicketId(database: DatabaseSync, timestamp: string): string {
  const dateSegment = timestamp.slice(0, 10).replaceAll("-", "");
  const result = database
    .prepare(`
      SELECT COUNT(*) AS count
      FROM tickets
      WHERE ticket_id LIKE ?
    `)
    .get(`TK-${dateSegment}-%`) as { count: number };

  const nextNumber = String(result.count + 1).padStart(2, "0");
  return `TK-${dateSegment}-${nextNumber}`;
}

function insertTicketEvent(
  database: DatabaseSync,
  event: {
    eventId: string;
    ticketId: string;
    eventType: string;
    message: string;
    metadata?: Record<string, string>;
    createdAt: string;
  },
): void {
  database.prepare(`
    INSERT INTO ticket_events (
      event_id,
      ticket_id,
      event_type,
      message,
      metadata_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    event.eventId,
    event.ticketId,
    event.eventType,
    event.message,
    event.metadata ? JSON.stringify(event.metadata) : null,
    event.createdAt,
  );
}

function countTicketEvents(database: DatabaseSync, ticketId: string): number {
  const result = database
    .prepare(`SELECT COUNT(*) AS count FROM ticket_events WHERE ticket_id = ?`)
    .get(ticketId) as { count: number };
  return result.count;
}

function inferCategory(text: string): string {
  if (/退款/u.test(text)) {
    return "refund";
  }
  if (/物流|包裹|发货/u.test(text)) {
    return "logistics";
  }
  if (/账号|登录|风控/u.test(text)) {
    return "account";
  }
  if (/投诉|主管|升级/u.test(text)) {
    return "complaint";
  }
  return "general";
}

function inferUpdateEventType(
  existingRow: TicketRow,
  nextStatus: TicketStatus,
  nextPriority: TicketPriority,
  nextSummary: string,
): string {
  if (existingRow.status !== nextStatus) {
    return "status_changed";
  }
  if (existingRow.priority !== nextPriority) {
    return "priority_changed";
  }
  if (existingRow.summary !== nextSummary) {
    return "summary_updated";
  }
  return "agent_note";
}
