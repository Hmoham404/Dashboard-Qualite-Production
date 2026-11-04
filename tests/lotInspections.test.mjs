import assert from 'node:assert/strict';
import test from 'node:test';
import { loadLotInspections, lotInspectionPayload, lotStorageKey, lotTotals, lotTrend, readLocalLots, saveLotInspection, transferLocalLots, validateLotInspection } from '../src/lotInspections.js';

const form = { department: 'Injection', inspection_date: '2026-11-03', work_order: 'OF-1', product_reference: 'REF-1', client_name: 'Client A', lot_number: 'LOT-1', lot_qty: '100', sample_qty: '10', decision: 'OK', defect: '', corrective_action: '', inspector_name: 'Qualiticien A' };
const storage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test('sampling and NOK validation reject incomplete or inconsistent controls', () => {
  assert.deepEqual(validateLotInspection(form), []);
  for (const sample_qty of ['0', '101', '2.5', '']) assert.ok(validateLotInspection({ ...form, sample_qty }).length);
  for (const lot_qty of ['0', '-1', '1.5', '2147483648']) assert.ok(validateLotInspection({ ...form, lot_qty }).length);
  assert.ok(validateLotInspection({ ...form, inspection_date: '2026-02-30' }).includes('Date'));
  assert.ok(validateLotInspection({ ...form, decision: 'NOK' }).includes('Défaut'));
  assert.ok(validateLotInspection({ ...form, decision: 'NOK', defect: 'Rayure' }).includes('Action'));
  assert.ok(validateLotInspection({ ...form, inspector_name: ' ' }).includes('Nom du qualiticien'));
  for (const corrective_action of ['Tri', 'Rebut', 'Dérogation']) assert.deepEqual(validateLotInspection({ ...form, decision: 'NOK', defect: 'Rayure', corrective_action }), []);
});

test('an OK lot is fully conforming and a NOK lot is fully blocked, independently of its sample size', () => {
  const ok = lotInspectionPayload({ ...form, defect: 'Old defect', corrective_action: 'Tri' });
  const nok = lotInspectionPayload({ ...form, lot_number: 'LOT-2', lot_qty: '200', sample_qty: '5', decision: 'NOK', defect: 'Rayure', corrective_action: 'Dérogation' });
  assert.equal(ok.defect, null);
  assert.equal(ok.corrective_action, null);
  assert.deepEqual(lotTotals([ok, nok]), { controlled: 300, conforming: 100, blocked: 200 });
  const trend = lotTrend([ok, nok], '2026-11');
  assert.equal(trend.length, 30);
  assert.deepEqual(trend[2], { date: '2026-11-03', controlled: 300, conforming: 100, blocked: 200 });
  assert.deepEqual(trend[0], { date: '2026-11-01', controlled: 0, conforming: 0, blocked: 0 });
});

test('local save persists and edits a single control, and rejects duplicate lot identities', async () => {
  const local = storage();
  const row = lotInspectionPayload(form);
  await saveLotInspection(null, 'local', row, local);
  assert.equal(readLocalLots(local).length, 1);
  const edited = lotInspectionPayload({ ...form, decision: 'NOK', defect: 'Bavure', corrective_action: 'Tri' }, row);
  await saveLotInspection(null, 'local', edited, local);
  assert.equal(readLocalLots(local).length, 1);
  assert.equal(readLocalLots(local)[0].id, row.id);
  assert.equal(readLocalLots(local)[0].decision, 'NOK');
  await assert.rejects(saveLotInspection(null, 'local', lotInspectionPayload(form), local), /existe déjà/);
  local.setItem(lotStorageKey, 'invalid');
  await assert.rejects(loadLotInspections(null, local));
});

test('a missing Supabase table permits an explicit local mode; network errors never silently fall back', async () => {
  const local = storage();
  const client = (result) => ({ from: () => ({ select() { return this; }, order() { return this; }, range: async () => result }) });
  const missing = await loadLotInspections(client({ error: { code: 'PGRST205' } }), local);
  assert.equal(missing.mode, 'missing');
  await assert.rejects(loadLotInspections(client({ error: new Error('Network failed') }), local), /Network failed/);
  const row = lotInspectionPayload(form);
  await saveLotInspection(null, 'local', row, local);
  const remote = await loadLotInspections(client({ data: [], count: 0, error: null }), local);
  assert.equal(remote.mode, 'remote');
  assert.equal(remote.pending.length, 1);
  let uploaded;
  const uploader = { from: () => ({ upsert(rows) { uploaded = rows; return this; }, select: async () => ({ data: uploaded, error: null }) }) };
  await transferLocalLots(uploader, remote.pending, local);
  assert.equal(uploaded[0].id, row.id);
  assert.equal(readLocalLots(local).length, 0);
});
