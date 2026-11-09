import assert from 'node:assert/strict';
import test from 'node:test';
import { anomalyFields, buildAnomalyReport, saveAnomalyReport, validateAnomalyReport } from '../src/anomalyReports.js';
import { lotInspectionPayload, lotStorageKey, readLocalLots, saveLotInspection } from '../src/lotInspections.js';

export const reportFields = { root_cause: 'Réglage incorrect du moule.', immediate_action: 'Isoler le lot et trier les pièces.', immediate_effectiveness: 'Toutes les pièces du lot sont identifiées.', corrective_action: 'Corriger le réglage et mettre à jour la gamme.', corrective_effectiveness: 'Aucun défaut sur trois lots de validation.' };
const form = { department: 'Injection', inspection_date: '2026-11-04', work_order: 'OF-2026-19', product_reference: 'REF-42', client_name: 'Client Démonstration', lot_number: 'LOT-001', lot_qty: 200, sample_qty: 20, decision: 'NOK', defect: 'Rayures', corrective_action: 'Tri', inspector_name: 'Qualiticien A' };
const storage = () => { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };

test('reports require all five descriptions and snapshot the saved NOK lot context', () => {
  assert.equal(validateAnomalyReport({}).length, 5);
  assert.deepEqual(validateAnomalyReport(reportFields), []);
  for (const [key, label] of anomalyFields) assert.ok(validateAnomalyReport({ ...reportFields, [key]: ' ' }).includes(label));
  const lot = lotInspectionPayload(form);
  const report = buildAnomalyReport(lot, reportFields);
  assert.equal(report.lot_id, lot.id);
  assert.equal(report.context.product_reference, form.product_reference);
  assert.equal(report.context.client_name, form.client_name);
  assert.equal(report.context.work_order, form.work_order);
  const edited = buildAnomalyReport({ ...lot, client_name: 'Changed', anomaly_report: report }, { ...reportFields, root_cause: 'Cause précisée.' });
  assert.equal(edited.id, report.id);
  assert.equal(edited.created_at, report.created_at);
  assert.equal(edited.context.client_name, form.client_name, 'Saved report context is a historical snapshot');
});

test('local report survives reload and subsequent OK validation without changing quantities', async () => {
  const local = storage();
  const lot = await saveLotInspection(null, 'local', lotInspectionPayload(form), local);
  const saved = await saveAnomalyReport(null, 'local', lot, reportFields, local);
  assert.equal(readLocalLots(local)[0].anomaly_report.root_cause, reportFields.root_cause);
  assert.equal(saved.lot_qty, 200);
  assert.equal(saved.decision, 'NOK');
  const released = lotInspectionPayload({ ...form, decision: 'OK' }, saved);
  await saveLotInspection(null, 'local', released, local);
  assert.equal(readLocalLots(local)[0].anomaly_report.id, saved.anomaly_report.id);
  assert.equal(readLocalLots(local)[0].anomaly_report.context.defect, 'Rayures');
  const ok = { ...form, id: 'new-ok', decision: 'OK', anomaly_report: null };
  await assert.rejects(saveAnomalyReport(null, 'local', ok, reportFields, local), /NOK/);
  const before = local.getItem(lotStorageKey);
  await assert.rejects(saveAnomalyReport(null, 'local', { ...released, updated_at: 'stale' }, reportFields, local), /modifié/);
  assert.equal(local.getItem(lotStorageKey), before);
});

test('shared report updates only report fields and timestamps, and explains a missing migration', async () => {
  const lot = lotInspectionPayload(form);
  const filters = [];
  let patch;
  const client = { from(table) { assert.equal(table, 'lot_inspections'); return {
    update(value) { patch = value; return this; }, eq(key, value) { filters.push([key, value]); return this; }, select() { return this; },
    single: async () => ({ data: { ...lot, ...patch }, error: null }),
  }; } };
  const result = await saveAnomalyReport(client, 'remote', lot, reportFields, storage());
  assert.deepEqual(Object.keys(patch).sort(), ['anomaly_report', 'updated_at']);
  assert.deepEqual(filters, [['id', lot.id], ['updated_at', lot.updated_at]]);
  assert.equal(result.lot_qty, lot.lot_qty);
  const missing = { from: () => ({ update() { return this; }, eq() { return this; }, select() { return this; }, single: async () => ({ error: { code: 'PGRST204', message: 'Missing anomaly_report column' } }) }) };
  await assert.rejects(saveAnomalyReport(missing, 'remote', lot, reportFields, storage()), /supabase-lot-anomaly-reports.sql/);
});
