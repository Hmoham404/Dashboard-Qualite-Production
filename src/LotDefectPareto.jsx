import React, { useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, LabelList, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { lotDefectPareto } from './lotInspections.js';

export default function LotDefectPareto({ rows, department, monthLabel, mode, t, locale }) {
  const data = useMemo(() => lotDefectPareto(rows), [rows]);
  const total = data.reduce((sum, entry) => sum + entry.lots, 0);
  const percent = (value) => `${Number(value).toLocaleString(locale, { maximumFractionDigits: 1 })} %`;
  const ready = !['loading', 'error'].includes(mode);

  return <section className="lot-analysis lot-pareto-analysis" aria-labelledby="lot-pareto-title">
    <div className="lot-section-heading">
      <div><h2 id="lot-pareto-title">{t('Pareto des défauts')} — {t(department)}</h2><p>{monthLabel}</p></div>
      {ready && <dl className="lot-pareto-total"><dt>{t('Lots avec défaut')}</dt><dd>{total.toLocaleString(locale)}</dd></dl>}
    </div>
    <p className="lot-chart-rule">{t('Lots OK et NOK avec un défaut renseigné, classés par fréquence décroissante. Chaque lot compte une fois ; la courbe indique le pourcentage cumulé.')}</p>
    {!ready ? <p className="empty-row" role="status">{t(mode === 'loading' ? 'Chargement des données…' : 'Chargement impossible')}</p>
      : !data.length ? <p className="empty-row" role="status">{t('Aucun défaut renseigné pour ce département sur ce mois.')}</p>
        : <>
          <div className="lot-pareto-chart-scroll">
            <div className="lot-pareto-chart" style={{ minWidth: Math.max(600, data.length * 120) }}>
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={data} margin={{ top: 30, right: 28, bottom: 16, left: 8 }} accessibilityLayer>
                  <CartesianGrid stroke="#e1e8ef" vertical={false} />
                  <XAxis dataKey="defect" interval={0} height={72} tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis yAxisId="lots" allowDecimals={false} domain={[0, (maximum) => Math.max(1, Math.ceil(maximum * 1.15))]} width={55} />
                  <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={percent} width={65} />
                  <Tooltip formatter={(value, name) => [name === t('Cumul (%)') ? percent(value) : Number(value).toLocaleString(locale), name]} />
                  <Legend />
                  <ReferenceLine yAxisId="percent" y={80} stroke="#9baabd" strokeDasharray="5 5" label={{ value: '80 %', position: 'insideTopLeft', fill: '#60738b', fontSize: 11 }} />
                  <Bar yAxisId="lots" dataKey="lots" name={t('Nombre de lots')} fill="#2462a0" maxBarSize={64} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="lots" position="top" fill="#24466e" fontSize={12} formatter={(value) => Number(value).toLocaleString(locale)} />
                  </Bar>
                  <Line yAxisId="percent" dataKey="cumulativePercent" name={t('Cumul (%)')} type="linear" stroke="#c42b76" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <details className="lot-pareto-details">
            <summary>{t('Voir les données du Pareto')}</summary>
            <div className="lot-table-scroll"><table className="lot-inspections-table">
              <thead><tr><th scope="col">{t('Défaut')}</th><th scope="col">{t('Nombre de lots')}</th><th scope="col">{t('Cumul (%)')}</th></tr></thead>
              <tbody>{data.map((entry) => <tr key={entry.defect}><th scope="row">{entry.defect}</th><td>{entry.lots.toLocaleString(locale)}</td><td>{percent(entry.cumulativePercent)}</td></tr>)}</tbody>
            </table></div>
          </details>
        </>}
  </section>;
}
