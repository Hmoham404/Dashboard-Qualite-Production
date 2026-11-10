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
  const unnamed = { ...otherClient, id: 'unnamed-client', work_order: 'OF5', scrap_qty: 8, note: '' };
  const namedTous = { ...otherClient, id: 'named-tous', work_order: 'OF6', scrap_qty: 2, note: 'CLIENT: Tous' };
  const archived = { ...otherClient, id: 'archived-client', production_date: '2000-01-01', work_order: 'OLD-OF', scrap_qty: 900, note: 'CLIENT: Client ancien' };
  const kikoRows = ['kiko', 'Kiko', 'KIKO'].map((client, index) => ({ ...otherClient, id: `kiko-${index}`, work_order: `KIKO-OF-${index}`, scrap_qty: (index + 1) * 10, note: `CLIENT: ${client}` }));
  const sorting = { id: 'sorting-kiko', sorting_date: row.production_date, department: 'Assemblage', client_name: 'KIKO', product_reference: 'SORT-REF', lot_number: 'SORT-LOT', hours: 3, headcount: 2, good_qty: 50, scrap_qty: 4 };
  const db = { tables: { production_entries: [row, otherClient, welding, otherWelding, unnamed, namedTous, archived, ...kikoRows], machines: [], product_references: [], mod_assignments: [], monthly_closures: [], customer_complaints: [], sorting_hours: [sorting], lot_inspections: [] }, writes: [] };
  const bundlePath = fileURLToPath(new URL(`.quality-client-ui-${process.pid}.mjs`, import.meta.url));
  let root;
  try {
    for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true, __qualityClientDB: db })) {
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    window.requestAnimationFrame = (callback) => { callback(); return 0; };
    window.HTMLElement.prototype.scrollIntoView = () => {};
    window.scrollTo = () => {};
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
            let payload, deletedId;
            const db=globalThis.__qualityClientDB;
            const query={select(){return this;},order(){return this;},
              range(from,to){if(table==='customer_complaints'&&db.complaintLoadError)return Promise.resolve({data:null,error:{code:'42P01',message:'customer_complaints unavailable'}});return Promise.resolve({data:db.tables[table].slice(from,to+1),count:db.tables[table].length,error:null});},
              insert(rows){payload=rows;return this;},upsert(rows){payload=rows;return this;},
              delete(){return this;},eq(key,value){if(table==='customer_complaints'&&key==='id')deletedId=value;return this;},
              single:async()=>{
                if(db.complaintFailure)throw new Error(db.complaintFailure);
                const saved={...payload,id:globalThis.crypto.randomUUID()};
                db.tables[table].push(saved);return {data:saved,error:null};
              },
              then(resolve,reject){return Promise.resolve().then(()=>{
                if(deletedId){db.tables[table]=db.tables[table].filter(row=>row.id!==deletedId);return {error:null};}
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
        const prototype = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
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
    assert.ok(document.querySelector('.topbar .site-meeting-toggle'), 'Meeting button is in the top header');
    assert.equal(document.querySelector('.site-meeting-controls'), null, 'No bottom meeting bar');
    assert.deepEqual([...document.querySelectorAll('.topbar .workspace-navigation a')].map((link) => link.hash), ['', '#lot', '#reports']);
    assert.ok(!/Supabase|\.env|\.sql\b/.test(document.body.textContent), 'Backend configuration is not displayed in the dashboard');
    assert.equal(window.getComputedStyle(document.querySelector('.history-top-button')).minHeight, '40px');
    const complaintPanel = () => document.querySelector('.customer-complaints');
    const complaintTotal = () => document.querySelector('[data-complaint-total]').textContent;
    const complaintRows = () => [...document.querySelectorAll('.complaints-table tbody tr')];
    const day = () => document.querySelector(`[data-complaint-date="${row.production_date}"]`);
    assert.equal(complaintPanel().querySelector('svg[data-chart-rows]'), null, 'The binary chart is replaced by a calendar');
    assert.equal(complaintTotal(), '0');
    await click(day());
    assert.equal(document.querySelector('.complaint-modal'), null, 'Day selection only consults records');
    await click(document.querySelector('.complaints-add'));
    assert.equal(document.querySelector('.complaint-window input[type="date"]').value, row.production_date);
    await change(document.querySelector('.complaint-window textarea'), 'KIKO — Rayure miroir');
    await submit('.complaint-window');
    assert.equal(document.querySelector('.complaint-modal'), null);
    assert.equal(complaintTotal(), '1');
    await click(document.querySelector('.complaints-add'));
    await change(document.querySelector('.complaint-window textarea'), 'Belloti — Bavure');
    db.complaintFailure = 'Connexion interrompue';
    await submit('.complaint-window');
    assert.equal(complaintTotal(), '1', 'A failed save never increments the counters');
    assert.equal(document.querySelector('.complaint-window textarea').value, 'Belloti — Bavure', 'The draft survives a failed save');
    db.complaintFailure = '';
    await submit('.complaint-window');
    assert.equal(complaintTotal(), '2');
    assert.equal(day().querySelector('.complaint-day-count').textContent, '2', 'Several complaints can be recorded on one day');
    assert.equal(document.querySelector('[data-complaint-days]').textContent, '1');
    await change(document.querySelector('.complaint-search input'), 'kiko');
    assert.equal(complaintRows().length, 1);
    assert.match(complaintRows()[0].textContent, /Rayure/);
    assert.equal(complaintTotal(), '2', 'Searching the register does not change monthly totals');
    await change(document.querySelector('.complaint-search input'), '');
    await click(complaintRows()[0].querySelector('button'));
    await click(document.querySelector('[aria-labelledby="complaint-delete-title"] .danger-button'));
    assert.equal(complaintTotal(), '1');
    await click(document.querySelector('.month-actions button'));
    assert.equal(complaintTotal(), '1', 'Calendar totals persist when data is reloaded');
    assert.equal(db.tables.customer_complaints.length, 1);
    db.complaintLoadError = true;
    await click(document.querySelector('.month-actions button'));
    assert.equal(document.querySelector('[data-complaint-total]'), null, 'Unavailable data is not represented by a zero counter');
    assert.match(complaintPanel().textContent, /Chargement impossible/);
    assert.ok(!/Supabase|\.sql|customer_complaints/.test(complaintPanel().textContent), 'Load errors contain no backend details');
    db.complaintLoadError = false;
    await click(document.querySelector('.month-actions button'));
    assert.equal(complaintTotal(), '1');
    const originalChart = document.querySelector('.defect-evolution-panel [data-chart-rows]');
    await click(document.querySelector('.topbar .site-meeting-toggle'));
    assert.ok(document.querySelector('.site-frame').classList.contains('site-meeting-active'));
    assert.equal(document.querySelector('.defect-evolution-panel [data-chart-rows]'), originalChart, 'Meeting mode keeps the original site charts');
    assert.equal(window.getComputedStyle(document.querySelector('.sheet-panel')).display, 'none');
    assert.equal(document.querySelector('.sheet-panel fieldset').disabled, true);
    assert.equal(window.getComputedStyle(document.querySelector('.incomplete-panel')).display, 'none', 'Completion workflow is hidden in meeting mode');
    assert.equal(document.querySelectorAll('.production-detail-panel tbody tr').length,
      db.tables.production_entries.filter((entry) => entry.department === 'Injection' && entry.production_date.startsWith(row.production_date.slice(0, 7))).length,
      'Meeting mode displays every filtered record, including incomplete entries, without the usual three-row limit');
    assert.equal(document.querySelector('.sorting-heading > button'), null, 'No sorting entry button in meeting mode');
    assert.equal(document.querySelector('.complaints-add, .complaints-table tbody button'), null, 'Meeting mode has no complaint entry or deletion controls');
    await click(day());
    assert.ok(document.querySelector('.complaint-search input'), 'Calendar consultation and search remain available in meeting mode');
    assert.equal(complaintTotal(), '1');
    assert.ok(!document.querySelector('.complaint-chart-panel').textContent.includes('Double-cliquez'));
    await click(document.querySelector('.history-top-button'));
    assert.ok(document.querySelector('.history-window'), 'All monthly records remain accessible in history');
    assert.equal(window.getComputedStyle(document.querySelector('.history-window tbody td:last-child')).display, 'none', 'History has no visible editing controls');
    await click(document.querySelector('.history-window-head .icon-only'));
    assert.equal(clientFilter().disabled, false, 'Data filters remain usable');
    await act(async () => { window.location.hash = '#lot'; window.dispatchEvent(new window.HashChangeEvent('hashchange')); });
    assert.ok(document.querySelector('.site-frame').classList.contains('site-meeting-active'), 'Meeting mode persists when navigating to LOT');
    assert.equal(document.getElementById('lot-number'), null, 'LOT has no entry fields in meeting mode');
    assert.equal(document.querySelector('.lot-page form'), null);
    assert.equal(document.querySelector('.lot-context-fields').disabled, false, 'LOT department selection remains usable');
    assert.ok(document.querySelector('.lot-page-header .site-meeting-toggle'), 'LOT has the same top meeting control');
    await act(async () => { window.location.hash = '#reports'; window.dispatchEvent(new window.HashChangeEvent('hashchange')); });
    assert.equal(document.querySelector('.lot-page h1').textContent, 'Rapports d’anomalie');
    assert.ok(document.querySelector('.lot-report-index'), 'Reports have their own complete page');
    assert.equal(document.querySelector('.lot-entry-panel'), null);
    assert.equal(document.querySelector('.lot-page .workspace-navigation [aria-current="page"]').hash, '#reports');
    assert.equal(document.title, 'Rapports d’anomalie — LOT');
    assert.ok(document.querySelector('.site-meeting-active'), 'Meeting mode also persists on the reports page');
    await act(async () => { window.location.hash = ''; window.dispatchEvent(new window.HashChangeEvent('hashchange')); });
    await click(document.querySelector('.site-meeting-exit'));
    assert.ok(!document.querySelector('.site-frame').classList.contains('site-meeting-active'));
    assert.equal(document.querySelector('.sheet-panel fieldset').disabled, false, 'Leaving meeting mode restores editing');
    assert.equal(document.querySelectorAll('.production-detail-panel tbody tr').length, 3, 'Leaving meeting mode restores the normal table view');
    const sortingData = () => JSON.parse(document.querySelector('.sorting-hours-panel [data-chart-rows]').getAttribute('data-chart-rows'));
    assert.equal(sortingData().find((day) => day.date === row.production_date).total, 3, 'The dashboard loads operation fields from Supabase into the sorting chart');
    assert.match(document.querySelector('.sorting-operations-table').textContent, /KIKO/);
    const scrapClient = () => document.getElementById('scrap-client');
    const scrapData = () => JSON.parse(document.querySelector('.defect-evolution-panel [data-chart-rows]').getAttribute('data-chart-rows'));
    const scrapTotal = () => scrapData().reduce((sum, day) => sum + day.total, 0);
    assert.deepEqual([...scrapClient().options].map((option) => option.value), ['', 'Autre client', 'Client original', 'KIKO', 'Tous'], 'Only clients recorded in the displayed month are offered, with one KIKO option');
    assert.equal(scrapTotal(), 110, 'All clients includes production without a recorded client');
    await change(scrapClient(), 'KIKO');
    assert.equal(scrapTotal(), 60, 'The single KIKO option includes kiko, Kiko and KIKO records');
    assert.equal(clientFilter().value, 'KIKO');
    await change(scrapClient(), 'Autre client');
    assert.equal(scrapTotal(), 40);
    assert.equal(clientFilter().value, 'Autre client', 'The chart filter stays synchronized with the general filter');
    await change(scrapClient(), 'Tous');
    assert.equal(scrapTotal(), 2, 'A client named Tous remains distinct from the all-clients choice');
    await change(scrapClient(), '');
    assert.equal(scrapTotal(), 110);
    await change(document.querySelector('.defect-pareto-controls input[type="date"]'), row.production_date);
    await change(scrapClient(), 'Autre client');
    assert.deepEqual(scrapData(), [{ type: 'Bavure', count: 40 }], 'Daily defect detail uses the same client selection');
    await change(scrapClient(), '');
    assert.deepEqual(scrapData(), [{ type: 'Bavure', count: 110 }]);
    await click([...document.querySelectorAll('.defect-mode-toggle button')].find((button) => button.textContent === 'Cumul'));
    await change(clientFilter(), 'Client original');
    assert.equal(scrapClient().value, 'Client original', 'Changing the general filter updates the chart selector');
    assert.equal(scrapTotal(), 0, 'A client without scrap has zero bars across the month');
    assert.equal(sortingData().find((day) => day.date === row.production_date).total, 3, 'Sorting keeps its own client filters');
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
    assert.equal(document.querySelector('.lot-page h1').textContent, 'Contrôle des lots');
    assert.equal(document.querySelector('main.shell').hidden, true, 'LOT replaces the visible dashboard with a page');
    assert.ok(document.querySelector('dialog#lot-workspace') === null, 'LOT is not a modal');
    assert.equal(document.title, 'Contrôle des lots — LOT');
    assert.equal(document.documentElement.lang, 'fr');
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
