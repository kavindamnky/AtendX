export function escapeCsvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function downloadBlob(content, fileName, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadRows(rows, baseFileName, formatType) {
  if (formatType === 'excel') {
    const htmlRows = rows
      .map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('');
    const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${htmlRows}</table></body></html>`;
    downloadBlob(workbook, `${baseFileName}.xls`, 'application/vnd.ms-excel;charset=utf-8');
    return;
  }

  const csv = rows.map(row => row.map(escapeCsvCell).join(',')).join('\n');
  downloadBlob(csv, `${baseFileName}.csv`, 'text/csv;charset=utf-8');
}
