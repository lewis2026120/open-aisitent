import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { applyFakeTicketSqlSchema } from "./schema.js";
import { seedFakeTicketSqlDatabase } from "./seed.js";

export interface FakeTicketSqlDatabaseOptions {
  databasePath?: string;
  seed?: boolean;
}

export function createFakeTicketSqlDatabase(
  options: FakeTicketSqlDatabaseOptions = {},
): DatabaseSync {
  const databasePath = options.databasePath ?? ":memory:";
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const database = new DatabaseSync(databasePath);
  applyFakeTicketSqlSchema(database);

  if (options.seed ?? true) {
    seedFakeTicketSqlDatabase(database);
  }

  return database;
}
