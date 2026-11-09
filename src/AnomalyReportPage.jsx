import React, { useRef, useState } from 'react';
import { ArrowLeft, FileDown, FileText, Save } from 'lucide-react';
import { anomalyFields, anomalyReportNumber, saveAnomalyReport, validateAnomalyReport } from './anomalyReports.js';
import { downloadAnomalyReport } from './anomalyReportPdf.js';

const fieldHints = {
  root_cause: 'Décrivez la cause à l’origine de l’anomalie.',
  immediate_action: 'Décrivez les mesures prises immédiatement pour contenir l’anomalie.',
  immediate_effectiveness: 'Décrivez le résultat des mesures immédiates et comment il a été vérifié.',
  corrective_action: 'Décrivez les actions prévues pour éviter que l’anomalie se reproduise.',
  corrective_effectiveness: 'Décrivez les résultats obtenus et les vérifications de l’efficacité.',
};

export default function AnomalyReportPage({ lot, client, mode, onBack, onSaved, t = (value) => value, locale = 'fr-FR', downloadReport = downloadAnomalyReport }) {
  const [fields, setFields] = useState(() => Object.fromEntries(anomalyFields.map(([key]) => [key, lot.anomaly_report?.[key] || ''])));
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fieldRefs = useRef({});
  const context = lot.anomaly_report?.context || lot;
  const update = (key, value) => {
    setFields((current) => ({ ...current, [key]: value }));
    if (value.trim()) setMissing((current) => current.filter((label) => label !== anomalyFields.find(([fieldKey]) => fieldKey === key)?.[1]));
  };

  async function persist(download = false) {
    if (busy) return;
    const invalid = validateAnomalyReport(fields);
    setMissing(invalid); setError(''); setNotice('');
    if (invalid.length) {
      const [firstKey] = anomalyFields.find(([, label]) => invalid.includes(label));
      fieldRefs.current[firstKey]?.focus();
      return;
    }
    setBusy(true);
    let saved;
    try {
      saved = await saveAnomalyReport(client, mode, lot, fields, window.localStorage);
      onSaved(saved);
      setNotice(mode === 'remote' ? 'Rapport enregistré dans Supabase.' : 'Rapport enregistré dans ce navigateur.');
      if (download) await downloadReport(saved.anomaly_report);
    } catch (cause) {
      setError(saved ? 'Rapport enregistré, mais le téléchargement a échoué. Réessayez.' : cause.message);
    } finally { setBusy(false); }
  }

  const field = (key, label, rows = 4) => <label>{t(label)}<textarea ref={(node) => { fieldRefs.current[key] = node; }} id={`anomaly-${key}`} rows={rows} required aria-invalid={missing.includes(anomalyFields.find(([fieldKey]) => fieldKey === key)?.[1]) || undefined} placeholder={t(fieldHints[key])} value={fields[key]} onChange={(event) => update(key, event.target.value)} /></label>;

  return <main className="lot-page anomaly-report-page">
    <header className="lot-page-header">
      <div className="lot-heading"><span className="lot-brand"><FileText size={20} />LOT</span><div><h1>{t('Rapport d’anomalie')}</h1><p>{lot.anomaly_report ? anomalyReportNumber(lot.anomaly_report) : t('Nouveau rapport')} · {context.lot_number}</p></div></div>
      <button type="button" disabled={busy} onClick={onBack}><ArrowLeft size={18} />{t('Retour aux contrôles')}</button>
    </header>
    <p className="anomaly-storage-note">{t(mode === 'remote' ? 'Le rapport est enregistré avec le lot dans Supabase.' : 'Le rapport est conservé dans ce navigateur avec le lot.')}</p>
    <form className="anomaly-report-form" noValidate onSubmit={(event) => { event.preventDefault(); persist(); }}>
      <section className="anomaly-context-panel" aria-labelledby="anomaly-context-title">
        <h2 id="anomaly-context-title">{t('Informations du lot')}</h2>
        <p className="anomaly-context-help">{t('La référence, l’OF, la date, le département et le client sont renseignés automatiquement depuis le lot.')}</p>
        <div className="anomaly-context-grid">
          {[['product_reference', 'Reference produit'], ['work_order', 'OF / Bon'], ['inspection_date', 'Date'], ['department', 'Departement'], ['client_name', 'Client'], ['lot_number', 'Numéro de lot']].map(([key, label]) =>
            <label key={key}>{t(label)}<input id={`anomaly-context-${key}`} readOnly value={key === 'inspection_date' ? new Date(`${context[key]}T12:00:00`).toLocaleDateString(locale) : key === 'department' ? t(context[key]) : context[key]} /></label>)}
        </div>
        <p className="anomaly-defect-context"><strong>{t('Défaut constaté')} :</strong> {context.defect || '—'} · <strong>{t('Nom du qualiticien')} :</strong> {context.inspector_name}</p>
      </section>
      <fieldset disabled={busy} className="anomaly-sections">
        <section className="anomaly-section"><h2><span>01</span>{t('Cause racine')}</h2>{field('root_cause', 'Description de la cause racine', 5)}</section>
        <section className="anomaly-section"><h2><span>02</span>{t('Action immédiate')}</h2><div className="anomaly-action-grid">{field('immediate_action', 'Description de l’action immédiate')}{field('immediate_effectiveness', 'Efficacité de l’action immédiate')}</div></section>
        <section className="anomaly-section"><h2><span>03</span>{t('Action corrective')}</h2><div className="anomaly-action-grid">{field('corrective_action', 'Description de l’action corrective')}{field('corrective_effectiveness', 'Efficacité de l’action corrective')}</div></section>
      </fieldset>
      {missing.length > 0 && <div className="lot-feedback lot-feedback-error" role="alert"><strong>{t('Champs à vérifier')}</strong><ul>{missing.map((label) => <li key={label}>{t(label)}</li>)}</ul></div>}
      {error && <p className="lot-feedback lot-feedback-error" role="alert">{t(error)}</p>}
      {notice && <p className="lot-feedback lot-feedback-success" role="status">{t(notice)}</p>}
      <footer className="anomaly-report-actions"><button type="submit" disabled={busy}><Save size={17} />{t('Enregistrer le rapport')}</button><button className="lot-save-button" type="button" disabled={busy} onClick={() => persist(true)}><FileDown size={17} />{t('Enregistrer et télécharger le PDF')}</button></footer>
    </form>
  </main>;
}
