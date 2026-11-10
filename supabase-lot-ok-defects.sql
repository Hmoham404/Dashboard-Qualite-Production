-- Allow optional defects on OK lots. Existing lots and reports are preserved.
-- Apply once to an existing installation, then refresh the LOT page.
begin;

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

commit;
