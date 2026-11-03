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
