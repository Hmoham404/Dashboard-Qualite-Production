import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Edit3, PlusCircle, X } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { entryDateForMonth, monthBounds } from './monthly.js';
import { productionClients } from './productionFilters.js';
import { buildSortingMonth, newSortingOperation, saveSortingOperation, sortingDepartments, validateSortingOperation } from './sortingOperations.js';
import { userMessage } from './userMessage.js';

const colors = ['#2462a0', '#20a77a', '#d58a12', '#a64d79', '#63758b', '#7b6bb0', '#258e9c'];
const clientColor = (id) => colors[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length];

function OperationDialog({ draft, setDraft, existing, clients, bounds, locked, assertWritable, client, onSaved, onClose, t, locale }) {
  const dialogRef = useRef(null);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState([]);
  const [notice, setNotice] = useState('');
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current.showModal();
    dialogRef.current.querySelector('#sorting-client').focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (savingRef.current || locked) return;
    const another = event.nativeEvent.submitter?.value === 'another';
    const fields = validateSortingOperation(draft, existing);
    setInvalid(fields); setError(''); setNotice('');
    if (fields.length) return;
    try {
      assertWritable(draft.sorting_date, existing?.sorting_date);
      savingRef.current = true; setSaving(true);
      const saved = await saveSortingOperation(client, draft, existing);
      onSaved(saved);
      if (another) {
        setDraft(newSortingOperation(draft.sorting_date, draft.department, { client_name: draft.client_name }));
        setNotice('Tri enregistré. Vous pouvez ajouter une autre opération.');
      } else onClose();
    } catch (cause) { setError(cause.message || 'Enregistrement impossible'); }
    finally { savingRef.current = false; setSaving(false); }
  }

  const personHours = draft.hours !== '' && draft.headcount !== '' && draft.headcount != null
    ? Number(draft.hours || 0) * Number(draft.headcount) : null;
  return <dialog ref={dialogRef} className="sorting-dialog" aria-labelledby="sorting-operation-title"
    onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}>
    <form className="sorting-operation-form" onSubmit={submit} noValidate>
      <header><div><p>{t('Une ligne par opération de tri')}</p><h2 id="sorting-operation-title">{t(existing ? 'Modifier le tri' : 'Ajouter un tri')}</h2></div><button type="button" className="icon-only" disabled={saving} aria-label={t('Fermer')} onClick={onClose}><X size={18} /></button></header>
      {existing && !existing.client_name && <p className="sorting-help">{t('Ancienne saisie : le client peut être renseigné sans modifier les quantités.')}</p>}
      <fieldset disabled={saving || locked} className="sorting-form-grid">
        <label>{t('Date')}<input id="sorting-date" type="date" min={bounds.from} max={bounds.to} value={draft.sorting_date} onChange={(event) => update('sorting_date', event.target.value)} required /></label>
        <label>{t('Departement')}<select id="sorting-department" value={draft.department} onChange={(event) => update('department', event.target.value)}>{sortingDepartments.map((name) => <option key={name} value={name}>{t(name)}</option>)}</select></label>
        <label>{t('Client')}<input id="sorting-client" list="sorting-client-suggestions" value={draft.client_name || ''} onChange={(event) => update('client_name', event.target.value)} required={!existing || Boolean(existing.client_name)} /></label>
        <label>{t('Durée du tri (h)')}<input id="sorting-hours" type="number" min="0" max="999999.99" step="0.01" value={draft.hours} onChange={(event) => update('hours', event.target.value)} required /></label>
        <label>{t('Effectif')}<input id="sorting-headcount" type="number" min="0" max="2147483647" step="1" value={draft.headcount ?? ''} onChange={(event) => update('headcount', event.target.value)} required={existing?.headcount != null || !existing} /></label>
        <label>{t('Qte bonne après tri')}<input id="sorting-good" type="number" min="0" max="2147483647" step="1" value={draft.good_qty} onChange={(event) => update('good_qty', event.target.value)} required /></label>
        <label>{t('Qte rebut après tri')}<input id="sorting-scrap" type="number" min="0" max="2147483647" step="1" value={draft.scrap_qty} onChange={(event) => update('scrap_qty', event.target.value)} required /></label>
      </fieldset>
      <datalist id="sorting-client-suggestions">{clients.map((name) => <option value={name} key={name} />)}</datalist>
      <p className="sorting-help">{t('Heures-personnes = durée du tri × effectif.')} <strong>{personHours == null || !Number.isFinite(personHours) ? '—' : personHours.toLocaleString(locale, { maximumFractionDigits: 2 })}</strong></p>
      {invalid.length > 0 && <div role="alert" className="complaint-error">{t('Champs à vérifier')}<ul>{invalid.map((field) => <li key={field}>{t(field)}</li>)}</ul></div>}
      {error && <p role="alert" className="complaint-error">{t(userMessage(error))}</p>}
      {notice && <p role="status" className="lot-feedback-success">{t(notice)}</p>}
      <footer><button type="button" disabled={saving} onClick={onClose}>{t('Annuler')}</button><button type="submit" value="another" disabled={saving || locked}>{t('Enregistrer et ajouter un autre tri')}</button><button type="submit" className="primary" value="close" disabled={saving || locked}>{t(saving ? 'Enregistrement…' : 'Enregistrer')}</button></footer>
    </form>
  </dialog>;
}

