import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';
import React, { act } from 'react';

// Optional DOM package, installed outside the project for this isolated test.
test('the UI rolls over without deleting October, supports history and persists month closure', { skip: !process.env.JSDOM_MODULE }, async () => {
  const { JSDOM } = await import(pathToFileURL(process.env.JSDOM_MODULE).href);
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
  const originalGlobals = Object.fromEntries(['window', 'document', 'navigator', 'localStorage', 'Date', 'IS_REACT_ACT_ENVIRONMENT', '__monthlyDownloads'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const originalTimezone = process.env.TZ;
  const RealDate = Date;
  let clock = new RealDate('2026-10-31T23:59:59+01:00');
  class TestDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : [clock.getTime()])); }
    static now() { return clock.getTime(); }
  }
  const timers = new Map();
  let timerId = 0;
  const bundlePath = fileURLToPath(new URL(`.monthly-ui-${process.pid}.mjs`, import.meta.url));
  let root;
  try {
    process.env.TZ = 'Africa/Lagos';
    for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage, Date: TestDate, IS_REACT_ACT_ENVIRONMENT: true, __monthlyDownloads: [] })) {
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    window.setInterval = (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; };
    window.clearInterval = (id) => timers.delete(id);
    const october = { id: 'local-oct', production_date: '2026-10-31', department: 'Injection', machine_code: 'OCT-MACHINE', product_reference: 'OCT-REF', work_order: 'OCT-OF', good_qty: 100, scrap_qty: 0, mod_count: 0, entry_status: 'Complete', note: 'REF_ARTICLE: OCT-ARTICLE' };
    localStorage.setItem('production_entries', JSON.stringify([october]));
    const source = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
      .replace("createRoot(document.getElementById('root')).render(<App />);", 'export { App };');
    const require = createRequire(import.meta.url);
    const xlsxUrl = pathToFileURL(require.resolve('xlsx/xlsx.mjs')).href;
    const output = await build({
      stdin: { contents: source, loader: 'jsx', sourcefile: 'main.jsx', resolveDir: fileURLToPath(new URL('../src', import.meta.url)) },
      bundle: true, platform: 'node', format: 'esm', write: false,
      external: ['react', 'react-dom/*', 'lucide-react', '@supabase/supabase-js'], loader: { '.css': 'empty' }, define: { 'import.meta.env': '{}' },
      plugins: [{ name: 'isolate-chart-and-download', setup(builder) {
        builder.onResolve({ filter: /^(recharts|xlsx)$/ }, (args) => ({ path: args.path, namespace: 'test-stub' }));
        builder.onResolve({ filter: /^file:/ }, (args) => ({ path: args.path, external: true }));
        builder.onLoad({ filter: /.*/, namespace: 'test-stub' }, (args) => ({ contents: args.path === 'xlsx'
          ? `import * as XLSX from ${JSON.stringify(xlsxUrl)}; export const utils=XLSX.utils; export const read=XLSX.read; export const writeFile=(workbook,name)=>globalThis.__monthlyDownloads.push({workbook,name});`
          : `import React from 'react';
             const Chart=({data,children})=>React.createElement('svg',{'data-chart-rows':JSON.stringify(data)},children);
             export const ComposedChart=Chart, BarChart=Chart;
             export const ResponsiveContainer=({children})=>React.createElement('div',null,children);
             const Empty=()=>null;
             export const Area=Empty,Bar=Empty,CartesianGrid=Empty,Cell=Empty,DefaultLegendContent=Empty,LabelList=Empty,Legend=Empty,Line=Empty,ReferenceLine=Empty,Tooltip=Empty,XAxis=Empty,YAxis=Empty;`, loader: 'js' }));
      } }],
    });
    writeFileSync(bundlePath, output.outputFiles[0].text);
    const { App } = await import(pathToFileURL(bundlePath).href);
    const { createRoot } = await import('react-dom/client');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(App)));
    const monthInput = () => document.querySelector('input[type="month"]');
    const button = (text) => [...document.querySelectorAll('button')].find((node) => node.textContent === text);
    const click = async (node) => { assert.ok(node); assert.equal(node.disabled, false); await act(async () => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))); };
    const change = async (node, value) => {
      const prototype = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
      await act(async () => {
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
        node.dispatchEvent(new window.Event('input', { bubbles: true }));
        node.dispatchEvent(new window.Event('change', { bubbles: true }));
      });
    };
    assert.equal(monthInput().value, '2026-10');
    assert.ok(document.body.textContent.includes('OCT-MACHINE'));
    assert.equal(document.querySelector('.month-entry-fields').disabled, false);
    clock = new RealDate('2026-11-01T00:00:01+01:00');
    await act(async () => [...timers.values()].find(({ delay }) => delay === 30000).callback());
    assert.equal(monthInput().value, '2026-11');
    assert.ok(!document.body.textContent.includes('OCT-MACHINE'));
    for (const chart of document.querySelectorAll('[data-chart-rows]')) {
      const rows = JSON.parse(chart.getAttribute('data-chart-rows'));
      assert.ok(rows.every(({ date }) => !date || date.startsWith('2026-11-')));
    }
    assert.equal(JSON.parse(localStorage.getItem('production_entries')).length, 1);
    const form = document.querySelector('.production-sheet');
    await change(form.querySelectorAll('select')[1], 'D230.1');
    await change(form.querySelectorAll('select')[2], 'D230.1');
    await change(form.querySelector('input[placeholder="OF / Bon"]'), 'NOV-OF');
    const numbers = form.querySelectorAll('input[type="number"]');
    await change(numbers[0], '50');
    await change(numbers[2], '0');
    await act(async () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    const stored = JSON.parse(localStorage.getItem('production_entries'));
    assert.equal(stored.length, 2);
    assert.ok(stored.some((row) => row.production_date === '2026-11-01' && row.work_order === 'NOV-OF'));
    await change(monthInput(), '2026-10');
    assert.ok(document.body.textContent.includes('OCT-MACHINE'));
    assert.ok(!document.body.textContent.includes('NOV-OF'));
    await click(button('Clôturer le mois'));
    assert.equal(localStorage.getItem('monthly_closures'), null, 'Opening confirmation must not close anything');
    await click(button('Exporter et clôturer'));
    assert.equal(document.querySelector('.month-entry-fields').disabled, true);
    assert.equal(button('Clôturer le mois').disabled, true);
    const archived = JSON.parse(localStorage.getItem('monthly_closures'))[0];
    assert.equal(archived.month, '2026-10-01');
    assert.equal(archived.snapshot.production_entries.length, 1);
    assert.equal(globalThis.__monthlyDownloads[0].name, 'bilan_2026-10.xlsx');
    await click(button('Exporter le mois'));
    assert.equal(globalThis.__monthlyDownloads.length, 2);
    await click(button('Mois actuel'));
    assert.equal(monthInput().value, '2026-11');
    assert.equal(document.querySelector('.month-entry-fields').disabled, false);
    assert.ok(document.body.textContent.includes('NOV-OF'));
    await change(monthInput(), '2026-10');
    clock = new RealDate('2026-12-01T00:00:01+01:00');
    await act(async () => [...timers.values()].find(({ delay }) => delay === 30000).callback());
    assert.equal(monthInput().value, '2026-10', 'A historical month chosen manually stays selected');
    await act(async () => root.unmount());
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(App)));
    assert.equal(monthInput().value, '2026-12', 'A fresh opening uses the current month');
    await change(monthInput(), '2026-10');
    assert.equal(document.querySelector('.month-entry-fields').disabled, true, 'Closure survives reloading the app');
    assert.ok(document.body.textContent.includes('OCT-MACHINE'));
  } finally {
    if (root) await act(async () => root.unmount());
    dom.window.close();
    try { unlinkSync(bundlePath); } catch {}
    for (const [key, descriptor] of Object.entries(originalGlobals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    if (originalTimezone == null) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});
