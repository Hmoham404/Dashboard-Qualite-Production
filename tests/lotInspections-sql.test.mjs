import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

test('LOT SQL migration preserves data on reapply and enforces sampling, NOK actions and lot uniqueness', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; grant usage on schema public to anon,authenticated;');
    const sql = readFileSync(new URL('../supabase-lot-inspections.sql', import.meta.url), 'utf8');
    await db.exec(sql);
    const insert = async (lot, qty, sample, decision, defect, action) => db.query(`
      insert into public.lot_inspections(inspection_date,department,work_order,product_reference,client_name,lot_number,lot_qty,sample_qty,decision,defect,corrective_action,inspector_name)
      values('2026-11-03','Injection','OF-1','REF-1','Client A',$1,$2,$3,$4,$5,$6,'Qualiticien A') returning *`, [lot, qty, sample, decision, defect, action]);
    await db.exec('set role anon;');
    await insert('LOT-1', 100, 10, 'OK', null, null);
    await insert('LOT-2', 200, 20, 'NOK', 'Bavure', 'Tri');
    await assert.rejects(insert('LOT-1', 100, 10, 'OK', null, null), /unique/);
    await assert.rejects(insert('BAD-SAMPLE', 10, 11, 'OK', null, null), /check constraint/);
    await assert.rejects(insert('BAD-NOK', 10, 1, 'NOK', 'Bavure', null), /check constraint/);
    await assert.rejects(insert('BAD-DEFECT', 10, 1, 'NOK', '', 'Tri'), /check constraint/);
    await assert.rejects(insert('BAD-OK', 10, 1, 'OK', 'Bavure', 'Tri'), /check constraint/);
    await db.exec("update public.lot_inspections set corrective_action='Dérogation' where lot_number='LOT-2';");
    await assert.rejects(db.exec('delete from public.lot_inspections;'), /permission denied/);
    await db.exec('reset role;');
    await db.exec(sql);
    assert.equal((await db.query('select count(*)::int as count from public.lot_inspections')).rows[0].count, 2);
    assert.equal((await db.query("select corrective_action from public.lot_inspections where lot_number='LOT-2'")).rows[0].corrective_action, 'Dérogation');
  } finally { await db.close(); }
});
