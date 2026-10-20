// Result tables: columns, rows and cell formatting. Each output column has its own unit, which can be
// changed at any time without recalculating. Shared by the results view and the exports.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, M = PumpIt.model, UI = PumpIt.ui;
  const F = UI.format;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;

  // warning level names
  const level = (lvl) => t('results.level.' + lvl);

  // k = result field, t = 'id' | 'txt' (text column), c = unit category, x = fixed decimal format;
  // headers come from the catalogs: results.columns.<table>.<k>
  const COLS = {
    pipes: [
      { k: 'id', t: 'id' },
      { k: 'dn', t: 'txt' },
      { k: 'schTxt', t: 'txt' },
      { k: 'zin', c: 'length', x: '0.00' },
      { k: 'zout', c: 'length', x: '0.00' },
      { k: 'Q', c: 'volFlow', x: '0.00' },
      { k: 'V', c: 'velocity', x: '0.00' },
      { k: 'P0in', c: 'pressure', x: '0.000' },
      { k: 'P0out', c: 'pressure', x: '0.000' },
      { k: 'K', x: '0.00' },
    ],
    junctions: [
      { k: 'id', t: 'id' }, { k: 'name', t: 'txt' }, { k: 'typeLabel', t: 'txt' },
      { k: 'P0in', c: 'pressure' }, { k: 'P0out', c: 'pressure' },
      { k: 'Pin', c: 'pressure' }, { k: 'Pout', c: 'pressure' },
      { k: 'dP', c: 'dp' }, { k: 'K' }, { k: 'Qt', c: 'volFlow' },
      { k: 'HGL', c: 'head' }, { k: 'z', c: 'length' },
    ],
    pumps: [
      { k: 'id', t: 'id' }, { k: 'name', t: 'txt' },
      { k: 'Q', c: 'volFlow' },
      { k: 'dH', c: 'head' }, { k: 'dP', c: 'dp' }, { k: 'speed' },
      { k: 'etaPct' }, { k: 'Pideal', c: 'power' }, { k: 'Pshaft', c: 'power' },
      { k: 'NPSHA', c: 'head' }, { k: 'NPSHR', c: 'head' },
    ],
    valves: [
      { k: 'id', t: 'id' }, { k: 'name', t: 'txt' }, { k: 'typeLabel', t: 'txt' },
      { k: 'state', t: 'txt' }, { k: 'Q', c: 'volFlow' }, { k: 'dP', c: 'dp' },
      { k: 'Pin', c: 'pressure' }, { k: 'Cv' }, { k: 'K' },
    ],
  };

  // compressible mode (R-25, §12.2): the columns of a gas, headers in results.gasColumns.<table>.<k>; the "in" and "out"
  // ends of a pipe are those of its reference direction, as for a liquid
  const gas = (cols) => cols.map((c) => Object.assign({ gas: true }, c));
  const GAS_COLS = {
    pipes: gas([
      { k: 'id', t: 'id' }, { k: 'dn', t: 'txt' },
      { k: 'm', c: 'massFlow' }, { k: 'Q', c: 'volFlow' }, { k: 'QN', c: 'normFlow' },
      { k: 'Vin', c: 'velocity' }, { k: 'Vout', c: 'velocity' }, { k: 'Min' }, { k: 'Mout' },
      { k: 'Pin', c: 'pressure' }, { k: 'Pout', c: 'pressure' }, { k: 'P0in', c: 'pressure' }, { k: 'P0out', c: 'pressure' },
      { k: 'Tin', c: 'temperature' }, { k: 'Tout', c: 'temperature' }, { k: 'rhoIn', c: 'density' }, { k: 'rhoOut', c: 'density' },
      { k: 'f' }, { k: 'dP0', c: 'dp' }, { k: 'chokedTxt', t: 'txt' },
    ]),
    junctions: gas([
      { k: 'id', t: 'id' }, { k: 'name', t: 'txt' }, { k: 'typeLabel', t: 'txt' },
      { k: 'Pin', c: 'pressure' }, { k: 'Pout', c: 'pressure' }, { k: 'P0in', c: 'pressure' }, { k: 'P0out', c: 'pressure' },
      { k: 'Tin', c: 'temperature' }, { k: 'T0in', c: 'temperature' }, { k: 'dP', c: 'dp' },
      { k: 'm', c: 'massFlow' }, { k: 'Q', c: 'volFlow' }, { k: 'massErr', c: 'massFlow' }, { k: 'z', c: 'length' },
    ]),
    pumps: gas([
      { k: 'id', t: 'id' }, { k: 'name', t: 'txt' }, { k: 'm', c: 'massFlow' }, { k: 'Q', c: 'volFlow' },
      { k: 'ratio' }, { k: 'dP', c: 'dp' }, { k: 'T0out', c: 'temperature' }, { k: 'Pgas', c: 'power' }, { k: 'stateTxt', t: 'txt' },
    ]),
    valves: gas([
      { k: 'id', t: 'id' }, { k: 'name', t: 'txt' }, { k: 'typeLabel', t: 'txt' }, { k: 'state', t: 'txt' },
      { k: 'm', c: 'massFlow' }, { k: 'Q', c: 'volFlow' }, { k: 'dP', c: 'dp' }, { k: 'Pin', c: 'pressure' }, { k: 'K' }, { k: 'chokedTxt', t: 'txt' },
    ]),
  };
  // the columns of a table for a set of results (a gas has its own)
  const isGas = (res) => !!(res && res.regime === 'compressible');
  const colsFor = (table, res) => (isGas(res) ? GAS_COLS : COLS)[table];

  // header text of a column
  const colLabel = (table, col) => t((col.gas ? 'results.gasColumns.' : 'results.columns.') + table + '.' + col.k);

  // unit selector in a column header (label = the column name, for screen readers)
  function unitSelect(table, col, label = colLabel(table, col)) {
    const u = app.outUnit(table + '.' + col.k, col.c);
    const units = U.list(col.c);
    return `<select class="unit-sel" data-t="${table}" data-c="${col.k}" data-cat="${col.c}" aria-label="${F.esc(t('results.unitOf', { label }))}">${units.map((x) => F.option(x, F.unit(x), x === u)).join('')}</select>`;
  }

  function rowsFor(table, res, eff) {
    const name = (k) => (M.getObj(eff, k) || {}).name || '';
    const choked = (r) => (r.choked ? t('results.gas.choked') : '');
    // a pipe of a catalogue shows its nominal size and series (4" and Sch. 40, OD 110 and SDR 11, DN 200 and K9); any
    // other pipe shows its inner diameter
    const L = UI.pipeLabels;
    if (table === 'pipes') return eff.pipes.map((p) => {
      const r = res.pipes[p.id] || {};
      const cat = L.isCatalog(p.material);
      const dn = cat ? L.nominal(p.material) : Number.isFinite(r.Dh) ? t('results.innerDiameter', { d: F.fmt(r.Dh * 1000, 4) }) : '—';
      return Object.assign({ id: p.id, name: p.name, key: 'p:' + p.id }, r, { dn, schTxt: cat ? L.series(p.material) : '—', chokedTxt: choked(r) });
    });
    if (table === 'junctions') return eff.junctions.map((j) => {
      const r = res.junctions[j.id] || {};
      return Object.assign({ id: j.id, name: j.name, key: 'j:' + j.id, typeLabel: M.JT[j.type].label, Qt: r.m / res.fluid.rho }, r);
    });
    if (table === 'pumps') return Object.entries(res.pumps).map(([id, r]) => Object.assign({ id: +id, name: name('j:' + id), key: 'j:' + id, etaPct: r.etaAssumed ? NaN : r.eta * 100 }, r));
    // a control valve shows its kind next to the type ("Control valve PRV")
    if (table === 'valves') return Object.entries(res.valves).map(([id, r]) => Object.assign({ id: +id, name: name('j:' + id), key: 'j:' + id, typeLabel: M.JT[r.type].label + (r.ctype ? ' ' + r.ctype : '') }, r, { chokedTxt: choked(r) }));
    return [];
  }

  function cellValue(col, r, ctx, table) {
    const v = r[col.k];
    if (col.t === 'id') return (table === 'pipes' ? 'P' : 'J') + r.id;
    if (col.t === 'txt') return v ?? '';
    if (v === undefined) return '—';
    const x = col.c ? F.conv(v, col.c, app.outUnit(table + '.' + col.k, col.c), ctx) : v;
    // fixed-format columns (those of the pipe sheet) show the same decimals as the Excel file
    if (col.x && Number.isFinite(x)) return F.fixed(x, (col.x.split('.')[1] || '').length);
    return F.fmt(x, 5);
  }

  PumpIt.ui.resultColumns = { level, COLS, GAS_COLS, colsFor, isGas, colLabel, unitSelect, rowsFor, cellValue };
})(typeof window !== 'undefined' ? window : globalThis);
