import { describe, expect, it } from "vitest";
import { createFakeSqlTicketToolsBundle } from "./fake-ticket-tools.js";

describe("FakeSqlTicketTools", () => {
  it("queries the seeded refund ticket and loads timeline events", async () => {
    const bundle = createFakeSqlTicketToolsBundle();

    try {
      const ticketState = await bundle.tools.ticketsQuery({
        ticketId: "TK-20260307-01",
        customerId: "cust-9001",
        sessionId: "conv-whatsapp-001",
      });
      const events = bundle.repository.listTicketEvents("TK-20260307-01");

      expect(ticketState?.status).toBe("pending");
      expect(ticketState?.priority).toBe("high");
      expect(events).toHaveLength(3);
      expect(events.some((event) => event.eventType === "status_changed")).toBe(true);
    } finally {
      bundle.close();
    }
  });

  it("creates a new ticket and stores the creation event", async () => {
    const bundle = createFakeSqlTicketToolsBundle();

    try {
      const created = await bundle.tools.ticketsCreate({
        customerId: "cust-new-1",
        sessionId: "conv-new-1",
        summary: "客户要求创建新的退款工单",
        message: "请帮我补开一个退款工单。",
        priority: "high",
      });
      const record = bundle.repository.queryTicket({
        ticketId: created.ticketId,
        customerId: "cust-new-1",
        sessionId: "conv-new-1",
      });

      expect(created.ticketId).toMatch(/^TK-/);
      expect(record?.events).toHaveLength(1);
      expect(record?.events[0]?.eventType).toBe("ticket_created");
    } finally {
      bundle.close();
    }
  });

  it("updates an existing ticket and appends an event", async () => {
    const bundle = createFakeSqlTicketToolsBundle();

    try {
      const updated = await bundle.tools.ticketsUpdate({
        ticketId: "TK-20260306-03",
        message: "客户再次催促物流进度。",
        status: "pending",
        priority: "high",
        summary: "物流轨迹停滞且客户要求加急。",
      });
      const record = bundle.repository.queryTicket({
        ticketId: "TK-20260306-03",
        customerId: "cust-5010",
        sessionId: "conv-app-003",
      });

      expect(updated.status).toBe("pending");
      expect(updated.priority).toBe("high");
      expect(record?.events).toHaveLength(4);
      expect(record?.events.at(-1)?.eventType).toBe("status_changed");
    } finally {
      bundle.close();
    }
  });
});
