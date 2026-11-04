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
  unique (department, work_order, product_reference, client_name, lot_number),
  check ((decision = 'OK' and corrective_action is null and defect is null)
    or (decision = 'NOK' and btrim(coalesce(defect,'')) <> '' and corrective_action is not null
      and corrective_action in ('Tri','Rebut','Dérogation')))
);
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
