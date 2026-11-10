import { monthDates } from './monthly.js';

export function buildComplaintMonth(rows, month) {
  const dates = monthDates(month);
  const days = new Map(dates.map((date) => [date, []]));
  const [year, number] = month.split('-').map(Number);
  const previousMonth = `${String(number === 1 ? year - 1 : year).padStart(4, '0')}-${String(number === 1 ? 12 : number - 1).padStart(2, '0')}`;
  const previousDates = new Set(monthDates(previousMonth));
  let previousTotal = 0;
  for (const row of rows) {
    days.get(row.date)?.push(row);
    if (previousDates.has(row.date)) previousTotal += 1;
  }
  const complaints = [...days.values()].flat().sort((a, b) => b.date.localeCompare(a.date) || String(a.id).localeCompare(String(b.id)));
  const leading = (new Date(`${dates[0]}T12:00:00`).getDay() + 6) % 7;
  const cells = [...Array(leading).fill(null), ...dates.map((date) => ({ date, count: days.get(date).length }))];
  while (cells.length % 7) cells.push(null);
  return { complaints, cells, total: complaints.length, daysAffected: [...days.values()].filter((day) => day.length).length,
    previousMonth, previousTotal, change: complaints.length - previousTotal,
    changePercent: previousTotal ? (complaints.length - previousTotal) / previousTotal * 100 : null };
}

const searchKey = (value) => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function searchComplaints(rows, { date = '', query = '' } = {}) {
  const key = searchKey(query);
  return rows.filter((row) => (!date || row.date === date) && (!key || searchKey(`${row.details} ${row.date} ${row.date.split('-').reverse().join('/')}`).includes(key)));
}
