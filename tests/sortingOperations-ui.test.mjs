import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';
import React, { act, useState } from 'react';
import { createTranslator } from '../src/i18n.js';

test('sorting UI saves several clients and lots per day, edits one operation, filters the chart, reloads and respects locks', { skip: !process.env.JSDOM_MODULE }, async () => {
  const { JSDOM } = await import(pathToFileURL(process.env.JSDOM_MODULE).href);
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const keys = ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT'];
  const originals = Object.fromEntries(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const bundlePath = fileURLToPath(new URL(`.sorting-ui-${process.pid}.mjs`, import.meta.url));
  let root;
  const remote = [{ id: 'legacy', created_at: '2026-11-09T08:00:00Z', sorting_date: '2026-11-09', department: 'Assemblage', client_name: null, product_reference: 'REF-HIST', lot_number: 'LOT-HIST', hours: 7, headcount: null, good_qty: 100, scrap_qty: 2 }];
  const guards = [];
  let failNext = false;
  try {
    for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
    const output = await build({
      entryPoints: [fileURLToPath(new URL('../src/SortingWorkspace.jsx', import.meta.url))], bundle: true, platform: 'node', format: 'esm', write: false,
      external: ['react', 'lucide-react'], plugins: [{ name: 'sorting-chart-geometry', setup(builder) {
        builder.onResolve({ filter: /^recharts$/ }, () => ({ path: 'recharts', namespace: 'sorting-chart' }));
        builder.onLoad({ filter: /.*/, namespace: 'sorting-chart' }, () => ({ loader: 'js', contents: `
          import React from 'react';
          const Rows=React.createContext([]);
          export const ResponsiveContainer=({children})=>React.createElement('div',null,children);
          export const ComposedChart=({data,children,onClick})=>React.createElement(Rows.Provider,{value:data},React.createElement('svg',{'data-sorting-chart':JSON.stringify(data),onClick:()=>onClick?.({activeLabel:data[8].date})},children));
          export const Bar=({dataKey,stackId,name})=>React.createElement('g',{'data-client-series':name,'data-stack':stackId});
          export const Line=({name})=>React.createElement('g',{'data-cumulative':name});
          export const Tooltip=({content})=>{const day=React.useContext(Rows)[8];return React.createElement('foreignObject',null,content({active:true,payload:[{payload:day}],label:day.date}));};
          const Empty=()=>null; export const CartesianGrid=Empty,Legend=Empty,XAxis=Empty,YAxis=Empty;
        ` }));
      } }],
    });
    writeFileSync(bundlePath, output.outputFiles[0].text);
    const { default: Workspace } = await import(pathToFileURL(bundlePath).href);
    const client = { from(table) {
      assert.equal(table, 'sorting_hours');
      let payload;
      return { upsert(value, options) { assert.deepEqual(options, { onConflict: 'id' }); payload = structuredClone(value); return this; }, select() { return this; }, single: async () => {
        if (failNext) { failNext = false; return { error: new Error('Network failed') }; }
        const i = remote.findIndex((row) => row.id === payload.id);
        if (i < 0) remote.push(payload); else remote[i] = payload;
        return { data: payload, error: null };
      } };
    } };
    function TestApp({ locked = false }) {
      const [rows, setRows] = useState(() => structuredClone(remote));
      return React.createElement(Workspace, { rows, month: '2026-11', today: '2026-11-10', initialDepartment: 'Assemblage', client, ready: true, locked,
        allClients: ['KIKO', 'Belloti'], t: createTranslator('fr'), locale: 'fr-FR',
        assertWritable(date, original) { guards.push([date, original]); },
        onSaved(saved) { setRows((current) => [saved, ...current.filter((row) => row.id !== saved.id)]); } });
    }
    const { createRoot } = await import('react-dom/client');
    const mount = async () => { root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(TestApp))); };
    await mount();
    const click = async (node) => { assert.ok(node); await act(async () => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))); };
    const change = async (id, value) => {
      const node = document.getElementById(id);
      assert.ok(node, id);
      await act(async () => {
        const prototype = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
        node.dispatchEvent(new window.Event('input', { bubbles: true })); node.dispatchEvent(new window.Event('change', { bubbles: true }));
      });
    };
    const submit = async (another = false) => {
      const submitter = document.querySelector(`.sorting-operation-form button[value="${another ? 'another' : 'close'}"]`);
      await act(async () => document.querySelector('.sorting-operation-form').dispatchEvent(new window.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter })));
    };
    const chart = () => JSON.parse(document.querySelector('[data-sorting-chart]').getAttribute('data-sorting-chart'));
    const tableRows = () => [...document.querySelectorAll('.sorting-operations-table tbody tr')];
    const add = () => document.querySelector('.sorting-heading button');
    const fill = async (name, hours, staff) => {
      for (const [id, value] of Object.entries({ 'sorting-date': '2026-11-09', 'sorting-client': name, 'sorting-hours': hours, 'sorting-headcount': staff, 'sorting-good': '100', 'sorting-scrap': '5' })) await change(id, value);
    };
    assert.equal(chart()[8].total, 7);
    assert.ok(![...document.querySelectorAll('.sorting-operations-table thead th')].some((node) => ['Reference produit', 'Numéro de lot'].includes(node.textContent)), 'Reference and lot columns are removed');
    assert.match(document.querySelector('.sorting-chart-tooltip').textContent, /Assemblage/, 'The chart tooltip identifies departments');
    assert.match(document.querySelector('.sorting-summary').textContent, /Calcul partiel/);
    await click(add());
    assert.equal(document.getElementById('sorting-reference'), null, 'Reference is removed from the add form');
    assert.equal(document.getElementById('sorting-lot'), null, 'Lot number is removed from the add form');
    await submit();
    assert.ok(document.querySelector('.sorting-dialog [role="alert"]'), 'An incomplete operation is rejected');
    assert.equal(remote.length, 1);
    await fill('KIKO', '2', '3');
    await submit(true);
    assert.equal(remote.length, 2);
    assert.ok(document.querySelector('.sorting-dialog[open]'), 'Save and add another keeps the form open');
    assert.equal(document.getElementById('sorting-hours').value, '');
    await fill('Belloti', '3', '2');
    await submit(true);
    await fill('kiko', '1', '1');
    failNext = true;
    await submit();
    assert.match(document.querySelector('.sorting-dialog [role="alert"]').textContent, /Network failed/);
    assert.equal(document.getElementById('sorting-client').value, 'kiko', 'Network failure preserves the form');
    assert.equal(document.getElementById('sorting-hours').value, '1');
    await submit();
    assert.equal(remote.length, 4);
    assert.equal(new Set(remote.map((row) => row.id)).size, 4);
    assert.equal(chart()[8].total, 13);
    assert.equal(chart()[29].cumulative, 13);
    assert.equal(document.querySelectorAll('.sorting-tooltip-operation').length, 4, 'The tooltip lists each operation, including repeated clients');
    assert.match(document.querySelector('.sorting-chart-tooltip').textContent, /REF-HIST/);
    assert.match(document.querySelector('.sorting-chart-tooltip').textContent, /LOT-HIST/);
    assert.equal(document.querySelectorAll('[data-client-series="KIKO"]').length, 1);
    assert.ok([...document.querySelectorAll('[data-stack]')].every((node) => node.getAttribute('data-stack') === 'clients'));
    await change('sorting-filter-client', 'client:kiko');
    assert.equal(chart()[8].total, 3);
    assert.equal(tableRows().length, 2);
    assert.equal(document.querySelectorAll('.sorting-tooltip-operation').length, 2, 'The chart detail follows client filtering');
    assert.ok(!document.querySelector('.sorting-chart-tooltip').textContent.includes('Belloti'));
    const first = tableRows().find((row) => row.cells[3].textContent === '2');
    const firstId = remote.find((row) => row.client_name === 'KIKO' && row.hours === 2).id;
    await click(first.querySelector('button'));
    await change('sorting-hours', '4');
    await submit();
    assert.equal(remote.length, 4, 'Editing one operation does not replace or duplicate the other daily operations');
    assert.equal(remote.find((row) => row.id === firstId).hours, 4);
    assert.equal(chart()[8].total, 5);
    assert.deepEqual(guards.at(-1), ['2026-11-09', '2026-11-09'], 'Month checks cover both original and edited dates');
    await change('sorting-filter-client', '');
    await click(document.querySelector('[data-sorting-chart]'));
    assert.equal(document.getElementById('sorting-detail-date').value, '2026-11-09');
    assert.equal(tableRows().length, 4);
    await change('sorting-filter-client', 'unassigned');
    assert.equal(tableRows().length, 1);
    await click(tableRows()[0].querySelector('button'));
    assert.equal(document.getElementById('sorting-reference'), null, 'Reference is also removed from the edit form');
    assert.equal(document.getElementById('sorting-lot'), null, 'Lot number is also removed from the edit form');
    assert.equal(document.getElementById('sorting-headcount').value, '');
    await submit();
    assert.equal(remote.find((row) => row.id === 'legacy').headcount, null);
    assert.equal(remote.find((row) => row.id === 'legacy').client_name, null);
    assert.equal(remote.find((row) => row.id === 'legacy').product_reference, 'REF-HIST', 'Editing preserves historical hidden metadata');
    assert.equal(remote.find((row) => row.id === 'legacy').lot_number, 'LOT-HIST');
    await act(async () => root.unmount());
    await mount();
    assert.equal(chart()[8].total, 15);
    assert.equal(tableRows().length, 4);
    await act(async () => root.render(React.createElement(TestApp, { locked: true })));
    assert.equal(add().disabled, true);
    assert.ok(tableRows().every((row) => row.querySelector('button').disabled));
    assert.equal(chart()[29].cumulative, 15, 'Closed months remain readable');
  } finally {
    if (root) await act(async () => root.unmount());
    dom.window.close();
    try { unlinkSync(bundlePath); } catch {}
    for (const [key, original] of Object.entries(originals)) { if (original) Object.defineProperty(globalThis, key, original); else delete globalThis[key]; }
  }
});
