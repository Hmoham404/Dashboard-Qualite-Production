-- INSTALLATION COMPLETE : QUALITE & PRODUCTION
-- Prepare le 9 novembre 2026 pour Supabase SQL Editor.
-- Copier tout ce fichier dans une nouvelle requete, puis executer Run.
-- Creation initiale ou mise a jour des schemas precedents fournis par ce projet.
-- Reexecutable : aucune table, saisie, cloture ou rapport existant n'est supprime.
-- Les politiques connues de l'application et ses fonctions/triggers sont recrees.
-- IMPORTANT : conserve le mode actuel SANS AUTHENTIFICATION.
-- anon et authenticated peuvent lire/ecrire selon les politiques ci-dessous ;
-- la cloture d'un mois termine reste accessible a ces deux roles.
-- Ce script n'ajoute ni comptes utilisateurs ni restriction par responsable.
-- A executer dans le projet Supabase utilise par le fichier .env de l'application.
-- Ne modifie pas les donnees locales du navigateur et n'importe pas les classeurs Excel.
-- Sources : supabase-schema.sql, supabase-monthly-archives.sql,
-- supabase-lot-inspections.sql, supabase-lot-anomaly-reports.sql.
-- Les migrations reclamations, tri et effectif sont deja incluses dans ces schemas.

begin;
set local search_path = public, extensions;

-- 1. Production, machines, references, affectations, reclamations et tri.
create extension if not exists pgcrypto;

create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text,
  department text not null default 'Injection',
  source_file text,
  created_at timestamptz not null default now()
);

create table if not exists public.product_references (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  designation text,
  family text,
  source_file text,
  created_at timestamptz not null default now()
);

