import { fail, json } from "@/lib/http";
import { resetToDefaults } from "@/lib/keywords";

export async function POST() {
  try { return json(await resetToDefaults()); } catch (e) { return fail(e); }
}
