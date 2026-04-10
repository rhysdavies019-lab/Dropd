-- ============================================================
-- Dropd — Supabase database schema
-- Run this in the Supabase SQL editor: Project → SQL Editor
-- ============================================================

-- ── Extensions ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. users ───────────────────────────────────────────────
-- Mirrors auth.users; extended with plan, credits, niche_lock.
-- A trigger (below) auto-inserts a row when a user signs up.
create table if not exists public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  plan         text not null default 'free' check (plan in ('free', 'hunter', 'pro')),
  credits      integer not null default 2,       -- free tier starts with 2 unlocks
  niche_lock   text,                             -- Pro-only: one niche category
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Trigger: create a public.users row on new auth.users signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. domains ─────────────────────────────────────────────
-- Domain listings ingested from Ahrefs / VeriSign / drop feeds.
-- `name` is stored plaintext server-side; `name_hashed` is the
-- redacted display version shown to users before unlock.
create table if not exists public.domains (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,                -- e.g. "cryptovault.io"
  name_hashed     text not null,                -- e.g. "cry***lt.io"
  grade           text not null check (grade in ('A+', 'A', 'B', 'C', 'D')),
  score           integer not null check (score between 0 and 100),
  backlinks       integer not null default 0,
  age             integer not null default 0,   -- years
  category        text not null,                -- niche tag
  extension       text not null,                -- ".com", ".io", etc.
  estimated_value integer not null default 0,   -- GBP
  reason          text,                         -- AI explanation of score
  created_at      timestamptz not null default now()
);

-- Index for fast filtering
create index if not exists domains_grade_idx     on public.domains (grade);
create index if not exists domains_category_idx  on public.domains (category);
create index if not exists domains_extension_idx on public.domains (extension);
create index if not exists domains_created_idx   on public.domains (created_at desc);

-- ── 3. unlocks ─────────────────────────────────────────────
-- Records which domains each user has unlocked (spent a credit on).
create table if not exists public.unlocks (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  domain_id   uuid not null references public.domains(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, domain_id)               -- prevent double-unlock
);

create index if not exists unlocks_user_idx on public.unlocks (user_id);

-- ── 4. watchlist ───────────────────────────────────────────
-- Keywords each user wants to track, with per-alert-type toggles.
create table if not exists public.watchlist (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  keyword     text not null,
  alert_email boolean not null default true,
  alert_sms   boolean not null default false,
  alert_app   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, keyword)
);

create index if not exists watchlist_user_idx on public.watchlist (user_id);

-- ── Row Level Security ──────────────────────────────────────
-- Enable RLS on all tables
alter table public.users     enable row level security;
alter table public.domains   enable row level security;
alter table public.unlocks   enable row level security;
alter table public.watchlist enable row level security;

-- users: each user can only read/update their own row
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- domains: all authenticated users can read domains
create policy "domains_select_auth" on public.domains
  for select using (auth.role() = 'authenticated');

-- unlocks: users can read and insert their own unlocks
create policy "unlocks_select_own" on public.unlocks
  for select using (auth.uid() = user_id);
create policy "unlocks_insert_own" on public.unlocks
  for insert with check (auth.uid() = user_id);

-- watchlist: full CRUD on own rows
create policy "watchlist_select_own" on public.watchlist
  for select using (auth.uid() = user_id);
create policy "watchlist_insert_own" on public.watchlist
  for insert with check (auth.uid() = user_id);
create policy "watchlist_update_own" on public.watchlist
  for update using (auth.uid() = user_id);
create policy "watchlist_delete_own" on public.watchlist
  for delete using (auth.uid() = user_id);

-- ── Seed: sample domain data (optional, for local testing) ──
-- Run this block separately if you want mock data in your DB.
/*
insert into public.domains (name, name_hashed, grade, score, backlinks, age, category, extension, estimated_value, reason) values
  ('cryptovault.io', 'cry***lt.io', 'A+', 96, 3840, 9, 'Crypto',     '.io',  8500, 'High-authority backlinks from CoinDesk and Decrypt.'),
  ('fitstack.com',   'fit***k.com', 'A+', 93, 2210, 7, 'Fitness',    '.com', 6200, 'Strong .com with fitness + tech portmanteau.'),
  ('airecruit.co',   'air***t.co',  'A',  88, 1540, 5, 'AI',         '.co',  4100, 'AI + recruitment — two hot verticals.'),
  ('greenledger.io', 'gre***r.io',  'A',  85,  980, 6, 'Finance',    '.io',  3300, 'ESG finance niche is booming.'),
  ('legalops.co',    'leg***s.co',  'B',  74,  430, 5, 'Legal',      '.co',  1900, 'Legal tech high-value vertical.'),
  ('debtfree.org',   'deb***e.org', 'C',  54,  620,11, 'Finance',    '.org',  900, 'Old .org with strong consumer finance intent.'),
  ('printshop.org',  'pri***p.org', 'D',  32,   45, 9, 'Retail',     '.org',  200, 'Competitive generic term.');
*/
