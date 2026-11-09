import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { buildAnomalyReport } from '../src/anomalyReports.js';

// PGlite supplies gen_random_uuid itself; pgcrypto installation is Supabase-specific.
// All data lives in memory. These tests never use the project's .env or Supabase.
const readSql = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')
  .replace('create extension if not exists pgcrypto;', '');
const install = readSql('supabase-install-complete.sql');
const enabled = { skip: !process.env.PGLITE_MODULE };
const expectedTables = ['customer_complaints', 'lot_inspections', 'machines', 'mod_assignments',
  'monthly_closures', 'product_references', 'production_entries', 'sorting_hours'];

async function database() {
  const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated;');
  return db;
}

test('complete SQL installs every module, allows app operations and preserves records and archives on reapply', enabled, async () => {
  const db = await database();
  try {
    await db.exec(install);
    const tables = await db.query("select tablename, rowsecurity from pg_catalog.pg_tables where schemaname='public' order by tablename");
    assert.deepEqual(tables.rows.map(({ tablename }) => tablename), expectedTables);
    assert.ok(tables.rows.every(({ rowsecurity }) => rowsecurity));
    await db.exec(`set role anon;
      insert into public.machines(code,label,department) values('INSTALL-M1','Machine test','Injection');
      insert into public.product_references(reference,designation) values('INSTALL-REF','Article test');
      insert into public.production_entries(production_date,department,good_qty,note,defect_breakdown)
        values('2025-01-10','Injection',100,'Note existante','[]');
      insert into public.customer_complaints(complaint_date,details) values('2025-01-10','Reclamation existante');
      insert into public.sorting_hours(sorting_date,department,hours,headcount,good_qty,scrap_qty)
        values('2025-01-10','Injection',3,2,90,10);
      insert into public.mod_assignments(shift_date,machine_code,operator_names) values('2025-01-10','INSTALL-M1','Operateur test');
    `);
    const lot = (await db.query(`insert into public.lot_inspections(inspection_date,department,work_order,
      product_reference,client_name,lot_number,lot_qty,sample_qty,decision,defect,corrective_action,inspector_name)
      values('2025-01-10','Injection','OF-INSTALL','INSTALL-REF','Client test','LOT-INSTALL',100,10,'NOK','Bavure','Tri','Qualite test') returning *`)).rows[0];
    const fields = { root_cause: 'Cause test', immediate_action: 'Isoler', immediate_effectiveness: 'Verifiee',
      corrective_action: 'Regler', corrective_effectiveness: 'Validee' };
    // PostgREST returns civil dates as strings; PGlite returns Date instances.
    const report = buildAnomalyReport({ ...lot, inspection_date: '2025-01-10' }, fields);
    await assert.rejects(db.query('update public.lot_inspections set anomaly_report=$1 where id=$2',
      [{ ...report, root_cause: '' }, lot.id]), /Rapport incomplet/);
    await db.query('update public.lot_inspections set anomaly_report=$1 where id=$2', [report, lot.id]);
    await assert.rejects(db.query('update public.lot_inspections set anomaly_report=null where id=$1', [lot.id]), /conservé/);
    const archive = (await db.query("select to_jsonb(public.close_production_month('2025-01-01')) as archive")).rows[0].archive;
    for (const rows of Object.values(archive.snapshot)) assert.equal(rows.length, 1);
    await assert.rejects(db.exec("update public.production_entries set good_qty=5 where production_date='2025-01-10'"), /Mois clôturé/);
    await assert.rejects(db.exec('delete from public.monthly_closures;'), /permission denied/);
    await db.exec('reset role;');
    await db.exec(install);
    await db.exec('set role anon;');
    for (const table of expectedTables) assert.equal((await db.query(`select count(*)::int as n from public.${table}`)).rows[0].n, 1, table);
    assert.deepEqual((await db.query('select anomaly_report from public.lot_inspections')).rows[0].anomaly_report, report);
    assert.deepEqual((await db.query('select to_jsonb(c) as archive from public.monthly_closures c')).rows[0].archive, archive);
    // Reapplication must preserve the database lock, not merely the archived rows.
    await assert.rejects(db.exec("insert into public.production_entries(production_date,department) values('2025-01-11','Injection')"), /Mois clôturé/);
  } finally { await db.close(); }
});

test('complete SQL upgrades an existing project without policy collisions or loss of legacy data', enabled, async () => {
  const db = await database();
  try {
    await db.exec(readSql('supabase-schema.sql'));
    await db.exec(readSql('supabase-lot-inspections.sql'));
    await db.exec(`alter table public.production_entries drop column defect_breakdown;
      alter table public.sorting_hours drop column headcount;
      alter table public.lot_inspections drop column anomaly_report;
      insert into public.production_entries(production_date,department,good_qty,note)
        values('2025-02-12','Injection',42,'REF_ARTICLE: LEGACY');
      insert into public.sorting_hours(sorting_date,department,hours) values('2025-02-12','Injection',4);
    `);
    await db.exec(install);
    await db.exec(install);
    const production = (await db.query('select good_qty,note,defect_breakdown from public.production_entries')).rows[0];
    assert.deepEqual(production, { good_qty: 42, note: 'REF_ARTICLE: LEGACY', defect_breakdown: [] });
    assert.equal((await db.query('select headcount from public.sorting_hours')).rows[0].headcount, null);
    await db.exec('set role authenticated;');
    assert.equal((await db.query('select count(*)::int as n from public.production_entries')).rows[0].n, 1);
  } finally { await db.close(); }
});
