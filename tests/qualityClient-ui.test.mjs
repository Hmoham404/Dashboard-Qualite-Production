import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';
import React, { act } from 'react';
import { localDateKey } from '../src/monthly.js';
import { extractClientName, extractQualityNote } from '../src/qualityNote.js';

test('client filtering covers departments, charts and history; quality client survives save and reload', { skip: !process.env.JSDOM_MODULE }, async () => {
  const { JSDOM } = await import(pathToFileURL(process.env.JSDOM_MODULE).href);
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const keys = ['window', 'document', 'navigator', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT', '__qualityClientDB'];
  const originals = Object.fromEntries(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const row = { id: 'client-entry', production_date: localDateKey(), department: 'Injection', machine_code: 'M1', product_reference: 'REF1', work_order: 'OF1', good_qty: 100, scrap_qty: 0, work_hours: 1, mod_count: 0, mod_hours: 0, operator_names: '', defect_type: 'Bavure', defect_breakdown: [], note: 'REF_ARTICLE: ARTICLE1\nCLIENT: Client original\nNOTE_QUALITE: Contrôle ancien', entry_status: 'Qualite a completer', missing_fields: ['Controle qualite'] };
  const otherClient = { ...row, id: 'other-client', work_order: 'OF2', good_qty: 500, scrap_qty: 40, note: 'REF_ARTICLE: ARTICLE2\nCLIENT: Autre client' };
  const welding = { ...row, id: 'welding-client', department: 'Soudure', work_order: 'OF3' };
  const otherWelding = { ...otherClient, id: 'welding-other-client', department: 'Soudure', work_order: 'OF4' };
  const db = { tables: { production_entries: [row, otherClient, welding, otherWelding], machines: [], product_references: [], mod_assignments: [], monthly_closures: [], customer_complaints: [], sorting_hours: [] }, writes: [] };
  const bundlePath = fileURLToPath(new URL(`.quality-client-ui-${process.pid}.mjs`, import.meta.url));
  let root;
  try {
    for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true, __qualityClientDB: db })) {
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    window.requestAnimationFrame = (callback) => { callback(); return 0; };
    window.HTMLElement.prototype.scrollIntoView = () => {};
    const style = document.createElement('style');
    style.textContent = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
    document.head.appendChild(style);
    const source = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
      .replace("createRoot(document.getElementById('root')).render(<App />);", 'export { App };');
    const output = await build({
      stdin: { contents: source, loader: 'jsx', sourcefile: 'main.jsx', resolveDir: fileURLToPath(new URL('../src', import.meta.url)) },
      bundle: true, platform: 'node', format: 'esm', write: false,
      external: ['react', 'react-dom/*', 'lucide-react', 'xlsx'], loader: { '.css': 'empty' },
      define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: 'https://example.invalid', VITE_SUPABASE_ANON_KEY: 'test' }) },
      plugins: [{ name: 'isolated-quality-services', setup(builder) {
        builder.onResolve({ filter: /^(recharts|@supabase\/supabase-js)$/ }, (args) => ({ path: args.path, namespace: 'quality-stub' }));
        builder.onLoad({ filter: /.*/, namespace: 'quality-stub' }, (args) => ({ loader: 'js', contents: args.path === 'recharts' ? `
          import React from 'react';
          export const ResponsiveContainer=({children})=>React.createElement('div',null,children);
          const Chart=({data,children})=>React.createElement('svg',{'data-chart-rows':JSON.stringify(data)},children), Empty=()=>null;
          export const ComposedChart=Chart,BarChart=Chart;
          export const Area=Empty,Bar=Empty,CartesianGrid=Empty,Cell=Empty,DefaultLegendContent=Empty,LabelList=Empty,Legend=Empty,Line=Empty,Rectangle=Empty,ReferenceLine=Empty,Tooltip=Empty,XAxis=Empty,YAxis=Empty;
        ` : `
          export const createClient=()=>({from(table) {
            let payload;
            const db=globalThis.__qualityClientDB;
            const query={select(){return this;},order(){return this;},
              range(from,to){return Promise.resolve({data:db.tables[table].slice(from,to+1),count:db.tables[table].length,error:null});},
              insert(rows){payload=rows;return this;},upsert(rows){payload=rows;return this;},
              then(resolve,reject){return Promise.resolve().then(()=>{
                for(const row of payload) {
                  if('client_name' in row) throw new Error('Unknown database column client_name');
                  db.writes.push(structuredClone(row));
                  db.tables[table]=[structuredClone(row),...db.tables[table].filter(item=>item.id!==row.id)];
                }
                return {data:structuredClone(payload),error:null};
              }).then(resolve,reject);}
            };return query;
          }});
        ` }));
      } }],
    });
    writeFileSync(bundlePath, output.outputFiles[0].text);
    const { App } = await import(pathToFileURL(bundlePath).href);
    const { createRoot } = await import('react-dom/client');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(App)));
    const click = async (node) => { assert.ok(node); await act(async () => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))); };
    const change = async (node, value) => {
      await act(async () => {
        const prototype = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
        node.dispatchEvent(new window.Event('input', { bubbles: true }));
        node.dispatchEvent(new window.Event('change', { bubbles: true }));
      });
    };
    const submit = async (selector) => { await act(async () => document.querySelector(selector).dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))); };
    const clientFilter = () => document.getElementById('filter-client');
    const resetButton = () => document.querySelector('.filters > button');
    assert.ok([...clientFilter().options].some((option) => option.value === 'Client original'));
    assert.equal(window.getComputedStyle(clientFilter()).height, '42px');
    assert.equal(window.getComputedStyle(resetButton()).height, '42px');
    await change(clientFilter(), 'Client original');
    assert.ok(document.querySelector('.production-detail-panel').textContent.includes('OF1'));
    assert.ok(!document.querySelector('.production-detail-panel').textContent.includes('OF2'));
    assert.ok(!document.querySelector('.incomplete-panel').textContent.includes('OF2'));
    const trend = JSON.parse(document.querySelector('.target-chart-panel [data-chart-rows]').getAttribute('data-chart-rows'));
    assert.equal(trend.find((day) => day.date === row.production_date).rate, 0, 'Charts exclude the other client’s scrap');
    assert.equal(document.querySelector('.month-actions .lot-button').getAttribute('href'), '#lot');
    await act(async () => {
      window.location.hash = '#lot';
      window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    });
    assert.equal(document.querySelector('.lot-page h1').textContent, 'Coming soon');
    assert.equal(document.querySelector('main.shell').hidden, true, 'LOT replaces the visible dashboard with a page');
    assert.ok(document.querySelector('dialog#lot-workspace') === null, 'LOT is not a modal');
    assert.equal(document.title, 'LOT — Coming soon');
    assert.equal(document.documentElement.lang, 'en');
    await act(async () => {
      window.location.hash = '';
      window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    });
    assert.ok(document.querySelector('.lot-page') === null);
    assert.equal(document.querySelector('main.shell').hidden, false);
    assert.equal(clientFilter().value, 'Client original', 'Returning from LOT preserves dashboard filters');
    await click(document.querySelectorAll('.dept-tabs button')[4]);
    assert.equal(clientFilter().value, 'Client original', 'Client selection stays active across departments');
    assert.ok(document.querySelector('.production-detail-panel').textContent.includes('OF3'));
    assert.ok(!document.querySelector('.production-detail-panel').textContent.includes('OF4'));
    await click(document.querySelector('.history-top-button'));
    assert.equal(document.querySelectorAll('.history-window-body tbody tr').length, 2);
    assert.ok(!document.querySelector('.history-window-body').textContent.includes('OF2'));
    await click(document.querySelector('.history-window-head button'));
    await click(resetButton());
    assert.equal(clientFilter().value, '');
    assert.ok(document.querySelector('.production-detail-panel').textContent.includes('OF4'));
    assert.equal(db.writes.length, 0, 'Filters never write to Supabase');
    await click(document.querySelectorAll('.dept-tabs button')[0]);
    await click(document.querySelectorAll('.service-switch button')[1]);
    await change(document.querySelector('.quality-pick select'), row.id);
    assert.equal(document.getElementById('quality-client').value, 'Client original');
    assert.equal(document.querySelector('.quality-note input').value, 'Contrôle ancien');
    for (const control of document.querySelectorAll('.quality-fields input, .quality-fields select')) {
      assert.equal(window.getComputedStyle(control).height, '38px');
    }
    await change(document.getElementById('quality-client'), 'Client modifié');
    await submit('.quality-sheet');
    assert.equal(db.writes.length, 1);
    assert.equal(extractClientName(db.writes[0].note), 'Client modifié');
    assert.equal(extractQualityNote(db.writes[0].note), 'Contrôle ancien');
    await act(async () => root.unmount());
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(App)));
    const savedRow = [...document.querySelectorAll('tr')].find((node) => node.textContent.includes('OF1'));
    await click(savedRow.querySelector('button'));
    assert.equal(document.getElementById('quality-client').value, 'Client modifié');
    await click(document.querySelectorAll('.service-switch button')[0]);
    await submit('.production-sheet');
    assert.equal(db.writes.length, 2);
    assert.equal(extractClientName(db.writes[1].note), 'Client modifié');
    await change(document.querySelector('.quality-pick select'), row.id);
    await change(document.getElementById('quality-client'), '');
    await submit('.quality-sheet');
    assert.equal(db.writes.length, 3);
    assert.equal(extractClientName(db.writes[2].note), '');
    assert.equal(extractQualityNote(db.writes[2].note), 'Contrôle ancien');
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
