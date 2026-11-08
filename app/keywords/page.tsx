"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Keyword } from "@/lib/types";
import { api, postJson } from "../ui";

type Tab = Keyword["type"];
const TABS: { id: Tab; label: string; help: string }[] = [
  { id: "include", label: "Include", help: "A job is kept only if its title matches at least one of these." },
  { id: "exclude", label: "Exclude", help: "A job is dropped if its title (or chosen field) matches any of these." },
  { id: "boost", label: "Boost", help: "Adds (or removes) points. Terms with the same field and weight form a group that scores once." },
];

export default function Keywords() {
  const [all, setAll] = useState<Keyword[] | null>(null);
  const [tab, setTab] = useState<Tab>("include");
  const [terms, setTerms] = useState("");
  const [field, setField] = useState<Keyword["field"]>("title");
  const [weight, setWeight] = useState(10);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try { setAll((await api("/api/keywords")).keywords); } catch (e: any) { setMsg(e.message); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const run = async (fn: () => Promise<any>, done?: (r: any) => string) => {
    try { const r = await fn(); setMsg(done ? done(r) : ""); await refresh(); } catch (e: any) { setMsg(e.message); }
  };

  const add = () => run(
    () => postJson("/api/keywords", { terms, type: tab, field, weight }),
    (r) => { setTerms(""); return `Added ${r.added}, skipped ${r.skipped}`; },
  );

  const upload = (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", tab);
    run(() => api("/api/keywords", { method: "POST", body: fd }), (r) => `Uploaded: added ${r.added}, skipped ${r.skipped}`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const patch = (k: Keyword, body: Partial<Keyword>) => run(() => postJson(`/api/keywords/${k.id}`, body, "PATCH"));
  const remove = (k: Keyword) => run(() => api(`/api/keywords/${k.id}`, { method: "DELETE" }));
  const reset = () => confirm("Replace ALL keywords with the defaults?") &&
    run(() => postJson("/api/keywords/reset"), (r) => `Reset: ${r.added} default keywords`);
  const rescore = () => confirm("Re-score today's saved jobs with the current keywords?") &&
    run(() => postJson("/api/rescore"), (r) => `Rescored ${r.rescored} jobs (${r.belowThreshold} now below threshold)`);
  const doPreview = async () => { setPreview("loading"); try { setPreview(await api("/api/rescore")); } catch (e: any) { setMsg(e.message); setPreview(null); } };

  const list = (all ?? []).filter((k) => k.type === tab);
  const groups = tab === "boost"
    ? Object.entries(list.reduce<Record<string, Keyword[]>>((g, k) => ((g[`${k.field} · ${k.weight > 0 ? "+" : ""}${k.weight}`] ??= []).push(k), g), {}))
    : [["", list] as [string, Keyword[]]];

  return (
    <>
      <div className="row between">
        <h1>Keywords</h1>
        <Link className="btn ghost" href="/">← Jobs</Link>
      </div>
      <p className="muted small">Changes apply from the next run. Saved jobs are not re-scored unless you press <b>Rescore today</b>.</p>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => { setTab(t.id); setField(t.id === "boost" ? "description" : "title"); }}>
            {t.label} <span className="muted small">{(all ?? []).filter((k) => k.type === t.id).length}</span>
          </button>
        ))}
      </div>
      <p className="muted small">{TABS.find((t) => t.id === tab)!.help}</p>

      <div className="card">
        <div className="row">
          <input type="text" placeholder="Add terms, comma-separated" value={terms} onChange={(e) => setTerms(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && terms.trim() && add()} />
          <select value={field} onChange={(e) => setField(e.target.value as Keyword["field"])}>
            <option value="title">title</option><option value="description">description</option><option value="location">location</option>
          </select>
          {tab === "boost" && <input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} title="Points (can be negative)" />}
          <button className="primary" disabled={!terms.trim()} onClick={add}>Add</button>
        </div>
        <div className="row small" style={{ marginTop: 8 }}>
          <label className="btn">Upload .csv / .txt
            <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          <a className="btn" href="/api/keywords/export">Export CSV</a>
          <button onClick={doPreview}>Preview impact</button>
          <button onClick={rescore}>Rescore today</button>
          <button className="danger" onClick={reset}>Reset to defaults</button>
        </div>
        <p className="muted small" style={{ marginBottom: 0 }}>CSV columns: <code>term,type,field,weight</code> (field and weight optional). TXT: one term per line, added to the open tab.</p>
        {msg && <p className="small"><b>{msg}</b></p>}
        {preview === "loading" && <p className="muted small">Scoring…</p>}
        {preview && preview !== "loading" && (
          <p className="small">With the current keywords, <b>{preview.pass}</b> of {preview.total} jobs from the last {preview.days} days would pass (threshold {preview.threshold}).
            {Object.entries(preview.byDay as Record<string, any>).map(([d, v]) => <span key={d} className="muted"><br />{d}: {v.pass}/{v.total} pass, {v.changed} score changes</span>)}
          </p>
        )}
      </div>

      {all === null && <p className="muted">Loading…</p>}
      {groups.map(([label, ks]) => (
        <div key={label} className="card">
          {label && <h2 className="small">{label}</h2>}
          <div className="chips">
            {ks.map((k) => (
              <span key={k.id} className={`chip${k.active ? "" : " off"}`}>
                <span title={`field: ${k.field}`}>{k.term}{tab !== "boost" && k.field !== "title" ? <span className="muted small"> ({k.field})</span> : null}</span>
                {tab === "boost" && (
                  <input type="number" defaultValue={k.weight} aria-label="weight"
                    onBlur={(e) => Number(e.target.value) !== k.weight && patch(k, { weight: Number(e.target.value) })} />
                )}
                <button title={k.active ? "Turn off" : "Turn on"} onClick={() => patch(k, { active: !k.active })}>{k.active ? "◉" : "○"}</button>
                <button title="Delete" className="danger" onClick={() => remove(k)}>✕</button>
              </span>
            ))}
            {!ks.length && <span className="muted small">None yet.</span>}
          </div>
        </div>
      ))}
    </>
  );
}
