import { describe, expect, it } from "vitest";
import { runGatewayDemo } from "../demo/gateway-demo.js";

describe("Gateway real-like business flow", () => {
  it("accepts a business-style message and drives the full tickets path", async () => {
    const trace = await runGatewayDemo();

    console.log("\\nGateway business flow trace:\n" + JSON.stringify(trace, null, 2));

    expect(trace.downstreamRoute).toBe("tickets");
    expect(trace.downstreamReply).toContain("TK-20260307-01");
    expect(trace.downstreamReply).toContain("处理中");
    expect(trace.ticketToolResult?.action).toBe("query");
    expect(trace.sessionStore.transcriptCount).toBeGreaterThan(0);
  });
});
