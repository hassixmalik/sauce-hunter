import { SOURCE_TIMEOUT_MS } from "@/config/searches";

export async function getJson<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { accept: "application/json", "user-agent": "sauce-hunter/1.0", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url.split("?")[0]}`);
  return res.json() as Promise<T>;
}

export const daysAgo = (n: number) => Date.now() - n * 86_400_000;
export const isRecent = (d: Date | null | undefined, days: number) => !d || d.getTime() >= daysAgo(days);

/** Runs tasks, collecting results and error messages instead of throwing. */
export async function settle<T>(tasks: (() => Promise<T[]>)[]): Promise<{ jobs: T[]; errors: string[] }> {
  const res = await Promise.allSettled(tasks.map((t) => t()));
  const jobs: T[] = [];
  const errors: string[] = [];
  for (const r of res) {
    if (r.status === "fulfilled") jobs.push(...r.value);
    else errors.push(String(r.reason?.message ?? r.reason).slice(0, 200));
  }
  return { jobs, errors };
}
