import { REED } from "@/config/searches";
import { plainText } from "../normalize";
import type { RawJob } from "../types";
import { getJson, isRecent, settle } from "./http";

/** Reed dates look like "05/11/2026". */
const parseReedDate = (s?: string) => {
  const m = s?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`) : null;
};

export async function fetchReed() {
  const key = process.env.REED_API_KEY;
  if (!key) return { jobs: [] as RawJob[], errors: ["skipped: REED_API_KEY not set"] };
  const auth = "Basic " + Buffer.from(`${key}:`).toString("base64");
  const tasks = REED.queries.flatMap((keywords) =>
    REED.locations.map((locationName) => async (): Promise<RawJob[]> => {
      const p = new URLSearchParams({
        keywords, locationName, distanceFromLocation: String(REED.distanceMiles), resultsToTake: String(REED.resultsToTake),
      });
      const data = await getJson(`https://www.reed.co.uk/api/1.0/search?${p}`, { headers: { authorization: auth } });
      return (data.results ?? [])
        .map((r: any): RawJob => ({
          source: "reed",
          title: r.jobTitle,
          company: r.employerName ?? "Unknown",
          location: r.locationName ?? null,
          url: r.jobUrl,
          postedAt: parseReedDate(r.date),
          description: plainText(r.jobDescription),
          salary: r.minimumSalary ? `${r.minimumSalary}${r.maximumSalary ? `-${r.maximumSalary}` : ""} ${r.currency ?? ""}`.trim() : null,
          country: "gb",
        }))
        .filter((j: RawJob) => isRecent(j.postedAt, REED.maxDaysOld + 1));
    }),
  );
  return settle(tasks);
}
