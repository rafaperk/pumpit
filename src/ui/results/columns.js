// Result tables: columns, rows and cell formatting. The columns of a table, their order and their units are the ones
// the user chose (column-setup.js), from the outputs of catalog.js; a unit can be changed at any time without
// recalculating. Shared by the results view and the exports.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, UI = PumpIt.ui;
  const F = UI.format;
  const Cat = UI.resultCatalog;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;

  // warning level names
  const level = (lvl) => t('results.level.' + lvl);

  // compressible mode (R-25, §12.2): a gas has columns of its own; the "in" and "out" ends of a pipe are those of its
  // reference direction, as for a liquid
  const isGas = (res) => !!(res && res.regime === 'compressible');
  const regimeOf = (res) => (isGas(res) ? 'gas' : 'liquid');
  // the columns of a table for a set of results
  const colsFor = (table, res) => UI.columnSetup.columns(regimeOf(res), table);

  // header text of a column
  const colLabel = (table, col) => Cat.label(col.regime || 'liquid', table, col.k);

  // unit selector in a column header (label = the column name, for screen readers). A column of a result table carries
  // its unit and its regime, and the choice goes to the columns of that regime; any other (the boundaries of the
  // summary) keeps its unit in prefs.colUnits.
  function unitSelect(table, col, label = colLabel(table, col)) {
    const u = col.regime ? col.u : app.outUnit(table + '.' + col.k, col.c);
    const regime = col.regime ? ` data-regime="${col.regime}"` : '';
    return `<select class="unit-sel"${regime} data-t="${table}" data-c="${col.k}" data-cat="${col.c}" aria-label="${F.esc(t('results.unitOf', { label }))}">${U.list(col.c).map((x) => F.option(x, F.unit(x), x === u)).join('')}</select>`;
  }

  // what the rows need from the interface: the designation of a pipe and the net flow at a boundary
  const L = UI.pipeLabels;
  const HOOKS = {
    dn: (p, r) => (L.isCatalog(p.material) ? L.nominal(p.material) : Number.isFinite(r.Dh) ? t('results.innerDiameter', { d: F.fmt(r.Dh * 1000, 4) }) : '—'),
    series: (p) => (L.isCatalog(p.material) ? L.series(p.material) : '—'),
    boundary(j, r) {
      const v = UI.junctionTypes.get(j.type);
      const b = v && v.boundaryFlow ? v.boundaryFlow(r) : null;
      return b === null || b === undefined ? NaN : b;
    },
  };
  const rowsFor = (table, res, eff) => Cat.rows(table, res, eff, HOOKS);
  const ctxOf = Cat.ctxOf;

  // the number of a cell in the unit of its column (NaN: no value)
  function number(col, r, ctx) {
    const v = Cat.value(col, r, ctx);
    if (typeof v !== 'number') return NaN;
    return col.c ? F.conv(v, col.c, col.u, ctx) : v;
  }

  function cellValue(col, r, ctx, table) {
    if (col.t === 'id') return (table === 'pipes' ? 'P' : 'J') + r.id;
    if (col.t === 'txt') return Cat.value(col, r, ctx) ?? '';
    const x = number(col, r, ctx);
    // fixed-format columns (the classic ones of the pipe table) show the same decimals as the Excel file
    if (col.x && Number.isFinite(x)) return F.fixed(x, (col.x.split('.')[1] || '').length);
    return Number.isNaN(x) ? '—' : F.fmt(x, 5);
  }

  PumpIt.ui.resultColumns = { level, colsFor, isGas, regimeOf, colLabel, unitSelect, rowsFor, ctxOf, number, cellValue };
})(typeof window !== 'undefined' ? window : globalThis);
