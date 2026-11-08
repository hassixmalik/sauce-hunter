import { ARBEITNOW } from "@/config/searches";
import { plainText } from "../normalize";
import type { RawJob } from "../types";
import { getJson, isRecent } from "./http";

export async function fetchArbeitnow() {
  if (!ARBEITNOW.enabled) return { jobs: [] as RawJob[], errors: ["skipped: disabled in config"] };
  const data = await getJson(`https://www.arbeitnow.com/api/job-board-api`);
  const jobs: RawJob[] = (data.data ?? []).map((j: any) => ({
    source: "arbeitnow", title: j.title, company: j.company_name, location: j.remote ? `${j.location} (remote)` : j.location,
    url: j.url, postedAt: j.created_at ? new Date(j.created_at * 1000) : null, description: plainText(j.description),
    country: "de",
  }));
  return { jobs: jobs.filter((j) => isRecent(j.postedAt, ARBEITNOW.maxDaysOld)), errors: [] as string[] };
}
