import { fail, json } from "@/lib/http";
import { listBatches } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function GET() {
  try { return json({ batches: await listBatches() }); } catch (e) { return fail(e); }
}
