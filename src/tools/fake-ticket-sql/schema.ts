import type { DatabaseSync } from "node:sqlite";

export const FAKE_TICKET_SQL_SCHEMA = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS tickets (
    ticket_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    source_channel TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('none', 'open', 'pending', 'resolved', 'closed')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    summary TEXT NOT NULL,
    latest_message TEXT NOT NULL,
    escalation_level INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ticket_events (
    event_id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tickets_customer_session
    ON tickets (customer_id, session_id, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket
    ON ticket_events (ticket_id, created_at ASC);
`;

export function applyFakeTicketSqlSchema(database: DatabaseSync): void {
  database.exec(FAKE_TICKET_SQL_SCHEMA);
}
