import { fail, isDate, json } from "@/lib/http";
import { markCopied, unmarkCopied } from "@/lib/jobs";

type Ctx = { params: Promise<{ date: string }> };

/** POST marks the day copied. Optional JSON body { ids: number[] } marks only those jobs. */
export async function POST(req: Request, ctx: Ctx) {
  const { date } = await ctx.params;
  if (!isDate(date)) return json({ error: "bad date" }, 400);
  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Number.isFinite) : undefined;
    return json(await markCopied(date, ids));
  } catch (e) { return fail(e); }
}

/** DELETE un-marks the whole day, or only { ids: number[] } if given. */
export async function DELETE(req: Request, ctx: Ctx) {
  const { date } = await ctx.params;
  if (!isDate(date)) return json({ error: "bad date" }, 400);
  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Number.isFinite) : undefined;
    return json(await unmarkCopied(date, ids));
  } catch (e) { return fail(e); }
}
