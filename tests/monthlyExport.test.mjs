import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import { buildMonthSnapshot } from '../src/monthly.js';
import { buildMonthlyWorkbook } from '../src/monthlyExport.js';

test('the monthly workbook round-trips all four data types, details and headcounts', () => {
  const snapshot = buildMonthSnapshot('2026-10', {
    production: [{ production_date: '2026-10-31', good_qty: 150, note: 'REF_ARTICLE: A\nCLIENT: Client exemple\nNOTE_QUALITE: OK', defect_breakdown: [{ type: 'Bavure', qty: 2 }] }, { production_date: '2026-11-01', good_qty: 999 }],
    sorting: [{ sorting_date: '2026-10-31', hours: 8, headcount: 0 }, { sorting_date: '2026-10-30', hours: 2, headcount: null }],
    complaints: [{ complaint_date: '2026-10-02', details: 'Une réclamation' }],
    assignments: [{ shift_date: '2026-10-31', operator_names: 'A / B' }],
  });
  const wb = buildMonthlyWorkbook(snapshot, { month: '2026-10', closedAt: '2026-11-01T08:00:00Z' });
  const read = XLSX.read(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' });
  assert.equal(read.SheetNames.length, 5);
  const production = XLSX.utils.sheet_to_json(read.Sheets.Production);
  assert.equal(production.length, 1);
  assert.equal(production[0]['Qte bonne'], 150);
  assert.equal(production[0]['Reference article'], 'A');
  assert.equal(production[0].Client, 'Client exemple');
  assert.ok(production[0]['Note qualite'].includes('REF_ARTICLE: A'));
  assert.deepEqual(JSON.parse(production[0]['Défauts détaillés']), [{ type: 'Bavure', qty: 2 }]);
  const sorting = XLSX.utils.sheet_to_json(read.Sheets['Heures de tri'], { defval: null });
  assert.equal(sorting[0].Effectif, 0);
  assert.equal(sorting[1].Effectif, null);
  assert.equal(XLSX.utils.sheet_to_json(read.Sheets['Réclamations'])[0]['Détail'], 'Une réclamation');
  assert.equal(XLSX.utils.sheet_to_json(read.Sheets['Affectation MOD'])[0]['Nom MOD'], 'A / B');
});

test('an empty new month exports stable headers and zero counts without old records', () => {
  const wb = buildMonthlyWorkbook(buildMonthSnapshot('2026-11', { production: [{ production_date: '2026-10-31' }] }), { month: '2026-11' });
  assert.equal(XLSX.utils.sheet_to_json(wb.Sheets.Production).length, 0);
  assert.ok(XLSX.utils.sheet_to_json(wb.Sheets['Heures de tri'], { header: 1 })[0].includes('Effectif'));
  const summary = XLSX.utils.sheet_to_json(wb.Sheets['Bilan mensuel'], { header: 1 });
  assert.deepEqual(summary[0], ['Mois affiché', '2026-11']);
  assert.deepEqual(summary[2], ['Production', 0]);
});
