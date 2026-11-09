import { monthDates, readAllRows } from './monthly.js';

export const lotStorageKey = 'quality_lot_inspections_v1';
export const lotActions = ['Tri', 'Rebut', 'Dérogation'];
const lotDepartments = ['Injection', 'Metallisation', 'Assemblage', 'Serigraphie', 'Soudure'];

export function validateLotInspection(row) {
  const errors = [];
  if (!lotDepartments.includes(row.department)) errors.push('Departement');
  if (!row.work_order?.trim()) errors.push('OF / Bon');
  if (!row.product_reference?.trim()) errors.push('Reference produit');
  if (!row.client_name?.trim()) errors.push('Client');
  const date = String(row.inspection_date || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date) || !monthDates(date.slice(0, 7)).includes(date)) errors.push('Date');
  if (!row.lot_number?.trim()) errors.push('Numéro de lot');
  const quantity = Number(row.lot_qty);
  const sample = Number(row.sample_qty);
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 2147483647) errors.push('La quantité du lot doit être un entier supérieur à zéro.');
  if (!Number.isInteger(sample) || sample <= 0 || sample > quantity) errors.push('L’échantillonnage doit être compris entre 1 et la quantité du lot.');
  if (!['OK', 'NOK'].includes(row.decision)) errors.push('Décision');
  if (row.decision === 'NOK' && !row.defect?.trim()) errors.push('Défaut');
  if (row.decision === 'NOK' && !lotActions.includes(row.corrective_action)) errors.push('Action');
  if (!row.inspector_name?.trim()) errors.push('Nom du qualiticien');
  return errors;
}

export function lotInspectionPayload(form, existing = null) {
  const payload = Object.fromEntries(['inspection_date', 'department', 'work_order', 'product_reference', 'client_name', 'lot_number', 'inspector_name'].map((field) => [field, String(form[field] || '').trim()]));
  return { ...payload, id: existing?.id || globalThis.crypto.randomUUID(), lot_qty: Number(form.lot_qty), sample_qty: Number(form.sample_qty),
    decision: form.decision, defect: form.decision === 'NOK' ? form.defect.trim() : null,
    corrective_action: form.decision === 'NOK' ? form.corrective_action : null,
    created_at: existing?.created_at || new Date().toISOString(), updated_at: new Date().toISOString(),
    ...(existing?.anomaly_report ? { anomaly_report: existing.anomaly_report } : {}) };
}

export function sameLot(a, b) {
  return ['department', 'work_order', 'product_reference', 'client_name', 'lot_number'].every((field) => String(a[field] || '').trim() === String(b[field] || '').trim());
}

export function lotTotals(rows) {
  return rows.reduce((totals, row) => {
    const quantity = Number(row.lot_qty) || 0;
    totals.controlled += quantity;
    if (row.decision === 'OK') totals.conforming += quantity;
    if (row.decision === 'NOK') totals.blocked += quantity;
    return totals;
  }, { controlled: 0, conforming: 0, blocked: 0 });
}

export function lotDailySummary(rows, date, department) {
  const daily = rows.filter((row) => row.inspection_date === date && row.department === department);
  return {
    lots: {
      controlled: daily.length,
      conforming: daily.filter((row) => row.decision === 'OK').length,
      blocked: daily.filter((row) => row.decision === 'NOK').length,
    },
    quantities: lotTotals(daily),
  };
}

export function lotTrend(rows, month) {
  const daily = new Map();
  for (const row of rows) {
    const items = daily.get(row.inspection_date) || [];
    items.push(row);
    daily.set(row.inspection_date, items);
  }
  return monthDates(month).map((date) => ({ date, ...lotTotals(daily.get(date) || []) }));
}

export function readLocalLots(storage) {
  const raw = storage.getItem(lotStorageKey);
  if (!raw) return [];
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows) || rows.some((row) => !row?.id || validateLotInspection(row).length)) throw new Error('Les données LOT locales sont illisibles.');
  return rows;
}

export async function loadLotInspections(client, storage) {
  if (!client) return { mode: 'local', rows: readLocalLots(storage), pending: [] };
  try {
    const rows = await readAllRows(client, 'lot_inspections', { orderBy: 'inspection_date' });
    let local = [];
    let localError = '';
    try { local = readLocalLots(storage); } catch { localError = 'Les données LOT locales sont illisibles.'; }
    return { mode: 'remote', rows, pending: local.filter((row) => !rows.some((saved) => saved.id === row.id)), localError };
  } catch (error) {
    if (['PGRST205', '42P01'].includes(error.code)) return { mode: 'missing', rows: readLocalLots(storage), pending: [] };
    throw error;
  }
}

export async function saveLotInspection(client, mode, row, storage) {
  if (mode === 'remote') {
    const { data, error } = await client.from('lot_inspections').upsert(row, { onConflict: 'id' }).select().single();
    if (error) throw error;
    return data;
  }
  const rows = readLocalLots(storage);
  if (rows.some((item) => item.id !== row.id && sameLot(item, row))) throw new Error('Ce lot existe déjà pour cet OF et cette référence. Modifiez le contrôle existant.');
  storage.setItem(lotStorageKey, JSON.stringify([row, ...rows.filter((item) => item.id !== row.id)]));
  return row;
}

export async function transferLocalLots(client, rows, storage) {
  if (!rows.length) return [];
  const { data, error } = await client.from('lot_inspections').upsert(rows, { onConflict: 'id' }).select();
  if (error) throw error;
  const ids = new Set((data || []).map((row) => row.id));
  if (ids.size !== rows.length) throw new Error('Transfert incomplet. Actualisez les contrôles.');
  storage.setItem(lotStorageKey, JSON.stringify(readLocalLots(storage).filter((row) => !ids.has(row.id))));
  return data;
}
