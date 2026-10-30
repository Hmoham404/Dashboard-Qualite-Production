import assert from 'node:assert/strict';
import test from 'node:test';
import { localDateKey, monthBounds, monthDates, rowsForMonth, entryDateForMonth, buildMonthSnapshot, isMonthClosed, assertLocalMonthsOpen, readAllRows } from '../src/monthly.js';

test('October remains available when November begins, including month and year boundaries', () => {
  const records = [{ id: 'oct', production_date: '2026-10-31' }, { id: 'nov', production_date: '2026-11-01' }];
  assert.deepEqual(rowsForMonth(records, '2026-10').map((row) => row.id), ['oct']);
  assert.deepEqual(rowsForMonth(records, '2026-11').map((row) => row.id), ['nov']);
  assert.equal(records.length, 2);
  assert.equal(monthDates('2026-10').length, 31);
  assert.equal(monthDates('2026-11').length, 30);
  assert.equal(monthDates('2028-02').length, 29);
  assert.equal(monthDates('2027-02').length, 28);
  assert.deepEqual(monthBounds('2026-12'), { from: '2026-12-01', to: '2026-12-31' });
  assert.equal(entryDateForMonth('2027-01', '2027-01-01'), '2027-01-01');
  assert.equal(entryDateForMonth('2026-10', '2026-11-01'), '2026-10-01');
  assert.throws(() => monthBounds('2026-13'));
});

test('civil dates do not shift back one day at local midnight in Lagos', () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = 'Africa/Lagos';
    assert.equal(localDateKey(new Date(2026, 10, 1, 0, 0)), '2026-11-01');
  } finally {
    if (original == null) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('the monthly archive includes every data type and preserves unknown versus zero headcount', () => {
  const snapshot = buildMonthSnapshot('2026-10', {
    production: [{ production_date: '2026-10-31', good_qty: 50 }, { production_date: '2026-11-01' }],
    sorting: [{ sorting_date: '2026-10-01', headcount: null }, { sorting_date: '2026-10-31', headcount: 0 }, { sorting_date: '2026-11-01', headcount: 3 }],
    complaints: [{ complaint_date: '2026-10-02', details: 'A' }],
    assignments: [{ shift_date: '2026-10-03', operator_names: 'B' }],
  });
  assert.equal(snapshot.production_entries.length, 1);
  assert.deepEqual(snapshot.sorting_hours.map((row) => row.headcount), [null, 0]);
  assert.equal(snapshot.customer_complaints.length, 1);
  assert.equal(snapshot.mod_assignments.length, 1);
});

test('closed months reject insert, delete and date moves from a closed month; the next month stays writable', () => {
  const closures = [{ month: '2026-10-01' }];
  assert.equal(isMonthClosed(closures, '2026-10-31'), true);
  assert.throws(() => assertLocalMonthsOpen(closures, ['2026-10-15']));
  assert.throws(() => assertLocalMonthsOpen(closures, ['2026-11-01', '2026-10-31']));
  assert.doesNotThrow(() => assertLocalMonthsOpen(closures, ['2026-11-01']));
});

test('pagination retains old October records beyond the server row cap', async () => {
  const source = Array.from({ length: 1203 }, (_, index) => ({ id: index, production_date: index < 800 ? '2026-10-31' : '2026-11-01' }));
  const ranges = [];
  const client = { from: () => ({ select: () => {
    const query = { order: () => query, range: async (from, to) => {
      ranges.push([from, to]);
      return { data: source.slice(from, Math.min(to + 1, from + 200)), count: source.length, error: null };
    } };
    return query;
  } }) };
  const rows = await readAllRows(client, 'production_entries');
  assert.equal(rows.length, 1203);
  assert.equal(rowsForMonth(rows, '2026-10').length, 800);
  assert.equal(ranges.length, 7);
});

test('a failed page or premature empty page cannot be mistaken for an empty month', async () => {
  for (const response of [{ error: new Error('offline') }, { data: [], count: 2, error: null }]) {
    const client = { from: () => ({ select: () => { const query = { order: () => query, range: async () => response }; return query; } }) };
    await assert.rejects(readAllRows(client, 'production_entries'));
  }
});
