import { lotStorageKey, readLocalLots } from './lotInspections.js';

export const anomalyFields = [
  ['root_cause', 'Cause racine'],
  ['immediate_action', 'Action immédiate'],
  ['immediate_effectiveness', 'Efficacité de l’action immédiate'],
  ['corrective_action', 'Action corrective'],
  ['corrective_effectiveness', 'Efficacité de l’action corrective'],
];

export function validateAnomalyReport(fields) {
  return anomalyFields.filter(([key]) => !String(fields[key] || '').trim()).map(([, label]) => label);
}

export function buildAnomalyReport(lot, fields, previous = lot.anomaly_report) {
  const contextFields = ['product_reference', 'work_order', 'inspection_date', 'department', 'client_name', 'lot_number', 'lot_qty', 'sample_qty', 'inspector_name', 'defect', 'decision'];
  return {
    version: 1, id: previous?.id || globalThis.crypto.randomUUID(), lot_id: lot.id,
    context: previous?.context || Object.fromEntries(contextFields.map((key) => [key, lot[key] ?? ''])),
    ...Object.fromEntries(anomalyFields.map(([key]) => [key, String(fields[key] || '').trim()])),
    created_at: previous?.created_at || new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

export function anomalyReportNumber(report) {
  return `RA-${report.context.inspection_date.replaceAll('-', '')}-${report.id.slice(0, 8).toUpperCase()}`;
}

export const anomalyMigrationMessage = 'Pour enregistrer les rapports dans Supabase, exécutez supabase-lot-anomaly-reports.sql, puis actualisez.';

export function reportStorageError(error) {
  if (['42703', 'PGRST204'].includes(error.code) && String(error.message).includes('anomaly_report')) return new Error(anomalyMigrationMessage);
  if (error.code === 'PGRST116') return new Error('Le contrôle a été modifié. Actualisez avant d’enregistrer le rapport.');
  return error;
}

export async function saveAnomalyReport(client, mode, lot, fields, storage) {
  if (validateAnomalyReport(fields).length) throw new Error('Complétez les cinq descriptions du rapport.');
  if (lot.decision !== 'NOK' && !lot.anomaly_report) throw new Error('Un nouveau rapport nécessite un lot NOK enregistré.');
  const report = buildAnomalyReport(lot, fields);
  if (mode === 'remote') {
    let query = client.from('lot_inspections').update({ anomaly_report: report, updated_at: report.updated_at }).eq('id', lot.id);
    if (lot.updated_at) query = query.eq('updated_at', lot.updated_at);
    const { data, error } = await query.select().single();
    if (error) throw reportStorageError(error);
    if (!data?.anomaly_report) throw new Error('Enregistrement du rapport impossible.');
    return data;
  }
  if (!['local', 'missing'].includes(mode)) throw new Error('Chargement impossible');
  const rows = readLocalLots(storage);
  const current = rows.find((row) => row.id === lot.id);
  if (!current) throw new Error('Le lot doit être enregistré avant son rapport.');
  if (current.updated_at !== lot.updated_at) throw new Error('Le contrôle a été modifié. Actualisez avant d’enregistrer le rapport.');
  const saved = { ...current, anomaly_report: report, updated_at: report.updated_at };
  storage.setItem(lotStorageKey, JSON.stringify(rows.map((row) => row.id === lot.id ? saved : row)));
  return saved;
}
