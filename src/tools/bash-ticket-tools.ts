import { spawn } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { TicketState } from "../core/contracts.js";
import type {
  TicketTools,
  TicketsCreateParams,
  TicketsQueryParams,
  TicketsUpdateParams,
} from "./ticket-tools.js";

export interface BashTicketToolsBundle {
  tools: TicketTools;
  databasePath: string;
}

export interface BashTicketToolsOptions {
  databasePath: string;
  scriptPath?: string;
}

interface BashTicketToolResponse {
  ok: boolean;
  error?: string;
  ticketState?: TicketState | null;
}

export class BashTicketTools implements TicketTools {
  private readonly scriptPath: string;

  constructor(private readonly databasePath: string, scriptPath?: string) {
    this.scriptPath = scriptPath ?? resolveDefaultScriptPath();
    if (!fs.existsSync(this.scriptPath)) {
      throw new Error(`Bash ticket tool script not found: ${this.scriptPath}`);
    }
  }

  async ticketsQuery(params: TicketsQueryParams): Promise<TicketState | null> {
    const response = await this.callTool("query", {
      TICKET_DB_PATH: this.databasePath,
      TICKET_ID: params.ticketId,
      TICKET_CUSTOMER_ID: params.customerId,
      TICKET_SESSION_ID: params.sessionId,
    });

    return response.ticketState ?? null;
  }

  async ticketsCreate(params: TicketsCreateParams): Promise<TicketState> {
    const response = await this.callTool("create", {
      TICKET_DB_PATH: this.databasePath,
      TICKET_CUSTOMER_ID: params.customerId,
      TICKET_SESSION_ID: params.sessionId,
      TICKET_SUMMARY: params.summary,
      TICKET_MESSAGE: params.message,
      TICKET_PRIORITY: params.priority,
    });

    if (!response.ticketState) {
      throw new Error("Bash ticketsCreate returned empty ticketState.");
    }

    return response.ticketState;
  }

  async ticketsUpdate(params: TicketsUpdateParams): Promise<TicketState> {
    const response = await this.callTool("update", {
      TICKET_DB_PATH: this.databasePath,
      TICKET_ID: params.ticketId,
      TICKET_MESSAGE: params.message,
      TICKET_SUMMARY: params.summary,
      TICKET_PRIORITY: params.priority,
      TICKET_STATUS: params.status,
    });

    if (!response.ticketState) {
      throw new Error("Bash ticketsUpdate returned empty ticketState.");
    }

    return response.ticketState;
  }

  private async callTool(
    action: "query" | "create" | "update",
    env: Record<string, string | undefined>,
  ): Promise<BashTicketToolResponse> {
    const output = await runBashTool({
      scriptPath: this.scriptPath,
      action,
      env,
    });

    let parsed: BashTicketToolResponse;
    try {
      parsed = JSON.parse(output) as BashTicketToolResponse;
    } catch {
      throw new Error(`Bash ticket tool returned invalid JSON: ${output}`);
    }

    if (!parsed.ok) {
      throw new Error(parsed.error ?? "Bash ticket tool failed.");
    }

    return parsed;
  }
}

export function createBashTicketToolsBundle(
  options: BashTicketToolsOptions,
): BashTicketToolsBundle {
  fs.mkdirSync(path.dirname(options.databasePath), { recursive: true });

  return {
    databasePath: options.databasePath,
    tools: new BashTicketTools(options.databasePath, options.scriptPath),
  };
}

export async function isSqliteCliAvailable(): Promise<boolean> {
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("sqlite3", ["--version"], {
        stdio: "ignore",
      });
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`sqlite3 exited with code ${code ?? -1}`));
      });
    });
    return true;
  } catch {
    return false;
  }
}

function resolveDefaultScriptPath(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "bash-ticket-sql",
    "ticket-tool.sh",
  );
}

function runBashTool(args: {
  scriptPath: string;
  action: "query" | "create" | "update";
  env: Record<string, string | undefined>;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("bash", [args.scriptPath, args.action], {
      env: {
        ...process.env,
        ...args.env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));

    child.on("error", reject);
    child.on("exit", (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();

      if (code !== 0) {
        reject(
          new Error(
            `Bash ticket tool action ${args.action} failed with code ${code ?? -1}: ${stderr || stdout}`,
          ),
        );
        return;
      }

      resolve(stdout);
    });
  });
}
