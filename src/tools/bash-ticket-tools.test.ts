import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createBashTicketToolsBundle, isSqliteCliAvailable } from "./bash-ticket-tools.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await fs.rm(dir, { recursive: true, force: true });
    }),
  );
});

describe("BashTicketTools", () => {
  it("can create/query/update ticket via bash sql tool", async () => {
    if (!(await isSqliteCliAvailable())) {
      return;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "bash-ticket-tools-"));
    tempDirs.push(tempDir);

    const bundle = createBashTicketToolsBundle({
      databasePath: path.join(tempDir, "tickets.sqlite"),
    });

    const created = await bundle.tools.ticketsCreate({
      customerId: "cust-bash-001",
      sessionId: "session-bash-001",
      summary: "测试 bash 工具写入",
      message: "请创建一个测试工单",
      priority: "high",
    });

    const queried = await bundle.tools.ticketsQuery({
      ticketId: created.ticketId,
      customerId: "cust-bash-001",
      sessionId: "session-bash-001",
    });

    const updated = await bundle.tools.ticketsUpdate({
      ticketId: created.ticketId!,
      message: "继续补充测试信息",
      summary: "测试 bash 工具更新",
      priority: "medium",
      status: "pending",
    });

    expect(created.ticketId?.startsWith("TK-")).toBe(true);
    expect(queried?.ticketId).toBe(created.ticketId);
    expect(updated.status).toBe("pending");
    expect(updated.summary).toContain("更新");
  });
});
