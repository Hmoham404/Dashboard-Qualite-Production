import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSortingMonth, newSortingOperation, saveSortingOperation, sortingClientId, validateSortingOperation } from '../src/sortingOperations.js';

const operation = (fields = {}) => ({ ...newSortingOperation('2026-11-09', 'Assemblage'), client_name: 'KIKO', product_reference: 'REF-1', lot_number: 'LOT-1', hours: '2', headcount: '3', good_qty: '100', scrap_qty: '5', ...fields });

test('multiple sorting operations aggregate by client and day, with a monthly cumulative curve and separate person-hours', () => {
  const rows = [operation(), operation({ client_name: 'Belloti', hours: '3', headcount: 2 }), operation({ client_name: 'kiko', hours: '1', headcount: 1 }),
    operation({ sorting_date: '2026-11-10', hours: '0.1', headcount: 0 }), operation({ sorting_date: '2026-10-09', hours: 999 }), operation({ department: 'Injection', hours: 12 })];
  const result = buildSortingMonth(rows, '2026-11', { department: 'Assemblage' });
  assert.equal(result.data.length, 30);
  assert.equal(result.operations.length, 4);
  assert.equal(result.totalHours, 6.1);
  assert.equal(result.personHours, 13);
  assert.equal(result.data[8].total, 6);
  assert.equal(result.data[9].cumulative, 6.1);
  assert.equal(result.data[29].cumulative, 6.1);
  assert.equal(result.data[0].total, 0);
  const kiko = result.series.find((item) => item.name === 'KIKO');
  assert.equal(result.data[8][kiko.key], 3);
  assert.equal(result.options.length, 2);
  assert.equal(buildSortingMonth(rows, '2026-11', { department: 'Assemblage', client: sortingClientId('Kiko') }).totalHours, 3.1);
});

test('legacy rows stay unassigned and unknown staff never becomes zero or an additive daily headcount', () => {
  const rows = [operation({ client_name: null, headcount: null }), operation({ client_name: 'unassigned', headcount: 0 }), operation({ headcount: 3 })];
  const result = buildSortingMonth(rows, '2026-11');
  assert.equal(result.totalHours, 6);
  assert.equal(result.personHours, 6);
  assert.equal(result.unknownHeadcount, 1);
  assert.equal(buildSortingMonth(rows, '2026-11', { client: 'unassigned' }).operations.length, 1);
  assert.equal(buildSortingMonth(rows, '2026-11', { client: sortingClientId('unassigned') }).operations.length, 1);
  assert.ok(!Object.hasOwn(result.data[8], 'headcount'));
  const empty = buildSortingMonth(rows, '2026-10');
  assert.equal(empty.totalHours, 0);
  assert.deepEqual(empty.series, []);
});

test('sorting validation checks real dates, required new clients and quantities, while allowing historical unknown fields', () => {
  assert.deepEqual(validateSortingOperation(operation()), []);
  assert.ok(validateSortingOperation(operation({ client_name: ' ' })).includes('Client'));
  for (const hours of ['', '-1', 'Infinity', '1.234', '1000000']) assert.ok(validateSortingOperation(operation({ hours })).length);
  assert.deepEqual(validateSortingOperation(operation({ hours: '2,25' })), []);
  for (const field of ['headcount', 'good_qty', 'scrap_qty']) {
    for (const value of ['', '-1', '1.5', '2147483648']) assert.ok(validateSortingOperation(operation({ [field]: value })).length);
  }
  assert.ok(validateSortingOperation(operation({ sorting_date: '2026-02-30' })).includes('Date'));
  const legacy = operation({ client_name: null, headcount: null });
  assert.deepEqual(validateSortingOperation(legacy, legacy), []);
});

test('saving retries and edits use the operation UUID rather than replacing the daily departmental total', async () => {
  const form = operation();
  const calls = [];
  const client = { from(table) { assert.equal(table, 'sorting_hours'); return { upsert(payload, options) { calls.push({ payload, options }); return this; }, select() { return this; }, single: async () => ({ data: calls.at(-1).payload }) }; } };
  await saveSortingOperation(client, form);
  await saveSortingOperation(client, { ...form, hours: '3' }, form);
  assert.equal(calls[0].payload.id, calls[1].payload.id);
  assert.equal(calls[1].payload.created_at, form.created_at);
  assert.deepEqual(calls[0].options, { onConflict: 'id' });
  assert.equal(calls[0].payload.client_name, 'KIKO');
  assert.equal(calls[1].payload.hours, 3);
  const failing = (error) => ({ from: () => ({ upsert() { return this; }, select() { return this; }, single: async () => ({ error }) }) });
  await assert.rejects(saveSortingOperation(failing({ code: 'PGRST204', message: 'client_name missing' }), form), /supabase-sorting-operations.sql/);
  await assert.rejects(saveSortingOperation(failing({ code: '23505', message: 'sorting_hours_sorting_date_department_key' }), form), /supabase-sorting-operations.sql/);
  await assert.rejects(saveSortingOperation(failing(new Error('Network failed')), form), /Network failed/);
});
