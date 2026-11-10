import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, PlusCircle, Search, Trash2, X } from 'lucide-react';
import { entryDateForMonth } from './monthly.js';
import { buildComplaintMonth, searchComplaints } from './customerComplaints.js';
import { userMessage } from './userMessage.js';

export default function CustomerComplaints({ rows, month, today, ready, error, canWrite, readOnly = false, onAdd, onDelete, t, locale }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [query, setQuery] = useState('');
  const result = useMemo(() => buildComplaintMonth(rows, month), [rows, month]);
  const visible = useMemo(() => searchComplaints(result.complaints, { date: selectedDate, query }), [result, selectedDate, query]);
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const formatDate = (date, options) => new Date(`${date}T12:00:00`).toLocaleDateString(locale, options);
  const weekday = (index, length) => new Date(2024, 0, index + 1, 12).toLocaleDateString(locale, { weekday: length });
  const number = (value) => value.toLocaleString(locale, { maximumFractionDigits: 1 });
  useEffect(() => { setSelectedDate(''); setQuery(''); }, [month]);

  return <article className="panel span12 complaint-chart-panel customer-complaints" aria-labelledby="complaints-title">
    <header className="complaints-heading"><div><h2 id="complaints-title">{t('Réclamations clients')} — {monthLabel}</h2>
      <p>{t('Calendrier et registre mensuel · tous clients et départements.')}</p></div>
      {!readOnly && <button type="button" className="primary complaints-add" disabled={!canWrite || !ready} onClick={() => onAdd(selectedDate || entryDateForMonth(month, today))}><PlusCircle size={17} />{t('Ajouter une réclamation')}</button>}
    </header>
    {error && <p className="complaint-error" role="alert">{t(userMessage(error))}</p>}
    {!ready ? <p className="empty-row" role="status">{t(error ? 'Chargement impossible' : 'Chargement des données…')}</p> : <>
      <dl className="complaints-metrics">
        <div><dt>{t('Réclamations ce mois')}</dt><dd data-complaint-total>{number(result.total)}</dd></div>
        <div><dt>{t('Jours concernés')}</dt><dd data-complaint-days>{number(result.daysAffected)}</dd></div>
        <div className={result.change > 0 ? 'complaint-increase' : result.change < 0 ? 'complaint-decrease' : ''}><dt>{t('Écart avec le mois précédent')}</dt>
          <dd data-complaint-change>{result.change > 0 ? '+' : ''}{number(result.change)}{result.changePercent != null && <small>({result.changePercent > 0 ? '+' : ''}{number(result.changePercent)} %)</small>}</dd>
          <p>{t('Mois précédent : {count} réclamation(s).', { count: number(result.previousTotal) })}</p></div>
      </dl>
      <div className="complaints-workspace">
        <section className="complaint-calendar" aria-label={t('Calendrier des réclamations')}>
          <div className="complaint-calendar-heading"><CalendarDays size={17} /><strong>{monthLabel}</strong><span>{t('Sélectionnez un jour pour consulter ses réclamations.')}</span></div>
          <div className="complaint-weekdays" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <abbr key={index} title={weekday(index, 'long')}>{weekday(index, 'short')}</abbr>)}</div>
          <div className="complaint-calendar-days" role="group" aria-label={t('Jours du mois')}>
            {result.cells.map((day, index) => day ? <button type="button" key={day.date} data-complaint-date={day.date}
              className={`complaint-day${day.count ? ' has-complaints' : ''}${day.count > 1 ? ' has-several' : ''}${day.date === today ? ' is-today' : ''}`}
              aria-label={`${formatDate(day.date, { dateStyle: 'full' })} · ${t('{count} réclamation(s)', { count: number(day.count) })}`}
              aria-pressed={selectedDate === day.date} aria-current={day.date === today ? 'date' : undefined}
              onClick={() => setSelectedDate((current) => current === day.date ? '' : day.date)}>
              <time dateTime={day.date}>{number(Number(day.date.slice(-2)))}</time><span className="complaint-day-count" aria-hidden="true">{day.count ? number(day.count) : '—'}</span>
            </button> : <span className="complaint-day-empty" key={`empty-${index}`} />)}
          </div>
          <div className="complaint-calendar-legend"><span><i />{t('Aucune réclamation')}</span><span><i className="has-complaints" />{t('Une réclamation')}</span><span><i className="has-several" />{t('Plusieurs réclamations')}</span></div>
        </section>
        <section className="complaint-register" aria-labelledby="complaint-register-title">
          <div className="complaint-register-heading"><div><h3 id="complaint-register-title">{selectedDate ? formatDate(selectedDate, { dateStyle: 'long' }) : t('Liste des réclamations')}</h3><p role="status" aria-live="polite">{t('{count} résultat(s)', { count: number(visible.length) })}</p></div>
            {selectedDate && <button type="button" onClick={() => setSelectedDate('')}><X size={14} />{t('Tout le mois')}</button>}</div>
          <label className="complaint-search"><span className="visually-hidden">{t('Rechercher une réclamation')}</span><Search size={17} aria-hidden="true" /><input type="search" value={query} placeholder={t('Rechercher dans les réclamations…')} onChange={(event) => setQuery(event.target.value)} /></label>
          <div className="complaints-table-wrap"><table className="complaints-table">
            <thead><tr><th scope="col">{t('Date')}</th><th scope="col">{t('Réclamation client')}</th><th scope="col" hidden={readOnly}>{t('Actions')}</th></tr></thead>
            <tbody>{visible.map((complaint) => <tr key={complaint.id}><td>{formatDate(complaint.date)}</td><td>{complaint.details}</td>
              <td hidden={readOnly}>{!readOnly && <button type="button" className="icon-only danger-icon" disabled={!canWrite} aria-label={t('Supprimer la réclamation du {date}', { date: formatDate(complaint.date) })} onClick={() => onDelete(complaint)}><Trash2 size={16} /></button>}</td></tr>)}
              {!visible.length && <tr><td colSpan={readOnly ? 2 : 3} className="empty-row">{t(result.total && (query || selectedDate) ? 'Aucune réclamation pour cette sélection.' : 'Aucune réclamation enregistrée.')}</td></tr>}
            </tbody>
          </table></div>
        </section>
      </div>
    </>}
  </article>;
}
