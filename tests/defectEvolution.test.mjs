import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDefectEvolution } from '../src/defectEvolution.js';

const breakdown = (row) => row.defects;
const selection = { month: '2026-10', department: 'Injection', type: 'Piqûre' };

test('defect evolution combines machines and repeated defects, without mixing departments, months or defect types', () => {
  const data = buildDefectEvolution([
    { production_date: '2026-10-02', department: 'Injection', defects: [['Piqûre', 3], ['Rayures', 80], ['Piqûre', 2]] },
    { production_date: '2026-10-02', department: 'Injection', defects: [['Piqûre', 7]] },
    { production_date: '2026-10-02', department: 'Assemblage', defects: [['Piqûre', 99]] },
    { production_date: '2026-09-02', department: 'Injection', defects: [['Piqûre', 99]] },
    { production_date: '2026-11-02', department: 'Injection', defects: [['Piqûre', 99]] },
    { production_date: '2026-10-03', department: 'Injection', defects: [['Rayures', 10]] },
    { production_date: '2026-10-31', department: 'Injection', defects: [['Piqûre', 4]] },
  ], selection, breakdown);
  assert.equal(data.length, 31);
  assert.deepEqual(data[1], { date: '2026-10-02', count: 12 });
  assert.equal(data[30].count, 4);
  assert.equal(data.reduce((sum, day) => sum + (day.count || 0), 0), 16);
  assert.equal(data[0].count, 0, 'Days without entries use zero to keep the curve continuous');
  assert.equal(data[2].count, 0, 'An entry with another defect has zero for the selected defect');
});

test('empty months retain all calendar dates and missing defect names use Autres', () => {
  const empty = buildDefectEvolution([], { ...selection, month: '2028-02' }, breakdown);
  assert.equal(empty.length, 29);
  assert.ok(empty.every((day) => day.count === 0));
  const data = buildDefectEvolution([
    { production_date: '2026-10-01', department: 'Injection', defects: [['', 5], ['Autres', -3]] },
  ], { ...selection, type: 'Autres' }, breakdown);
  assert.equal(data[0].count, 5);
});
