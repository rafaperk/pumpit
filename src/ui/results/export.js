// Result exports: any result table as tab-separated text (to paste into a spreadsheet) and the pipe table as
// an .xlsx file with the same columns, order and number formats as on screen.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const F = UI.format;
  const C = UI.resultColumns;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;

  // TSV to paste into a spreadsheet
  function tableTSV(table, res, eff) {
    const cols = C.colsFor(table, res);
    const rows = C.rowsFor(table, res, eff);
    const ctx = { rho: res.fluid.rho, patm: res.patm };
    const head = cols.map((c) => c.c ? `${C.colLabel(table, c)} (${F.unit(app.outUnit(table + '.' + c.k, c.c))})` : C.colLabel(table, c)).join('\t');
    const lines = rows.map((r) => cols.map((c) => {
      if (c.t) return C.cellValue(c, r, ctx, table);
      const v = r[c.k];
      const x = c.c ? F.conv(v, c.c, app.outUnit(table + '.' + c.k, c.c), ctx) : v;
      const d = c.x ? (c.x.split('.')[1] || '').length : -1;
      return Number.isFinite(x) ? (d >= 0 ? x.toFixed(d) : String(+x.toPrecision(8))).replace('.', F.decimalSep()) : '';
    }).join('\t'));
    return [head].concat(lines).join('\n');
  }

  // pipe sheet for Excel: same columns and order as the table, real numbers
  function pipeSheet(res, eff) {
    const cols = C.colsFor('pipes', res);
    const ctx = { rho: res.fluid.rho, patm: res.patm };
    const widths = { id: 8, dn: 16, schTxt: 11, zin: 14, zout: 14, Q: 13, V: 13, P0in: 22, P0out: 22, K: 9 };
    const columns = cols.map((c) => ({
      header: c.c ? `${C.colLabel('pipes', c)} (${F.unit(app.outUnit('pipes.' + c.k, c.c))})` : C.colLabel('pipes', c),
      width: widths[c.k] || 14,
      format: c.t ? 'text' : c.x || '0.00',
    }));
    const rows = C.rowsFor('pipes', res, eff).map((r) => cols.map((c) => {
      if (c.t === 'id') return 'P' + r.id;
      if (c.t) return r[c.k] ?? '';
      const v = c.c ? F.conv(r[c.k], c.c, app.outUnit('pipes.' + c.k, c.c), ctx) : r[c.k];
      return Number.isFinite(v) ? v : '—';
    }));
    return { columns, rows };
  }

  app.exportPipesXlsx = () => {
    const res = app.okResults();
    if (!res) { app.toast(t('results.export.noResults')); return; }
    const sheet = pipeSheet(res, app.eff());
    const blob = UI.xlsx.workbook({ sheet: t('results.export.sheet'), columns: sheet.columns, rows: sheet.rows });
    const { saveFile, safeName } = UI.download;
    saveFile(`${safeName(app.model.title)} - ${safeName(app.scenario().name)} - ${t('results.export.fileSuffix')}.xlsx`, blob);
  };

  PumpIt.ui.resultExport = { tableTSV, pipeSheet };
})(typeof window !== 'undefined' ? window : globalThis);
