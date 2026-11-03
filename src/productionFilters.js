import { extractClientName } from './qualityNote.js';

export function productionClientName(row) {
  return String(row.client_name || extractClientName(row.note)).trim();
}

export function filterProductionByClient(rows, client = '') {
  return client ? rows.filter((row) => productionClientName(row) === client) : rows;
}

export function productionClients(rows) {
  return [...new Set(rows.map(productionClientName).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
