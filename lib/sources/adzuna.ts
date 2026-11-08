import { ADZUNA } from "@/config/searches";
import { plainText } from "../normalize";
import type { RawJob } from "../types";
import { getJson, settle } from "./http";

export async function fetchAdzuna() {
  const id = process.env.ADZUNA_APP_ID, key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return { jobs: [] as RawJob[], errors: ["skipped: ADZUNA_APP_ID / ADZUNA_APP_KEY not set"] };
  const tasks = ADZUNA.countries.flatMap((country) =>
    ADZUNA.queries.map((what) => async (): Promise<RawJob[]> => {
      const p = new URLSearchParams({
        app_id: id, app_key: key, what, max_days_old: String(ADZUNA.maxDaysOld),
        sort_by: "date", results_per_page: String(ADZUNA.resultsPerPage),
      });
      const data = await getJson(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${p}`);
      return (data.results ?? []).map((r: any) => ({
        source: "adzuna",
        title: plainText(r.title, 300),
        company: r.company?.display_name ?? "Unknown",
        location: r.location?.display_name ?? null,
        url: r.redirect_url,
        postedAt: r.created ? new Date(r.created) : null,
        description: plainText(r.description),
        salary: r.salary_min ? `${Math.round(r.salary_min)}${r.salary_max ? `-${Math.round(r.salary_max)}` : ""}` : null,
        country,
      }));
    }),
  );
  return settle(tasks);
}
