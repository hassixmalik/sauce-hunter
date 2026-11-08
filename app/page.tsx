"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toDelimited } from "@/lib/csv";
import type { JobRow } from "@/lib/types";
import { api, copyText, fmtDay, fmtTime, load, postJson, save } from "./ui";

interface Batch { batch_date: string; job_count: number; new_count: number; copied_at: string | null; top_score: number | null; sponsor_count: number }
interface Run { id: number; started_at: string; finished_at: string | null; stats: any }
interface Prefs { minScore: number; sponsorOnly: boolean; linksOnly: boolean; header: boolean; hideCopied: boolean }

const PREFS: Prefs = { minScore: 0, sponsorOnly: false, linksOnly: false, header: false, hideCopied: false };

export default function Home() {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [sponsors, setSponsors] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Record<string, JobRow[]>>({});
  const [prefs, setPrefs] = useState<Prefs>(PREFS);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [showRun, setShowRun] = useState(false);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [b, r] = await Promise.all([api("/api/batches"), api("/api/runs")]);
      setBatches(b.batches);
      setRuns(r.runs);
      setSponsors(r.sponsors);
      return b.batches as Batch[];
    } catch (e: any) { setError(e.message); setBatches([]); return []; }
  }, []);

  const loadDay = useCallback(async (date: string) => {
    const r = await api(`/api/jobs?date=${date}`);
    setJobs((j) => ({ ...j, [date]: r.jobs }));
  }, []);

  useEffect(() => {
    setPrefs(load("prefs", PREFS));
    refresh().then((b) => {
      // Open the first day that still has new jobs, so the daily visit is one tap.
      const first = b.find((x) => x.new_count > 0) ?? b[0];
      if (first) { setOpen(first.batch_date); loadDay(first.batch_date).catch((e) => setError(e.message)); }
    });
  }, [refresh, loadDay]);

  const setPref = (p: Partial<Prefs>) => setPrefs((old) => { const n = { ...old, ...p }; save("prefs", n); return n; });

  const toggle = (date: string) => {
    if (open === date) return setOpen(null);
    setOpen(date);
    if (!jobs[date]) loadDay(date).catch((e) => setError(e.message));
  };

  const visible = useCallback((date: string) => {
    const s = search.trim().toLowerCase();
    return (jobs[date] ?? []).filter((j) =>
      j.score >= prefs.minScore &&
      (!prefs.sponsorOnly || j.sponsor_uk) &&
      (!prefs.hideCopied || !j.copied_at) &&
      (!s || `${j.title} ${j.company} ${j.location ?? ""}`.toLowerCase().includes(s)));
  }, [jobs, prefs, search]);

  /** Copies the not-yet-copied visible jobs (or all visible if everything was copied), then marks them. */
  async function copyDay(date: string, mode: "new" | "all") {
    const list = visible(date);
    const pick = mode === "new" ? list.filter((j) => !j.copied_at) : list;
    if (!pick.length) return flash(mode === "new" ? "Nothing new to copy — try Copy all" : "Nothing to copy");
    const ok = await copyText(toDelimited(pick, { delim: "\t", header: prefs.header, linksOnly: prefs.linksOnly }));
    if (!ok) return flash("Copy failed — use Download .csv instead");
    await markCopied(date, pick.map((j) => j.id), `Copied ${pick.length} jobs ✓`);
  }

  async function markCopied(date: string, ids?: number[], msg = "Marked as copied ✓") {
    setBusy(date);
    try {
      await postJson(`/api/batches/${date}/copied`, ids ? { ids } : {});
      await Promise.all([refresh(), loadDay(date)]);
      flash(msg);
    } catch (e: any) { setError(e.message); } finally { setBusy(""); }
  }

  async function undo(date: string) {
    setBusy(date);
    try {
      await api(`/api/batches/${date}/copied`, { method: "DELETE" });
      await Promise.all([refresh(), loadDay(date)]);
      flash("Un-marked");
    } catch (e: any) { setError(e.message); } finally { setBusy(""); }
  }

  async function runNow(what?: "sponsors") {
    setBusy("run");
    flash(what ? "Refreshing sponsor list…" : "Fetching jobs… (up to a minute)");
    try {
      const r = await api(`/api/run${what ? "?what=sponsors" : ""}`, { method: "POST" });
      const b = await refresh();
      if (!what && b[0]) await loadDay(b[0].batch_date);
      if (!what) setOpen(b[0]?.batch_date ?? null);
      flash(what ? `Loaded ${r.sponsors} sponsors` : `Done: ${total(r.sources, "inserted")} new jobs`);
    } catch (e: any) { setError(e.message); } finally { setBusy(""); }
  }

  const lastRun = runs[0];
  const pending = useMemo(() => (batches ?? []).reduce((a, b) => a + b.new_count, 0), [batches]);

  return (
    <>
      <div className="row between">
        <h1>Sauce Hunter</h1>
        <div className="row">
          <Link className="btn ghost" href="/keywords">Keywords</Link>
          <button onClick={() => runNow()} disabled={busy === "run"}>{busy === "run" ? "Running…" : "Run now"}</button>
        </div>
      </div>

      <div className="card small">
        <div className="row between">
          <span>
            {pending ? <b>{pending} new jobs waiting</b> : <span className="muted">All caught up</span>}
            {lastRun && <span className="muted"> · last run {fmtTime(lastRun.started_at)}{lastRun.stats?.error ? " (failed)" : ""}</span>}
          </span>
          {lastRun && <button className="ghost small" onClick={() => setShowRun(!showRun)}>{showRun ? "Hide" : "Run details"}</button>}
        </div>
        {showRun && lastRun && <RunDetails run={lastRun} sponsors={sponsors} onSponsors={() => runNow("sponsors")} busy={busy === "run"} />}
      </div>

      <div className="card">
        <div className="row">
          <input type="search" placeholder="Filter title / company / location" value={search} onChange={(e) => setSearch(e.target.value)} />
          <label className="check">Min score <input type="number" value={prefs.minScore} onChange={(e) => setPref({ minScore: Number(e.target.value) || 0 })} /></label>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <label className="check"><input type="checkbox" checked={prefs.sponsorOnly} onChange={(e) => setPref({ sponsorOnly: e.target.checked })} /> UK sponsors only</label>
          <label className="check"><input type="checkbox" checked={prefs.hideCopied} onChange={(e) => setPref({ hideCopied: e.target.checked })} /> Hide copied</label>
          <label className="check"><input type="checkbox" checked={prefs.linksOnly} onChange={(e) => setPref({ linksOnly: e.target.checked })} /> Copy links only</label>
          <label className="check"><input type="checkbox" checked={prefs.header} onChange={(e) => setPref({ header: e.target.checked })} /> Include header row</label>
        </div>
      </div>

      {error && <div className="card danger small">Error: {error}</div>}
      {batches === null && <p className="muted">Loading…</p>}
      {batches?.length === 0 && !error && <p className="muted">No jobs yet. Press <b>Run now</b> or wait for the daily run (6 AM Bahrain).</p>}

      {batches?.map((b) => {
        const isOpen = open === b.batch_date;
        const list = isOpen ? visible(b.batch_date) : [];
        const done = b.new_count === 0 && b.job_count > 0;
        return (
          <section className="card" key={b.batch_date}>
            <button className="day row" onClick={() => toggle(b.batch_date)} aria-expanded={isOpen}>
              <span>
                <span className="date">{fmtDay(b.batch_date)}</span>
                <span className="muted small"> · {b.job_count} jobs{b.sponsor_count ? ` · ${b.sponsor_count} sponsor` : ""}{b.top_score != null ? ` · top ${b.top_score}` : ""}</span>
              </span>
              {done
                ? <span className="badge ok">Copied ✓ {fmtTime(b.copied_at)}</span>
                : b.copied_at ? <span className="badge new">{b.new_count} new</span>
                : <span className="badge new">New</span>}
            </button>

            {isOpen && (
              <>
                <div className="row actions" style={{ margin: "8px 0" }}>
                  <button className="primary" disabled={busy === b.batch_date} onClick={() => copyDay(b.batch_date, done ? "all" : "new")}>
                    {done ? "Copy again" : `Copy as CSV${b.copied_at ? " (new only)" : ""}`}
                  </button>
                  {!done && <button disabled={busy === b.batch_date} onClick={() => markCopied(b.batch_date)}>Mark copied</button>}
                  {b.copied_at && <button disabled={busy === b.batch_date} onClick={() => undo(b.batch_date)}>Undo copied</button>}
                  <a className="btn" href={`/api/jobs?date=${b.batch_date}&format=csv&download=1`}>Download .csv</a>
                </div>
                {!jobs[b.batch_date] && <p className="muted small">Loading…</p>}
                {jobs[b.batch_date] && list.length === 0 && <p className="muted small">No jobs match your filters.</p>}
                {list.map((j) => <JobItem key={j.id} j={j} />)}
              </>
            )}
          </section>
        );
      })}

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}

