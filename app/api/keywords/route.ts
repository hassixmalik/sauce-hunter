import { fail, json } from "@/lib/http";
import { addKeywords, cleanKeyword, loadKeywords, parseKeywordFile } from "@/lib/keywords";
import type { Keyword } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try { return json({ keywords: await loadKeywords() }); } catch (e) { return fail(e); }
}

/**
 * Add keywords. Either:
 *  - JSON { terms: "a, b, c", type, field, weight }  (comma-separated)
 *  - JSON { items: [{ term, type, field, weight }] }
 *  - multipart form with `file` (.csv / .txt) and `type` (used for .txt lines)
 */
export async function POST(req: Request) {
  try {
    let parsed: (Keyword | null)[] = [];
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return json({ error: "no file" }, 400);
      if (file.size > 512_000) return json({ error: "file too large (max 500 KB)" }, 400);
      parsed = parseKeywordFile(await file.text(), file.name, String(form.get("type") ?? "include"));
    } else {
      const b = await req.json();
      if (Array.isArray(b.items)) parsed = b.items.map((k: Partial<Keyword>) => cleanKeyword(k));
      else parsed = String(b.terms ?? "").split(",").map((term) => cleanKeyword({ term, type: b.type, field: b.field, weight: b.weight }));
    }
    const valid = parsed.filter((k): k is Keyword => !!k);
    const unique = [...new Map(valid.map((k) => [`${k.term}|${k.type}|${k.field}`, k])).values()];
    const r = await addKeywords(unique);
    return json({ added: r.added, skipped: r.skipped + (parsed.length - unique.length) });
  } catch (e) { return fail(e); }
}
