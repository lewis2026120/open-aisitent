#!/usr/bin/env bash
set -euo pipefail

action="${1:-}"

db_path="${TICKET_DB_PATH:-}"
customer_id="${TICKET_CUSTOMER_ID:-}"
session_id="${TICKET_SESSION_ID:-}"
ticket_id="${TICKET_ID:-}"
summary="${TICKET_SUMMARY:-}"
message="${TICKET_MESSAGE:-}"
priority="${TICKET_PRIORITY:-}"
status="${TICKET_STATUS:-}"

if [[ -z "$db_path" ]]; then
  echo '{"ok":false,"error":"TICKET_DB_PATH is required"}'
  exit 1
fi

mkdir -p "$(dirname "$db_path")"

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo '{"ok":false,"error":"sqlite3 command is not available"}'
  exit 1
fi

json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e ':a;N;$!ba;s/\n/\\n/g' -e 's/\r/\\r/g'
}

sql_escape() {
  printf '%s' "$1" | sed "s/'/''/g"
}

init_schema() {
  sqlite3 "$db_path" <<'SQL'
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS tickets (
  ticket_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('none', 'open', 'pending', 'resolved', 'closed')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  summary TEXT NOT NULL,
  latest_message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ticket_events (
  event_id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_session
  ON tickets (customer_id, session_id, updated_at DESC);
SQL
}

format_ticket_json() {
  local row="$1"
  if [[ -z "$row" ]]; then
    echo '{"ok":true,"ticketState":null}'
    return
  fi

  local parsed_ticket_id parsed_status parsed_priority parsed_summary parsed_updated_at
  IFS=$'\t' read -r parsed_ticket_id parsed_status parsed_priority parsed_summary parsed_updated_at <<<"$row"

  echo "{\"ok\":true,\"ticketState\":{\"ticketId\":\"$(json_escape "$parsed_ticket_id")\",\"status\":\"$(json_escape "$parsed_status")\",\"priority\":\"$(json_escape "$parsed_priority")\",\"summary\":\"$(json_escape "$parsed_summary")\",\"lastUpdateAt\":\"$(json_escape "$parsed_updated_at")\"}}"
}

select_ticket_row() {
  local lookup_ticket_id="$1"
  local lookup_customer_id="$2"
  local lookup_session_id="$3"

  if [[ -n "$lookup_ticket_id" ]]; then
    local escaped_id
    escaped_id="$(sql_escape "$lookup_ticket_id")"
    sqlite3 -separator $'\t' "$db_path" "SELECT ticket_id,status,priority,summary,updated_at FROM tickets WHERE ticket_id='${escaped_id}' LIMIT 1;"
    return
  fi

  if [[ -n "$lookup_customer_id" && -n "$lookup_session_id" ]]; then
    local escaped_customer escaped_session
    escaped_customer="$(sql_escape "$lookup_customer_id")"
    escaped_session="$(sql_escape "$lookup_session_id")"
    local scoped
    scoped="$(sqlite3 -separator $'\t' "$db_path" "SELECT ticket_id,status,priority,summary,updated_at FROM tickets WHERE customer_id='${escaped_customer}' AND session_id='${escaped_session}' ORDER BY updated_at DESC LIMIT 1;")"
    if [[ -n "$scoped" ]]; then
      printf '%s' "$scoped"
      return
    fi
  fi

  if [[ -n "$lookup_customer_id" ]]; then
    local escaped_customer
    escaped_customer="$(sql_escape "$lookup_customer_id")"
    sqlite3 -separator $'\t' "$db_path" "SELECT ticket_id,status,priority,summary,updated_at FROM tickets WHERE customer_id='${escaped_customer}' ORDER BY updated_at DESC LIMIT 1;"
  fi
}

ensure_priority() {
  local value="$1"
  if [[ "$value" != "low" && "$value" != "medium" && "$value" != "high" ]]; then
    echo "medium"
    return
  fi
  echo "$value"
}

ensure_status() {
  local value="$1"
  if [[ "$value" != "none" && "$value" != "open" && "$value" != "pending" && "$value" != "resolved" && "$value" != "closed" ]]; then
    echo "pending"
    return
  fi
  echo "$value"
}

create_ticket() {
  local now ticket_count next_number generated_ticket_id
  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  local date_segment
  date_segment="$(date -u +"%Y%m%d")"
  ticket_count="$(sqlite3 "$db_path" "SELECT COUNT(*) FROM tickets WHERE ticket_id LIKE 'TK-${date_segment}-%';")"
  next_number=$(printf "%02d" $((ticket_count + 1)))
  generated_ticket_id="TK-${date_segment}-${next_number}"

  local escaped_ticket_id escaped_customer escaped_session escaped_summary escaped_message escaped_priority escaped_now
  escaped_ticket_id="$(sql_escape "$generated_ticket_id")"
  escaped_customer="$(sql_escape "$customer_id")"
  escaped_session="$(sql_escape "$session_id")"
  escaped_summary="$(sql_escape "${summary:-${message:-新建工单}}")"
  escaped_message="$(sql_escape "${message:-${summary:-客户提交了新问题。}}")"
  escaped_priority="$(sql_escape "$(ensure_priority "${priority:-medium}")")"
  escaped_now="$(sql_escape "$now")"

  sqlite3 "$db_path" <<SQL
INSERT INTO tickets (ticket_id, customer_id, session_id, status, priority, summary, latest_message, created_at, updated_at)
VALUES ('${escaped_ticket_id}', '${escaped_customer}', '${escaped_session}', 'open', '${escaped_priority}', '${escaped_summary}', '${escaped_message}', '${escaped_now}', '${escaped_now}');
INSERT INTO ticket_events (event_id, ticket_id, event_type, message, created_at)
VALUES ('${escaped_ticket_id}-evt-1', '${escaped_ticket_id}', 'ticket_created', '${escaped_message}', '${escaped_now}');
SQL

  local row
  row="$(select_ticket_row "$generated_ticket_id" "$customer_id" "$session_id")"
  format_ticket_json "$row"
}

update_ticket() {
  local row existing_ticket_id
  row="$(select_ticket_row "$ticket_id" "$customer_id" "$session_id")"
  if [[ -z "$row" ]]; then
    echo '{"ok":false,"error":"ticket not found"}'
    exit 1
  fi

  IFS=$'\t' read -r existing_ticket_id _ _ _ _ <<<"$row"

  local now escaped_ticket_id next_priority next_status next_summary next_message
  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  escaped_ticket_id="$(sql_escape "$existing_ticket_id")"
  next_priority="$(ensure_priority "${priority:-medium}")"
  next_status="$(ensure_status "${status:-pending}")"
  next_summary="${summary:-${message:-已补充处理信息}}"
  next_message="${message:-${summary:-已补充处理信息}}"

  sqlite3 "$db_path" <<SQL
UPDATE tickets
SET status = '$(sql_escape "$next_status")',
    priority = '$(sql_escape "$next_priority")',
    summary = '$(sql_escape "$next_summary")',
    latest_message = '$(sql_escape "$next_message")',
    updated_at = '$(sql_escape "$now")'
WHERE ticket_id = '${escaped_ticket_id}';
INSERT INTO ticket_events (event_id, ticket_id, event_type, message, created_at)
VALUES ('${escaped_ticket_id}-evt-' || (SELECT COUNT(*) + 1 FROM ticket_events WHERE ticket_id='${escaped_ticket_id}'), '${escaped_ticket_id}', 'agent_note', '$(sql_escape "$next_message")', '$(sql_escape "$now")');
SQL

  local refreshed
  refreshed="$(select_ticket_row "$existing_ticket_id" "$customer_id" "$session_id")"
  format_ticket_json "$refreshed"
}

query_ticket() {
  local row
  row="$(select_ticket_row "$ticket_id" "$customer_id" "$session_id")"
  format_ticket_json "$row"
}

init_schema

case "$action" in
  query)
    query_ticket
    ;;
  create)
    if [[ -z "$customer_id" || -z "$session_id" ]]; then
      echo '{"ok":false,"error":"customer_id and session_id are required for create"}'
      exit 1
    fi
    create_ticket
    ;;
  update)
    if [[ -z "$ticket_id" ]]; then
      echo '{"ok":false,"error":"ticket_id is required for update"}'
      exit 1
    fi
    update_ticket
    ;;
  *)
    echo '{"ok":false,"error":"unsupported action"}'
    exit 1
    ;;
esac