create table if not exists public.production_entries (
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

alter table public.production_entries add column if not exists justified_scrap_qty integer not null default 0;
alter table public.production_entries add column if not exists work_hours numeric(12,2) not null default 0;
alter table public.production_entries add column if not exists operator_names text;
alter table public.production_entries add column if not exists defect_breakdown jsonb not null default '[]'::jsonb;
alter table public.production_entries add column if not exists entry_status text not null default 'Complete';
alter table public.production_entries add column if not exists missing_fields text[] not null default '{}';
alter table public.production_entries add column if not exists completed_at timestamptz;

create table if not exists public.mod_assignments (
  id uuid primary key default gen_random_uuid(),
  machine_code text not null,
  operator_names text not null,
  mod_count integer not null default 1,
  shift_date date default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_complaints (
  id uuid primary key default gen_random_uuid(),
  complaint_date date not null,
  details text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sorting_hours (
  id uuid primary key default gen_random_uuid(),
  sorting_date date not null,
  department text not null,
  hours numeric(8,2) not null default 0 check (hours >= 0),
  headcount integer check (headcount >= 0),
  good_qty integer not null default 0 check (good_qty >= 0),
  scrap_qty integer not null default 0 check (scrap_qty >= 0),
  created_at timestamptz not null default now(),
  unique (sorting_date, department)
);

alter table public.sorting_hours add column if not exists good_qty integer not null default 0 check (good_qty >= 0);
alter table public.sorting_hours add column if not exists headcount integer check (headcount >= 0);
alter table public.sorting_hours add column if not exists scrap_qty integer not null default 0 check (scrap_qty >= 0);

alter table public.machines enable row level security;
alter table public.product_references enable row level security;
alter table public.production_entries enable row level security;
alter table public.mod_assignments enable row level security;
alter table public.customer_complaints enable row level security;
alter table public.sorting_hours enable row level security;

drop policy if exists "anon read machines" on public.machines;
create policy "anon read machines" on public.machines for select to anon, authenticated using (true);
drop policy if exists "anon write machines" on public.machines;
create policy "anon write machines" on public.machines for insert to anon, authenticated with check (true);
drop policy if exists "anon update machines" on public.machines;
create policy "anon update machines" on public.machines for update to anon, authenticated using (true);

drop policy if exists "anon read references" on public.product_references;
create policy "anon read references" on public.product_references for select to anon, authenticated using (true);
drop policy if exists "anon write references" on public.product_references;
create policy "anon write references" on public.product_references for insert to anon, authenticated with check (true);
drop policy if exists "anon update references" on public.product_references;
create policy "anon update references" on public.product_references for update to anon, authenticated using (true);

drop policy if exists "anon read production" on public.production_entries;
create policy "anon read production" on public.production_entries for select to anon, authenticated using (true);
drop policy if exists "anon write production" on public.production_entries;
create policy "anon write production" on public.production_entries for insert to anon, authenticated with check (true);
drop policy if exists "anon update production" on public.production_entries;
create policy "anon update production" on public.production_entries for update to anon, authenticated using (true);
drop policy if exists "anon delete production" on public.production_entries;
create policy "anon delete production" on public.production_entries for delete to anon, authenticated using (true);

drop policy if exists "anon read mod" on public.mod_assignments;
create policy "anon read mod" on public.mod_assignments for select to anon, authenticated using (true);
drop policy if exists "anon write mod" on public.mod_assignments;
create policy "anon write mod" on public.mod_assignments for insert to anon, authenticated with check (true);
drop policy if exists "anon update mod" on public.mod_assignments;
create policy "anon update mod" on public.mod_assignments for update to anon, authenticated using (true);
drop policy if exists "anon delete mod" on public.mod_assignments;
create policy "anon delete mod" on public.mod_assignments for delete to anon, authenticated using (true);




drop policy if exists "anon read customer complaints" on public.customer_complaints;
create policy "anon read customer complaints" on public.customer_complaints for select to anon, authenticated using (true);
drop policy if exists "anon insert customer complaints" on public.customer_complaints;
create policy "anon insert customer complaints" on public.customer_complaints for insert to anon, authenticated with check (true);
drop policy if exists "anon delete customer complaints" on public.customer_complaints;
create policy "anon delete customer complaints" on public.customer_complaints for delete to anon, authenticated using (true);




drop policy if exists "anon read sorting hours" on public.sorting_hours;
create policy "anon read sorting hours" on public.sorting_hours for select to anon, authenticated using (true);
drop policy if exists "anon insert sorting hours" on public.sorting_hours;
create policy "anon insert sorting hours" on public.sorting_hours for insert to anon, authenticated with check (true);
drop policy if exists "anon update sorting hours" on public.sorting_hours;
create policy "anon update sorting hours" on public.sorting_hours for update to anon, authenticated using (true) with check (true);

-- Droits necessaires aux operations effectivement utilisees par l'application.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.machines, public.product_references,
  public.production_entries, public.mod_assignments, public.sorting_hours to anon, authenticated;
grant select, insert, delete on public.customer_complaints to anon, authenticated;
grant delete on public.production_entries, public.mod_assignments to anon, authenticated;

-- 2. Archives mensuelles et verrouillage des mois clotures.
-- Apply once in the Supabase SQL Editor after the base schema.
-- No existing production, complaint, sorting or staffing record is deleted.

-- Include the preceding effectif migration for existing installations.
alter table public.sorting_hours add column if not exists headcount integer check (headcount >= 0);

create table if not exists public.monthly_closures (
  month date primary key check (extract(day from month) = 1),
  closed_at timestamptz not null default now(),
  snapshot jsonb not null
);
alter table public.monthly_closures enable row level security;
revoke all on public.monthly_closures from public, anon, authenticated;
grant select on public.monthly_closures to anon, authenticated;
drop policy if exists "read monthly closures" on public.monthly_closures;
create policy "read monthly closures" on public.monthly_closures
  for select to anon, authenticated using (true);

create or replace function public.guard_closed_production_month()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  old_date date;
  new_date date;
begin
  if tg_op <> 'INSERT' then old_date := (to_jsonb(old) ->> tg_argv[0])::date; end if;
  if tg_op <> 'DELETE' then new_date := (to_jsonb(new) ->> tg_argv[0])::date; end if;
  if exists (
    select 1 from public.monthly_closures c
    where c.month = date_trunc('month', old_date)::date
       or c.month = date_trunc('month', new_date)::date
  ) then
    raise exception 'Mois clôturé : les données sont en lecture seule.' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.guard_closed_production_month() from public, anon, authenticated;

drop trigger if exists guard_closed_month on public.production_entries;
create trigger guard_closed_month before insert or update or delete on public.production_entries
  for each row execute function public.guard_closed_production_month('production_date');
drop trigger if exists guard_closed_month on public.sorting_hours;
create trigger guard_closed_month before insert or update or delete on public.sorting_hours
  for each row execute function public.guard_closed_production_month('sorting_date');
drop trigger if exists guard_closed_month on public.customer_complaints;
create trigger guard_closed_month before insert or update or delete on public.customer_complaints
  for each row execute function public.guard_closed_production_month('complaint_date');
drop trigger if exists guard_closed_month on public.mod_assignments;
create trigger guard_closed_month before insert or update or delete on public.mod_assignments
  for each row execute function public.guard_closed_production_month('shift_date');

create or replace function public.close_production_month(p_month date)
returns public.monthly_closures language plpgsql security definer set search_path = '' as $$
declare
  result public.monthly_closures;
  month_end date;
begin
  if p_month is null or extract(day from p_month) <> 1
     or p_month >= date_trunc('month', timezone('Africa/Lagos', now()))::date then
    raise exception 'Seul un mois terminé peut être clôturé.' using errcode = '22023';
  end if;
  month_end := (p_month + interval '1 month')::date;

  -- Wait for ongoing writes and prevent a save from racing the archive snapshot.
  -- Ordinary SELECT queries remain available during this short transaction.
  lock table public.production_entries, public.sorting_hours,
    public.customer_complaints, public.mod_assignments in share row exclusive mode;
  select * into result from public.monthly_closures where month = p_month;
  if found then return result; end if;

  insert into public.monthly_closures (month, snapshot)
  values (p_month, jsonb_build_object(
    'production_entries', (select coalesce(jsonb_agg(to_jsonb(e) order by e.production_date, e.id), '[]'::jsonb)
      from public.production_entries e where e.production_date >= p_month and e.production_date < month_end),
    'sorting_hours', (select coalesce(jsonb_agg(to_jsonb(s) order by s.sorting_date, s.id), '[]'::jsonb)
      from public.sorting_hours s where s.sorting_date >= p_month and s.sorting_date < month_end),
    'customer_complaints', (select coalesce(jsonb_agg(to_jsonb(c) order by c.complaint_date, c.id), '[]'::jsonb)
      from public.customer_complaints c where c.complaint_date >= p_month and c.complaint_date < month_end),
    'mod_assignments', (select coalesce(jsonb_agg(to_jsonb(a) order by a.shift_date, a.id), '[]'::jsonb)
      from public.mod_assignments a where a.shift_date >= p_month and a.shift_date < month_end)
  )) returning * into result;
  return result;
end;
$$;
-- Match the app's existing anonymous write model; this adds no edit/delete
-- access to archives. Restrict this RPC to your supervisor role when Auth is added.
revoke all on function public.close_production_month(date) from public;
grant execute on function public.close_production_month(date) to anon, authenticated;

create index if not exists production_entries_month_idx on public.production_entries (production_date);
create index if not exists customer_complaints_month_idx on public.customer_complaints (complaint_date);
create index if not exists mod_assignments_month_idx on public.mod_assignments (shift_date);

-- 3. Controles des lots OK/NOK.
-- Run in Supabase SQL Editor to enable shared LOT inspections.
-- Existing production tables and monthly archives are not modified.

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

-- 4. Rapports d'anomalie lies aux lots.
-- Apply after supabase-lot-inspections.sql. Existing LOT data is preserved.

alter table public.lot_inspections add column if not exists anomaly_report jsonb;

create or replace function public.validate_lot_anomaly_report()
returns trigger language plpgsql set search_path = '' as $$
declare
  field_name text;
  previous_report jsonb;
begin
  if tg_op = 'UPDATE' then previous_report := old.anomaly_report; end if;
  if previous_report is not null and new.anomaly_report is null then
    raise exception 'Un rapport enregistré doit être conservé.';
  end if;
  if new.anomaly_report is null then return new; end if;
  -- Allow import of a local report created during NOK and retained after OK.
  if previous_report is null and new.decision <> 'NOK'
      and (tg_op <> 'INSERT' or new.anomaly_report->'context'->>'decision' is distinct from 'NOK') then
    raise exception 'Un nouveau rapport nécessite un lot NOK enregistré.';
  end if;
  if not coalesce(jsonb_typeof(new.anomaly_report) = 'object'
      and new.anomaly_report->>'version' = '1'
      and new.anomaly_report->>'lot_id' = new.id::text
      and jsonb_typeof(new.anomaly_report->'context') = 'object'
      and btrim(new.anomaly_report->>'id') <> '', false) then
    raise exception 'Rapport d’anomalie invalide.';
  end if;
  foreach field_name in array array['root_cause','immediate_action','immediate_effectiveness','corrective_action','corrective_effectiveness'] loop
    if not coalesce(jsonb_typeof(new.anomaly_report->field_name) = 'string'
        and btrim(new.anomaly_report->>field_name) <> '', false) then
      raise exception 'Rapport incomplet : %', field_name;
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists validate_lot_anomaly_report on public.lot_inspections;
create trigger validate_lot_anomaly_report before insert or update on public.lot_inspections
  for each row execute function public.validate_lot_anomaly_report();

-- 5. Actualiser le cache du schema de l'API apres validation de la transaction.
notify pgrst, 'reload schema';
commit;

-- Verification : les huit tables doivent apparaitre avec rowsecurity = true.
select tablename as table_projet, rowsecurity as rls_active
from pg_catalog.pg_tables
where schemaname = 'public'
  and tablename in ('machines', 'product_references', 'production_entries',
    'mod_assignments', 'customer_complaints', 'sorting_hours',
    'monthly_closures', 'lot_inspections')
order by tablename;
