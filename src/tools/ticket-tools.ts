import type { TicketPriority, TicketState, TicketStatus } from "../core/contracts.js";

export interface TicketsQueryParams {
  ticketId?: string;
  customerId: string;
  sessionId: string;
}

export interface TicketsCreateParams {
  customerId: string;
  sessionId: string;
  summary: string;
  message: string;
  priority?: TicketPriority;
}

export interface TicketsUpdateParams {
  ticketId: string;
  message: string;
  summary?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
}

export interface TicketOperationResult {
  action: "query" | "create" | "update";
  ticketState: TicketState | null;
}

export interface TicketTools {
  ticketsQuery(params: TicketsQueryParams): Promise<TicketState | null>;
  ticketsCreate(params: TicketsCreateParams): Promise<TicketState>;
  ticketsUpdate(params: TicketsUpdateParams): Promise<TicketState>;
}
