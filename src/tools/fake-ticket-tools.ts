import type { DatabaseSync } from "node:sqlite";
import type { TicketState } from "../core/contracts.js";
import { createFakeTicketSqlDatabase } from "./fake-ticket-sql/db.js";
import {
  createFakeSqlTicketRepository,
  type FakeSqlTicketRepository,
} from "./fake-ticket-sql/repository.js";
import type {
  TicketTools,
  TicketsCreateParams,
  TicketsQueryParams,
  TicketsUpdateParams,
} from "./ticket-tools.js";

export interface FakeSqlTicketToolsBundle {
  database: DatabaseSync;
  repository: FakeSqlTicketRepository;
  tools: TicketTools;
  close(): void;
}

export class FakeSqlTicketTools implements TicketTools {
  constructor(private readonly repository: FakeSqlTicketRepository) {}

  async ticketsQuery(params: TicketsQueryParams): Promise<TicketState | null> {
    return this.repository.toTicketState(this.repository.queryTicket(params));
  }

  async ticketsCreate(params: TicketsCreateParams): Promise<TicketState> {
    return this.repository.toTicketState(this.repository.createTicket(params)) as TicketState;
  }

  async ticketsUpdate(params: TicketsUpdateParams): Promise<TicketState> {
    return this.repository.toTicketState(this.repository.updateTicket(params)) as TicketState;
  }
}

export function createFakeSqlTicketToolsBundle(params: {
  databasePath?: string;
  seed?: boolean;
} = {}): FakeSqlTicketToolsBundle {
  const database = createFakeTicketSqlDatabase({
    databasePath: params.databasePath,
    seed: params.seed,
  });
  const repository = createFakeSqlTicketRepository(database);
  const tools = new FakeSqlTicketTools(repository);

  return {
    database,
    repository,
    tools,
    close() {
      database.close();
    },
  };
}
