export interface RawJob {
  source: string;
  title: string;
  company: string;
  location?: string | null;
  url: string;
  postedAt?: Date | null;
  description?: string | null;
  salary?: string | null;
  /** ISO country code when the source knows it (gb, nl, de ...). */
  country?: string | null;
}

export interface Keyword {
  id?: number;
  term: string;
  type: "include" | "exclude" | "boost";
  field: "title" | "description" | "location";
  weight: number;
  active: boolean;
}

export interface JobRow {
  id: number;
  title: string;
  company: string;
  location: string | null;
  source: string;
  url: string;
  posted_at: string | null;
  batch_date: string;
  score: number;
  matched_keywords: string[];
  sponsor_uk: boolean | null;
  salary: string | null;
  copied_at: string | null;
}
