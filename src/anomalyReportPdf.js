import { anomalyReportNumber } from './anomalyReports.js';

function fontBase64(bytes) {
  const data = new Uint8Array(bytes);
  let binary = '';
  for (let offset = 0; offset < data.length; offset += 8192) binary += String.fromCharCode(...data.subarray(offset, offset + 8192));
  return btoa(binary);
}

const cleanText = (value) => String(value ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

export async function createAnomalyReportPdf(report, { fontBytes } = {}) {
  const { jsPDF } = await import('jspdf');
  if (!fontBytes) {
    const response = await fetch(new URL('./assets/fonts/NotoSans-Regular.ttf', import.meta.url));
    if (!response.ok) throw new Error('Impossible de charger la police du PDF.');
    fontBytes = await response.arrayBuffer();
  }
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  doc.addFileToVFS('NotoSans-Regular.ttf', fontBase64(fontBytes));
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans', 'normal');
  const reference = anomalyReportNumber(report);
  doc.setProperties({ title: `Rapport d’anomalie - ${reference}`, subject: `Lot ${report.context.lot_number}`, creator: 'Qualité & Production' });
  const margin = 18;
  const width = 174;
  let y = 24;
  const text = (value, x, position, size = 10, color = [29, 48, 71]) => {
    doc.setFontSize(size); doc.setTextColor(...color); doc.text(cleanText(value), x, position);
  };
  const newPage = () => {
    doc.addPage();
    text('RAPPORT D’ANOMALIE', margin, 16, 9, [190, 24, 93]);
    text(reference, 125, 16, 8, [95, 112, 130]);
    y = 28;
  };
  const ensureSpace = (height) => { if (y + height > 270) newPage(); };
  const linesFor = (value, maxWidth = width, size = 10) => {
    doc.setFontSize(size);
    return doc.splitTextToSize(cleanText(value), maxWidth);
  };
  const paragraph = (value) => {
    for (const line of linesFor(value)) {
      ensureSpace(6);
      text(line, margin, y);
      y += 5.5;
    }
    y += 5;
  };
  const field = (label, value) => {
    ensureSpace(17); text(label, margin, y, 9, [95, 112, 130]); y += 6; paragraph(value);
  };
  const section = (number, title) => {
    ensureSpace(24);
    doc.setFillColor(253, 239, 246); doc.roundedRect(margin, y - 5, width, 11, 2, 2, 'F');
    text(`${number}  ${title}`, margin + 4, y + 2, 11, [164, 22, 79]);
    y += 16;
  };

  text('LOT / QUALITÉ & PRODUCTION', margin, y, 9, [190, 24, 93]); y += 12;
  text('Rapport d’anomalie', margin, y, 21); y += 8;
  text(reference, margin, y, 9, [95, 112, 130]); y += 13;
  const context = report.context;
  const metadata = [['Référence', context.product_reference], ['OF / Bon', context.work_order], ['Date', context.inspection_date.split('-').reverse().join('/')],
    ['Département', context.department], ['Client', context.client_name], ['Numéro de lot', context.lot_number],
    ['Défaut constaté', context.defect || 'Non renseigné'], ['Qualiticien', context.inspector_name]];
  for (let index = 0; index < metadata.length; index += 2) {
    const pair = metadata.slice(index, index + 2).map(([label, value]) => ({ label, lines: linesFor(value, 81) }));
    const height = 5 + Math.max(...pair.map((item) => item.lines.length)) * 5.5;
    if (height > 200) {
      pair.forEach((item) => field(item.label, item.lines.join('\n')));
      continue;
    }
    ensureSpace(height);
    pair.forEach((item, column) => {
      const x = margin + column * 91;
      text(item.label, x, y, 8, [95, 112, 130]);
      item.lines.forEach((line, lineIndex) => text(line, x, y + 5 + lineIndex * 5.5));
    });
    y += height + 3;
  }
  section('01', 'Cause racine'); paragraph(report.root_cause);
  section('02', 'Action immédiate'); field('Description', report.immediate_action); field('Efficacité', report.immediate_effectiveness);
  section('03', 'Action corrective'); field('Description', report.corrective_action); field('Efficacité', report.corrective_effectiveness);
  ensureSpace(12);
  text(`Rapport enregistré le ${new Date(report.updated_at).toLocaleString('fr-FR', { timeZone: 'Africa/Lagos' })}`, margin, y, 8, [95, 112, 130]);
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page); doc.setDrawColor(220, 227, 235); doc.line(margin, 280, 192, 280);
    text(reference, margin, 287, 8, [95, 112, 130]);
    text(`${page} / ${pageCount}`, 179, 287, 8, [95, 112, 130]);
  }
  return doc;
}

export async function downloadAnomalyReport(report) {
  const doc = await createAnomalyReportPdf(report);
  await doc.save(`rapport_anomalie_${anomalyReportNumber(report)}.pdf`, { returnPromise: true });
}
