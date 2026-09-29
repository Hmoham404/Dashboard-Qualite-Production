create extension if not exists pgcrypto;

create table if not exists machines (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text,
  department text not null default 'Injection',
  source_file text,
  created_at timestamptz not null default now()
);

create table if not exists product_references (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  designation text,
  family text,
  source_file text,
  created_at timestamptz not null default now()
);

create table if not exists production_entries (
  id uuid primary key default gen_random_uuid(),
  production_date date not null,
  department text not null,
  machine_code text,
  product_reference text,
  work_order text,
  good_qty integer not null default 0,
  scrap_qty integer not null default 0,
  justified_scrap_qty integer not null default 0,
  purge_kg numeric(12,2) not null default 0,
  machine_hours numeric(12,2) not null default 0,
  work_hours numeric(12,2) not null default 0,
  mod_count integer not null default 0,
  mod_hours numeric(12,2) not null default 0,
  operator_names text,
  defect_type text,
  defect_breakdown jsonb not null default '[]'::jsonb,
  note text,
  entry_status text not null default 'Complete',
  missing_fields text[] not null default '{}',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table production_entries add column if not exists justified_scrap_qty integer not null default 0;
alter table production_entries add column if not exists work_hours numeric(12,2) not null default 0;
alter table production_entries add column if not exists operator_names text;
alter table production_entries add column if not exists defect_breakdown jsonb not null default '[]'::jsonb;
alter table production_entries add column if not exists entry_status text not null default 'Complete';
alter table production_entries add column if not exists missing_fields text[] not null default '{}';
alter table production_entries add column if not exists completed_at timestamptz;

create table if not exists mod_assignments (
  id uuid primary key default gen_random_uuid(),
  machine_code text not null,
  operator_names text not null,
  mod_count integer not null default 1,
  shift_date date default current_date,
  created_at timestamptz not null default now()
);

alter table machines enable row level security;
alter table product_references enable row level security;
alter table production_entries enable row level security;
alter table mod_assignments enable row level security;

create policy "anon read machines" on machines for select using (true);
create policy "anon write machines" on machines for insert with check (true);
create policy "anon update machines" on machines for update using (true);

create policy "anon read references" on product_references for select using (true);
create policy "anon write references" on product_references for insert with check (true);
create policy "anon update references" on product_references for update using (true);

create policy "anon read production" on production_entries for select using (true);
create policy "anon write production" on production_entries for insert with check (true);
create policy "anon update production" on production_entries for update using (true);
create policy "anon delete production" on production_entries for delete using (true);

create policy "anon read mod" on mod_assignments for select using (true);
create policy "anon write mod" on mod_assignments for insert with check (true);
create policy "anon update mod" on mod_assignments for update using (true);
create policy "anon delete mod" on mod_assignments for delete using (true);
