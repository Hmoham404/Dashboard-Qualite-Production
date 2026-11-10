import assert from 'node:assert/strict';
import test from 'node:test';
import { buildComplaintMonth, searchComplaints } from '../src/customerComplaints.js';

test('complaint calendar counts every record on a day and compares monthly totals without changing the source', () => {
  const rows = [
    { id: '1', date: '2026-11-09', details: 'KIKO : rayure' },
    { id: '2', date: '2026-11-09', details: 'Belloti : bavure' },
    { id: '3', date: '2026-11-09', details: 'KIKO : colis' },
    { id: '4', date: '2026-11-10', details: 'KIKO : trace' },
    { id: '5', date: '2026-10-01', details: 'Ancienne' },
    { id: '6', date: '2026-10-31', details: 'Autre ancienne' },
    { id: '7', date: '2026-12-01', details: 'Autre mois' },
  ];
  const original = structuredClone(rows);
  const result = buildComplaintMonth(rows, '2026-11');
  assert.equal(result.total, 4);
  assert.equal(result.daysAffected, 2);
  assert.equal(result.cells.find((cell) => cell?.date === '2026-11-09').count, 3, 'Several complaints are never reduced to a binary 1');
  assert.equal(result.previousTotal, 2);
  assert.equal(result.change, 2);
  assert.equal(result.changePercent, 100);
  assert.deepEqual(result.cells.slice(0, 6), Array(6).fill(null), 'Calendar starts on Monday; November 1, 2026 is Sunday');
  assert.equal(result.cells.length, 42);
  assert.equal(result.complaints[0].date, '2026-11-10');
  assert.deepEqual(rows, original);
});

test('calendar handles leap days, year boundaries, empty months and a zero comparison baseline', () => {
  const leap = buildComplaintMonth([{ id: 'leap', date: '2024-02-29', details: 'Valid' }, { id: 'invalid', date: '2024-02-30', details: 'Invalid' }], '2024-02');
  assert.equal(leap.total, 1);
  assert.equal(leap.cells.filter(Boolean).length, 29);
  assert.equal(leap.changePercent, null, 'A zero baseline is never shown as an invented percentage');
  const january = buildComplaintMonth([{ id: 'old', date: '2026-12-31', details: 'Old' }], '2027-01');
  assert.equal(january.previousMonth, '2026-12');
  assert.equal(january.previousTotal, 1);
  assert.equal(january.total, 0);
  assert.equal(january.changePercent, -100);
  assert.equal(january.cells.filter(Boolean).length, 31);
  assert.equal(buildComplaintMonth([], '2026-11').daysAffected, 0);
});

test('register search combines day selection with case, accent and multiline matching', () => {
  const rows = [{ id: '1', date: '2026-11-09', details: 'KIKO — Réclamation\nrayure miroir' },
    { id: '2', date: '2026-11-10', details: 'KIKO — Bavure' }];
  assert.deepEqual(searchComplaints(rows, { query: 'reclamation rayure' }).map((row) => row.id), ['1']);
  assert.equal(searchComplaints(rows, { query: 'kiko' }).length, 2);
  assert.equal(searchComplaints(rows, { date: '2026-11-09', query: 'bavure' }).length, 0);
  assert.deepEqual(searchComplaints(rows, { query: '09/11/2026' }).map((row) => row.id), ['1']);
  assert.equal(searchComplaints(rows, { date: '2026-11-10' }).length, 1);
});
