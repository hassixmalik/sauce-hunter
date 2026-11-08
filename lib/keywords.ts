import { DEFAULT_KEYWORDS, type KeywordSeed } from "@/config/scoring";
import { db, q } from "./db";
import type { Keyword } from "./types";

const TYPES = ["include", "exclude", "boost"] as const;
const FIELDS = ["title", "description", "location"] as const;

/** Validates + normalises one keyword. Returns null if it is unusable. */
export function cleanKeyword(k: Partial<KeywordSeed> & { term?: unknown }, fallbackType?: string): Keyword | null {
  const term = String(k.term ?? "").toLowerCase().trim().replace(/\s+/g, " ");
  const type = String(k.type || fallbackType || "").toLowerCase().trim();
  const field = String(k.field || "title").toLowerCase().trim();
  if (!term || term.length > 100) return null;
  if (!TYPES.includes(type as Keyword["type"]) || !FIELDS.includes(field as Keyword["field"])) return null;
  const weight = type === "boost" ? Math.round(Number(k.weight) || 0) : 0;
  return { term, type: type as Keyword["type"], field: field as Keyword["field"], weight, active: true };
}

/** Insert many keywords in one query. Duplicates are skipped. */
export async function addKeywords(list: Keyword[]): Promise<{ added: number; skipped: number }> {
  if (!list.length) return { added: 0, skipped: 0 };
  const rows = await q(
    `insert into keywords (term, type, field, weight)
     select * from unnest($1::text[], $2::text[], $3::text[], $4::int[])
     on conflict (term, type, field) do nothing returning id`,
    [list.map((k) => k.term), list.map((k) => k.type), list.map((k) => k.field), list.map((k) => k.weight)],
  );
  return { added: rows.length, skipped: list.length - rows.length };
}

export async function listKeywords(): Promise<Keyword[]> {
  return q<Keyword>(`select id::int, term, type, field, weight, active from keywords order by type, field, weight desc, term`);
}

/** Keywords for scoring. Seeds the defaults the first time. */
export async function loadKeywords(): Promise<Keyword[]> {
  let rows = await listKeywords();
  if (!rows.length) {
    await seedDefaults();
    rows = await listKeywords();
  }
  return rows;
}

export async function seedDefaults() {
  return addKeywords(DEFAULT_KEYWORDS.map((k) => cleanKeyword(k)!).filter(Boolean));
}

export async function resetToDefaults() {
  await db().transaction((tx) => [tx`delete from keywords`]);
  return seedDefaults();
}

/** Parses an uploaded file. CSV: term,type,field,weight (header optional). TXT: one term per line. */
export function parseKeywordFile(text: string, filename: string, fallbackType: string): (Keyword | null)[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const isCsv = filename.toLowerCase().endsWith(".csv") || lines.some((l) => l.includes(","));
  if (!isCsv) return lines.map((term) => cleanKeyword({ term }, fallbackType));
  return lines
    .map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")))
    .filter((c, i) => !(i === 0 && c[0]?.toLowerCase() === "term"))
    .map(([term, type, field, weight]) =>
      cleanKeyword({ term, type: type as Keyword["type"], field: field as Keyword["field"], weight: Number(weight) }, fallbackType),
    );
}
