// Shared by the API (server) and the page (browser). No Node imports here.

export const CSV_COLUMNS = ["Date Found", "Score", "Title", "Company", "Location", "Sponsor (UK)", "Source", "Link"];

export interface CsvJob {
  batch_date: string; score: number; title: string; company: string;
  location: string | null; sponsor_uk: boolean | null; source: string; url: string;
}

const sponsor = (v: boolean | null) => (v === true ? "Yes" : v === false ? "No" : "");
const row = (j: CsvJob) => [j.batch_date, String(j.score), j.title, j.company, j.location ?? "", sponsor(j.sponsor_uk), j.source, j.url];

function cell(v: string, delim: "," | "\t"): string {
  if (delim === "\t") return v.replace(/[\t\r\n]+/g, " ");
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * Tab-separated (for pasting into Google Sheets) or comma-separated (for a .csv file).
 * `header: false` is handy when appending to a sheet that already has headers.
 */
export function toDelimited(jobs: CsvJob[], opts: { delim?: "," | "\t"; header?: boolean; linksOnly?: boolean } = {}): string {
  const delim = opts.delim ?? ",";
  const rows = jobs.map((j) => (opts.linksOnly ? [j.url] : row(j)));
  if (opts.header !== false) rows.unshift(opts.linksOnly ? ["Link"] : CSV_COLUMNS);
  return rows.map((r) => r.map((c) => cell(c, delim)).join(delim)).join("\n");
}
