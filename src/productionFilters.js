import { extractClientName } from './qualityNote.js';

export function productionClientName(row) {
  return String(row.client_name || extractClientName(row.note)).normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function productionClientKey(client = '') {
  return String(client).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function filterProductionByClient(rows, client = '') {
  const key = productionClientKey(client);
  return key ? rows.filter((row) => productionClientKey(productionClientName(row)) === key) : rows;
}

export function productionClients(rows) {
  const clients = new Map();
  for (const row of rows) {
    const name = productionClientName(row);
    if (!name) continue;
    const key = productionClientKey(name);
    // Prefer an existing uppercase spelling for names such as KIKO.
    if (!clients.has(key) || name === name.toUpperCase()) clients.set(key, name);
  }
  return [...clients.values()].sort((a, b) => a.localeCompare(b));
}
