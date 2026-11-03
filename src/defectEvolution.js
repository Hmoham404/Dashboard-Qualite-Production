import { monthDates } from './monthly.js';

// Reuse the dashboard's defect reader, including historical note-based records.
export function buildDefectEvolution(rows, { month, department, type }, defectsForRow) {
  const daily = new Map();
  for (const row of rows) {
    if (row.department !== department || !row.production_date?.startsWith(`${month}-`)) continue;
    const count = defectsForRow(row).reduce((total, [name, quantity]) =>
      total + ((name || 'Autres') === type ? Math.max(0, Number(quantity) || 0) : 0), 0);
    daily.set(row.production_date, (daily.get(row.production_date) || 0) + count);
  }
  return monthDates(month).map((date) => ({ date, count: daily.get(date) || 0 }));
}
