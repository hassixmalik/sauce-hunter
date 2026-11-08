# Sauce Hunter — daily job radar

Runs once a day on Vercel, pulls new jobs from public job APIs, scores them against your keywords, stores each job
once (Neon Postgres) and shows them grouped by day. Each day has a **Copy as CSV** button (tab-separated, so it pastes
straight into Google Sheets columns) and is then marked **Copied ✓**, so you never paste the same jobs twice.

The whole thing is one daily serverless function plus five small tables, so it stays inside the free tiers (Vercel Hobby + Neon free).

## Setup (once)

1. **Vercel**: import this repo at vercel.com/new (Next.js is auto-detected).
2. **Database**: in the Vercel project, go to *Storage → Marketplace → Neon* and connect it. This adds `DATABASE_URL`.
3. **Tables**: created automatically on the first request. (Optional manual way: copy `DATABASE_URL` and run)
   ```bash
   DATABASE_URL="postgres://..." npm run db:init
   ```
   (or paste `db/schema.sql` into the Neon SQL editor).
4. **Env vars** (Project → Settings → Environment Variables), see `.env.example`:
   - `CRON_SECRET`: any long random string. Vercel sends it to the cron routes automatically.
   - `BASIC_AUTH_USER` / `BASIC_AUTH_PASS`: the login for the site. **Required**; the site returns 500 without them in production.
   - `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` (free at developer.adzuna.com), `REED_API_KEY` (free at reed.co.uk/developers).
     Optional: without them those sources are skipped and the company boards still run.
5. Redeploy. Open the site, log in, then press **Run now**. Open **Run details** → **Refresh sponsors** once to load the UK sponsor register.

Crons (`vercel.json`): jobs daily at 03:00 UTC (6 AM Bahrain), sponsor register every Monday at 02:00 UTC.

## Daily use (phone friendly)

- Open the site. The first day with new jobs is already expanded.
- **Copy as CSV**: copies the visible, not-yet-copied jobs and marks them copied. Paste into the sheet.
- **Mark copied**: marks the day without copying (e.g. if you exported another way). **Undo copied** reverts it.
- **Download .csv**: comma-separated file of the whole day.
- Filters (saved on your device): search, min score, UK sponsors only, hide copied, links only, include header row.
- Tip: on iPhone use *Share → Add to Home Screen*; on Android use *Install app* to get an app icon.

## Letting Claude fetch the list for you

Everything except the cron routes uses Basic Auth:

```bash
curl -u "$BASIC_AUTH_USER:$BASIC_AUTH_PASS" "https://<app>/api/jobs?format=csv&only=new"
```

```bash
curl -u "$BASIC_AUTH_USER:$BASIC_AUTH_PASS" -X POST "https://<app>/api/batches/2026-11-08/copied"
```

| Route | What |
|---|---|
| `GET /api/jobs?date=YYYY-MM-DD&format=json\|csv\|tsv&only=new&links=1&header=0&download=1` | A day's jobs, score desc. No date = oldest day that still has uncopied jobs |
| `GET /api/batches` | Days with `job_count`, `new_count`, `copied_at` |
| `POST /api/batches/:date/copied` | Mark the day copied (body `{ "ids": [..] }` to mark only some). `DELETE` un-marks it |
| `GET /api/runs` | Last 10 runs with per-source stats |
| `POST /api/run` | Run the fetch now (`?what=sponsors` refreshes the sponsor list) |
| `GET/POST /api/keywords`, `PATCH/DELETE /api/keywords/:id`, `GET /api/keywords/export`, `POST /api/keywords/reset` | Keyword manager |
| `GET /api/rescore` (preview last 7 days), `POST /api/rescore?date=` (rescore a day) | Re-scoring |

Trigger the cron by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/fetch
```

## Tuning

- **Keywords**: edit them at `/keywords` (add, comma-separated add, CSV/TXT upload, toggle, delete, export, reset).
  Defaults and the score threshold (35) are in `config/scoring.ts`. Changes apply from the next run; press **Rescore today** to re-score saved jobs.
  - *Include*: the title must match one. *Exclude*: the title is dropped if it matches one.
  - *Boost*: adds the weight when the term is in the chosen field. **Terms with the same field and weight form a group that counts once**
    (so "Applied AI / ML Engineer" gets +25, not +75).
  - Fixed rules (in `config/scoring.ts`): +5 for mid-level/no seniority word, +15 for UK sponsor register or "visa sponsorship" text, −30 for "no sponsorship"/"must have right to work".
- **Companies**: `config/companies.ts` (Greenhouse / Lever / Ashby slugs). A wrong slug only shows as an error in Run details.
- **Searches**: `config/searches.ts` (Adzuna countries + queries, Reed queries + locations, Arbeitnow on/off).

## Notes

- Dedupe: URLs are cleaned of tracking params, and `url` and `dedupe_key` (company|title|location) are both unique, so a job is stored once across sources and days.
- `batch_date` uses the Asia/Bahrain calendar day.
- Non-UK jobs have `sponsor_uk = null`; UK jobs are `true`/`false` once the register is loaded.
- No scraping of LinkedIn/Indeed/Glassdoor; only official/public APIs.

## Dev

```bash
npm install
```

```bash
npm test
```

```bash
cp .env.example .env.local && npm run dev
```
