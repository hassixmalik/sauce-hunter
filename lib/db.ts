import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { schemaStatements } from "./schema";

let client: NeonQueryFunction<false, false> | null = null;
let ready: Promise<unknown> | null = null;

/** Lazy so `next build` works without DATABASE_URL. */
export function db() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}

/**
 * Creates the tables if missing. Runs once per server instance.
 * An advisory lock stops two cold starts racing each other on "create table".
 */
export function ensureSchema() {
  ready ??= (async () => {
    const [r] = (await db().query(`select to_regclass('public.uk_sponsors') is not null as ok`)) as { ok: boolean }[];
    if (r?.ok) return;
    await db().transaction((tx) => [tx`select pg_advisory_xact_lock(727274)`, ...schemaStatements().map((s) => tx.query(s))]);
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

/** Run a parameterised query: q("select * from jobs where id = $1", [id]) */
export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  return (await db().query(text, params)) as T[];
}
