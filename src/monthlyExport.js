import * as XLSX from 'xlsx';

const sheets = [
  ['Production', 'production_entries', {
    id: 'Identifiant', production_date: 'Date', department: 'Departement', machine_code: 'Machine / Poste',
    product_reference: 'Reference machine', article_reference: 'Reference article', work_order: 'OF / Bon', good_qty: 'Qte bonne', scrap_qty: 'Qte rebut',
    justified_scrap_qty: 'Rebut justifie', purge_kg: 'Purge kg', machine_hours: 'Heures machine', work_hours: 'Heure travail',
    mod_count: 'MOD', mod_hours: 'Total H MOD', operator_names: 'Nom MOD', defect_type: 'Pareto defaut',
    defect_breakdown: 'Défauts détaillés', note: 'Note qualite', entry_status: 'Etat', missing_fields: 'Champs manquants',
    completed_at: 'Date de validation', created_at: 'Date de création',
  }],
  ['Heures de tri', 'sorting_hours', {
    id: 'Identifiant', sorting_date: 'Date', department: 'Departement', hours: 'Heures de tri', headcount: 'Effectif',
    good_qty: 'Qte bonne après tri', scrap_qty: 'Qte rebut après tri', created_at: 'Date de création',
  }],
  ['Réclamations', 'customer_complaints', {
    id: 'Identifiant', complaint_date: 'Date', details: 'Détail', created_at: 'Date de création',
  }],
  ['Affectation MOD', 'mod_assignments', {
    id: 'Identifiant', shift_date: 'Date', machine_code: 'Machine / Poste', operator_names: 'Nom MOD',
    mod_count: 'Nb MOD', created_at: 'Date de création',
  }],
];

export function buildMonthlyWorkbook(snapshot, { month, closedAt = null, t = (value) => value }) {
  const workbook = XLSX.utils.book_new();
  const summary = [[t('Mois affiché'), month], [t('Clôturé le'), closedAt || ''],
    ...sheets.map(([name, key]) => [t(name), (snapshot[key] || []).length])];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summary), t('Bilan mensuel').slice(0, 31));
  for (const [name, key, columns] of sheets) {
    // Stable headers are retained even for a month with no entries.
    const records = (snapshot[key] || []).map((row) => Object.fromEntries(Object.entries(columns).map(([field, label]) => {
      const value = field === 'article_reference'
        ? row.article_reference || String(row.note || '').match(/^REF_ARTICLE:\s*(.*)$/m)?.[1]?.trim()
        : row[field];
      return [t(label), value != null && typeof value === 'object' ? JSON.stringify(value) : value ?? null];
    })));
    const headers = Object.values(columns).map((label) => t(label));
    const worksheet = XLSX.utils.json_to_sheet(records, { header: headers });
    worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(14, Math.min(32, header.length + 4)) }));
    XLSX.utils.book_append_sheet(workbook, worksheet, t(name).slice(0, 31));
  }
  return workbook;
}
