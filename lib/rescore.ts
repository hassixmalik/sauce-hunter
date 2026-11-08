import { PREVIEW_DAYS, SCORE_THRESHOLD } from "@/config/scoring";
import { q } from "./db";
import { loadKeywords } from "./keywords";
import { scoreJob } from "./score";

interface Stored { id: number; batch_date: string; title: string; description: string | null; location: string | null; sponsor_uk: boolean | null; score: number }

const load = (where: string, params: unknown[]) =>
  q<Stored>(`select id::int, batch_date::text, title, description, location, sponsor_uk, score from jobs where ${where}`, params);

/** How many stored jobs from the last N days would pass with today's keywords. Read-only. */
export async function previewImpact(days = PREVIEW_DAYS) {
  const [jobs, kw] = await Promise.all([load(`batch_date >= current_date - $1::int`, [days]), loadKeywords()]);
  const byDay: Record<string, { total: number; pass: number; changed: number }> = {};
  for (const j of jobs) {
    const s = scoreJob({ ...j, sponsorMatch: j.sponsor_uk }, kw);
    const d = (byDay[j.batch_date] ??= { total: 0, pass: 0, changed: 0 });
    d.total++;
    if (s.keep && s.score >= SCORE_THRESHOLD) d.pass++;
    if (s.score !== j.score) d.changed++;
  }
  const total = Object.values(byDay).reduce((a, d) => ({ total: a.total + d.total, pass: a.pass + d.pass }), { total: 0, pass: 0 });
  return { days, threshold: SCORE_THRESHOLD, ...total, byDay };
}

/** Re-scores one day in place. Jobs that now fail stay (with their new score) so nothing silently disappears. */
export async function rescoreDay(date: string) {
  const [jobs, kw] = await Promise.all([load(`batch_date = $1::date`, [date]), loadKeywords()]);
  const upd = jobs.map((j) => {
    const s = scoreJob({ ...j, sponsorMatch: j.sponsor_uk }, kw);
    return { id: j.id, score: s.keep ? s.score : 0, matched: s.matched };
  });
  if (upd.length)
    await q(
      `update jobs set score = x.score, matched_keywords = x.matched
       from jsonb_to_recordset($1::jsonb) as x(id bigint, score int, matched text[]) where jobs.id = x.id`,
      [JSON.stringify(upd)],
    );
  return { date, rescored: upd.length, belowThreshold: upd.filter((u) => u.score < SCORE_THRESHOLD).length };
}
