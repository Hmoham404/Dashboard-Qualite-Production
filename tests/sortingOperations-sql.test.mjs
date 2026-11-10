import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const sql = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace('create extension if not exists pgcrypto;', '');
test('sorting migration preserves old entries and closed archives, permits repeated client operations and survives reinstall', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated;');
    await db.exec(sql('supabase-install-complete.sql'));
    await db.exec(`alter table public.sorting_hours drop column client_name, drop column product_reference, drop column lot_number;
      alter table public.sorting_hours add constraint legacy_daily_sorting unique(sorting_date,department);
      insert into public.sorting_hours(sorting_date,department,hours,headcount,good_qty,scrap_qty) values
        ('2025-01-09','Assemblage',7,null,100,2), ('2025-02-09','Assemblage',7,null,100,2);`);
    await assert.rejects(db.exec("insert into public.sorting_hours(sorting_date,department,hours) values('2025-02-09','Assemblage',2)"), /unique/);
    const archive = (await db.query("select to_jsonb(public.close_production_month('2025-01-01')) as archive")).rows[0].archive;
    const legacy = (await db.query("select * from public.sorting_hours where sorting_date='2025-02-09'")).rows[0];
    await db.exec(sql('supabase-sorting-operations.sql'));
    await db.exec('set role anon;');
    const insert = (client, hours) => db.query(`insert into public.sorting_hours(sorting_date,department,client_name,product_reference,lot_number,hours,headcount,good_qty,scrap_qty)
      values('2025-02-09','Assemblage',$1,'REF-1','LOT-1',$2,2,100,5) returning id`, [client, hours]);
    const first = (await insert('KIKO', 2)).rows[0];
    await insert('Belloti', 3); await insert('KIKO', 1);
    assert.equal((await db.query("select sum(hours)::float as hours from public.sorting_hours where sorting_date='2025-02-09'")).rows[0].hours, 13);
    await db.query('update public.sorting_hours set hours=4 where id=$1', [first.id]);
    await assert.rejects(db.exec("insert into public.sorting_hours(sorting_date,department,hours) values('2025-01-10','Assemblage',1)"), /Mois clôturé/);
    await assert.rejects(db.query("update public.sorting_hours set sorting_date='2025-01-10' where id=$1", [first.id]), /Mois clôturé/);
    await assert.rejects(insert('KIKO', -1), /check constraint/);
    await db.exec('reset role;');
    for (const file of ['supabase-sorting-operations.sql', 'supabase-sorting-hours.sql', 'supabase-install-complete.sql', 'supabase-install-complete.sql']) {
      await db.exec(sql(file));
      assert.equal((await db.query("select count(*)::int as n from public.sorting_hours where sorting_date='2025-02-09'")).rows[0].n, 4);
      const saved = (await db.query('select * from public.sorting_hours where id=$1', [legacy.id])).rows[0];
      assert.equal(saved.hours, legacy.hours);
      assert.equal(saved.headcount, null);
      assert.equal(saved.client_name, null);
      assert.equal(saved.good_qty, 100);
      assert.deepEqual((await db.query('select to_jsonb(c) as archive from public.monthly_closures c')).rows[0].archive, archive);
    }
    const february = (await db.query("select to_jsonb(public.close_production_month('2025-02-01')) as archive")).rows[0].archive;
    assert.equal(february.snapshot.sorting_hours.length, 4);
    assert.equal(february.snapshot.sorting_hours.filter((row) => row.client_name === 'KIKO').length, 2);
    await assert.rejects(db.query('update public.sorting_hours set hours=5 where id=$1', [first.id]), /Mois clôturé/);
  } finally { await db.close(); }
});
