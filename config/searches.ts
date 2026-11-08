// Search queries for keyed job APIs. Edit here only.

export const ADZUNA = {
  countries: ["gb", "nl", "de"] as const,
  queries: ["software engineer", "ai engineer", "machine learning engineer", "full stack developer", "backend engineer"],
  maxDaysOld: 2,
  resultsPerPage: 50,
};

export const REED = {
  queries: ["software engineer", "ai engineer", "full stack developer", "backend developer", "python developer"],
  locations: ["London", "Manchester"],
  distanceMiles: 20,
  resultsToTake: 50,
  maxDaysOld: 2,
};

/** Phase 2 sources. Turn off here if they get noisy. */
export const ARBEITNOW = { enabled: true, maxDaysOld: 2 };

/** Per-request timeout for every source. */
export const SOURCE_TIMEOUT_MS = 10_000;
