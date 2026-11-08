import { fail, isDate, json, today } from "@/lib/http";
import { previewImpact, rescoreDay } from "@/lib/rescore";

export const dynamic = "force-dynamic";

/** GET = preview impact on the last 7 days (read-only). */
export async function GET() {
  try { return json(await previewImpact()); } catch (e) { return fail(e); }
}

/** POST ?date=YYYY-MM-DD (default today) = rescore that day in place. */
export async function POST(req: Request) {
  const d = new URL(req.url).searchParams.get("date");
  try { return json(await rescoreDay(isDate(d) ? d : today())); } catch (e) { return fail(e); }
}
