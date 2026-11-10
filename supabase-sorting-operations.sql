-- Multiple sorting operations per day. Existing rows and archives are preserved.
begin;

alter table public.sorting_hours add column if not exists client_name text;
alter table public.sorting_hours add column if not exists product_reference text;
alter table public.sorting_hours add column if not exists lot_number text;
alter table public.sorting_hours add column if not exists headcount integer check (headcount >= 0);

-- Remove the old daily aggregate uniqueness; every operation keeps its UUID.
do $sorting_operations$
declare previous_constraint record;
begin
  for previous_constraint in
    select conname from pg_catalog.pg_constraint
    where conrelid = 'public.sorting_hours'::regclass and contype = 'u'
      and array_length(conkey, 1) = 2
      and conkey @> array(select attnum from pg_catalog.pg_attribute
        where attrelid = 'public.sorting_hours'::regclass and attname in ('sorting_date', 'department'))
  loop
    execute format('alter table public.sorting_hours drop constraint %I', previous_constraint.conname);
  end loop;
end $sorting_operations$;

create index if not exists sorting_hours_date_department_idx on public.sorting_hours(sorting_date, department);
commit;