export default function SortingWorkspace({ rows, month, today, initialDepartment, allClients = [], client, readOnly = false,
  ready, locked, error, assertWritable, onSaved, t, locale }) {
  const [department, setDepartment] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [detailDate, setDetailDate] = useState('');
  const [draft, setDraft] = useState(null);
  const base = useMemo(() => buildSortingMonth(rows, month, { department }), [rows, month, department]);
  const result = useMemo(() => buildSortingMonth(rows, month, { department, client: clientFilter }), [rows, month, department, clientFilter]);
  const existing = draft ? rows.find((row) => row.id === draft.id) : null;
  const bounds = monthBounds(month);
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString(locale);
  const formatNumber = (value) => Number(value || 0).toLocaleString(locale, { maximumFractionDigits: 2 });
  const canWrite = !readOnly && ready && !locked && Boolean(client);
  const clientName = (name) => name || t('Client non renseigné');
  const suggestions = useMemo(() => productionClients([...allClients.map((name) => ({ client_name: name })), ...rows]), [allClients, rows]);
  const visibleOperations = result.operations.filter((row) => !detailDate || row.sorting_date === detailDate)
    .sort((a, b) => b.sorting_date.localeCompare(a.sorting_date) || String(a.created_at || '').localeCompare(String(b.created_at || '')) || a.id.localeCompare(b.id));
  useEffect(() => {
    if (clientFilter && !base.options.some((option) => option.id === clientFilter)) setClientFilter('');
  }, [base, clientFilter]);

  function addOperation() {
    setDraft(newSortingOperation(detailDate || entryDateForMonth(month, today), department || initialDepartment,
      { client_name: base.options.find((option) => option.id === clientFilter)?.name || '' }));
  }
  function chooseDay(state) {
    if (result.data.some((point) => point.date === state?.activeLabel)) setDetailDate(state.activeLabel);
  }

  return <article className="panel span12 sorting-hours-panel" aria-labelledby="sorting-workspace-title">
    <div className="sorting-heading"><div><h2 id="sorting-workspace-title">{t('Heures de tri par jour')} — {monthLabel}</h2><p className="sorting-help">{t(readOnly ? 'Heures de tri par client et par jour.' : 'Plusieurs clients et plusieurs opérations peuvent être enregistrés le même jour.')}</p></div>{!readOnly && <button className="primary" type="button" disabled={!canWrite} onClick={addOperation}><PlusCircle size={17} />{t('Ajouter un tri')}</button>}</div>
    <div className="sorting-filters">
      <label>{t('Departement')}<select id="sorting-filter-department" value={department} onChange={(event) => { setDepartment(event.target.value); setClientFilter(''); }}><option value="">{t('Tous les départements')}</option>{sortingDepartments.map((name) => <option key={name} value={name}>{t(name)}</option>)}</select></label>
      <label>{t('Client')}<select id="sorting-filter-client" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option value="">{t('Tous')}</option>{base.options.map((option) => <option key={option.id} value={option.id}>{clientName(option.name)}</option>)}</select></label>
      <p className="sorting-help">{t('Barres : heures par client. Courbe : cumul des heures du mois. Cliquez sur un jour pour voir ses opérations.')}</p>
    </div>
    {error && <p className="complaint-error" role="alert">{t(userMessage(error))}</p>}
    {!client && !readOnly && <p className="sorting-help">{t('L’enregistrement des tris est indisponible.')}</p>}
    {!ready ? <p role="status" className="empty-row">{t(error ? 'Chargement impossible' : 'Chargement des données…')}</p> : <>
      <dl className="sorting-summary">
        <div><dt>{t('Durée du tri (h)')}</dt><dd>{formatNumber(result.totalHours)}</dd></div>
        <div><dt>{t('Heures-personnes')}</dt><dd>{result.operations.length > 0 && result.unknownHeadcount === result.operations.length ? '—' : formatNumber(result.personHours)}</dd>{result.unknownHeadcount > 0 && <small>{t('Calcul partiel : {count} tri(s) sans effectif.', { count: result.unknownHeadcount })}</small>}</div>
        <div><dt>{t('Opérations de tri')}</dt><dd>{result.operations.length.toLocaleString(locale)}</dd></div>
        <div><dt>{t('Qte bonne après tri')}</dt><dd>{formatNumber(result.goodQty)}</dd></div>
        <div><dt>{t('Qte rebut après tri')}</dt><dd>{formatNumber(result.scrapQty)}</dd></div>
      </dl>
      <div className="sorting-chart-scroll"><div className="sorting-chart">
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={result.data} margin={{ top: 16, right: 16, bottom: 10, left: 0 }} onClick={chooseDay} accessibilityLayer>
            <CartesianGrid stroke="#dbe5f2" vertical={false} />
            <XAxis dataKey="date" interval={0} tick={{ fontSize: 11 }} tickFormatter={(date) => date.slice(-2)} />
            <YAxis yAxisId="hours" tickFormatter={(value) => `${formatNumber(value)} h`} width={66} />
            <YAxis yAxisId="cumulative" orientation="right" tickFormatter={(value) => `${formatNumber(value)} h`} width={70} />
            <Tooltip wrapperStyle={{ pointerEvents: 'auto', zIndex: 20 }} content={({ active, payload, label }) => {
              const day = payload?.[0]?.payload;
              if (!active || !day) return null;
              const operations = result.operations.filter((row) => row.sorting_date === day.date);
              return <div className="chart-tooltip sorting-chart-tooltip"><strong>{formatDate(label)}</strong>{result.series.filter((item) => day[item.key] > 0).map((item) => <div key={item.key}>{clientName(item.name)} : {formatNumber(day[item.key])} h</div>)}<div>{t('Durée du tri (h)')} : {formatNumber(day.total)}</div><div>{t('Cumul des heures')} : {formatNumber(day.cumulative)} h</div><div>{t('Opérations de tri')} : {day.operations}</div><div>{t('Qte bonne après tri')} : {formatNumber(day.goodQty)}</div><div>{t('Qte rebut après tri')} : {formatNumber(day.scrapQty)}</div>
                {operations.length > 0 && <div className="sorting-tooltip-operations">{operations.map((row) => <div className="sorting-tooltip-operation" key={row.id}>
                  <strong>{clientName(row.client_name)} · {t(row.department)}</strong>
                  <div>{t('Durée du tri (h)')} : {formatNumber(row.hours)} · {t('Effectif')} : {row.headcount ?? '—'}</div>
                  <div>{t('Qte bonne après tri')} : {formatNumber(row.good_qty)} · {t('Qte rebut après tri')} : {formatNumber(row.scrap_qty)}</div>
                  {row.product_reference && <div>{t('Reference produit')} : {row.product_reference}</div>}
                  {row.lot_number && <div>{t('Numéro de lot')} : {row.lot_number}</div>}
                </div>)}</div>}
              </div>;
            }} />
            <Legend />
            {result.series.map((item) => <Bar key={item.id} yAxisId="hours" stackId="clients" dataKey={item.key} name={clientName(item.name)} fill={item.id === 'unassigned' ? '#8896a5' : clientColor(item.id)} maxBarSize={34} isAnimationActive={false} />)}
            <Line yAxisId="cumulative" dataKey="cumulative" name={t('Cumul des heures')} stroke="#17364c" strokeWidth={2} type="linear" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div></div>
      {!result.operations.length && <p className="empty-row" role="status">{t('Aucun tri pour ces filtres sur ce mois.')}</p>}
      <div className="sorting-detail-heading"><h3>{t('Opérations de tri')}</h3><label>{t('Jour à consulter')}<input id="sorting-detail-date" type="date" min={bounds.from} max={bounds.to} value={detailDate} onChange={(event) => { const date = event.target.value; if (!date || (date >= bounds.from && date <= bounds.to)) setDetailDate(date); }} /></label>{detailDate && <button type="button" onClick={() => setDetailDate('')}>{t('Tout le mois')}</button>}</div>
      <div className="sorting-table-scroll"><table className="sorting-operations-table">
        <thead><tr>{['Date', 'Departement', 'Client', 'Durée du tri (h)', 'Effectif', 'Heures-personnes', 'Qte bonne après tri', 'Qte rebut après tri', 'Actions'].map((label) => <th scope="col" key={label} hidden={readOnly && label === 'Actions'}>{t(label)}</th>)}</tr></thead>
        <tbody>{visibleOperations.map((row) => <tr key={row.id}><td>{formatDate(row.sorting_date)}</td><td>{t(row.department)}</td><td>{clientName(row.client_name)}</td><td>{formatNumber(row.hours)}</td><td>{row.headcount ?? '—'}</td><td>{row.headcount == null ? '—' : formatNumber(Number(row.hours) * row.headcount)}</td><td>{formatNumber(row.good_qty)}</td><td>{formatNumber(row.scrap_qty)}</td><td hidden={readOnly}>{!readOnly && <button type="button" disabled={!canWrite} aria-label={t('Modifier le tri')} onClick={() => setDraft({ ...row })}><Edit3 size={16} /></button>}</td></tr>)}{!visibleOperations.length && <tr><td colSpan={readOnly ? 8 : 9} className="empty-row">{t('Aucun tri pour ces filtres sur ce mois.')}</td></tr>}</tbody>
      </table></div>
    </>}
    {!readOnly && draft && <OperationDialog draft={draft} setDraft={setDraft} existing={existing} clients={suggestions} bounds={bounds} locked={!canWrite}
      assertWritable={assertWritable} client={client} onSaved={onSaved} onClose={() => setDraft(null)} t={t} locale={locale} />}
  </article>;
}
