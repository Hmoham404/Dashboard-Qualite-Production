import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

// Set PGLITE_MODULE to an installed @electric-sql/pglite/dist/index.js for an
// isolated PostgreSQL test. No connection to the configured Supabase is used.
test('the SQL migration archives atomically and protects every dated table', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated;');
    const schema = readFileSync(new URL('../supabase-schema.sql', import.meta.url), 'utf8')
      .replace('create extension if not exists pgcrypto;', '');
    await db.exec(schema);
    // Exercise migration from a deployment that has not yet added effectif.
    await db.exec('alter table public.sorting_hours drop column headcount;');
    const migration = readFileSync(new URL('../supabase-monthly-archives.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration); // Re-applying must preserve existing schema and rules.
    await db.exec(`
      grant usage on schema public to anon, authenticated;
      grant select, insert, update, delete on public.production_entries, public.sorting_hours,
        public.customer_complaints, public.mod_assignments to anon, authenticated;
      insert into public.production_entries(production_date, department, good_qty) values
        ('2025-10-31','Assemblage',100),('2025-11-01','Assemblage',200);
      insert into public.sorting_hours(sorting_date,department,hours,headcount) values
        ('2025-10-31','Assemblage',8,5);
      insert into public.customer_complaints(complaint_date,details) values ('2025-10-31','Test');
      insert into public.mod_assignments(shift_date,machine_code,operator_names) values ('2025-10-31','M1','A');
      set role anon;
    `);
    const close = async () => (await db.query("select to_jsonb(public.close_production_month('2025-10-01')) as archive")).rows[0].archive;
    const archive = await close();
    assert.equal(archive.month, '2025-10-01');
    for (const key of ['production_entries', 'sorting_hours', 'customer_complaints', 'mod_assignments']) {
      assert.equal(archive.snapshot[key].length, 1, key);
    }
    assert.equal(archive.snapshot.production_entries[0].good_qty, 100);
    assert.equal(archive.snapshot.sorting_hours[0].headcount, 5);
    assert.deepEqual(await close(), archive, 'Repeat closure returns the original immutable archive');

    const cases = [
      ['production_entries', 'production_date', "department='Assemblage'", "(production_date,department) values ('2025-10-15','Assemblage')"],
      ['sorting_hours', 'sorting_date', "department='Assemblage'", "(sorting_date,department) values ('2025-10-15','Assemblage')"],
      ['customer_complaints', 'complaint_date', "details='Test'", "(complaint_date,details) values ('2025-10-15','Test')"],
      ['mod_assignments', 'shift_date', "machine_code='M1'", "(shift_date,machine_code,operator_names) values ('2025-10-15','M1','A')"],
    ];
    for (const [table, dateKey, condition, insert] of cases) {
      await assert.rejects(db.query(`insert into public.${table} ${insert}`), /Mois clôturé/);
      try {
        const update = await db.query(`update public.${table} set ${dateKey}='2025-11-02' where ${dateKey}='2025-10-31' and ${condition} returning id`);
        assert.equal(update.rows.length, 0);
      } catch (error) { assert.match(error.message, /Mois clôturé/); }
      // A pre-existing SELECT-only RLS policy may hide rows from DELETE rather
      // than raise an error (sorting_hours). Both outcomes must preserve the row.
      try {
        const deletion = await db.query(`delete from public.${table} where ${dateKey}='2025-10-31' returning id`);
        assert.equal(deletion.rows.length, 0);
      } catch (error) { assert.match(error.message, /Mois clôturé/); }
      assert.equal((await db.query(`select count(*)::int as count from public.${table} where ${dateKey}='2025-10-31'`)).rows[0].count, 1);
    }
    await db.exec('reset role;');
    for (const [table, dateKey] of cases) {
      await assert.rejects(db.query(`update public.${table} set ${dateKey}='2025-11-02' where ${dateKey}='2025-10-31'`), /Mois clôturé/);
      await assert.rejects(db.query(`delete from public.${table} where ${dateKey}='2025-10-31'`), /Mois clôturé/);
    }
    await db.exec('set role anon;');
    await assert.rejects(db.query("update public.production_entries set production_date='2025-10-30' where production_date='2025-11-01'"), /Mois clôturé/);
    await db.query("insert into public.production_entries(production_date,department,good_qty) values ('2025-11-02','Assemblage',300)");
    assert.equal((await db.query('select count(*)::int as count from public.production_entries')).rows[0].count, 3);
    await assert.rejects(db.query("delete from public.monthly_closures where month='2025-10-01'"), /permission denied/);
    await assert.rejects(db.query("update public.monthly_closures set snapshot='{}'"), /permission denied/);
    await assert.rejects(db.query("insert into public.monthly_closures(month,snapshot) values('2025-09-01','{}')"), /permission denied/);
    await assert.rejects(db.query("select public.close_production_month(date_trunc('month', timezone('Africa/Lagos',now()))::date)"), /mois terminé/);
    await assert.rejects(db.query("select public.close_production_month('2025-10-15')"), /mois terminé/);
    assert.deepEqual(await close(), archive, 'November writes cannot alter the October snapshot');
  } finally {
    await db.close();
  }
});
