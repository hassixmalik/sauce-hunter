import { q } from "@/lib/db";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [runs, [sp]] = await Promise.all([
      q(`select id::int, started_at, finished_at, stats from runs order by id desc limit 10`),
      q<{ n: number }>(`select count(*)::int as n from uk_sponsors`),
    ]);
    return json({ runs, sponsors: sp.n });
  } catch (e) { return fail(e); }
}