function JobItem({ j }: { j: JobRow }) {
  return (
    <div className={`job${j.copied_at ? " done" : ""}`}>
      <div className="score">{j.score}</div>
      <div>
        <a className="title" href={j.url} target="_blank" rel="noreferrer">{j.title}</a>
        <div className="small">
          <b>{j.company}</b>{j.location ? ` · ${j.location}` : ""}{j.salary ? ` · ${j.salary}` : ""}
        </div>
        <div className="tags">
          {j.sponsor_uk === true && <span className="badge ok">UK sponsor</span>}
          {j.sponsor_uk === false && <span className="badge plain">not on register</span>}
          <span className="tag">{j.source}</span>
          {j.matched_keywords?.map((k) => <span className="tag" key={k}>{k}</span>)}
        </div>
      </div>
    </div>
  );
}

const total = (sources: Record<string, any> = {}, key: string) => Object.values(sources).reduce((a, s: any) => a + (s?.[key] ?? 0), 0);

function RunDetails({ run, sponsors, onSponsors, busy }: { run: Run; sponsors: number; onSponsors: () => void; busy: boolean }) {
  const src: Record<string, { fetched: number; kept: number; inserted: number; errors: string[] }> = run.stats?.sources ?? {};
  return (
    <div style={{ marginTop: 8 }}>
      {run.stats?.error && <p className="danger">Run error: {run.stats.error}</p>}
      <table className="small" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr className="muted"><th align="left">Source</th><th>Fetched</th><th>Kept</th><th>New</th><th>Errors</th></tr></thead>
        <tbody>
          {Object.entries(src).map(([name, s]) => (
            <tr key={name}><td>{name}</td><td align="center">{s.fetched}</td><td align="center">{s.kept}</td><td align="center">{s.inserted}</td><td align="center">{s.errors?.length || ""}</td></tr>
          ))}
        </tbody>
      </table>
      {Object.entries(src).filter(([, s]) => s.errors?.length).map(([name, s]) => (
        <pre key={name} className="muted"><b>{name}:</b> {s.errors.join("\n")}</pre>
      ))}
      <div className="row between" style={{ marginTop: 8 }}>
        <span className="muted">UK sponsor register: {sponsors ? `${sponsors.toLocaleString()} companies` : "not loaded yet"}</span>
        <button className="small" onClick={onSponsors} disabled={busy}>Refresh sponsors</button>
      </div>
    </div>
  );
}
