import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';
import React, { act } from 'react';
import { lotStorageKey } from '../src/lotInspections.js';
import { createTranslator } from '../src/i18n.js';

test('LOT saves OK/NOK controls, edits decisions, persists on reload and transfers local records to Supabase', { skip: !process.env.JSDOM_MODULE }, async () => {
  const { JSDOM } = await import(pathToFileURL(process.env.JSDOM_MODULE).href);
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/#lot' });
  const keys = ['window', 'document', 'navigator', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT'];
  const originals = Object.fromEntries(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const bundlePath = fileURLToPath(new URL(`.lot-ui-${process.pid}.mjs`, import.meta.url));
  let root;
  try {
    for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true })) {
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    const output = await build({
      entryPoints: [fileURLToPath(new URL('../src/LotWorkspacePage.jsx', import.meta.url))], bundle: true, platform: 'node', format: 'esm', write: false,
      external: ['react', 'lucide-react'],
      plugins: [{ name: 'chart-geometry', setup(builder) {
        builder.onResolve({ filter: /^recharts$/ }, () => ({ path: 'recharts', namespace: 'lot-chart' }));
        builder.onLoad({ filter: /.*/, namespace: 'lot-chart' }, () => ({ loader: 'js', contents: `
          import React from 'react';
          export const ResponsiveContainer=({children})=>React.createElement('div',null,children);
          export const ComposedChart=({data,children})=>React.createElement('svg',{'data-lot-trend':JSON.stringify(data)},children);
          const Empty=()=>null;
          export const CartesianGrid=Empty,Legend=Empty,Line=Empty,Tooltip=Empty,XAxis=Empty,YAxis=Empty;
        ` }));
      } }],
    });
    writeFileSync(bundlePath, output.outputFiles[0].text);
    const { default: LotPage } = await import(pathToFileURL(bundlePath).href);
    const { createRoot } = await import('react-dom/client');
    const props = { initialMonth: '2026-11', today: '2026-11-03', t: createTranslator('fr') };
    const render = async (extra = {}) => {
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(React.createElement(LotPage, { ...props, ...extra })));
    };
    const change = async (id, value) => {
      const node = document.getElementById(id);
      assert.ok(node, id);
      await act(async () => {
        const prototype = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
        node.dispatchEvent(new window.Event('input', { bubbles: true }));
        node.dispatchEvent(new window.Event('change', { bubbles: true }));
      });
    };
    const submit = async () => act(async () => document.querySelector('.lot-entry-panel').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    const totals = () => [...document.querySelectorAll('.lot-statistics strong')].map((node) => Number(node.textContent));
    await render();
    for (const [id, value] of [['lot-work-order', 'OF-1'], ['lot-reference', 'REF-1'], ['lot-client', 'Client A'], ['lot-number', 'LOT-1'], ['lot-quantity', '100'], ['lot-sample', '101'], ['lot-decision', 'OK'], ['lot-inspector', 'Qualiticien A']]) await change(id, value);
    assert.equal(document.getElementById('lot-action').disabled, true);
    await submit();
    assert.equal(localStorage.getItem(lotStorageKey), null, 'Invalid sample cannot be saved');
    assert.match(document.querySelector('[role="alert"]').textContent, /échantillonnage/);
    await change('lot-sample', '10');
    await submit();
    assert.deepEqual(totals(), [1, 100, 100, 0]);
    for (const [id, value] of [['lot-number', 'LOT-2'], ['lot-quantity', '200'], ['lot-sample', '20'], ['lot-decision', 'NOK'], ['lot-defect', 'Bavure']]) await change(id, value);
    assert.equal(document.getElementById('lot-action').disabled, false);
    await submit();
    assert.equal(JSON.parse(localStorage.getItem(lotStorageKey)).length, 1, 'NOK requires an action');
    await change('lot-action', 'Tri');
    await submit();
    assert.deepEqual(totals(), [2, 300, 100, 200]);
    assert.equal(document.querySelectorAll('.lot-decision-badge.lot-is-nok').length, 1);
    const chart = JSON.parse(document.querySelector('[data-lot-trend]').getAttribute('data-lot-trend'));
    assert.deepEqual(chart[2], { date: '2026-11-03', controlled: 300, conforming: 100, blocked: 200 });
    assert.equal(chart[0].controlled, 0);
    const blocked = JSON.parse(localStorage.getItem(lotStorageKey)).find((row) => row.decision === 'NOK');
    await act(async () => document.querySelector('[aria-label="Modifier le lot LOT-2"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    await change('lot-decision', 'OK');
    assert.equal(document.getElementById('lot-defect').value, '');
    await submit();
    assert.deepEqual(totals(), [2, 300, 300, 0]);
    assert.equal(JSON.parse(localStorage.getItem(lotStorageKey)).find((row) => row.id === blocked.id).corrective_action, null);
    await act(async () => root.unmount());
    await render();
    assert.deepEqual(totals(), [2, 300, 300, 0]);
    await change('lot-department', 'Soudure');
    assert.deepEqual(totals(), [0, 0, 0, 0]);
    await change('lot-department', 'Injection');
    await change('lot-month', '2026-10');
    assert.deepEqual(totals(), [0, 0, 0, 0]);
    await change('lot-month', '2026-11');
    assert.deepEqual(totals(), [2, 300, 300, 0]);
    await act(async () => root.unmount());
    const remote = [];
    const client = { from(table) {
      assert.equal(table, 'lot_inspections');
      let payload;
      return { select() { return this; }, order() { return this; }, range: async () => ({ data: remote, count: remote.length, error: null }),
        upsert(value) { payload = value; return this; },
        then(resolve, reject) { return Promise.resolve().then(() => {
          for (const row of payload) { const i = remote.findIndex((item) => item.id === row.id); if (i >= 0) remote[i] = row; else remote.push(row); }
          return { data: payload, error: null };
        }).then(resolve, reject); }
      };
    } };
    await render({ client });
    assert.deepEqual(totals(), [0, 0, 0, 0], 'Pending local records are not falsely shown as shared');
    const transfer = [...document.querySelectorAll('button')].find((node) => node.textContent.startsWith('Transférer'));
    assert.ok(transfer);
    await act(async () => transfer.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    assert.equal(remote.length, 2);
    assert.equal(JSON.parse(localStorage.getItem(lotStorageKey)).length, 0);
    assert.deepEqual(totals(), [2, 300, 300, 0]);
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
