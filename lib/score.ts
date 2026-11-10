import {
  MID_LEVEL_POINTS, MID_LEVEL_TERMS, NON_EUROPE_POINTS, NON_EUROPE_TERMS, NO_SPONSOR_PHRASES, NO_SPONSOR_POINTS, SENIORITY_TERMS,
  SPONSOR_PHRASES, SPONSOR_POINTS,
} from "@/config/scoring";
import type { Keyword } from "./types";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cache = new Map<string, RegExp>();
/** Whole-word, case-insensitive match. Works for terms like "next.js", "7+ years", "c++". */
export function has(text: string, term: string): boolean {
  let re = cache.get(term);
  if (!re) {
    re = new RegExp(`(?<![a-z0-9])${esc(term.toLowerCase())}(?![a-z0-9])`, "i");
    cache.set(term, re);
  }
  return re.test(text);
}
const hasAny = (text: string, terms: string[]) => terms.find((t) => has(text, t));

export interface ScoreInput {
  title: string;
  description?: string | null;
  location?: string | null;
  /** true = on the UK sponsor register */
  sponsorMatch?: boolean | null;
}
export interface ScoreResult { keep: boolean; reason?: "no-include" | "excluded"; score: number; matched: string[] }

export function scoreJob(job: ScoreInput, keywords: Keyword[]): ScoreResult {
  const active = keywords.filter((k) => k.active);
  const title = job.title.toLowerCase();
  const fields = { title, description: (job.description ?? "").toLowerCase(), location: (job.location ?? "").toLowerCase() };

  const includes = active.filter((k) => k.type === "include");
  if (includes.length && !includes.some((k) => has(title, k.term))) return { keep: false, reason: "no-include", score: 0, matched: [] };

  // An include phrase that contains the exclude word wins ("member of technical staff" vs "staff").
  const ex = active.find((k) => k.type === "exclude" && has(fields[k.field], k.term) &&
    !includes.some((i) => i.term !== k.term && has(i.term, k.term) && has(title, i.term)));
  if (ex) return { keep: false, reason: "excluded", score: 0, matched: [`-${ex.term}`] };

  let score = 0;
  const matched: string[] = [];
  const groupsHit = new Set<string>();
  for (const k of active) {
    if (k.type !== "boost" || !has(fields[k.field], k.term)) continue;
    const group = `${k.field}:${k.weight}`;
    if (groupsHit.has(group)) { matched.push(k.term); continue; }
    groupsHit.add(group);
    score += k.weight;
    matched.push(k.term);
  }

  const locationBoost = active.some((k) => k.type === "boost" && k.field === "location" && k.weight > 0 && has(fields.location, k.term));
  if (!locationBoost && hasAny(fields.location, NON_EUROPE_TERMS)) {
    score += NON_EUROPE_POINTS;
    matched.push("outside-europe");
  }

  if (hasAny(title, MID_LEVEL_TERMS) || !hasAny(title, SENIORITY_TERMS)) {
    score += MID_LEVEL_POINTS;
    matched.push("mid/no-seniority");
  }

  const text = `${fields.title} ${fields.description}`;
  if (hasAny(text, NO_SPONSOR_PHRASES)) {
    score += NO_SPONSOR_POINTS;
    matched.push("no-sponsorship");
  } else if (job.sponsorMatch) {
    score += SPONSOR_POINTS;
    matched.push("uk-sponsor");
  } else if (hasAny(text, SPONSOR_PHRASES)) {
    score += SPONSOR_POINTS;
    matched.push("visa-sponsorship");
  }

  return { keep: true, score: Math.max(0, Math.min(100, score)), matched };
}
