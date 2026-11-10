import React, { useMemo, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { anomalyReportNumber } from './anomalyReports.js';
import { productionClientKey } from './productionFilters.js';

export default function LotReportIndex({ rows, department, departments, onDepartmentChange, onOpen, readOnly, loading, error, t, locale }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const reportRows = useMemo(() => rows.filter((row) => row.decision === 'NOK' || row.anomaly_report), [rows]);
  const visible = reportRows.filter((row) => {
    if (status === 'saved' && !row.anomaly_report || status === 'pending' && row.anomaly_report) return false;
    return productionClientKey([row.client_name, row.lot_number, row.product_reference, row.work_order, row.defect,
      row.anomaly_report ? anomalyReportNumber(row.anomaly_report) : ''].join(' ')).includes(productionClientKey(query));
  });
  const savedCount = reportRows.filter((row) => row.anomaly_report).length;
  return <section className="lot-report-index" aria-labelledby="report-index-title">
    <div className="lot-section-heading"><div><h2 id="report-index-title">{t('Rapports d’anomalie')}</h2><p>{t(readOnly ? 'Consultez les rapports d’anomalie du mois.' : 'Retrouvez les rapports enregistrés et les lots NOK à documenter.')}</p></div>
      <span className="report-count">{savedCount} {t('Enregistrés')} · {reportRows.length - savedCount} {t(readOnly ? 'Sans rapport' : 'À rédiger')}</span>
    </div>
    <div className="report-index-filters">
      <label>{t('Departement')}<select value={department} onChange={(event) => onDepartmentChange(event.target.value)}>{departments.map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></label>
      <label className="report-search">{t('Rechercher')}<span><Search size={16} /><input type="search" value={query} placeholder={t('Client, lot, référence, défaut…')} onChange={(event) => setQuery(event.target.value)} /></span></label>
      <label>{t('Statut')}<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t('Tous')}</option><option value="saved">{t('Enregistrés')}</option><option value="pending">{t(readOnly ? 'Sans rapport' : 'À rédiger')}</option></select></label>
    </div>
    {loading ? <p className="empty-row" role="status">{t('Chargement des données…')}</p> : error ? <p className="lot-feedback-error" role="alert">{error}</p> : <div className="lot-table-scroll"><table className="report-index-table">
      <thead><tr>{['Date', 'Rapport d’anomalie', 'Client', 'Numéro de lot', 'Reference produit', 'Défaut', 'Statut', 'Actions'].map((label) => <th key={label} scope="col">{t(label)}</th>)}</tr></thead>
      <tbody>{visible.map((row) => <tr key={row.id}>
        <td>{new Date(`${row.inspection_date}T12:00:00`).toLocaleDateString(locale)}</td>
        <td>{row.anomaly_report ? anomalyReportNumber(row.anomaly_report) : '—'}</td><td>{row.client_name || '—'}</td>
        <td><strong>{row.lot_number}</strong><small className="lot-row-context">{row.work_order}</small></td><td>{row.product_reference || '—'}</td><td>{row.defect || '—'}</td>
        <td><span className={`report-status ${row.anomaly_report ? 'is-saved' : ''}`}>{t(row.anomaly_report ? 'Enregistré' : readOnly ? 'Sans rapport' : 'À rédiger')}</span></td>
        <td>{!readOnly || row.anomaly_report ? <button type="button" onClick={() => onOpen(row)}><FileText size={15} />{t(row.anomaly_report ? 'Consulter' : 'Rédiger')}</button> : '—'}</td>
      </tr>)}{!visible.length && <tr><td colSpan="8" className="empty-row">{t('Aucun rapport ni lot NOK pour cette sélection.')}</td></tr>}</tbody>
    </table></div>}
  </section>;
}
