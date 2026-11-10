import { monthDates } from './monthly.js';
import { productionClientKey, productionClientName, productionClients } from './productionFilters.js';

export const sortingDepartments = ['Injection', 'Metallisation', 'Assemblage', 'Serigraphie', 'Soudure'];
export const sortingMigrationMessage = 'Pour enregistrer plusieurs tris par jour et par client, exécutez supabase-sorting-operations.sql dans Supabase, puis actualisez.';
const number = (value) => Number(String(value ?? '').replace(',', '.'));
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function sortingClientId(name) {
  const key = productionClientKey(name || '');
  return key ? `client:${key}` : 'unassigned';
}

export function newSortingOperation(date, department, context = {}) {
  return { id: globalThis.crypto.randomUUID(), created_at: new Date().toISOString(), sorting_date: date, department,
    client_name: '', product_reference: '', lot_number: '', hours: '', headcount: '', good_qty: '', scrap_qty: '', ...context };
}

export function validateSortingOperation(form, existing = null) {
  const errors = [];
  const date = String(form.sorting_date || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date) || !monthDates(date.slice(0, 7)).includes(date)) errors.push('Date');
  if (!sortingDepartments.includes(form.department)) errors.push('Departement');
  if (!productionClientName(form) && (!existing || productionClientName(existing))) errors.push('Client');
  const hours = number(form.hours);
  if (String(form.hours ?? '').trim() === '' || !Number.isFinite(hours) || hours < 0 || hours > 999999.99 || Math.abs(hours * 100 - Math.round(hours * 100)) > 0.000001) errors.push('Durée du tri (h)');
  for (const [key, label] of [['headcount', 'Effectif'], ['good_qty', 'Qte bonne après tri'], ['scrap_qty', 'Qte rebut après tri']]) {
    if (key === 'headcount' && existing?.headcount == null && String(form[key] ?? '').trim() === '' && existing) continue;
    const value = number(form[key]);
    if (String(form[key] ?? '').trim() === '' || !Number.isInteger(value) || value < 0 || value > 2147483647) errors.push(label);
  }
  return errors;
}

export function sortingOperationPayload(form) {
  return { id: form.id, ...(form.created_at ? { created_at: form.created_at } : {}), sorting_date: form.sorting_date, department: form.department,
    client_name: productionClientName(form) || null,
    product_reference: String(form.product_reference || '').trim() || null,
    lot_number: String(form.lot_number || '').trim() || null,
    hours: number(form.hours), headcount: String(form.headcount ?? '').trim() === '' ? null : number(form.headcount),
    good_qty: number(form.good_qty), scrap_qty: number(form.scrap_qty) };
}

export async function saveSortingOperation(client, form, existing = null) {
  if (validateSortingOperation(form, existing).length) throw new Error('Vérifiez les champs du tri.');
  if (!client) throw new Error('Configurez Supabase pour enregistrer les heures de tri en ligne.');
  // A stable UUID prevents an uncertain network retry from creating a second operation.
  const { data, error } = await client.from('sorting_hours').upsert(sortingOperationPayload(form), { onConflict: 'id' }).select().single();
  if (error) {
    if (['42703', 'PGRST204'].includes(error.code) || (error.code === '23505' && /sorting_date.*department/.test(String(error.message)))) throw new Error(sortingMigrationMessage);
    throw error;
  }
  if (!data?.id) throw new Error('Enregistrement impossible');
  return data;
}

export function buildSortingMonth(rows, month, { department = '', client = '' } = {}) {
  const dates = monthDates(month);
  const monthRows = rows.filter((row) => dates.includes(row.sorting_date));
  const departmentRows = monthRows.filter((row) => !department || row.department === department);
  const clients = productionClients(departmentRows);
  const options = clients.map((name) => ({ id: sortingClientId(name), name }));
  if (departmentRows.some((row) => !productionClientName(row))) options.push({ id: 'unassigned', name: null });
  const operations = departmentRows.filter((row) => !client || sortingClientId(row.client_name) === client);
  const visibleIds = new Set(operations.map((row) => sortingClientId(row.client_name)));
  const series = options.filter((option) => visibleIds.has(option.id)).map((option, index) => ({ ...option, key: `client_${index}` }));
  const perDay = new Map(dates.map((date) => [date, []]));
  for (const row of operations) perDay.get(row.sorting_date).push(row);
  let cumulative = 0;
  const data = dates.map((date) => {
    const daily = perDay.get(date);
    const point = { date, total: round(daily.reduce((sum, row) => sum + Number(row.hours || 0), 0)), operations: daily.length,
      goodQty: daily.reduce((sum, row) => sum + Number(row.good_qty || 0), 0), scrapQty: daily.reduce((sum, row) => sum + Number(row.scrap_qty || 0), 0) };
    for (const item of series) point[item.key] = round(daily.filter((row) => sortingClientId(row.client_name) === item.id).reduce((sum, row) => sum + Number(row.hours || 0), 0));
    cumulative = round(cumulative + point.total);
    return { ...point, cumulative };
  });
  const personHours = round(operations.reduce((sum, row) => sum + (row.headcount == null ? 0 : Number(row.hours || 0) * Number(row.headcount)), 0));
  return { options, series, data, operations, totalHours: cumulative, personHours,
    unknownHeadcount: operations.filter((row) => row.headcount == null).length,
    goodQty: operations.reduce((sum, row) => sum + Number(row.good_qty || 0), 0),
    scrapQty: operations.reduce((sum, row) => sum + Number(row.scrap_qty || 0), 0) };
}
