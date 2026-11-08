// Company job boards (no API key needed). Add or remove freely.
// `slug` is the part of the board URL, e.g. boards.greenhouse.io/<slug>, jobs.lever.co/<slug>, jobs.ashbyhq.com/<slug>.
// A wrong slug only shows up as an error for that company in the run stats; it never breaks the run.

export type Ats = "greenhouse" | "lever" | "ashby";
export interface Company { name: string; ats: Ats; slug: string }

export const COMPANIES: Company[] = [
  // Greenhouse
  { name: "Anthropic", ats: "greenhouse", slug: "anthropic" },
  { name: "Google DeepMind", ats: "greenhouse", slug: "deepmind" },
  { name: "Isomorphic Labs", ats: "greenhouse", slug: "isomorphiclabs" },
  { name: "Wayve", ats: "greenhouse", slug: "wayve" },
  { name: "Stability AI", ats: "greenhouse", slug: "stabilityai" },
  { name: "Monzo", ats: "greenhouse", slug: "monzo" },
  { name: "GoCardless", ats: "greenhouse", slug: "gocardless" },
  { name: "Intercom", ats: "greenhouse", slug: "intercom" },
  { name: "Helsing", ats: "greenhouse", slug: "helsing" },
  // Lever
  { name: "Mistral AI", ats: "lever", slug: "mistral" },
  { name: "Tractable", ats: "lever", slug: "tractable" },
  { name: "Cleo", ats: "lever", slug: "cleo" },
  // Ashby
  { name: "Synthesia", ats: "ashby", slug: "synthesia" },
  { name: "ElevenLabs", ats: "ashby", slug: "elevenlabs" },
  { name: "Cohere", ats: "ashby", slug: "cohere" },
  { name: "PolyAI", ats: "ashby", slug: "polyai" },
  { name: "n8n", ats: "ashby", slug: "n8n" },
  { name: "Langfuse", ats: "ashby", slug: "langfuse" },
  { name: "Lovable", ats: "ashby", slug: "lovable" },
  { name: "Poolside", ats: "ashby", slug: "poolside" },
  { name: "Legora", ats: "ashby", slug: "legora" },
  { name: "Granola", ats: "ashby", slug: "granola" },
];

/** Company boards list every open role, so only take ones posted in the last N days. */
export const BOARD_MAX_AGE_DAYS = 3;
