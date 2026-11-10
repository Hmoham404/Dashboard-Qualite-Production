import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { buildAnomalyReport } from '../src/anomalyReports.js';

const sql = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('OK defect migration upgrades the old rule, preserves reports, and survives all installation scripts', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; grant usage on schema public to anon,authenticated;');
    await db.exec(sql('supabase-lot-inspections.sql'));
    await db.exec(sql('supabase-lot-anomaly-reports.sql'));
    // Simulate the legacy constraint with an arbitrary generated name.
    await db.exec(`alter table public.lot_inspections drop constraint lot_inspections_decision_details_check;
      alter table public.lot_inspections add constraint lot_inspections_check7
        check ((decision='OK' and defect is null and corrective_action is null)
          or (decision='NOK' and btrim(coalesce(defect,''))<>'' and corrective_action in ('Tri','Rebut','Dérogation') and corrective_action is not null));`);
    const lot = (await db.query(`insert into public.lot_inspections(inspection_date,department,work_order,product_reference,client_name,lot_number,lot_qty,sample_qty,decision,defect,corrective_action,inspector_name)
      values('2026-11-10','Injection','OF-1','REF-1','Client A','LOT-1',100,10,'NOK','Rayure','Tri','QA') returning *`)).rows[0];
    const report = buildAnomalyReport(lot, { root_cause: 'Cause', immediate_action: 'Isoler', immediate_effectiveness: 'Verifiee', corrective_action: 'Regler', corrective_effectiveness: 'Validee' });
    await db.query('update public.lot_inspections set anomaly_report=$1::jsonb where id=$2', [JSON.stringify(report), lot.id]);
    await assert.rejects(db.exec("update public.lot_inspections set decision='OK',corrective_action=null"), /check constraint/);

    await db.exec(sql('supabase-lot-ok-defects.sql'));
    await db.exec('set role anon;');
    await db.exec("update public.lot_inspections set decision='OK',corrective_action=null");
    await assert.rejects(db.exec("update public.lot_inspections set corrective_action='Tri'"), /check constraint/);
    await assert.rejects(db.exec("update public.lot_inspections set decision='NOK',defect=''"), /check constraint/);
    await assert.rejects(db.exec('update public.lot_inspections set sample_qty=101'), /check constraint/);
    await db.exec('reset role;');

    for (const file of ['supabase-lot-ok-defects.sql', 'supabase-lot-inspections.sql', 'supabase-install-complete.sql', 'supabase-install-complete.sql']) {
      await db.exec(sql(file).replace('create extension if not exists pgcrypto;', ''));
      const saved = (await db.query('select * from public.lot_inspections')).rows;
      assert.equal(saved.length, 1);
      assert.equal(saved[0].id, lot.id);
      assert.equal(saved[0].decision, 'OK');
      assert.equal(saved[0].defect, 'Rayure');
      assert.equal(saved[0].anomaly_report.id, report.id);
      assert.equal(saved[0].lot_qty, 100);
    }
    await db.exec('set role authenticated;');
    await db.exec("update public.lot_inspections set defect='Bavure'");
    assert.equal((await db.query('select defect from public.lot_inspections')).rows[0].defect, 'Bavure');
  } finally { await db.close(); }
});
