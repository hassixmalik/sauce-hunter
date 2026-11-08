import { SCORE_THRESHOLD } from "@/config/scoring";
import { q } from "./db";
import { loadKeywords } from "./keywords";
import { bahrainDate, cleanUrl, dedupeKey, guessCountry, normalizeCompany } from "./normalize";
import { scoreJob } from "./score";
import { fetchAdzuna } from "./sources/adzuna";
import { fetchArbeitnow } from "./sources/arbeitnow";
import { fetchBoards } from "./sources/boards";
import { fetchReed } from "./sources/reed";
import { sponsorMatches } from "./sponsors";
import type { RawJob } from "./types";

interface SourceStat { fetched: number; kept: number; inserted: number; errors: string[] }

async function collect(): Promise<Record<string, { jobs: RawJob[]; errors: string[] }>> {
  const wrap = (p: Promise<{ jobs: RawJob[]; errors: string[] }>) =>
    p.catch((e) => ({ jobs: [] as RawJob[], errors: [String(e?.message ?? e).slice(0, 200)] }));
  const [adzuna, reed, arbeitnow, boards] = await Promise.all([
    wrap(fetchAdzuna()), wrap(fetchReed()), wrap(fetchArbeitnow()),
    fetchBoards().catch((e) => ({ boards: { jobs: [] as RawJob[], errors: [String(e?.message ?? e)] } })),
  ]);
  return { adzuna, reed, arbeitnow, ...boards };
}

/** The daily job: fetch -> filter/score -> insert -> update batch -> log run. */
export async function runFetch() {
  const [{ id: runId }] = await q<{ id: number }>(`insert into runs default values returning id::int`);
  const batchDate = bahrainDate();
  const stats: Record<string, SourceStat> = {};
  try {
    const [bySource, keywords] = await Promise.all([collect(), loadKeywords()]);
    const all = Object.values(bySource).flatMap((s) => s.jobs).filter((j) => j?.url && j.title && j.company);
    const { matches, loaded } = await sponsorMatches(all.filter((j) => guessCountry(j) === "gb").map((j) => j.company));

    const seen = new Set<string>();
    const rows: Record<string, unknown>[] = [];
    for (const [source, { jobs, errors }] of Object.entries(bySource)) {
      const st: SourceStat = (stats[source] = { fetched: jobs.length, kept: 0, inserted: 0, errors });
      for (const j of jobs) {
        if (!j?.url || !j.title || !j.company) continue;
        const url = cleanUrl(j.url);
        const key = dedupeKey(j.company, j.title, j.location);
        if (seen.has(url) || seen.has(key)) continue;
        seen.add(url); seen.add(key);

        const isUk = guessCountry(j) === "gb";
        const sponsor_uk = isUk && loaded ? matches.has(normalizeCompany(j.company)) : null;
        const s = scoreJob({ title: j.title, description: j.description, location: j.location, sponsorMatch: sponsor_uk }, keywords);
        if (!s.keep || s.score < SCORE_THRESHOLD) continue;
        st.kept++;
        rows.push({
          dedupe_key: key, url, title: j.title.trim(), company: j.company.trim(), location: j.location ?? null, source,
          posted_at: j.postedAt && !isNaN(+j.postedAt) ? j.postedAt.toISOString() : null,
          batch_date: batchDate, score: s.score, matched_keywords: s.matched, sponsor_uk,
          salary: j.salary ?? null, description: j.description ?? null,
        });
      }
    }

    if (rows.length) {
      // One round trip; unique url/dedupe_key means jobs seen on earlier days are skipped.
      const inserted = await q<{ source: string }>(
        `insert into jobs (dedupe_key, url, title, company, location, source, posted_at, batch_date, score,
                           matched_keywords, sponsor_uk, salary, description)
         select dedupe_key, url, title, company, location, source, posted_at, batch_date, score,
                matched_keywords, sponsor_uk, salary, description
         from jsonb_to_recordset($1::jsonb) as x(
           dedupe_key text, url text, title text, company text, location text, source text, posted_at timestamptz,
           batch_date date, score int, matched_keywords text[], sponsor_uk boolean, salary text, description text)
         on conflict do nothing
         returning source`,
        [JSON.stringify(rows)],
      );
      for (const r of inserted) stats[r.source].inserted++;
    }
    await refreshBatchCount(batchDate);

    const summary = { batch_date: batchDate, sponsors_loaded: loaded, sources: stats };
    await q(`update runs set finished_at = now(), stats = $2::jsonb where id = $1`, [runId, JSON.stringify(summary)]);
    return summary;
  } catch (e: any) {
    await q(`update runs set finished_at = now(), stats = $2::jsonb where id = $1`, [
      runId, JSON.stringify({ batch_date: batchDate, error: String(e?.message ?? e), sources: stats }),
    ]);
    throw e;
  }
}

export async function refreshBatchCount(date: string) {
  await q(
    `insert into batches (batch_date, job_count)
     select $1::date, count(*) from jobs where batch_date = $1::date
     on conflict (batch_date) do update set job_count = excluded.job_count`,
    [date],
  );
}
