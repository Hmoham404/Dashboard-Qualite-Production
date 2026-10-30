-- Run in the Supabase SQL Editor before saving sorting entries with headcount.
-- Historical entries stay NULL (not recorded); an entered zero means zero staff.
alter table public.sorting_hours
  add column if not exists headcount integer check (headcount >= 0);
