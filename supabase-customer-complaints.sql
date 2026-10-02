-- Run once in the Supabase SQL Editor to enable online customer complaints.
create extension if not exists pgcrypto;

create table if not exists public.customer_complaints (
  id uuid primary key default gen_random_uuid(),
  complaint_date date not null,
  details text not null,
  created_at timestamptz not null default now()
);

alter table public.customer_complaints enable row level security;

drop policy if exists "anon read customer complaints" on public.customer_complaints;
drop policy if exists "anon insert customer complaints" on public.customer_complaints;
drop policy if exists "anon delete customer complaints" on public.customer_complaints;

create policy "anon read customer complaints"
  on public.customer_complaints for select using (true);
create policy "anon insert customer complaints"
  on public.customer_complaints for insert with check (true);
create policy "anon delete customer complaints"
  on public.customer_complaints for delete using (true);
