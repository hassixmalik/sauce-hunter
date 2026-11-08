// Greenhouse, Lever and Ashby public job boards. No keys needed.
import { BOARD_MAX_AGE_DAYS, COMPANIES, type Company } from "@/config/companies";
import { plainText } from "../normalize";
import type { RawJob } from "../types";
import { getJson, isRecent, settle } from "./http";

async function greenhouse(c: Company): Promise<RawJob[]> {
  const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${c.slug}/jobs?content=true`);
  return (data.jobs ?? []).map((j: any) => ({
    source: "greenhouse", title: j.title, company: c.name, location: j.location?.name ?? null,
    url: j.absolute_url, postedAt: new Date(j.first_published ?? j.updated_at), description: plainText(j.content),
  }));
}

async function lever(c: Company): Promise<RawJob[]> {
  const data = await getJson(`https://api.lever.co/v0/postings/${c.slug}?mode=json`);
  return (Array.isArray(data) ? data : []).map((j: any) => ({
    source: "lever", title: j.text, company: c.name,
    location: j.categories?.allLocations?.join(" / ") || j.categories?.location || null,
    url: j.hostedUrl, postedAt: j.createdAt ? new Date(j.createdAt) : null,
    description: plainText(j.descriptionPlain ?? j.description),
    salary: j.salaryRange ? `${j.salaryRange.min}-${j.salaryRange.max} ${j.salaryRange.currency ?? ""}`.trim() : null,
  }));
}

async function ashby(c: Company): Promise<RawJob[]> {
  const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${c.slug}?includeCompensation=true`);
  return (data.jobs ?? [])
    .filter((j: any) => j.isListed !== false)
    .map((j: any) => ({
      source: "ashby", title: j.title, company: c.name,
      location: [j.location, ...(j.secondaryLocations ?? []).map((l: any) => l.location)].filter(Boolean).join(" / ") || null,
      url: j.jobUrl, postedAt: j.publishedAt ? new Date(j.publishedAt) : null,
      description: plainText(j.descriptionPlain ?? j.descriptionHtml),
      salary: j.compensation?.compensationTierSummary ?? null,
    }));
}

const ADAPTERS = { greenhouse, lever, ashby };

/** Returns results grouped by ATS so each shows up separately in run stats. */
export async function fetchBoards() {
  const out: Record<string, { jobs: RawJob[]; errors: string[] }> = {};
  await Promise.all(
    (Object.keys(ADAPTERS) as (keyof typeof ADAPTERS)[]).map(async (ats) => {
      const list = COMPANIES.filter((c) => c.ats === ats);
      const r = await settle(
        list.map((c) => () => ADAPTERS[ats](c).catch((e) => Promise.reject(new Error(`${c.name}: ${e.message}`)))),
      );
      out[ats] = { jobs: r.jobs.filter((j) => isRecent(j.postedAt, BOARD_MAX_AGE_DAYS)), errors: r.errors };
    }),
  );
  return out;
}
