-- Allow blank anomaly report descriptions on an existing LOT installation. Preserves all data.
begin;
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
    -- Descriptions may be empty; keep the report shape and text types valid.
    if not coalesce(jsonb_typeof(new.anomaly_report->field_name) = 'string', false) then
      raise exception 'Champ du rapport invalide : %', field_name;
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists validate_lot_anomaly_report on public.lot_inspections;
create trigger validate_lot_anomaly_report before insert or update on public.lot_inspections
  for each row execute function public.validate_lot_anomaly_report();
commit;
