import { fail } from "@/lib/http";
import { listKeywords } from "@/lib/keywords";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await listKeywords();
    const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const body = ["term,type,field,weight,active", ...rows.map((k) => [esc(k.term), k.type, k.field, k.weight, k.active].join(","))].join("\n");
    return new Response(body, {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="keywords.csv"` },
    });
  } catch (e) { return fail(e); }
}
