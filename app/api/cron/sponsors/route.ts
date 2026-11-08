import { cronAuthorized, fail, json } from "@/lib/http";
import { refreshSponsors } from "@/lib/sponsors";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return json({ error: "unauthorized" }, 401);
  try { return json(await refreshSponsors()); } catch (e) { return fail(e); }
}
