import { q } from "@/lib/db";
import { fail, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { weight?, type?, field?, active? } */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const b = await req.json();
    const sets: string[] = [];
    const vals: unknown[] = [id];
    const add = (col: string, v: unknown) => { vals.push(v); sets.push(col + " = $" + vals.length); };
    if (typeof b.active === "boolean") add("active", b.active);
    if (b.weight !== undefined && Number.isFinite(Number(b.weight))) add("weight", Math.round(Number(b.weight)));
    if (["include", "exclude", "boost"].includes(b.type)) add("type", b.type);
    if (["title", "description", "location"].includes(b.field)) add("field", b.field);
    if (!sets.length) return json({ error: "nothing to update" }, 400);
    const rows = await q(`update keywords set ${sets.join(", ")} where id = $1 returning id::int, term, type, field, weight, active`, vals);
    return rows.length ? json(rows[0]) : json({ error: "not found" }, 404);
  } catch (e) { return fail(e); }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await q(`delete from keywords where id = $1`, [id]);
    return json({ ok: true });
  } catch (e) { return fail(e); }
}
