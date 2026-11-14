import { createHash } from "node:crypto";
import type { RawJob } from "./types";

const TRACKING = /^(utm_.*|ref|referrer|source|src|gh_src|gh_jid_src|lever-source|lever-origin|trk|trackingid|fbclid|gclid|mc_.*|campaign)$/i;

/** Strip tracking params, hash and trailing slash so the same job has one URL. */
export function cleanUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    let s = u.toString();
    if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
    return s.replace(/\?$/, "");
  } catch {
    return raw.trim();
  }
}

const squash = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

export function dedupeKey(company: string, title: string, location?: string | null): string {
  return createHash("sha1").update(`${squash(company)}|${squash(title)}|${squash(location)}`).digest("hex");
}

/** Company name as used for the UK sponsor register match. */
export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["ltd", "limited", "plc", "uk", "llp", "inc"].includes(w))
    .join(" ");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+|#39);/gi, (m, e: string) => {
    if (ENTITIES[e.toLowerCase()]) return ENTITIES[e.toLowerCase()];
    if (e[0] === "#") {
      const n = e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return m;
  });
}

/** HTML (possibly entity-escaped) -> plain text, trimmed to `max` chars. */
export function plainText(html: string | null | undefined, max = 3000): string {
  if (!html) return "";
  const text = decode(decode(html)) // greenhouse double-escapes
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, max);
}

const UK_HINTS = /\b(uk|united kingdom|england|scotland|wales|london|manchester|edinburgh|glasgow|bristol|cambridge|oxford|birmingham|leeds|belfast)\b/i;

/** Best-guess country: uses the source's value, else the location text. Only "gb" matters for sponsor checks. */
export function guessCountry(job: Pick<RawJob, "country" | "location">): string | null {
  if (job.country) return job.country.toLowerCase();
  return job.location && UK_HINTS.test(job.location) ? "gb" : null;
}

/** IANA time zone that decides which calendar day a job belongs to. Set TIMEZONE (default UTC). */
export const TIMEZONE = process.env.TIMEZONE || "UTC";

/** Calendar day in TIMEZONE, YYYY-MM-DD. */
export function localDate(d = new Date(), timeZone = TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(d);
}
