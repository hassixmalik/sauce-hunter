-- Sauce Hunter schema. Safe to run more than once.

create table if not exists jobs (
  id               bigserial primary key,
  dedupe_key       text unique not null,      -- sha1(lower(company)|lower(title)|lower(location))
  url              text unique not null,      -- canonical URL, tracking params stripped
  title            text not null,
  company          text not null,
  location         text,
  source           text not null,             -- adzuna | reed | greenhouse | lever | ashby | arbeitnow
  posted_at        timestamptz,
  batch_date       date not null,             -- day the job was found (TIMEZONE env)
  score            int not null,
  matched_keywords text[] default '{}',
  sponsor_uk       boolean,
  salary           text,
  description      text,                      -- trimmed to ~3000 chars, for re-scoring
  copied_at        timestamptz,               -- null = not pasted into the sheet yet
  created_at       timestamptz default now()
);
create index if not exists jobs_batch_date_idx on jobs (batch_date);

create table if not exists batches (
  batch_date  date primary key,
  job_count   int not null default 0,
  copied_at   timestamptz                     -- last time this day was marked copied
);

create table if not exists runs (
  id           bigserial primary key,
  started_at   timestamptz default now(),
  finished_at  timestamptz,
  stats        jsonb                          -- per-source fetched/kept/inserted/errors
);

create table if not exists keywords (
  id          bigserial primary key,
  term        text not null,                  -- stored lowercase, trimmed
  type        text not null check (type in ('include','exclude','boost')),
  field       text not null default 'title' check (field in ('title','description','location')),
  weight      int not null default 0,         -- boost only; can be negative
  active      boolean not null default true,
  created_at  timestamptz default now(),
  unique (term, type, field)
);

create table if not exists uk_sponsors (
  name_norm text primary key
);
