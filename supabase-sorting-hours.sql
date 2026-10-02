-- Run once in the Supabase SQL Editor to enable online daily sorting-hour entries.
create extension if not exists pgcrypto;

create table if not exists public.sorting_hours (
  id uuid primary key default gen_random_uuid(),
  sorting_date date not null,
  department text not null,
  hours numeric(8,2) not null default 0 check (hours >= 0),
  created_at timestamptz not null default now(),
  unique (sorting_date, department)
);

alter table public.sorting_hours enable row level security;

drop policy if exists "anon read sorting hours" on public.sorting_hours;
drop policy if exists "anon insert sorting hours" on public.sorting_hours;
drop policy if exists "anon update sorting hours" on public.sorting_hours;

create policy "anon read sorting hours"
  on public.sorting_hours for select using (true);
create policy "anon insert sorting hours"
  on public.sorting_hours for insert with check (true);
create policy "anon update sorting hours"
  on public.sorting_hours for update using (true) with check (true);
