// Per-pipe losses of a single-node junction: K leaving to and arriving from each pipe and, where the junction
// type allows it (reservoir), where each pipe connects: at an elevation or at a depth below the liquid surface.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, U = PumpIt.units, UI = PumpIt.ui;
  const F = UI.format;
  const { el, section, hint, wrap, idOf } = UI.forms;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('inspector.pipeLosses.' + key, params);

  const fin = (x) => x && Number.isFinite(x.value);
  const toM = (x) => U.toSI(x.value, x.unit, 'length');
  // a length (m) in the unit u, without the noise of the arithmetic
  const inUnit = (m, u) => +U.fromSI(m, u, 'length').toPrecision(12);

  function build(key, j) {
    const s = section(tx('title'), { info: tx('hint') });
    const pipes = M.pipesAt(app.model, j.id);
    if (!pipes.length) { s.appendChild(hint(tx('noPipes'))); return s; }
    const conn = UI.junctionTypes.get(j.type).connectionElevation ? connections(key, j, pipes, s) : null;
    const table = el('table', { class: 'mini-table' });
    table.innerHTML = `<thead><tr><th>${tx('pipe')}</th><th title="${tx('kOutTitle')}">${tx('kOut')}</th><th title="${tx('kInTitle')}">${tx('kIn')}</th>${conn ? `<th>${F.esc(conn.head)}</th>` : ''}</tr></thead>`;
    const tb = el('tbody');
    for (const p of pipes) {
      const cur = (j.pipeK && j.pipeK[p.id]) || {};
      const path = 'pipeK.' + p.id;
      const write = (patch) => app.setVal(key, path, Object.assign({ kOut: 0, kIn: 0 }, cur, patch));
      const tr = el('tr');
      const td0 = el('td', {}, `<span class="num">P${p.id}</span>`);
      const mk = (field, aria) => {
        const i = el('input', { type: 'text', inputmode: 'decimal', id: `pk-${j.id}-${p.id}-${field}`, 'aria-label': aria });
        i.value = F.inputStr(cur[field] ?? 0);
        i.addEventListener('change', () => { const n = F.parseNum(i.value); write({ [field]: Number.isFinite(n) ? n : 0 }); });
        const td = el('td'); td.appendChild(i); return td;
      };
      tr.append(td0, mk('kOut', tx('kOutAria', { id: p.id })), mk('kIn', tx('kInAria', { id: p.id })));
      if (conn) tr.appendChild(conn.cell(p, cur, write));
      tb.appendChild(tr);
    }
    table.appendChild(tb);
    s.appendChild(table);
    return s;
  }

  // Where each pipe of a reservoir connects. The reference is the elevation or the depth below the liquid surface (for a
  // gas, below the reference elevation); a blank cell is the bottom, the junction elevation. Switching the reference
  // keeps every connection where it is and leaves the old values in their own field, so restoring an inherited
  // reference in a scenario restores its values too. The column is in the unit of the liquid level.
  function connections(key, j, pipes, s) {
    const gas = M.isCompressible(app.eff());
    const depth = j.connBy === 'depth';
    const field = depth ? 'depth' : 'elev';
    const u = (j.liquidElev && j.liquidElev.unit) || 'm';
    const zL = fin(j.liquidElev) ? toM(j.liquidElev) : NaN;
    const zB = fin(j.elevation) ? toM(j.elevation) : NaN;
    // the elevation (m) where a pipe connects: its own value, or the bottom
    const zOf = (pk) => (fin(pk[field]) ? (depth ? zL - toM(pk[field]) : toM(pk[field])) : zB);

    function switchTo(to) {
      const pairs = [['connBy', to]];
      if (!Number.isFinite(zL)) return pairs; // without a level nothing converts: the values wait in their own field
      for (const p of pipes) {
        const pk = j.pipeK && j.pipeK[p.id];
        if (!pk || !fin(pk[field])) continue;
        const z = zOf(pk);
        pairs.push(['pipeK.' + p.id, Object.assign({ kOut: 0, kIn: 0 }, pk, to === 'depth' ? { depth: { value: inUnit(zL - z, u), unit: u } } : { elev: { value: inUnit(z, u), unit: u } })]);
      }
      return pairs;
    }
    const g = el('div', { class: 'seg', role: 'radiogroup', id: idOf(key, 'connBy'), 'aria-label': tx('connBy') });
    for (const [val, lab] of [['elevation', tx('byElevation')], ['depth', tx('byDepth')]]) {
      const on = (val === 'depth') === depth;
      const b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(on), class: on ? 'on' : null }, F.esc(lab));
      b.addEventListener('click', () => { if (!on) app.setVals(key, switchTo(val)); });
      g.appendChild(b);
    }
    s.appendChild(wrap(key, 'connBy', tx('connBy'), g, { wide: true, info: tx(gas ? 'connHintGas' : 'connHint') }));

    return {
      head: `${tx(depth ? 'depth' : 'elevation')} (${F.unit(u)})`,
      cell(p, cur, write) {
        const v = cur[field];
        const i = el('input', { type: 'text', inputmode: 'decimal', id: `pk-${j.id}-${p.id}-${field}`, 'aria-label': tx(depth ? 'depthAria' : 'elevationAria', { id: p.id }), placeholder: tx('bottom') });
        i.value = fin(v) ? F.inputStr(v.unit === u ? v.value : inUnit(toM(v), u)) : '';
        // the other reference in the tooltip: the elevation of a depth, the depth of an elevation (six digits, as the
        // drawing of the reservoir shows it)
        const z = zOf(cur);
        const shown = (m) => `${F.inputStr(+U.fromSI(m, u, 'length').toPrecision(6))} ${F.unit(u)}`;
        if (Number.isFinite(z) && Number.isFinite(zL)) i.title = depth ? tx('atElevation', { z: shown(z) }) : tx('atDepth', { d: shown(zL - z) });
        i.addEventListener('change', () => { const n = F.parseNum(i.value); write({ [field]: Number.isFinite(n) ? { value: n, unit: u } : null }); });
        const td = el('td'); td.appendChild(i); return td;
      },
    };
  }

  PumpIt.ui.pipeLossesTable = { build };
})(typeof window !== 'undefined' ? window : globalThis);
