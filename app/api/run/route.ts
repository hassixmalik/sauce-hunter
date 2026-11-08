// "Run now" button on the page (behind Basic Auth). Same work as the daily cron.
import { fail, json } from "@/lib/http";
import { runFetch } from "@/lib/run";
import { refreshSponsors } from "@/lib/sponsors";

export const maxDuration = 60;

export async function POST(req: Request) {
  const what = new URL(req.url).searchParams.get("what");
  try { return json(what === "sponsors" ? await refreshSponsors() : await runFetch()); } catch (e) { return fail(e); }
}
