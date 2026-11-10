import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildAnomalyReport } from '../src/anomalyReports.js';
import { createAnomalyReportPdf } from '../src/anomalyReportPdf.js';

test('PDF export generates a document for completely blank and partial anomaly reports', async () => {
  const lot = { id: 'pdf-lot', inspection_date: '2026-11-10', product_reference: 'REF-1', work_order: 'OF-1',
    department: 'Injection', client_name: 'KIKO', lot_number: '17', defect: 'Bavure', inspector_name: 'Eya', decision: 'NOK' };
  const fontBytes = readFileSync(new URL('../src/assets/fonts/NotoSans-Regular.ttf', import.meta.url));
  for (const fields of [{}, { root_cause: 'Réglage du moule.' }]) {
    const report = buildAnomalyReport(lot, fields);
    const original = structuredClone(report);
    const pdf = await createAnomalyReportPdf(report, { fontBytes });
    assert.ok(pdf.getNumberOfPages() >= 1);
    assert.ok(Buffer.from(pdf.output('arraybuffer')).subarray(0, 5).equals(Buffer.from('%PDF-')));
    assert.deepEqual(report, original, 'Export does not fill or modify blank descriptions');
  }
});
