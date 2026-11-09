import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const categories = [
  { key: 'controlled', label: 'Contrôlés', color: '#2462a0' },
  { key: 'conforming', label: 'Acceptés', color: '#16945b' },
  { key: 'blocked', label: 'Rejetés', color: '#dc3545' },
];

function DailyHistogram({ id, title, values, t, locale }) {
  const data = categories.map((category) => ({ ...category, label: t(category.label), value: values[category.key] }));
  const formatNumber = (value) => Number(value).toLocaleString(locale);

  return <figure className="lot-daily-chart" aria-labelledby={id}>
    <figcaption id={id}>{title}</figcaption>
    <div className="lot-daily-chart-plot" aria-hidden="true">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 28, right: 16, bottom: 8, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid stroke="#e1e8ef" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#526a7b' }} interval={0} />
          <YAxis allowDecimals={false} domain={[0, (maximum) => Math.max(1, Math.ceil(maximum * 1.15))]} tickFormatter={formatNumber} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 11, fill: '#64778c' }} />
          <Tooltip cursor={{ fill: '#f4f7fa' }} formatter={(value) => [formatNumber(value), title]} />
          <Bar dataKey="value" maxBarSize={72} radius={[5, 5, 0, 0]} isAnimationActive={false}>
            {data.map((item) => <Cell key={item.key} fill={item.color} />)}
            <LabelList dataKey="value" position="top" formatter={formatNumber} fill="#17364c" fontSize={13} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <dl className="lot-daily-chart-values">
      {data.map((item) => <div key={item.key}>
        <dt><span className="lot-daily-key" style={{ backgroundColor: item.color }} />{item.label}</dt>
        <dd>{formatNumber(item.value)}</dd>
      </div>)}
    </dl>
  </figure>;
}

export default function LotDailyHistograms({ summary, date, month, today, department, bounds, onDateChange, onToday, mode, t, locale }) {
  const available = ['local', 'missing', 'remote'].includes(mode);
  return <section className="lot-analysis lot-daily-analysis" aria-labelledby="lot-daily-title">
    <div className="lot-section-heading lot-daily-heading">
      <div><h2 id="lot-daily-title">{t('Bilan du jour')} — {t(department)}</h2><p>{new Date(`${date}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
      <div className="lot-daily-controls">
        <label>{t('Jour à analyser')}<input id="lot-analysis-date" type="date" min={bounds.from} max={month === today.slice(0, 7) ? today : bounds.to} value={date} onChange={(event) => onDateChange(event.target.value)} /></label>
        <button type="button" onClick={onToday} disabled={date === today}>{t('Aujourd’hui')}</button>
      </div>
    </div>
    {!available ? <p className="empty-row" role="status">{t(mode === 'loading' ? 'Chargement des données…' : 'Chargement impossible')}</p> : <>
      <div className="lot-daily-charts">
        <DailyHistogram id="lot-daily-count-title" title={t('Nombre de lots')} values={summary.lots} t={t} locale={locale} />
        <DailyHistogram id="lot-daily-quantity-title" title={t('Quantités des lots')} values={summary.quantities} t={t} locale={locale} />
      </div>
      {summary.lots.controlled === 0 && <p className="lot-daily-empty" role="status">{t('Aucun lot contrôlé pour ce département ce jour.')}</p>}
      <p className="lot-chart-rule lot-daily-rule">{t('Acceptés = OK ; rejetés = NOK. Les quantités portent sur les lots entiers, hors échantillonnage.')}</p>
    </>}
  </section>;
}
