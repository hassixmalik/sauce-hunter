import { describe, expect, it } from "vitest";
import { toDelimited } from "@/lib/csv";
import { bahrainDate, cleanUrl, dedupeKey, guessCountry, normalizeCompany, plainText } from "@/lib/normalize";

describe("cleanUrl", () => {
  it("strips tracking params, hash and trailing slash", () => {
    expect(cleanUrl("https://Jobs.Lever.co/acme/123/?utm_source=x&lever-source=li&ref=abc#apply")).toBe("https://jobs.lever.co/acme/123");
    expect(cleanUrl("https://boards.greenhouse.io/acme/jobs/9?gh_jid=9&gh_src=foo")).toBe("https://boards.greenhouse.io/acme/jobs/9?gh_jid=9");
  });
});

describe("dedupeKey", () => {
  it("ignores case and spacing", () => {
    expect(dedupeKey("Acme", "AI  Engineer", "London")).toBe(dedupeKey("acme", "ai engineer", " london "));
    expect(dedupeKey("Acme", "AI Engineer", "London")).not.toBe(dedupeKey("Acme", "AI Engineer", "Berlin"));
  });
});

describe("normalizeCompany", () => {
  it("strips suffixes and punctuation", () => {
    expect(normalizeCompany("Monzo Bank Ltd.")).toBe("monzo bank");
    expect(normalizeCompany("Synthesia UK Limited")).toBe("synthesia");
    expect(normalizeCompany("Marks & Spencer PLC")).toBe("marks and spencer");
  });
});

describe("misc", () => {
  it("plainText decodes greenhouse escaped html", () => {
    expect(plainText("&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;")).toBe("Hello & welcome");
  });
  it("guessCountry", () => {
    expect(guessCountry({ location: "London, England" })).toBe("gb");
    expect(guessCountry({ location: "Berlin" })).toBeNull();
    expect(guessCountry({ country: "NL", location: "Amsterdam" })).toBe("nl");
  });
  it("bahrainDate rolls over at 21:00 UTC", () => {
    expect(bahrainDate(new Date("2026-01-01T20:59:00Z"))).toBe("2026-01-01");
    expect(bahrainDate(new Date("2026-01-01T21:00:00Z"))).toBe("2026-01-02");
  });
});

describe("csv", () => {
  const job = { batch_date: "2026-11-08", score: 80, title: "AI, Engineer", company: "Acme\tLtd", location: null, sponsor_uk: true, source: "lever", url: "https://x.y/1" };
  it("tsv cleans tabs, csv quotes commas", () => {
    expect(toDelimited([job], { delim: "\t", header: false })).toBe("2026-11-08\t80\tAI, Engineer\tAcme Ltd\t\tYes\tlever\thttps://x.y/1");
    expect(toDelimited([job]).split("\n")[1]).toBe('2026-11-08,80,"AI, Engineer",Acme\tLtd,,Yes,lever,https://x.y/1');
  });
  it("links only", () => {
    expect(toDelimited([job], { linksOnly: true })).toBe("Link\nhttps://x.y/1");
  });
});

import { readFileSync } from "node:fs";
import { SCHEMA_SQL, schemaStatements } from "@/lib/schema";
describe("schema", () => {
  it("lib/schema.ts matches db/schema.sql", () => {
    expect(SCHEMA_SQL).toBe(readFileSync("db/schema.sql", "utf8"));
    expect(schemaStatements()).toHaveLength(6);
  });
});
