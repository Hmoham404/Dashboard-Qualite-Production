-- Run in Supabase SQL Editor to enable shared LOT inspections.
-- Existing production tables and monthly archives are not modified.
begin;
create table if not exists public.lot_inspections (
  id uuid primary key default gen_random_uuid(),
  inspection_date date not null,
  department text not null check (department in ('Injection','Metallisation','Assemblage','Serigraphie','Soudure')),
  work_order text not null check (btrim(work_order) <> ''),
  product_reference text not null check (btrim(product_reference) <> ''),
  client_name text not null check (btrim(client_name) <> ''),
  lot_number text not null check (btrim(lot_number) <> ''),
  lot_qty integer not null check (lot_qty > 0),
  sample_qty integer not null check (sample_qty > 0 and sample_qty <= lot_qty),
  decision text not null check (decision in ('OK','NOK')),
  defect text,
  corrective_action text,
  inspector_name text not null check (btrim(inspector_name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department, work_order, product_reference, client_name, lot_number)
);
-- Earlier scripts generated an unnamed check constraint. Identify it by its
-- three columns instead of depending on PostgreSQL's generated constraint name.
do $lot_decision$
declare
  previous_constraint record;
begin
  for previous_constraint in
    select conname from pg_catalog.pg_constraint
    where conrelid = 'public.lot_inspections'::regclass and contype = 'c'
      and (conname = 'lot_inspections_decision_details_check' or conname ~ '^lot_inspections_check[0-9]*$')
      and array_length(conkey, 1) = 3
      and conkey @> array(
        select attnum from pg_catalog.pg_attribute
        where attrelid = 'public.lot_inspections'::regclass
          and attname in ('decision', 'defect', 'corrective_action')
      )
  loop
    execute format('alter table public.lot_inspections drop constraint %I', previous_constraint.conname);
  end loop;
end $lot_decision$;

alter table public.lot_inspections add constraint lot_inspections_decision_details_check
  check ((decision = 'OK' and corrective_action is null)
    or (decision = 'NOK' and btrim(coalesce(defect,'')) <> '' and corrective_action is not null
      and corrective_action in ('Tri','Rebut','Dérogation')));

alter table public.lot_inspections add column if not exists anomaly_report jsonb;
create index if not exists lot_inspections_date_department_idx on public.lot_inspections(inspection_date, department);
alter table public.lot_inspections enable row level security;
-- Same access roles as the current dashboard; no delete operation is exposed.
grant select, insert, update on public.lot_inspections to anon, authenticated;
drop policy if exists "read lot inspections" on public.lot_inspections;
drop policy if exists "insert lot inspections" on public.lot_inspections;
drop policy if exists "update lot inspections" on public.lot_inspections;
create policy "read lot inspections" on public.lot_inspections for select to anon, authenticated using (true);
create policy "insert lot inspections" on public.lot_inspections for insert to anon, authenticated with check (true);
create policy "update lot inspections" on public.lot_inspections for update to anon, authenticated using (true) with check (true);
commit;
