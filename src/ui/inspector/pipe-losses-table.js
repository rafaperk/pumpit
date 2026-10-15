// Per-pipe losses of a single-node junction: K leaving to and arriving from each pipe and, where the junction
// type allows it (reservoir), the elevation at which each pipe connects.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, UI = PumpIt.ui;
  const F = UI.format;
  const { el, section, hint } = UI.forms;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('inspector.pipeLosses.' + key, params);

  function build(key, j) {
    const s = section(tx('title'));
    const pipes = M.pipesAt(app.model, j.id);
    if (!pipes.length) { s.appendChild(hint(tx('noPipes'))); return s; }
    const table = el('table', { class: 'mini-table' });
    const withElev = !!UI.junctionTypes.get(j.type).connectionElevation;
    table.innerHTML = `<thead><tr><th>${tx('pipe')}</th><th title="${tx('kOutTitle')}">${tx('kOut')}</th><th title="${tx('kInTitle')}">${tx('kIn')}</th>${withElev ? `<th>${tx('elevation')}</th>` : ''}</tr></thead>`;
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
      if (withElev) {
        const i = el('input', { type: 'text', inputmode: 'decimal', id: `pk-${j.id}-${p.id}-elev`, 'aria-label': tx('elevationAria', { id: p.id }), placeholder: tx('bottom') });
        i.value = cur.elev && Number.isFinite(cur.elev.value) ? F.inputStr(cur.elev.value) : '';
        i.addEventListener('change', () => { const n = F.parseNum(i.value); write({ elev: Number.isFinite(n) ? { value: n, unit: 'm' } : null }); });
        const td = el('td'); td.appendChild(i); tr.appendChild(td);
      }
      tb.appendChild(tr);
    }
    table.appendChild(tb);
    s.appendChild(table);
    s.appendChild(hint(tx('hint')));
    return s;
  }

  PumpIt.ui.pipeLossesTable = { build };
})(typeof window !== 'undefined' ? window : globalThis);
