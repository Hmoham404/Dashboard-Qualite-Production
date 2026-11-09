import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { buildAnomalyReport } from '../src/anomalyReports.js';

test('SQL validates report completeness, lot linkage and NOK creation, then retains reports after OK', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; grant usage on schema public to anon,authenticated;');
    await db.exec(readFileSync(new URL('../supabase-lot-inspections.sql', import.meta.url), 'utf8'));
    const migration = readFileSync(new URL('../supabase-lot-anomaly-reports.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec('set role anon;');
    const lot = (await db.query(`insert into public.lot_inspections(inspection_date,department,work_order,product_reference,client_name,lot_number,lot_qty,sample_qty,decision,defect,corrective_action,inspector_name)
      values('2026-11-04','Injection','OF-1','REF-1','Client A','LOT-1',200,20,'NOK','Bavure','Tri','Qualiticien A') returning *`)).rows[0];
    const fields = { root_cause: 'Cause', immediate_action: 'Action', immediate_effectiveness: 'Efficace', corrective_action: 'Correction', corrective_effectiveness: 'Vérifiée' };
    const report = buildAnomalyReport(lot, fields);
    const update = (value) => db.query('update public.lot_inspections set anomaly_report=$1::jsonb where id=$2', [JSON.stringify(value), lot.id]);
    await assert.rejects(update({ ...report, root_cause: '' }), /Rapport incomplet/);
    await assert.rejects(update({ ...report, lot_id: 'wrong' }), /Rapport d’anomalie invalide/);
    await db.query('update public.lot_inspections set decision=\'OK\',defect=null,corrective_action=null where id=$1', [lot.id]);
    await assert.rejects(update(report), /NOK/);
    await db.query('update public.lot_inspections set decision=\'NOK\',defect=\'Bavure\',corrective_action=\'Tri\' where id=$1', [lot.id]);
    await update(report);
    await db.query('update public.lot_inspections set decision=\'OK\',defect=null,corrective_action=null where id=$1', [lot.id]);
    assert.equal((await db.query('select anomaly_report from public.lot_inspections where id=$1', [lot.id])).rows[0].anomaly_report.id, report.id);
    await assert.rejects(db.query('update public.lot_inspections set anomaly_report=null where id=$1', [lot.id]), /conservé/);
    const importedId = globalThis.crypto.randomUUID();
    const importedReport = { ...report, lot_id: importedId };
    await db.query(`insert into public.lot_inspections(id,inspection_date,department,work_order,product_reference,client_name,lot_number,lot_qty,sample_qty,decision,inspector_name,anomaly_report)
      values($1,'2026-11-04','Injection','OF-2','REF-1','Client A','LOT-2',200,20,'OK','Qualiticien A',$2::jsonb)`, [importedId, JSON.stringify(importedReport)]);
    await db.exec('reset role;');
    await db.exec(migration);
    assert.equal((await db.query('select count(*)::int as count from public.lot_inspections')).rows[0].count, 2);
  } finally { await db.close(); }
});
