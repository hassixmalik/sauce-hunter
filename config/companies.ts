// Company job boards (no API key needed). Add or remove freely.
// `slug` is the part of the board URL, e.g. boards.greenhouse.io/<slug>, jobs.lever.co/<slug>, jobs.ashbyhq.com/<slug>.
// A wrong slug only shows up as an error for that company in the run stats; it never breaks the run.

export type Ats = "greenhouse" | "lever" | "ashby";
export interface Company { name: string; ats: Ats; slug: string }

export const COMPANIES: Company[] = [
  // Greenhouse (slugs checked 2026-11-08)
  { name: "Anthropic", ats: "greenhouse", slug: "anthropic" },
  { name: "Isomorphic Labs", ats: "greenhouse", slug: "isomorphiclabs" },
  { name: "Stability AI", ats: "greenhouse", slug: "stabilityai" },
  { name: "Monzo", ats: "greenhouse", slug: "monzo" },
  { name: "GoCardless", ats: "greenhouse", slug: "gocardless" },
  { name: "Intercom", ats: "greenhouse", slug: "intercom" },
  { name: "Helsing", ats: "greenhouse", slug: "helsing" },
  { name: "Cleo", ats: "greenhouse", slug: "cleo" },
  { name: "PolyAI", ats: "greenhouse", slug: "polyai" },
  { name: "Wise", ats: "greenhouse", slug: "wise" },
  { name: "Deliveroo", ats: "greenhouse", slug: "deliveroo" },
  // Lever
  { name: "Pigment", ats: "lever", slug: "pigment" },
  // Ashby
  { name: "Synthesia", ats: "ashby", slug: "synthesia" },
  { name: "ElevenLabs", ats: "ashby", slug: "elevenlabs" },
  { name: "Cohere", ats: "ashby", slug: "cohere" },
  { name: "Wayve", ats: "ashby", slug: "wayve" },
  { name: "Tractable", ats: "ashby", slug: "tractable" },
  { name: "Faculty", ats: "ashby", slug: "faculty" },
  { name: "Quantexa", ats: "ashby", slug: "quantexa" },
  { name: "Causaly", ats: "ashby", slug: "causaly" },
  { name: "Multiverse", ats: "ashby", slug: "multiverse" },
  { name: "n8n", ats: "ashby", slug: "n8n" },
  { name: "Langfuse", ats: "ashby", slug: "langfuse" },
  { name: "Lovable", ats: "ashby", slug: "lovable" },
  { name: "Poolside", ats: "ashby", slug: "poolside" },
  { name: "Legora", ats: "ashby", slug: "legora" },
  { name: "Granola", ats: "ashby", slug: "granola" },
  { name: "Parloa", ats: "ashby", slug: "parloa" },
  { name: "DeepL", ats: "ashby", slug: "deepl" },
  { name: "Photoroom", ats: "ashby", slug: "photoroom" },
  { name: "Dust", ats: "ashby", slug: "dust" },
  { name: "Harvey", ats: "ashby", slug: "harvey" },
  { name: "Perplexity", ats: "ashby", slug: "perplexity" },
  { name: "OpenAI", ats: "ashby", slug: "openai" },
];

/** Company boards list every open role, so only take ones posted in the last N days. */
export const BOARD_MAX_AGE_DAYS = 3;
