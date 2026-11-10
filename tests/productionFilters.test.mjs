import assert from 'node:assert/strict';
import test from 'node:test';
import { filterProductionByClient, productionClientName, productionClients } from '../src/productionFilters.js';

test('client selection works across departments, with structured fields and historical notes', () => {
  const rows = [
    { department: 'Injection', client_name: 'Client A' },
    { department: 'Serigraphie', note: 'REF_ARTICLE: X\nCLIENT: Client A\nNOTE_QUALITE: OK' },
    { department: 'Injection', note: 'CLIENT: Client B' },
    { department: 'Soudure', note: 'Sans client' },
  ];
  const before = structuredClone(rows);
  assert.deepEqual(filterProductionByClient(rows, 'Client A'), rows.slice(0, 2));
  assert.deepEqual(filterProductionByClient(rows, 'Client absent'), []);
  assert.deepEqual(filterProductionByClient(rows, ''), rows);
  assert.deepEqual(rows, before, 'Filtering must not change records or monthly archive input');
});

test('client options are unique and a client named Tous is distinct from the all-clients option', () => {
  const rows = [{ note: 'CLIENT: Tous' }, { client_name: 'Client A' }, { note: 'CLIENT: Client A' }, { note: '' }];
  assert.deepEqual(productionClients(rows), ['Client A', 'Tous']);
  assert.equal(filterProductionByClient(rows, 'Tous').length, 1);
  assert.equal(filterProductionByClient(rows, '').length, 4);
  assert.equal(productionClientName({ note: 'CLIENT: \nNOTE_QUALITE: OK' }), '');
});

test('client spellings differing only in case, spacing or Unicode composition share one option and all their data', () => {
  const rows = [
    { client_name: ' kiko ', scrap_qty: 10 },
    { note: 'CLIENT: Kiko', scrap_qty: 20 },
    { client_name: 'KIKO', scrap_qty: 30 },
    { client_name: 'Client  A' }, { note: 'CLIENT: client a' },
    { client_name: 'Clie\u0301nt' }, { note: 'CLIENT: CLIÉNT' },
    { client_name: 'KÍKO' }, { note: 'Sans client' },
  ];
  const before = structuredClone(rows);
  const options = productionClients(rows);
  assert.equal(options.filter((name) => name.toLowerCase() === 'kiko').length, 1);
  assert.ok(options.includes('KIKO'));
  assert.equal(options.length, 4);
  for (const client of ['kiko', 'Kiko', 'KIKO', '  KiKo ']) {
    const filtered = filterProductionByClient(rows, client);
    assert.equal(filtered.length, 3);
    assert.equal(filtered.reduce((sum, row) => sum + row.scrap_qty, 0), 60);
  }
  assert.equal(filterProductionByClient(rows, 'client a').length, 2);
  assert.equal(filterProductionByClient(rows, 'clie\u0301nt').length, 2);
  assert.equal(filterProductionByClient(rows, 'KÍKO').length, 1, 'Accented names stay distinct');
  assert.deepEqual(rows, before, 'Grouping never rewrites recorded names');
});
