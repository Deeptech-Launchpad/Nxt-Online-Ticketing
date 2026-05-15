/**
 * Convert an array of plain objects into a downloadable CSV file.
 *
 * @param {string} filename  e.g. "tickets-2026-05-14.csv"
 * @param {Array<object>} rows  each object's keys become the header row
 * @param {Array<string>} [columns]  optional ordered subset of keys to export.
 *                                   If omitted, uses keys from the first row.
 */
export function downloadCSV(filename, rows, columns) {
  if (!rows || rows.length === 0) {
    alert('Nothing to export — there is no data on this page.');
    return;
  }

  const cols = columns && columns.length > 0 ? columns : Object.keys(rows[0]);

  const esc = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    // Wrap in quotes if it contains comma, quote, newline or carriage return.
    // Double up internal quotes per RFC 4180.
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = cols.join(',');
  const body   = rows.map(r => cols.map(c => esc(r[c])).join(',')).join('\r\n');
  const csv    = header + '\r\n' + body;

  // Prepend UTF-8 BOM so Excel renders unicode (emoji, accents) correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Return today's date as "YYYY-MM-DD" — handy for filename suffixes. */
export function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
