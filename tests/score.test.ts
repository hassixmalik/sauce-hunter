import { describe, expect, it } from "vitest";
import { DEFAULT_KEYWORDS, SCORE_THRESHOLD } from "@/config/scoring";
import { cleanKeyword, parseKeywordFile } from "@/lib/keywords";
import { has, scoreJob } from "@/lib/score";
import type { Keyword } from "@/lib/types";

const KW = DEFAULT_KEYWORDS.map((k) => cleanKeyword(k)!) as Keyword[];

describe("has", () => {
  it("matches whole words only", () => {
    expect(has("ai engineer", "ai")).toBe(true);
    expect(has("maintenance engineer", "ai")).toBe(false);
    expect(has("we use next.js and node", "next.js")).toBe(true);
    expect(has("needs 7+ years experience", "7+ years")).toBe(true);
    expect(has("software engineer ii", "ii")).toBe(true);
  });
});

describe("scoreJob", () => {
  it("drops titles with no include term", () => {
    expect(scoreJob({ title: "Office Manager" }, KW).keep).toBe(false);
  });
  it("drops excluded titles", () => {
    const r = scoreJob({ title: "Staff Software Engineer" }, KW);
    expect(r).toMatchObject({ keep: false, reason: "excluded" });
  });
  it("scores a strong AI role above the threshold", () => {
    const r = scoreJob({
      title: "AI Engineer",
      description: "Python, TypeScript, React. Build LLM agents with RAG on AWS. Visa sponsorship available.",
      location: "London, UK",
    }, KW);
    // 25 ai + 10 python + 8 ts + 5 aws + 15 llm + 5 no-seniority + 10 london + 15 visa
    expect(r.score).toBe(93);
    expect(r.matched).toContain("visa-sponsorship");
  });
  it("counts a boost group once", () => {
    const r = scoreJob({ title: "Applied AI / ML / LLM Engineer" }, KW);
    expect(r.score).toBe(25 + 5);
  });
  it("penalises no-sponsorship and long experience", () => {
    const r = scoreJob({ title: "Senior Backend Engineer", description: "8+ years. No sponsorship.", location: "London" }, KW);
    expect(r.score).toBe(0); // 15 backend + 10 london - 15 - 30 -> clamped
  });
  it("sponsor register match adds points once", () => {
    const base = scoreJob({ title: "Full Stack Developer", location: "Manchester" }, KW).score;
    const withSponsor = scoreJob({ title: "Full Stack Developer", location: "Manchester", sponsorMatch: true, description: "visa sponsorship available" }, KW).score;
    expect(withSponsor - base).toBe(15);
    expect(base).toBeGreaterThanOrEqual(SCORE_THRESHOLD - 5);
  });
  it("penalises US-only locations but not mixed ones", () => {
    expect(scoreJob({ title: "AI Engineer", location: "San Francisco, CA" }, KW).score).toBe(0);
    expect(scoreJob({ title: "AI Engineer", location: "London / New York" }, KW).score).toBe(40);
  });
  it("include phrase beats a shorter exclude word", () => {
    expect(scoreJob({ title: "Member of Technical Staff (AI Engineer)" }, KW).keep).toBe(true);
    expect(scoreJob({ title: "Staff Software Engineer" }, KW).keep).toBe(false);
  });
  it("ignores inactive keywords", () => {
    const kw = KW.map((k) => (k.term === "staff" ? { ...k, active: false } : k));
    expect(scoreJob({ title: "Staff Software Engineer" }, kw).keep).toBe(true);
  });
});

describe("keyword parsing", () => {
  it("parses csv with header and txt", () => {
    const csv = parseKeywordFile("term,type,field,weight\nrust,boost,description,6\nsales,exclude\n", "k.csv", "include");
    expect(csv).toEqual([
      { term: "rust", type: "boost", field: "description", weight: 6, active: true },
      { term: "sales", type: "exclude", field: "title", weight: 0, active: true },
    ]);
    const txt = parseKeywordFile("Golang\n  Rust \n", "k.txt", "include");
    expect(txt.map((k) => k?.term)).toEqual(["golang", "rust"]);
  });
  it("rejects bad types", () => {
    expect(cleanKeyword({ term: "x", type: "nope" as any })).toBeNull();
  });
});
