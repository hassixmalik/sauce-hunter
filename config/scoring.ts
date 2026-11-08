// Default keyword seed + scoring constants.
// Live keywords are in the `keywords` table (edit them at /keywords).
// This list is only used when that table is empty, or when you press "Reset to defaults".

export type KeywordType = "include" | "exclude" | "boost";
export type KeywordField = "title" | "description" | "location";
export interface KeywordSeed { term: string; type: KeywordType; field?: KeywordField; weight?: number }

/** Jobs with a score below this are not saved. */
export const SCORE_THRESHOLD = 35;

/** How many days back the preview tool looks. */
export const PREVIEW_DAYS = 7;

const include = (terms: string[]): KeywordSeed[] => terms.map((term) => ({ term, type: "include", field: "title" }));
const exclude = (terms: string[]): KeywordSeed[] => terms.map((term) => ({ term, type: "exclude", field: "title" }));
const boost = (field: KeywordField, weight: number, terms: string[]): KeywordSeed[] =>
  terms.map((term) => ({ term, type: "boost", field, weight }));

// NOTE: boost keywords that share the same field AND weight form one group.
// A group adds its points once, however many of its terms match.
export const DEFAULT_KEYWORDS: KeywordSeed[] = [
  ...include([
    "engineer", "developer", "ai", "ml", "llm", "machine learning", "full stack", "full-stack",
    "backend", "back-end", "software", "product engineer", "platform", "python", "typescript",
    "applied scientist", "founding",
  ]),
  ...exclude([
    "senior director", "vp", "head of", "principal", "staff", "intern", "internship",
    "graduate scheme", "sales", "recruiter", "marketing", "account executive", ".net only",
    "embedded", "hardware", "security clearance", "sc cleared", "dv",
  ]),
  ...boost("title", 25, ["ai", "llm", "ml", "agent", "applied ai"]),
  ...boost("title", 15, ["full stack", "full-stack", "product engineer", "founding engineer", "backend", "back-end"]),
  ...boost("description", 10, ["python"]),
  ...boost("description", 8, ["typescript", "node", "node.js", "react", "next.js"]),
  ...boost("description", 5, ["aws"]),
  ...boost("description", 15, ["llm", "llms", "rag", "langchain", "openai", "anthropic", "agents", "vector"]),
  ...boost("description", -15, ["7+ years", "8+ years", "10+ years"]),
  ...boost("location", 10, ["london", "manchester", "uk", "united kingdom", "england"]),
  ...boost("location", 7, ["amsterdam", "berlin", "munich", "netherlands", "germany", "europe", "eu", "emea"]),
];

// --- Fixed rules (not keywords) ---

/** +5 if the title has one of these, or no seniority word at all. */
export const MID_LEVEL_TERMS = ["mid", "mid-level", "ii", "2"];
export const SENIORITY_TERMS = ["senior", "sr", "lead", "junior", "jr", "principal", "staff", "head", "director", "vp"];
export const MID_LEVEL_POINTS = 5;

/** +15 if the company is on the UK sponsor register or the text mentions sponsorship. */
export const SPONSOR_POINTS = 15;
export const SPONSOR_PHRASES = [
  "visa sponsorship available", "visa sponsorship is available", "we offer visa sponsorship",
  "we sponsor visas", "can sponsor", "will sponsor", "sponsorship available", "skilled worker visa",
  "visa support", "relocation and visa",
];

/** -30 if the text says they won't sponsor. Checked before SPONSOR_PHRASES. */
export const NO_SPONSOR_POINTS = -30;
export const NO_SPONSOR_PHRASES = [
  "no sponsorship", "not able to sponsor", "unable to sponsor", "cannot sponsor", "can't sponsor",
  "do not offer sponsorship", "does not offer sponsorship", "not offer visa sponsorship",
  "must have right to work", "must have the right to work", "without sponsorship",
  "sponsorship is not available", "sponsorship not available",
];
