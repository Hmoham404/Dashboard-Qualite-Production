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
          export const BarChart=({data,children})=>React.createElement('svg',{'data-lot-daily':JSON.stringify(data)},children);
          export const Bar=({children})=>React.createElement('g',null,children);
          const Empty=()=>null;
          export const Line=({dataKey,children})=>React.createElement('g',{'data-lot-series':dataKey},children);
          export const CartesianGrid=Empty,Legend=Empty,Tooltip=Empty,XAxis=Empty,YAxis=Empty,Cell=Empty,LabelList=Empty,ReferenceLine=Empty;
        ` }));
      } }],
    });
    writeFileSync(bundlePath, output.outputFiles[0].text);
    const { default: LotPage } = await import(pathToFileURL(bundlePath).href);
    const { createRoot } = await import('react-dom/client');
    const downloads = [];
    const props = { initialMonth: '2026-11', today: '2026-11-03', t: createTranslator('fr'), downloadReport: async (report) => {
      assert.ok(JSON.parse(localStorage.getItem(lotStorageKey)).some((lot) => lot.anomaly_report?.id === report.id), 'Report is saved before download');
      downloads.push(structuredClone(report));
    } };
    const render = async (extra = {}) => {
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(React.createElement(LotPage, { ...props, ...extra })));
    };
    const change = async (id, value) => {
      const node = document.getElementById(id);
      assert.ok(node, id);
      await act(async () => {
        const prototype = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
        node.dispatchEvent(new window.Event('input', { bubbles: true }));
        node.dispatchEvent(new window.Event('change', { bubbles: true }));
      });
    };
    const submit = async () => act(async () => document.querySelector('.lot-entry-panel').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    const totals = () => [...document.querySelectorAll('.lot-statistics strong')].map((node) => Number(node.textContent));
    const dailyValues = () => [...document.querySelectorAll('.lot-daily-chart-values')].map((list) => [...list.querySelectorAll('dd')].map((node) => Number(node.textContent)));
    await render();
    assert.equal(document.getElementById('lot-analysis-date').value, '2026-11-03');
    assert.deepEqual(dailyValues(), [[0, 0, 0], [0, 0, 0]]);
    for (const [id, value] of [['lot-work-order', 'OF-1'], ['lot-reference', 'REF-1'], ['lot-client', 'Client A'], ['lot-number', 'LOT-1'], ['lot-quantity', '100'], ['lot-sample', '101'], ['lot-decision', 'OK'], ['lot-inspector', 'Qualiticien A']]) await change(id, value);
    assert.equal(document.getElementById('lot-action').disabled, true);
    assert.equal(document.getElementById('lot-defect').disabled, false, 'OK lots may record a defect');
    await change('lot-defect', 'Rayure');
    assert.equal(document.querySelector('.lot-entry-row .lot-anomaly-button'), null, 'An OK draft does not offer a new anomaly report');
    await submit();
    assert.equal(localStorage.getItem(lotStorageKey), null, 'Invalid sample cannot be saved');
    assert.match(document.querySelector('[role="alert"]').textContent, /échantillonnage/);
    await change('lot-sample', '10');
    await submit();
    assert.deepEqual(totals(), [1, 100, 100, 0]);
    assert.equal(JSON.parse(localStorage.getItem(lotStorageKey))[0].defect, 'Rayure');
    const pareto = () => JSON.parse(document.querySelector('.lot-pareto-analysis [data-lot-trend]').getAttribute('data-lot-trend'));
    assert.deepEqual(pareto(), [{ defect: 'Rayure', lots: 1, cumulativePercent: 100 }]);
    for (const [id, value] of [['lot-number', 'LOT-2'], ['lot-quantity', '200'], ['lot-sample', '20'], ['lot-decision', 'NOK'], ['lot-defect', 'Bavure']]) await change(id, value);
    assert.equal(document.getElementById('lot-action').disabled, false);
    assert.ok(document.querySelector('.lot-entry-row .lot-anomaly-button'), 'Selecting NOK exposes the report button directly in the draft actions');
    await act(async () => document.querySelector('.lot-entry-row .lot-anomaly-button').click());
    assert.equal(JSON.parse(localStorage.getItem(lotStorageKey)).length, 1, 'NOK requires an action');
    assert.equal(document.querySelector('.anomaly-report-page'), null, 'Invalid controls cannot open a report');
    await change('lot-action', 'Tri');
    await act(async () => document.querySelector('.lot-entry-row .lot-anomaly-button').click());
    assert.equal(JSON.parse(localStorage.getItem(lotStorageKey)).length, 2, 'Opening the report saves the valid NOK control first');
    for (const [key, value] of Object.entries({ product_reference: 'REF-1', work_order: 'OF-1', inspection_date: '03/11/2026', department: 'Injection', client_name: 'Client A' })) {
      const input = document.getElementById(`anomaly-context-${key}`);
      assert.equal(input.value, value);
      assert.equal(input.readOnly, true);
    }
    assert.equal(document.querySelectorAll('.anomaly-sections textarea').length, 5);
    for (const textarea of document.querySelectorAll('.anomaly-sections textarea')) {
      assert.equal(textarea.value, '', 'The five descriptions remain for the inspector to write');
      assert.equal(textarea.required, false);
      assert.ok(textarea.placeholder.length > 0);
    }
    await act(async () => document.querySelector('.anomaly-report-page header button').click());
    assert.deepEqual(totals(), [2, 300, 100, 200]);
    assert.deepEqual(pareto().map(({ defect, lots }) => [defect, lots]), [['Bavure', 1], ['Rayure', 1]], 'Pareto includes both OK and NOK defects');
    assert.deepEqual(dailyValues(), [[2, 1, 1], [300, 100, 200]]);
    const dailyCharts = [...document.querySelectorAll('[data-lot-daily]')].map((node) => JSON.parse(node.getAttribute('data-lot-daily')));
    assert.deepEqual(dailyCharts.map((chart) => chart.map(({ value }) => value)), [[2, 1, 1], [300, 100, 200]], 'Both histograms receive their own units');
    const blockedTrend = () => JSON.parse(document.querySelector('.lot-blocking-analysis [data-lot-trend]').getAttribute('data-lot-trend'));
    assert.ok(document.querySelector('.lot-entry-panel').nextElementSibling.classList.contains('lot-blocking-analysis'), 'Blocking trend appears directly below the entry table and form');
    assert.deepEqual([...document.querySelectorAll('.lot-blocking-analysis [data-lot-series]')].map((node) => node.getAttribute('data-lot-series')), ['blocked'], 'The dedicated curve shows only blocked quantities');
    assert.equal(blockedTrend().length, 30);
    assert.equal(blockedTrend()[0].date, '2026-11-01');
    assert.equal(blockedTrend()[29].date, '2026-11-30');
    assert.equal(blockedTrend()[2].blocked, 200);
    assert.equal(blockedTrend()[29].blocked, 0, 'The complete month includes zero days');
    assert.equal(document.querySelector('.lot-blocking-total dd').textContent, '200');
    await change('lot-analysis-date', '2026-11-02');
    assert.deepEqual(dailyValues(), [[0, 0, 0], [0, 0, 0]]);
    assert.equal(blockedTrend()[2].blocked, 200, 'Daily histogram selection does not filter the monthly blocking curve');
    assert.deepEqual(totals(), [2, 300, 100, 200], 'Daily selection does not alter monthly totals');
    assert.equal(document.getElementById('lot-date').value, '2026-11-03', 'Analysis date is independent of the entry form');
    await act(async () => [...document.querySelectorAll('.lot-daily-controls button')].find((node) => node.textContent === 'Aujourd’hui').click());
    assert.deepEqual(dailyValues(), [[2, 1, 1], [300, 100, 200]]);
    assert.equal(document.querySelectorAll('.lot-decision-badge.lot-is-nok').length, 1);
    const chart = JSON.parse(document.querySelector('[data-lot-trend]').getAttribute('data-lot-trend'));
    assert.deepEqual(chart[2], { date: '2026-11-03', controlled: 300, conforming: 100, blocked: 200 });
    assert.equal(chart[0].controlled, 0);
    const blocked = JSON.parse(localStorage.getItem(lotStorageKey)).find((row) => row.decision === 'NOK');
    await act(async () => document.querySelector('.lot-row-actions .lot-anomaly-button').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    assert.equal(document.querySelector('.anomaly-report-page h1').textContent, 'Rapport d’anomalie');
    assert.equal(document.getElementById('anomaly-context-product_reference').value, 'REF-1');
    assert.equal(document.getElementById('anomaly-context-work_order').value, 'OF-1');
    assert.equal(document.getElementById('anomaly-context-client_name').value, 'Client A');
    assert.equal(document.getElementById('anomaly-context-department').value, 'Injection');
    assert.equal(document.getElementById('anomaly-context-inspection_date').value, '03/11/2026');
    assert.equal(document.getElementById('anomaly-context-client_name').readOnly, true);
    await act(async () => document.querySelector('.anomaly-report-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(downloads.length, 0);
    assert.equal(document.querySelector('.anomaly-report-form [role="alert"]'), null);
    const blankSavedReport = JSON.parse(localStorage.getItem(lotStorageKey)).find((row) => row.id === blocked.id).anomaly_report;
    for (const field of ['root_cause', 'immediate_action', 'immediate_effectiveness', 'corrective_action', 'corrective_effectiveness']) assert.equal(blankSavedReport[field], '', 'A fully blank report is saved');
    await act(async () => document.querySelector('.anomaly-report-page header button').click());
    await act(async () => document.querySelector('.lot-row-actions .lot-anomaly-button').click());
    assert.equal(document.getElementById('anomaly-root_cause').value, '', 'Blank fields survive reopening');
    await change('anomaly-root_cause', 'Réglage du moule.');
    await act(async () => document.querySelector('.anomaly-report-actions .lot-save-button').click());
    assert.equal(downloads.length, 1);
    assert.equal(downloads[0].id, blankSavedReport.id);
    assert.equal(downloads[0].immediate_action, '', 'A partial report can also be saved before PDF download');
    await act(async () => document.querySelector('.anomaly-report-page header button').click());
    await act(async () => document.querySelector('.lot-row-actions .lot-anomaly-button').click());
    assert.equal(document.getElementById('anomaly-root_cause').value, 'Réglage du moule.');
    assert.equal(document.getElementById('anomaly-immediate_action').value, '');
    for (const [key, value] of Object.entries({ root_cause: 'Réglage du moule.', immediate_action: 'Trier le lot.', immediate_effectiveness: 'Lot isolé.', corrective_action: 'Corriger le réglage.', corrective_effectiveness: 'Trois lots conformes.' })) await change(`anomaly-${key}`, value);
    assert.equal(document.querySelectorAll('.anomaly-sections textarea[aria-invalid="true"]').length, 0);
    await act(async () => document.querySelector('.anomaly-report-actions .lot-save-button').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    assert.equal(downloads.length, 2);
    assert.equal(downloads[0].context.lot_number, 'LOT-2');
    assert.equal(downloads[0].root_cause, 'Réglage du moule.');
    await act(async () => document.querySelector('.anomaly-report-page header button').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    assert.deepEqual(totals(), [2, 300, 100, 200], 'Writing a report never changes the lot quantities or decision');
    await act(async () => document.querySelector('[aria-label="Modifier le lot LOT-2"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    await change('lot-decision', 'OK');
    assert.equal(document.getElementById('lot-defect').value, 'Bavure', 'Changing to OK preserves the observed defect');
    await submit();
    assert.deepEqual(totals(), [2, 300, 300, 0]);
    assert.deepEqual(dailyValues(), [[2, 2, 0], [300, 300, 0]], 'Editing the decision updates both daily histograms');
    assert.equal(blockedTrend()[2].blocked, 0, 'Released lots leave the blocking curve');
    assert.equal(pareto().length, 2, 'Released lots retain their defects in the Pareto');
    assert.equal(document.querySelector('.lot-blocking-total dd').textContent, '0');
    assert.equal(JSON.parse(localStorage.getItem(lotStorageKey)).find((row) => row.id === blocked.id).corrective_action, null);
    assert.equal(JSON.parse(localStorage.getItem(lotStorageKey)).find((row) => row.id === blocked.id).anomaly_report.id, downloads[0].id);
    await act(async () => root.unmount());
    await render();
    assert.deepEqual(totals(), [2, 300, 300, 0]);
    assert.equal(pareto().length, 2, 'OK defects survive reload');
    await act(async () => document.querySelector('.lot-row-actions .lot-anomaly-button').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    assert.equal(document.getElementById('anomaly-root_cause').value, 'Réglage du moule.', 'Saved report is available after reload and OK release');
    await act(async () => document.querySelector('.anomaly-report-page header button').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    await change('lot-department', 'Soudure');
    assert.equal(document.querySelector('.lot-pareto-analysis [data-lot-trend]'), null, 'Pareto follows the department');
    assert.deepEqual(totals(), [0, 0, 0, 0]);
    assert.deepEqual(dailyValues(), [[0, 0, 0], [0, 0, 0]]);
    await change('lot-department', 'Injection');
    await change('lot-month', '2026-10');
    assert.equal(document.querySelector('.lot-pareto-analysis [data-lot-trend]'), null, 'Pareto follows the month');
    assert.deepEqual(totals(), [0, 0, 0, 0]);
    assert.equal(blockedTrend().length, 31);
    assert.equal(blockedTrend()[30].date, '2026-10-31');
    assert.ok(blockedTrend().every((day) => day.blocked === 0), 'Previous months do not mix in November controls');
    assert.equal(document.getElementById('lot-analysis-date').value, '2026-10-01');
    assert.deepEqual(dailyValues(), [[0, 0, 0], [0, 0, 0]]);
    await act(async () => document.querySelector('.lot-daily-controls button').click());
    assert.equal(document.getElementById('lot-month').value, '2026-11');
    assert.equal(document.getElementById('lot-analysis-date').value, '2026-11-03');
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
    await act(async () => root.unmount());
    remote.push({ ...remote[0], id: 'pending-report', lot_number: 'PENDING', decision: 'NOK', anomaly_report: null, defect: 'Rayure' });
    remote.push({ ...remote[0], id: 'other-department', department: 'Soudure', lot_number: 'WELD', decision: 'NOK', anomaly_report: null });
    remote.push({ ...remote[0], id: 'other-month', inspection_date: '2026-10-03', lot_number: 'OCTOBER', decision: 'NOK', anomaly_report: null });
    await render({ client, readOnly: true });
    assert.equal(document.getElementById('lot-number'), null, 'Meeting mode removes LOT entry fields');
    assert.equal(document.querySelector('.lot-page form'), null);
    assert.equal(document.querySelector('.lot-context-fields').disabled, false, 'Read-only meeting mode keeps department filtering available');
    const beforeMeeting = JSON.stringify(remote);
    await act(async () => document.querySelector('.lot-row-actions .lot-anomaly-button').click());
    assert.equal(document.getElementById('anomaly-root_cause').textContent, 'Réglage du moule.', 'Reports present saved text without an input field');
    assert.equal(document.querySelector('.anomaly-report-page form, .anomaly-report-page input, .anomaly-report-page textarea'), null);
    assert.equal(document.getElementById('anomaly-context-client_name').tagName, 'DD');
    assert.ok(!/Supabase|\.env|\.sql\b/.test(document.querySelector('.anomaly-report-page').textContent));
    await act(async () => document.querySelector('.anomaly-report-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(JSON.stringify(remote), beforeMeeting, 'Meeting mode cannot save anomaly reports');
    await act(async () => root.render(React.createElement(LotPage, { ...props, client, readOnly: true, view: 'reports' })));
    const reportRows = () => [...document.querySelectorAll('.report-index-table tbody tr')];
    assert.equal(document.querySelector('.lot-entry-panel'), null);
    assert.equal(reportRows().length, 2, 'Reports list includes released OK reports and pending NOK lots for the chosen month and department');
    assert.equal(document.querySelectorAll('.report-index-table button').length, 1, 'Only saved reports have a consultation button in meeting mode');
    assert.ok(!document.querySelector('.report-index-table').textContent.includes('Rédiger'));
    assert.ok(!document.querySelector('.report-index-table').textContent.includes('OCTOBER'));
    const filters = document.querySelectorAll('.report-index-filters select');
    filters[0].id = 'report-test-department'; filters[1].id = 'report-test-status';
    document.querySelector('.report-search input').id = 'report-test-search';
    await change('report-test-status', 'saved');
    assert.equal(reportRows().length, 1);
    assert.match(reportRows()[0].textContent, /LOT-2/);
    await change('report-test-status', '');
    await change('report-test-search', 'pending');
    assert.equal(reportRows().length, 1);
    assert.match(reportRows()[0].textContent, /PENDING/);
    await change('report-test-search', '');
    await change('report-test-department', 'Soudure');
    assert.equal(reportRows().length, 1);
    assert.match(reportRows()[0].textContent, /WELD/);
    await change('report-test-department', 'Injection');
    await act(async () => document.querySelector('.report-index-table button:not(:disabled)').click());
    assert.equal(document.getElementById('anomaly-root_cause').textContent, 'Réglage du moule.');
    assert.equal(document.querySelector('.anomaly-report-page textarea'), null);
    assert.equal(document.querySelector('.anomaly-report-page header button').textContent, 'Retour aux rapports');
    await act(async () => document.querySelector('.anomaly-report-page .workspace-navigation a[href="#reports"]').click());
    assert.ok(document.querySelector('.lot-report-index'), 'Reports navigation returns to the list even when the hash is already #reports');
    assert.equal(JSON.stringify(remote), beforeMeeting, 'Browsing reports in meeting mode never writes data');
    await act(async () => document.querySelector('.report-index-table button').click());
    await act(async () => root.render(React.createElement(LotPage, { ...props, client, readOnly: false, view: 'reports' })));
    await change('anomaly-root_cause', 'Brouillon non enregistré');
    await act(async () => root.render(React.createElement(LotPage, { ...props, client, readOnly: true, view: 'reports' })));
    assert.equal(document.getElementById('anomaly-root_cause').textContent, 'Réglage du moule.', 'Meeting presentation uses saved data rather than an unsaved editing draft');
    await act(async () => root.render(React.createElement(LotPage, { ...props, client, readOnly: false, view: 'reports' })));
    assert.equal(document.getElementById('anomaly-root_cause').value, 'Brouillon non enregistré', 'Leaving meeting mode preserves an editing draft');
    assert.equal(JSON.stringify(remote), beforeMeeting);
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
