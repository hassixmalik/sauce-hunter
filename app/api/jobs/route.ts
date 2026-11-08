import { toDelimited } from "@/lib/csv";
import { fail, isDate, json } from "@/lib/http";
import { defaultDate, jobsForDate } from "@/lib/jobs";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs?date=YYYY-MM-DD&format=json|csv|tsv&only=new&links=1&header=0&download=1
 * Default date: oldest day with uncopied jobs (else the newest day).
 */
export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const qd = p.get("date");
    const date = isDate(qd) ? qd : await defaultDate();
    const format = p.get("format") ?? "json";
    const jobs = date ? await jobsForDate(date, p.get("only") === "new") : [];

    if (format === "csv" || format === "tsv") {
      const tsv = format === "tsv";
      const body = toDelimited(jobs, { delim: tsv ? "\t" : ",", header: p.get("header") !== "0", linksOnly: p.get("links") === "1" });
      return new Response(body, {
        headers: {
          "content-type": `text/${tsv ? "tab-separated-values" : "csv"}; charset=utf-8`,
          "content-disposition": `${p.get("download") === "1" ? "attachment" : "inline"}; filename="jobs-${date ?? "none"}.${format}"`,
          "x-batch-date": date ?? "",
        },
      });
    }
    return json({ date, count: jobs.length, jobs });
  } catch (e) { return fail(e); }
}
