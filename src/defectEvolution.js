import { monthDates } from './monthly.js';

// Reuse the dashboard's defect reader, including historical note-based records.
export function buildDefectEvolution(rows, { month, department, type }, defectsForRow, scrapForRow) {
  const daily = new Map();
  for (const row of rows) {
    if (row.department !== department || !row.production_date?.startsWith(`${month}-`)) continue;
    const defects = defectsForRow(row);
    const count = defects.reduce((total, [name, quantity]) =>
      total + ((name || 'Autres') === type ? Math.max(0, Number(quantity) || 0) : 0), 0);
    const totalScrap = scrapForRow ? scrapForRow(row) : Math.max(0, Number(row.scrap_qty) || 0)
      || defects.reduce((total, [, quantity]) => total + Math.max(0, Number(quantity) || 0), 0);
    const day = daily.get(row.production_date) || { count: 0, totalScrap: 0 };
    daily.set(row.production_date, { count: day.count + count, totalScrap: day.totalScrap + totalScrap });
  }
  return monthDates(month).map((date) => {
    const day = daily.get(date) || { count: 0, totalScrap: 0 };
    return { date, ...day, share: day.totalScrap > 0 ? day.count / day.totalScrap : 0 };
  });
}
