import { NextResponse } from "next/server";
import { localDate } from "./normalize";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

export function fail(e: unknown) {
  console.error(e);
  return json({ error: String((e as Error)?.message ?? e) }, 500);
}

export function isDate(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export const today = () => localDate();

/** Cron routes: Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export function cronAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}
