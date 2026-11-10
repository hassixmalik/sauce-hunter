// Adds any default keywords (config/scoring.ts) that are missing from the DB. Keeps your edits.
// Not scheduled: call it by hand after changing the defaults:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/keywords
import { cronAuthorized, fail, json } from "@/lib/http";
import { seedDefaults } from "@/lib/keywords";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return json({ error: "unauthorized" }, 401);
  try { return json(await seedDefaults()); } catch (e) { return fail(e); }
}
