import React, { useState } from 'react';
import { ArrowLeft, FileDown, FileText, Save } from 'lucide-react';
import { anomalyFields, anomalyReportNumber, saveAnomalyReport } from './anomalyReports.js';
import { downloadAnomalyReport } from './anomalyReportPdf.js';
import WorkspaceNavigation from './WorkspaceNavigation.jsx';
import { SiteMeetingButton } from './SiteMeetingFrame.jsx';
import { userMessage } from './userMessage.js';

const fieldHints = {
  root_cause: 'Décrivez la cause à l’origine de l’anomalie.',
  immediate_action: 'Décrivez les mesures prises immédiatement pour contenir l’anomalie.',
  immediate_effectiveness: 'Décrivez le résultat des mesures immédiates et comment il a été vérifié.',
  corrective_action: 'Décrivez les actions prévues pour éviter que l’anomalie se reproduise.',
  corrective_effectiveness: 'Décrivez les résultats obtenus et les vérifications de l’efficacité.',
};

export default function AnomalyReportPage({ lot, client, mode, readOnly = false, sourceView = 'lot', onBack, onSaved, t = (value) => value, locale = 'fr-FR', downloadReport = downloadAnomalyReport }) {
  const [fields, setFields] = useState(() => Object.fromEntries(anomalyFields.map(([key]) => [key, lot.anomaly_report?.[key] || ''])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const context = lot.anomaly_report?.context || lot;
  const ReportContainer = readOnly ? 'div' : 'form';
  const SectionsContainer = readOnly ? 'div' : 'fieldset';
  const update = (key, value) => {
    setFields((current) => ({ ...current, [key]: value }));
  };

  async function persist(download = false) {
    if (busy || readOnly) return;
    setError(''); setNotice('');
    setBusy(true);
    let saved;
    try {
      saved = await saveAnomalyReport(client, mode, lot, fields, window.localStorage);
      onSaved(saved);
      setNotice('Rapport enregistré.');
      if (download) await downloadReport(saved.anomaly_report);
    } catch (cause) {
      setError(saved ? 'Rapport enregistré, mais le téléchargement a échoué. Réessayez.' : cause.message);
    } finally { setBusy(false); }
  }

  const field = (key, label, rows = 4) => readOnly
    ? <div className="anomaly-report-field"><h3>{t(label)}</h3><p id={`anomaly-${key}`} className="anomaly-report-value">{lot.anomaly_report?.[key] || '—'}</p></div>
    : <label>{t(label)}<textarea id={`anomaly-${key}`} rows={rows} placeholder={t(fieldHints[key])} value={fields[key]} onChange={(event) => update(key, event.target.value)} /></label>;
  const contextItems = [['product_reference', 'Reference produit'], ['work_order', 'OF / Bon'], ['inspection_date', 'Date'], ['department', 'Departement'], ['client_name', 'Client'], ['lot_number', 'Numéro de lot']];
  const contextValue = (key) => key === 'inspection_date' ? new Date(`${context[key]}T12:00:00`).toLocaleDateString(locale) : key === 'department' ? t(context[key]) : context[key];

  return <main className="lot-page anomaly-report-page">
    <header className="lot-page-header">
      <div className="lot-heading"><span className="lot-brand"><FileText size={20} />LOT</span><div><h1>{t('Rapport d’anomalie')}</h1><p>{lot.anomaly_report ? anomalyReportNumber(lot.anomaly_report) : t('Nouveau rapport')} · {context.lot_number}</p></div></div>
      <div className="workspace-header-actions"><button type="button" disabled={busy} onClick={onBack}><ArrowLeft size={18} />{t(sourceView === 'reports' ? 'Retour aux rapports' : 'Retour aux contrôles')}</button><SiteMeetingButton /></div>
      <WorkspaceNavigation current={sourceView} onNavigate={onBack} t={t} />
    </header>
    <ReportContainer className="anomaly-report-form" noValidate={readOnly ? undefined : true} onSubmit={readOnly ? undefined : (event) => { event.preventDefault(); persist(); }}>
      <section className="anomaly-context-panel" aria-labelledby="anomaly-context-title">
        <h2 id="anomaly-context-title">{t('Informations du lot')}</h2>
        {!readOnly && <p className="anomaly-context-help">{t('La référence, l’OF, la date, le département et le client sont renseignés automatiquement depuis le lot.')}</p>}
        {readOnly ? <dl className="anomaly-context-grid anomaly-context-values">{contextItems.map(([key, label]) =>
          <div key={key}><dt>{t(label)}</dt><dd id={`anomaly-context-${key}`}>{contextValue(key) || '—'}</dd></div>)}</dl> : <div className="anomaly-context-grid">
          {contextItems.map(([key, label]) => <label key={key}>{t(label)}<input id={`anomaly-context-${key}`} readOnly value={contextValue(key)} /></label>)}
        </div>}
        <p className="anomaly-defect-context"><strong>{t('Défaut constaté')} :</strong> {context.defect || '—'} · <strong>{t('Nom du qualiticien')} :</strong> {context.inspector_name}</p>
      </section>
      {!readOnly && <p className="anomaly-context-help">{t('Tous les champs du rapport sont facultatifs. Vous pouvez enregistrer et compléter plus tard.')}</p>}
      <SectionsContainer disabled={readOnly ? undefined : busy} className="anomaly-sections">
        <section className="anomaly-section"><h2><span>01</span>{t('Cause racine')}</h2>{field('root_cause', 'Description de la cause racine', 5)}</section>
        <section className="anomaly-section"><h2><span>02</span>{t('Action immédiate')}</h2><div className="anomaly-action-grid">{field('immediate_action', 'Description de l’action immédiate')}{field('immediate_effectiveness', 'Efficacité de l’action immédiate')}</div></section>
        <section className="anomaly-section"><h2><span>03</span>{t('Action corrective')}</h2><div className="anomaly-action-grid">{field('corrective_action', 'Description de l’action corrective')}{field('corrective_effectiveness', 'Efficacité de l’action corrective')}</div></section>
      </SectionsContainer>
      {!readOnly && <>
      {error && <p className="lot-feedback lot-feedback-error" role="alert">{t(userMessage(error))}</p>}
      {notice && <p className="lot-feedback lot-feedback-success" role="status">{t(notice)}</p>}
      <footer className="anomaly-report-actions"><button type="submit" disabled={busy}><Save size={17} />{t('Enregistrer le rapport')}</button><button className="lot-save-button" type="button" disabled={busy} onClick={() => persist(true)}><FileDown size={17} />{t('Enregistrer et télécharger le PDF')}</button></footer></>}
    </ReportContainer>
  </main>;
}
