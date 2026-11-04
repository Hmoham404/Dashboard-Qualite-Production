import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Edit3, Package, PlusCircle, RefreshCcw, Save, ShieldAlert } from 'lucide-react';
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { entryDateForMonth, localDateKey, monthBounds } from './monthly.js';
import { loadLotInspections, lotActions, lotInspectionPayload, lotTotals, lotTrend, sameLot, saveLotInspection, transferLocalLots, validateLotInspection } from './lotInspections.js';

function blankInspection(department, date, context = {}) {
  return { department, inspection_date: date, work_order: '', product_reference: '', client_name: '', lot_number: '',
    lot_qty: '', sample_qty: '', decision: '', defect: '', corrective_action: '', inspector_name: '', ...context };
}

export default function LotWorkspacePage({ client = null, departmentOptions = [], initialDepartment = 'Injection', initialMonth,
  today = localDateKey(), references = [], clients = [], workOrders = [], t = (value) => value, locale = 'fr-FR' }) {
  const [month, setMonth] = useState(initialMonth || today.slice(0, 7));
  const [form, setForm] = useState(() => blankInspection(initialDepartment, entryDateForMonth(initialMonth || today.slice(0, 7), today)));
  const [rows, setRows] = useState([]);
  const [pending, setPending] = useState([]);
  const [mode, setMode] = useState('loading');
  const [reloadCount, setReloadCount] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState('');
  const [missingFields, setMissingFields] = useState([]);
  const [notice, setNotice] = useState('');
  const lotNumberRef = useRef(null);
  const bounds = monthBounds(month);
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString(locale);
  const busy = saving || transferring || mode === 'loading';
  const canSave = !busy && ['local', 'missing', 'remote'].includes(mode);
  const departments = departmentOptions.length ? departmentOptions : ['Injection', 'Metallisation', 'Assemblage', 'Serigraphie', 'Soudure'];

  useEffect(() => {
    let cancelled = false;
    setMode('loading');
    setError('');
    loadLotInspections(client, window.localStorage).then((result) => {
      if (!cancelled) { setRows(result.rows); setPending(result.pending); setMode(result.mode); setError(result.localError || ''); }
    }).catch((cause) => {
      if (!cancelled) { setMode('error'); setError(cause.message || 'Chargement impossible'); }
    });
    return () => { cancelled = true; };
  }, [client, reloadCount]);

  const visibleRows = useMemo(() => rows.filter((row) => row.department === form.department && row.inspection_date.startsWith(`${month}-`))
    .sort((a, b) => b.inspection_date.localeCompare(a.inspection_date) || String(b.created_at).localeCompare(String(a.created_at))), [rows, form.department, month]);
  const totals = useMemo(() => lotTotals(visibleRows), [visibleRows]);
  const trend = useMemo(() => lotTrend(visibleRows, month), [visibleRows, month]);
  const clientSuggestions = [...new Set([...clients, ...rows.map((row) => row.client_name)].filter(Boolean))].sort();
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  function newInspection() {
    setForm(blankInspection(form.department, entryDateForMonth(month, today)));
    setEditingId(null); setMissingFields([]); setError(''); setNotice('');
  }

  async function saveInspection(event) {
    event.preventDefault();
    if (!canSave) return;
    const invalid = validateLotInspection(form);
    if (!form.inspection_date.startsWith(`${month}-`)) invalid.push('La date doit appartenir au mois affiché.');
    setMissingFields(invalid); setError(''); setNotice('');
    if (invalid.length) return;
    if (rows.some((row) => row.id !== editingId && sameLot(row, form))) {
      setError('Ce lot existe déjà pour cet OF et cette référence. Modifiez le contrôle existant.'); return;
    }
    setSaving(true);
    try {
      const payload = lotInspectionPayload(form, rows.find((row) => row.id === editingId));
      const saved = await saveLotInspection(client, mode, payload, window.localStorage);
      if (!saved) throw new Error('Enregistrement impossible');
      setRows((current) => [saved, ...current.filter((row) => row.id !== saved.id)]);
      setEditingId(null);
      setForm(blankInspection(form.department, form.inspection_date, { work_order: form.work_order, product_reference: form.product_reference,
        client_name: form.client_name, inspector_name: form.inspector_name }));
      setNotice(mode === 'remote' ? 'Contrôle enregistré dans Supabase.' : 'Contrôle enregistré dans ce navigateur.');
    } catch (cause) {
      setError(cause.code === '23505' ? 'Ce lot existe déjà pour cet OF et cette référence. Modifiez le contrôle existant.' : cause.message);
    } finally { setSaving(false); }
  }

  function editInspection(row) {
    setForm({ ...row, defect: row.defect || '', corrective_action: row.corrective_action || '' });
    setEditingId(row.id); setMissingFields([]); setError(''); setNotice('');
    lotNumberRef.current?.focus();
    lotNumberRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }

  async function transferInspections() {
    if (busy || mode !== 'remote') return;
    setTransferring(true); setError(''); setNotice('');
    try {
      const saved = await transferLocalLots(client, pending, window.localStorage);
      setRows((current) => [...saved, ...current.filter((row) => !saved.some((item) => item.id === row.id))]);
      setPending([]); setNotice('Les contrôles locaux ont été transférés dans Supabase.');
    } catch (cause) { setError(cause.message); } finally { setTransferring(false); }
  }

  return <main className="lot-page">
    <header className="lot-page-header">
      <div className="lot-heading"><span className="lot-brand"><Package size={20} />LOT</span><div><h1>{t('Contrôle des lots')}</h1><p>{t('Suivi des décisions et des quantités par département.')}</p></div></div>
      <a href="#"><ArrowLeft size={18} />{t('Retour au tableau de bord')}</a>
    </header>

    <section className="lot-toolbar" aria-label={t('Gestion des contrôles de lots')}>
      <label>{t('Mois affiché')}<input id="lot-month" type="month" max={today.slice(0, 7)} value={month} disabled={busy} onChange={(event) => {
        const value = event.target.value;
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value > today.slice(0, 7)) return;
        setMonth(value); setForm(blankInspection(form.department, entryDateForMonth(value, today))); setEditingId(null); setMissingFields([]); setNotice('');
      }} /></label>
      <span className={`lot-storage-state ${mode === 'remote' ? 'lot-storage-shared' : ''}`}>{t(mode === 'remote' ? 'Connecte a Supabase' : mode === 'loading' ? 'Chargement des données…' : mode === 'error' ? 'Chargement impossible' : 'Sauvegarde locale')}</span>
      <button type="button" disabled={busy} onClick={() => setReloadCount((value) => value + 1)}><RefreshCcw size={16} />{t('Actualiser')}</button>
      {pending.length > 0 && mode === 'remote' && <button type="button" disabled={busy} onClick={transferInspections}>{t('Transférer {count} contrôle(s) local(aux)', { count: pending.length })}</button>}
      {['local', 'missing'].includes(mode) && <p className="lot-storage-help">{t('Les contrôles LOT sont conservés uniquement dans ce navigateur. Pour les partager, exécutez supabase-lot-inspections.sql dans Supabase, puis actualisez.')}</p>}
    </section>

    <form className="lot-entry-panel" onSubmit={saveInspection} noValidate>
      <div className="lot-section-heading"><h2>{t(editingId ? 'Modifier le contrôle' : 'Nouveau contrôle')}</h2>{editingId && <button type="button" disabled={busy} onClick={newInspection}><PlusCircle size={16} />{t('Nouveau contrôle')}</button>}</div>
      <fieldset disabled={!canSave} className="lot-context-fields">
        <label>{t('Departement')}<select id="lot-department" value={form.department} onChange={(event) => update('department', event.target.value)}>{departments.map((department) => <option value={department} key={department}>{t(department)}</option>)}</select></label>
        <label>{t('OF / Bon')}<input id="lot-work-order" list="lot-work-orders" value={form.work_order} onChange={(event) => update('work_order', event.target.value)} /></label>
        <label>{t('Date')}<input id="lot-date" type="date" min={bounds.from} max={bounds.to} value={form.inspection_date} onChange={(event) => update('inspection_date', event.target.value)} /></label>
        <label>{t('Reference produit')}<input id="lot-reference" list="lot-references" value={form.product_reference} onChange={(event) => update('product_reference', event.target.value)} /></label>
        <label>{t('Client')}<input id="lot-client" list="lot-clients" value={form.client_name} onChange={(event) => update('client_name', event.target.value)} /></label>
      </fieldset>
      <datalist id="lot-work-orders">{[...new Set(workOrders)].filter(Boolean).map((value) => <option key={value} value={value} />)}</datalist>
      <datalist id="lot-references">{[...new Set(references)].filter(Boolean).map((value) => <option key={value} value={value} />)}</datalist>
      <datalist id="lot-clients">{clientSuggestions.map((value) => <option key={value} value={value} />)}</datalist>
      <div className="lot-table-scroll">
        <table className="lot-inspections-table">
          <thead><tr>{['Numéro de lot', 'Quantité du lot', 'Échantillonnage', 'Décision', 'Défaut', 'Action', 'Nom du qualiticien', 'Modifier'].map((label) => <th key={label} scope="col">{t(label)}</th>)}</tr></thead>
          <tbody>
            <tr className="lot-entry-row">
              <td><input ref={lotNumberRef} id="lot-number" aria-label={t('Numéro de lot')} value={form.lot_number} disabled={!canSave} onChange={(event) => update('lot_number', event.target.value)} /></td>
              <td><input id="lot-quantity" aria-label={t('Quantité du lot')} type="number" min="1" step="1" max="2147483647" value={form.lot_qty} disabled={!canSave} onChange={(event) => update('lot_qty', event.target.value)} /></td>
              <td><input id="lot-sample" aria-label={t('Échantillonnage')} type="number" min="1" step="1" max={form.lot_qty || undefined} value={form.sample_qty} disabled={!canSave} onChange={(event) => update('sample_qty', event.target.value)} /></td>
              <td><select id="lot-decision" aria-label={t('Décision')} className={`lot-decision-select ${form.decision === 'OK' ? 'lot-is-ok' : form.decision === 'NOK' ? 'lot-is-nok' : ''}`} value={form.decision} disabled={!canSave} onChange={(event) => setForm({ ...form, decision: event.target.value, defect: '', corrective_action: '' })}><option value="">{t('Choisir')}</option><option value="OK">{t('OK')}</option><option value="NOK">{t('NOK')}</option></select></td>
              <td><input id="lot-defect" aria-label={t('Défaut')} value={form.defect} disabled={!canSave || form.decision !== 'NOK'} placeholder={form.decision === 'OK' ? '—' : t('Défaut constaté')} onChange={(event) => update('defect', event.target.value)} /></td>
              <td><select id="lot-action" aria-label={t('Action')} value={form.corrective_action} disabled={!canSave || form.decision !== 'NOK'} onChange={(event) => update('corrective_action', event.target.value)}><option value="">{form.decision === 'NOK' ? t('Choisir') : '—'}</option>{lotActions.map((action) => <option key={action} value={action}>{t(action)}</option>)}</select></td>
              <td><input id="lot-inspector" aria-label={t('Nom du qualiticien')} value={form.inspector_name} disabled={!canSave} onChange={(event) => update('inspector_name', event.target.value)} /></td>
              <td className="lot-draft-marker">{t(editingId ? 'Modification' : 'Saisie')}</td>
            </tr>
            {visibleRows.map((row) => <tr key={row.id} className={row.id === editingId ? 'lot-editing-row' : ''}>
              <td><strong>{row.lot_number}</strong><small className="lot-row-context">{formatDate(row.inspection_date)} · {row.work_order}<br />{row.product_reference} · {row.client_name}</small></td>
              <td>{row.lot_qty.toLocaleString(locale)}</td><td>{row.sample_qty.toLocaleString(locale)}</td>
              <td><span className={`lot-decision-badge ${row.decision === 'OK' ? 'lot-is-ok' : 'lot-is-nok'}`}>{row.decision === 'OK' ? <CheckCircle2 size={15} /> : <ShieldAlert size={15} />}{row.decision}</span></td>
              <td>{row.defect || '—'}</td><td>{row.corrective_action ? t(row.corrective_action) : '—'}</td><td>{row.inspector_name}</td>
              <td><button type="button" className="icon-only" disabled={!canSave} onClick={() => editInspection(row)} aria-label={t('Modifier le lot {lot}', { lot: row.lot_number })}><Edit3 size={17} /></button></td>
            </tr>)}
            {!visibleRows.length && <tr><td colSpan="8" className="empty-row">{t('Aucun lot contrôlé pour ce département sur ce mois.')}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="lot-entry-footer"><p>{t('L’action et le défaut sont obligatoires uniquement pour une décision NOK.')}</p><div>{editingId && <button type="button" disabled={busy} onClick={newInspection}>{t('Annuler')}</button>}<button className="lot-save-button" type="submit" disabled={!canSave}><Save size={17} />{t(saving ? 'Enregistrement…' : 'Enregistrer le contrôle')}</button></div></div>
      {missingFields.length > 0 && <div className="lot-feedback lot-feedback-error" role="alert"><strong>{t('Champs à vérifier')}</strong><ul>{missingFields.map((field) => <li key={field}>{t(field)}</li>)}</ul></div>}
      {error && <p className="lot-feedback lot-feedback-error" role="alert">{t(error)}</p>}
      {notice && <p className="lot-feedback lot-feedback-success" role="status">{t(notice)}</p>}
    </form>

    <section className="lot-analysis" aria-labelledby="lot-analysis-title">
      <div className="lot-section-heading"><div><h2 id="lot-analysis-title">{t('Évolution des quantités')} — {t(form.department)}</h2><p>{monthLabel}</p></div></div>
      <div className="lot-statistics">
        <div><span>{t('Lots contrôlés')}</span><strong>{visibleRows.length.toLocaleString(locale)}</strong></div>
        <div><span>{t('Quantité contrôlée')}</span><strong>{totals.controlled.toLocaleString(locale)}</strong></div>
        <div className="lot-stat-ok"><span>{t('Quantité conforme')}</span><strong>{totals.conforming.toLocaleString(locale)}</strong></div>
        <div className="lot-stat-nok"><span>{t('Quantité bloquée')}</span><strong>{totals.blocked.toLocaleString(locale)}</strong></div>
      </div>
      <p className="lot-chart-rule">{t('Un lot OK est entièrement conforme ; un lot NOK est entièrement bloqué. L’échantillonnage est suivi séparément.')}</p>
      {mode === 'loading' || mode === 'error' ? <p className="empty-row">{t(mode === 'loading' ? 'Chargement des données…' : 'Chargement impossible')}</p> : <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={trend} margin={{ top: 20, right: 24, bottom: 12, left: 8 }}>
          <CartesianGrid stroke="#e1e8ef" vertical={false} />
          <XAxis dataKey="date" minTickGap={28} tickFormatter={(date) => new Date(`${date}T12:00:00`).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })} />
          <YAxis allowDecimals={false} domain={[0, 'auto']} tickFormatter={(value) => Number(value).toLocaleString(locale)} />
          <Tooltip labelFormatter={formatDate} formatter={(value, name) => [Number(value).toLocaleString(locale), name]} />
          <Legend />
          <Line dataKey="controlled" name={t('Quantité contrôlée')} type="linear" stroke="#2462a0" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
          <Line dataKey="conforming" name={t('Quantité conforme')} type="linear" stroke="#16945b" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          <Line dataKey="blocked" name={t('Quantité bloquée')} type="linear" stroke="#dc3545" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>}
    </section>
  </main>;
}
