import Database from "better-sqlite3";
import path from "path";
import { Pool } from "pg";

type SqlValue = string | number | null;

export type QuickUser = {
  id: number;
  displayName: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  floor: string;
  apartment: string;
  locality: string;
  province: string;
  cp: string;
  notes: string;
  isActive: boolean;
};

type DbRow = Record<string, SqlValue>;

type PgRow = {
  id: number;
  display_name: string;
  email: string | null;
  phone: string | null;
  street: string;
  number: string;
  floor: string | null;
  apartment: string | null;
  locality: string;
  province: string;
  cp: string;
  notes: string | null;
  is_active: boolean;
};

let sqliteDbInstance: Database.Database | null = null;
let pgPoolInstance: Pool | null = null;
let pgSchemaReadyPromise: Promise<void> | null = null;

function normalizeDbPath(fileName: string): string {
  return path.resolve(process.cwd(), fileName);
}

function shouldUsePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  return String(value) === "1";
}

function mapQuickUser(row: DbRow): QuickUser {
  return {
    id: Number(row.id),
    displayName: String(row.display_name),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    street: String(row.street),
    number: String(row.number),
    floor: String(row.floor ?? ""),
    apartment: String(row.apartment ?? ""),
    locality: String(row.locality),
    province: String(row.province),
    cp: String(row.cp),
    notes: String(row.notes ?? ""),
    isActive: normalizeBoolean(row.is_active)
  };
}

function mapQuickUserFromPg(row: PgRow): QuickUser {
  return {
    id: Number(row.id),
    displayName: String(row.display_name),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    street: String(row.street),
    number: String(row.number),
    floor: String(row.floor ?? ""),
    apartment: String(row.apartment ?? ""),
    locality: String(row.locality),
    province: String(row.province),
    cp: String(row.cp),
    notes: String(row.notes ?? ""),
    isActive: Boolean(row.is_active)
  };
}

function getSqliteDb(): Database.Database {
  if (sqliteDbInstance) {
    return sqliteDbInstance;
  }

  const dbFilePath = normalizeDbPath("orxoca.sqlite");
  const db = new Database(dbFilePath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS quick_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      street TEXT NOT NULL,
      number TEXT NOT NULL,
      floor TEXT,
      apartment TEXT,
      locality TEXT NOT NULL,
      province TEXT NOT NULL,
      cp TEXT NOT NULL,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  sqliteDbInstance = db;
  return sqliteDbInstance;
}

function getPgPool(): Pool {
  if (pgPoolInstance) {
    return pgPoolInstance;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL para usar Postgres.");
  }

  pgPoolInstance = new Pool({
    connectionString,
    ssl:
      process.env.PGSSL === "false"
        ? undefined
        : {
            rejectUnauthorized: false
          }
  });
  return pgPoolInstance;
}

async function ensurePostgresSchema(): Promise<void> {
  if (pgSchemaReadyPromise) {
    return pgSchemaReadyPromise;
  }

  pgSchemaReadyPromise = (async () => {
    const pool = getPgPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quick_users (
        id BIGSERIAL PRIMARY KEY,
        display_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        street TEXT NOT NULL,
        number TEXT NOT NULL,
        floor TEXT,
        apartment TEXT,
        locality TEXT NOT NULL,
        province TEXT NOT NULL,
        cp TEXT NOT NULL,
        notes TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  })();

  return pgSchemaReadyPromise;
}

export async function listQuickUsers(): Promise<QuickUser[]> {
  if (shouldUsePostgres()) {
    await ensurePostgresSchema();
    const pool = getPgPool();
    const result = await pool.query<PgRow>(
      `
        SELECT id, display_name, email, phone, street, number, floor, apartment, locality, province, cp, notes, is_active
        FROM quick_users
        WHERE is_active = TRUE
        ORDER BY display_name
      `
    );
    return result.rows.map(mapQuickUserFromPg);
  }

  const rows = getSqliteDb()
    .prepare(
      "SELECT id, display_name, email, phone, street, number, floor, apartment, locality, province, cp, notes, is_active FROM quick_users WHERE is_active = 1 ORDER BY display_name"
    )
    .all() as DbRow[];
  return rows.map(mapQuickUser);
}

export async function getQuickUserById(id: number): Promise<QuickUser | null> {
  if (shouldUsePostgres()) {
    await ensurePostgresSchema();
    const pool = getPgPool();
    const result = await pool.query<PgRow>(
      `
        SELECT id, display_name, email, phone, street, number, floor, apartment, locality, province, cp, notes, is_active
        FROM quick_users
        WHERE id = $1
      `,
      [id]
    );
    return result.rows[0] ? mapQuickUserFromPg(result.rows[0]) : null;
  }

  const row = getSqliteDb()
    .prepare(
      "SELECT id, display_name, email, phone, street, number, floor, apartment, locality, province, cp, notes, is_active FROM quick_users WHERE id = ?"
    )
    .get(id) as DbRow | undefined;
  return row ? mapQuickUser(row) : null;
}
