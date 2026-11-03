import React, { useEffect, useRef } from 'react';
import { CartesianGrid, ComposedChart, Line, Rectangle, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { X } from 'lucide-react';

export function DefectBar({ payload, onSelect, label, ...props }) {
  return <g role="button" tabIndex={0} aria-label={label} className="defect-clickable-bar"
    onClick={(event) => onSelect(payload.type, event.currentTarget)}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(payload.type, event.currentTarget);
      }
    }}>
    <Rectangle {...props} />
  </g>;
}

export default function DefectEvolutionDialog({ selection, data, monthLabel, locale, t, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = selection.trigger;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const total = data.reduce((sum, day) => sum + (day.count || 0), 0);
  const peak = data.reduce((best, day) => (day.count || 0) > (best?.count || 0) ? day : best, null);
  const daysWithDefect = data.filter((day) => day.count > 0).length;
  const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString(locale);
  const quantityLabel = t('Qte rebut');

  return <dialog ref={dialogRef} className="defect-evolution-dialog" aria-labelledby="defect-evolution-title"
    aria-describedby="defect-evolution-description" onCancel={onClose}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="defect-evolution-window">
      <header className="defect-evolution-head">
        <div>
          <p className="defect-evolution-context">{t(selection.department)} · {monthLabel}</p>
          <h2 id="defect-evolution-title">{t('Évolution du défaut')} — {t(selection.type)}</h2>
        </div>
        <button type="button" className="icon-only" onClick={onClose} autoFocus aria-label={t('Fermer')}><X size={20} /></button>
      </header>
      <div className="defect-evolution-content">
        <p id="defect-evolution-description" className="chart-instruction">{t('Quantité de ce défaut par jour dans le département sélectionné, sur le mois affiché.')}</p>
        <dl className="defect-evolution-summary">
          <div><dt>{t('Total du mois')}</dt><dd>{total.toLocaleString(locale)}</dd></div>
          <div><dt>{t('Maximum journalier')}</dt><dd>{(peak?.count || 0).toLocaleString(locale)}<small>{peak ? formatDate(peak.date) : '—'}</small></dd></div>
          <div><dt>{t('Jours avec ce défaut')}</dt><dd>{daysWithDefect.toLocaleString(locale)}</dd></div>
        </dl>
        <div className="defect-evolution-chart" role="img" aria-label={t('Évolution du défaut : {defect}', { defect: t(selection.type) })}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data} margin={{ top: 18, right: 20, bottom: 12, left: 0 }}>
              <CartesianGrid stroke="#dbe5f2" vertical={false} />
              <XAxis dataKey="date" minTickGap={26} tickFormatter={(date) => new Date(`${date}T12:00:00`).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })} />
              <YAxis allowDecimals={false} domain={[0, 'auto']} tickFormatter={(value) => Number(value).toLocaleString(locale)} />
              <Tooltip labelFormatter={formatDate} formatter={(value) => [Number(value).toLocaleString(locale), quantityLabel]} />
              <ReferenceLine x={selection.date} stroke="#60738b" strokeDasharray="4 4" />
              <Line type="linear" dataKey="count" name={t(selection.type)} stroke={selection.color} strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} connectNulls={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="defect-evolution-note">{t('Les jours sans saisie ou sans ce défaut sont affichés à zéro.')}</p>
        <footer className="defect-evolution-footer"><button type="button" onClick={onClose}>{t('Fermer')}</button></footer>
      </div>
    </section>
  </dialog>;
}
