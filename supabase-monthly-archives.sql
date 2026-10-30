-- Apply once in the Supabase SQL Editor after the base schema.
-- No existing production, complaint, sorting or staffing record is deleted.
begin;

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
commit;
