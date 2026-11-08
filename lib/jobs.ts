import { q } from "./db";
import type { JobRow } from "./types";

const COLS = `id::int, title, company, location, source, url, posted_at, batch_date::text, score,
              matched_keywords, sponsor_uk, salary, copied_at`;

/** The oldest day that still has uncopied jobs; else the newest day. */
export async function defaultDate(): Promise<string | null> {
  const [r] = await q<{ d: string | null }>(
    `select coalesce(
       (select min(batch_date) from jobs where copied_at is null),
       (select max(batch_date) from batches))::text as d`,
  );
  return r?.d ?? null;
}

export async function jobsForDate(date: string, onlyNew = false): Promise<JobRow[]> {
  return q<JobRow>(
    `select ${COLS} from jobs where batch_date = $1::date ${onlyNew ? "and copied_at is null" : ""}
     order by score desc, id`,
    [date],
  );
}

export interface BatchRow {
  batch_date: string; job_count: number; new_count: number; copied_at: string | null;
  top_score: number | null; sponsor_count: number;
}

export async function listBatches(limit = 60) {
  return q<BatchRow>(
    `select b.batch_date::text, b.job_count, b.copied_at,
            count(j.id) filter (where j.copied_at is null)::int as new_count,
            max(j.score)::int as top_score,
            count(j.id) filter (where j.sponsor_uk)::int as sponsor_count
     from batches b left join jobs j on j.batch_date = b.batch_date
     group by b.batch_date order by b.batch_date desc limit $1`,
    [limit],
  );
}

/** Marks a day (or only the given job ids from it) as copied. */
export async function markCopied(date: string, ids?: number[]) {
  const rows = await q(
    `update jobs set copied_at = now()
     where batch_date = $1::date and copied_at is null ${ids?.length ? "and id = any($2::bigint[])" : ""}
     returning id`,
    ids?.length ? [date, ids] : [date],
  );
  await q(`update batches set copied_at = now() where batch_date = $1::date`, [date]);
  return { date, marked: rows.length };
}

export async function unmarkCopied(date: string) {
  const rows = await q(`update jobs set copied_at = null where batch_date = $1::date and copied_at is not null returning id`, [date]);
  await q(`update batches set copied_at = null where batch_date = $1::date`, [date]);
  return { date, unmarked: rows.length };
}
