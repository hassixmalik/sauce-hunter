import { db, ensureSchema, q } from "./db";
import { normalizeCompany } from "./normalize";

const PAGE_API = "https://www.gov.uk/api/content/government/publications/register-of-licensed-sponsors-workers";

/** Finds the current CSV link on gov.uk (the file name changes every update). */
async function findCsvUrl(): Promise<string> {
  const res = await fetch(PAGE_API, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`gov.uk content API ${res.status}`);
  const data = await res.json();
  const attachments: { url?: string; content_type?: string }[] = data?.details?.attachments ?? [];
  const csv = attachments.find((a) => a.url?.toLowerCase().endsWith(".csv") || a.content_type === "text/csv");
  if (!csv?.url) throw new Error("No CSV attachment found on the sponsor register page");
  return csv.url;
}

/** First column of each CSV row (Organisation Name), handles quoted values. */
function firstColumn(line: string): string {
  if (!line.startsWith('"')) return line.split(",")[0];
  let out = "";
  for (let i = 1; i < line.length; i++) {
    if (line[i] === '"') {
      if (line[i + 1] === '"') { out += '"'; i++; } else break;
    } else out += line[i];
  }
  return out;
}

export async function refreshSponsors() {
  const url = await findCsvUrl();
  const res = await fetch(url, { signal: AbortSignal.timeout(40_000) });
  if (!res.ok) throw new Error(`Sponsor CSV ${res.status}`);
  const lines = (await res.text()).split(/\r?\n/).slice(1);
  const names = [...new Set(lines.map(firstColumn).map(normalizeCompany).filter((n) => n.length > 1))];
  if (names.length < 1000) throw new Error(`Only ${names.length} sponsors parsed, refusing to replace the list`);

  await ensureSchema();
  const CHUNK = 5000;
  await db().transaction((tx) => {
    const qs = [tx`truncate uk_sponsors`];
    for (let i = 0; i < names.length; i += CHUNK) {
      qs.push(tx.query(`insert into uk_sponsors select unnest($1::text[]) on conflict do nothing`, [names.slice(i, i + CHUNK)]));
    }
    return qs;
  });
  return { url, sponsors: names.length };
}

/** Which of these company names are on the register. */
export async function sponsorMatches(companies: string[]): Promise<{ matches: Set<string>; loaded: boolean }> {
  const norms = [...new Set(companies.map(normalizeCompany))];
  const [{ n }] = await q<{ n: number }>(`select count(*)::int as n from (select 1 from uk_sponsors limit 1) s`);
  if (!n || !norms.length) return { matches: new Set(), loaded: !!n };
  const rows = await q<{ name_norm: string }>(`select name_norm from uk_sponsors where name_norm = any($1::text[])`, [norms]);
  return { matches: new Set(rows.map((r) => r.name_norm)), loaded: true };
}
