import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';
import React, { act } from 'react';

// Chart geometry is simulated; the actual bar, dialog, aggregation and App wiring run.
test('a defect opens its departmental monthly trend by bar, keyboard and legend, and closes cleanly', { skip: !process.env.JSDOM_MODULE }, async () => {
  const { JSDOM } = await import(pathToFileURL(process.env.JSDOM_MODULE).href);
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const keys = ['window', 'document', 'navigator', 'localStorage', 'Date', 'IS_REACT_ACT_ENVIRONMENT'];
  const originals = Object.fromEntries(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const RealDate = Date;
  class TestDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : ['2026-10-28T12:00:00+01:00'])); }
  }
  const bundlePath = fileURLToPath(new URL(`.defect-ui-${process.pid}.mjs`, import.meta.url));
  let root;
  try {
    for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage, Date: TestDate, IS_REACT_ACT_ENVIRONMENT: true })) {
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    // JSDOM does not implement native modal display/focus handling.
    window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); this.querySelector('button').focus(); };
    window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    const row = (date, department, fields) => ({ id: `${date}-${department}-${JSON.stringify(fields)}`, production_date: date, department, client_name: 'Client A', good_qty: 100, scrap_qty: 0, note: '', ...fields });
    const entries = [
      row('2026-10-27', 'Injection', { scrap_qty: 6, defect_breakdown: [{ type: 'Bavure', qty: 4 }, { type: 'Rayure', qty: 2 }] }),
      row('2026-10-27', 'Injection', { scrap_qty: 2, defect_type: 'Bavure' }),
      row('2026-10-26', 'Injection', { scrap_qty: 3, note: 'REPARTITION_DEFAUTS: [{"type":"Bavure","qty":3}]' }),
      row('2026-10-25', 'Injection', { scrap_qty: 5, defect_type: 'Rayure' }),
      row('2026-10-27', 'Assemblage', { scrap_qty: 90, defect_type: 'Bavure' }),
      row('2026-09-27', 'Injection', { scrap_qty: 50, defect_type: 'Bavure' }),
      row('2026-10-27', 'Injection', { client_name: 'Client B', scrap_qty: 1000, defect_type: 'Bavure' }),
    ];
    localStorage.setItem('production_entries', JSON.stringify(entries));
    const source = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
      .replace("createRoot(document.getElementById('root')).render(<App />);", 'export { App };');
    const output = await build({
      stdin: { contents: source, loader: 'jsx', sourcefile: 'main.jsx', resolveDir: fileURLToPath(new URL('../src', import.meta.url)) },
      bundle: true, platform: 'node', format: 'esm', write: false,
      external: ['react', 'react-dom/*', 'lucide-react', '@supabase/supabase-js', 'xlsx'], loader: { '.css': 'empty' }, define: { 'import.meta.env': '{}' },
      plugins: [{ name: 'chart-geometry', setup(builder) {
        builder.onResolve({ filter: /^recharts$/ }, () => ({ path: 'recharts', namespace: 'test-chart' }));
        builder.onLoad({ filter: /.*/, namespace: 'test-chart' }, () => ({ loader: 'js', contents: `
          import React from 'react';
          const Rows=React.createContext([]);
          const Chart=({data,children})=>React.createElement(Rows.Provider,{value:data},React.createElement('svg',{'data-chart-rows':JSON.stringify(data)},children));
          export const ComposedChart=Chart,BarChart=Chart;
          export const ResponsiveContainer=({children})=>React.createElement('div',null,children);
          export const Bar=({shape})=>React.useContext(Rows).map((payload,index)=>shape ? React.createElement(React.Fragment,{key:index},shape({payload,x:index*40,y:0,width:30,height:100,fill:'#287fff'})) : null);
          export const Rectangle=({x,y,width,height,fill})=>React.createElement('rect',{x,y,width,height,fill});
          export const Line=({children})=>React.createElement('g',null,children);
          export const LabelList=({dataKey,formatter,className})=>React.useContext(Rows).map((day,index)=>React.createElement('text',{key:index,className},formatter ? formatter(day[dataKey]) : day[dataKey]));
          const Empty=()=>null;
          export const Area=Empty,CartesianGrid=Empty,Cell=Empty,DefaultLegendContent=Empty,Legend=Empty,ReferenceLine=Empty,Tooltip=Empty,XAxis=Empty,YAxis=Empty;
        ` }));
      } }],
    });
    writeFileSync(bundlePath, output.outputFiles[0].text);
    const { App } = await import(pathToFileURL(bundlePath).href);
    const { createRoot } = await import('react-dom/client');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(App)));
    const click = async (element) => { assert.ok(element); await act(async () => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))); };
    const selectClient = async (value) => act(async () => {
      const select = document.getElementById('filter-client');
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, value);
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    await selectClient('Client A');
    await click([...document.querySelectorAll('button')].find((button) => button.textContent === 'J-1'));
    const bar = () => document.querySelector('.defect-clickable-bar[aria-label$="Bavure"]');
    const dialog = () => document.querySelector('.defect-evolution-dialog');
    bar().focus();
    await click(bar());
    assert.ok(dialog().open);
    assert.match(dialog().textContent, /Évolution du défaut.*Bavure/);
    assert.match(dialog().textContent, /Injection.*octobre 2026/);
    const data = JSON.parse(dialog().querySelector('[data-chart-rows]').getAttribute('data-chart-rows'));
    assert.equal(data.length, 31);
    assert.equal(data[26].count, 6);
    assert.equal(data[25].count, 3, 'Legacy note breakdown is included');
    assert.equal(data[24].count, 0);
    assert.equal(data[0].count, 0);
    assert.equal(data[26].totalScrap, 8);
    assert.equal(data[26].share, .75, 'Daily share uses daily scrap, not the monthly denominator');
    const pointLabels = dialog().querySelectorAll('.defect-percentage-label');
    const formatPercent = (value) => new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 }).format(value);
    assert.equal(pointLabels.length, 31, 'Every point, including zero days, has a percentage label');
    assert.equal(pointLabels[26].textContent, formatPercent(.75));
    assert.equal(pointLabels[25].textContent, formatPercent(1));
    assert.equal(pointLabels[0].textContent, formatPercent(0));
    assert.equal(dialog().querySelector('dd').textContent, '9');
    assert.equal(dialog().querySelector('.defect-share-value').textContent, new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 2 }).format(9 / 16));
    assert.equal(dialog().querySelector('.defect-share small').textContent, '9 sur 16 rebuts', 'Denominator includes every defect across the month, only for this department and client');
    assert.equal(document.body.style.overflow, 'hidden');
    await click(dialog().querySelector('button'));
    assert.ok(dialog() === null, 'Close button removes the dialog');
    assert.equal(document.body.style.overflow, '');
    assert.ok(document.activeElement === bar(), 'Closing restores focus to the defect bar');
    await act(async () => bar().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    assert.ok(dialog().open);
    await act(async () => dialog().dispatchEvent(new window.Event('cancel', { cancelable: true })));
    assert.ok(dialog() === null, 'Escape/cancel removes the dialog');
    await act(async () => bar().dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true })));
    assert.ok(dialog().open);
    await click(dialog());
    assert.ok(dialog() === null, 'Backdrop click removes the dialog');
    await click(document.querySelector('.defect-type-legend button[aria-label$="Rayure"]'));
    assert.match(dialog().textContent, /Évolution du défaut.*Rayure/);
    assert.equal(dialog().querySelector('dd').textContent, '7');
    assert.equal(dialog().querySelector('.defect-share small').textContent, '7 sur 16 rebuts');
    await click(dialog().querySelector('button'));
    await selectClient('Client B');
    await click(bar());
    assert.equal(dialog().querySelector('.defect-share-value').textContent, new Intl.NumberFormat('fr-FR', { style: 'percent' }).format(1));
    assert.equal(dialog().querySelector('.defect-share small').textContent, '1 000 sur 1 000 rebuts');
    assert.deepEqual(JSON.parse(localStorage.getItem('production_entries')), entries, 'Viewing trends never changes stored records');
  } finally {
    if (root) await act(async () => root.unmount());
    dom.window.close();
    try { unlinkSync(bundlePath); } catch {}
    for (const [key, original] of Object.entries(originals)) {
      if (original) Object.defineProperty(globalThis, key, original);
      else delete globalThis[key];
    }
  }
});
