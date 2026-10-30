// Result exports: any result table as tab-separated text (to paste into a spreadsheet) and every result table as a
// sheet of one .xlsx file, with the columns, order and units chosen for the screen (column-setup.js).
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const F = UI.format;
  const C = UI.resultColumns;
  const Cat = UI.resultCatalog;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;

  // header of a column, with its unit
  const header = (table, c) => (c.c ? `${C.colLabel(table, c)} (${F.unit(c.u)})` : C.colLabel(table, c));
  // decimals of a column without a fixed format: five significant digits of its largest value
  function autoFormat(values) {
    const big = values.reduce((m, v) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(m, Math.abs(v)) : m), 0);
    const d = big > 0 ? Math.min(6, Math.max(0, 4 - Math.floor(Math.log10(big)))) : 2;
    return d ? '0.' + '0'.repeat(d) : '0';
  }
  // widths of the classic columns of the pipe sheet, as before the columns could be chosen
  const PIPE_WIDTHS = { id: 8, dn: 16, schTxt: 16, zin: 14, zout: 14, Q: 13, V: 13, P0in: 22, P0out: 22, K: 9 };

  // a text cell stays text when pasted into a spreadsheet: a tab or a line break would split it, and a leading = + - @
  // would make it a formula there (a name read from someone else's model file could otherwise be one)
  const pasteText = (s) => {
    const v = String(s).replace(/[\t\r\n]+/g, ' ');
    return /^[=+\-@]/.test(v) ? "'" + v : v;
  };

  // TSV to paste into a spreadsheet
  function tableTSV(table, res, eff) {
    const cols = C.colsFor(table, res);
    const ctx = C.ctxOf(res);
    const lines = C.rowsFor(table, res, eff).map((r) => cols.map((c) => {
      if (c.t) return pasteText(C.cellValue(c, r, ctx, table));
      const x = C.number(c, r, ctx);
      const d = c.x ? (c.x.split('.')[1] || '').length : -1;
      return Number.isFinite(x) ? (d >= 0 ? x.toFixed(d) : String(+x.toPrecision(8))).replace('.', F.decimalSep()) : '';
    }).join('\t'));
    return [cols.map((c) => header(table, c)).join('\t')].concat(lines).join('\n');
  }

  // a sheet for Excel: the columns and order of the table, real numbers in the unit of each column
  function sheet(table, res, eff) {
    const cols = C.colsFor(table, res);
    const ctx = C.ctxOf(res);
    const rows = C.rowsFor(table, res, eff).map((r) => cols.map((c) => {
      if (c.t) return C.cellValue(c, r, ctx, table);
      const v = C.number(c, r, ctx);
      return Number.isFinite(v) ? v : '—';
    }));
    const columns = cols.map((c, i) => {
      const head = header(table, c);
      const cells = rows.map((row) => row[i]);
      const longest = c.t ? cells.reduce((m, v) => Math.max(m, String(v).length), 0) : 10;
      const width = (table === 'pipes' && PIPE_WIDTHS[c.k]) || Math.min(40, Math.max(9, Math.ceil(head.length / 2) + 3, longest + 2));
      return { header: head, width, format: c.t ? 'text' : c.x || autoFormat(cells) };
    });
    return { name: t('results.tabs.' + table), columns, rows };
  }
  // the sheets of every table with something in it
  const sheets = (res, eff) => Cat.TABLES.map((tb) => sheet(tb, res, eff)).filter((s) => s.rows.length);

  app.exportResultsXlsx = () => {
    const res = app.okResults();
    if (!res) { app.toast(t('results.export.noResults')); return; }
    const blob = UI.xlsx.workbook({ sheets: sheets(res, app.eff()) });
    const { saveFile, safeName } = UI.download;
    saveFile(`${safeName(app.model.title)} - ${safeName(app.scenario().name)} - ${t('results.export.fileSuffix')}.xlsx`, blob);
  };

  PumpIt.ui.resultExport = { tableTSV, pasteText, sheet, sheets, autoFormat };
})(typeof window !== 'undefined' ? window : globalThis);
