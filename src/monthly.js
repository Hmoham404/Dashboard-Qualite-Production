export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function monthBounds(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid month');
  const [year, number] = month.split('-').map(Number);
  const lastDay = new Date(year, number, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${lastDay}` };
}

export function monthDates(month) {
  const { from, to } = monthBounds(month);
  const dates = [];
  for (let day = 1; day <= Number(to.slice(-2)); day += 1) {
    dates.push(`${from.slice(0, 8)}${String(day).padStart(2, '0')}`);
  }
  return dates;
}

export function rowsForMonth(rows, month, dateKey = 'production_date') {
  const { from, to } = monthBounds(month);
  return rows.filter((row) => row[dateKey] >= from && row[dateKey] <= to);
}

export function entryDateForMonth(month, today) {
  return today.startsWith(`${month}-`) ? today : monthBounds(month).from;
}

export function buildMonthSnapshot(month, { production = [], sorting = [], complaints = [], assignments = [] }) {
  return {
    production_entries: rowsForMonth(production, month),
    sorting_hours: rowsForMonth(sorting, month, 'sorting_date'),
    customer_complaints: rowsForMonth(complaints, month, 'complaint_date'),
    mod_assignments: rowsForMonth(assignments, month, 'shift_date'),
  };
}

export function isMonthClosed(closures, date) {
  return closures.some((closure) => closure.month.slice(0, 7) === String(date).slice(0, 7));
}

export function assertLocalMonthsOpen(closures, dates) {
  if (dates.some((date) => date && isMonthClosed(closures, date))) {
    throw new Error('Mois clôturé : les données sont en lecture seule.');
  }
}

// Read every page, even when the API's configured row cap is smaller than our page size.
export async function readAllRows(client, table, { orderBy = 'created_at', stableKey = 'id', columns = '*', pageSize = 500 } = {}) {
  const rows = [];
  for (;;) {
    let query = client.from(table).select(columns, { count: 'exact' }).order(orderBy, { ascending: true });
    if (stableKey !== orderBy) query = query.order(stableKey, { ascending: true });
    const { data, error, count } = await query.range(rows.length, rows.length + pageSize - 1);
    if (error) throw error;
    if (!data?.length) {
      if (count != null && rows.length < count) throw new Error('Chargement incomplet. Réessayez.');
      return rows;
    }
    rows.push(...data);
    if (count != null ? rows.length >= count : data.length < pageSize) return rows;
  }
}
