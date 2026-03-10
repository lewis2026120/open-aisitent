import type { TicketState } from "../core/contracts.js";
import type {
  TicketTools,
  TicketsCreateParams,
  TicketsQueryParams,
  TicketsUpdateParams,
} from "./ticket-tools.js";

export type MockTicketsQueryResolver = (
  params: TicketsQueryParams,
) => Promise<TicketState | null> | TicketState | null;
export type MockTicketsCreateResolver = (
  params: TicketsCreateParams,
) => Promise<TicketState> | TicketState;
export type MockTicketsUpdateResolver = (
  params: TicketsUpdateParams,
) => Promise<TicketState> | TicketState;

export class MockTicketTools implements TicketTools {
  constructor(
    private readonly queryResolver: MockTicketsQueryResolver,
    private readonly createResolver: MockTicketsCreateResolver,
    private readonly updateResolver: MockTicketsUpdateResolver,
  ) {}

  async ticketsQuery(params: TicketsQueryParams): Promise<TicketState | null> {
    return this.queryResolver(params);
  }

  async ticketsCreate(params: TicketsCreateParams): Promise<TicketState> {
    return this.createResolver(params);
  }

  async ticketsUpdate(params: TicketsUpdateParams): Promise<TicketState> {
    return this.updateResolver(params);
  }

  static fromState(state: TicketState | null): MockTicketTools {
    return new MockTicketTools(() => state, () => {
      throw new Error("ticketsCreate was not expected in this test.");
    }, () => {
      throw new Error("ticketsUpdate was not expected in this test.");
    });
  }
}
