// The chart over time (§10.4 of the specification of the time simulation): series chosen by object and quantity, one
// panel for each unit category, against the time in s, min, h or d, or on the clock (d hh:mm). The step of the time cursor
// is marked on every series.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, UI = PumpIt.ui;
  const F = UI.format;
  const Cat = UI.resultCatalog;
  const C = UI.resultColumns;
  const { lineChart } = UI.lineChart;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('charts.time.' + key, params);

  const COLORS = ['var(--accent)', 'var(--sel)', '#c0612b', 'var(--ok)', 'var(--m3-press)', 'var(--warn)', 'var(--crit)', 'var(--caution)'];
  const X_UNITS = ['s', 'min', 'h', 'd', 'clock'];

  // the quantities an object can draw: the numeric outputs of its table (with their unit category), or the fields of a tank
  function quantities(run, kind, id) {
    if (kind === 'tanks') return UI.timeResults.tankCols(run.series.tanks[id]).filter(([, c]) => c !== 'txt').map(([k, c]) => ({ k, c, label: UI.timeResults.tankLabel(k) }));
    const regime = C.regimeOf(app.currentResults());
    const fields = run.series[kind][id] || {};
    const out = Cat.outputs(regime, kind).filter((e) => e.c && !e.t && (e.k in fields || e.v)).map((e) => ({ k: e.k, c: e.c, label: Cat.label(regime, kind, e.k), e }));
    if (kind === 'junctions' && run.series.inputs[id]) {
      const j = PumpIt.model.getObj(app.eff(), 'j:' + id);
      const def = j && PumpIt.junctionTypes.get(j.type);
      const qt = j && j.time && def && def.time && def.time.quantities ? (def.time.quantities(j, { gas: PumpIt.model.isCompressible(app.eff()) }) || []).find((x) => x.what === j.time.what) : null;
      if (qt) out.push({ k: '@input', c: qt.cat === 'none' || qt.cat === 'percent' ? null : qt.cat, label: t('time.results.input', { what: t('time.data.whats.' + j.time.what) }) });
    }
    return out;
  }

  // the values of a series at every recorded step, in SI
  function values(run, kind, id, q) {
    const n = run.times.length;
    if (kind === 'tanks') return Array.from(run.series.tanks[id][q.k]);
    if (q.k === '@input') return Array.from(run.series.inputs[id].v);
    const ctx = C.ctxOf(app.currentResults());
    const out = new Array(n);
    for (let i = 0; i < n; i++) { const v = Cat.value(q.e, UI.timeResults.rowAt(run, kind, id, i), ctx); out[i] = typeof v === 'number' ? v : NaN; }
    return out;
  }

  function render(box, ctl, notes) {
    const run = app.timeRun();
    notes.textContent = '';
    if (!run) { ctl.innerHTML = ''; box.innerHTML = `<div class="empty">${F.esc(tx('noRun'))}</div>`; return; }
    const pf = app.prefs.timeChart || {};
    const chosen = (pf.series || []).filter((s) => { const [kid, k] = s.split('|'); const [kind, id] = kid.split(':'); return run.series[kind] && run.series[kind][id] && quantities(run, kind, id).some((q) => q.k === k); });
    const xu = X_UNITS.includes(pf.x) ? pf.x : UI.timeFormat.unitFor(run.tf - run.t0);
    const objs = UI.timeResults.objects(run);
    const obj = objs.find((o) => o.v === pf.obj) || objs[0];
    const qs = obj ? quantities(run, obj.kind, obj.id) : [];
    const groups = ['tanks', 'pipes', 'junctions', 'pumps', 'valves'].map((k) => {
      const os = objs.filter((o) => o.kind === k);
      return os.length ? `<optgroup label="${F.esc(t('time.results.kinds.' + k))}">${os.map((o) => F.option(o.v, o.label, o === obj)).join('')}</optgroup>` : '';
    }).join('');
    const chips = chosen.map((s, i) => `<span class="tc-chip"><i style="background:${COLORS[i % COLORS.length]}"></i>${F.esc(seriesName(run, s))}<button type="button" class="row-btn" data-tcdel="${F.esc(s)}" aria-label="${F.esc(tx('remove'))}">×</button></span>`).join('');
    ctl.innerHTML = `<label>${F.esc(tx('object'))}<select id="tch-obj">${groups}</select></label>
      <label>${F.esc(tx('quantity'))}<select id="tch-q">${qs.map((q) => F.option(q.k, q.label, false)).join('')}</select></label>
      <button type="button" class="btn small" id="tch-add">${F.esc(tx('add'))}</button>
      <label>${F.esc(tx('axis'))}<select id="tch-x">${X_UNITS.map((u) => F.option(u, u === 'clock' ? tx('clock') : F.unit(u), u === xu)).join('')}</select></label>
      <div class="tc-chips">${chips}</div>`;
    if (!chosen.length) { box.innerHTML = `<div class="empty">${F.esc(tx('choose'))}</div>`; return; }
    // the time axis: hours on the clock
    const xs = Array.from(run.times, (x) => U.fromSI(x, xu === 'clock' ? 'h' : xu, 'time'));
    const xLabel = xu === 'clock' ? tx('clockAxis') : `${tx('time')} (${F.unit(xu)})`;
    const xTick = xu === 'clock' ? (v) => clockShort(v * 3600) : null;
    const ctx = C.ctxOf(app.currentResults());
    const ic = app.cursorIndex();
    // one panel per unit category
    const byCat = new Map();
    chosen.forEach((s, i) => {
      const [kid, k] = s.split('|'); const [kind, id] = kid.split(':');
      const q = quantities(run, kind, id).find((x) => x.k === k);
      const cat = q.c || 'none';
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push({ s, i, kind, id, q });
    });
    let html = '';
    for (const [cat, list] of byCat) {
      const u = cat === 'none' ? '' : app.outUnit('tchart.' + cat, cat);
      const conv = (v) => (cat === 'none' ? v : F.conv(v, cat, u, ctx));
      const series = list.map(({ s, i, kind, id, q }) => {
        const ys = values(run, kind, id, q).map(conv);
        return { name: seriesName(run, s), color: COLORS[i % COLORS.length], pts: xs.map((x, n) => [x, ys[n]]), at: [xs[ic], ys[ic]] };
      });
      const unitSel = cat === 'none' ? '' : `<select class="unit-sel" data-t="tchart" data-c="${cat}" data-cat="${cat}" aria-label="${F.esc(tx('unit'))}">${U.list(cat).map((x) => F.option(x, F.unit(x), x === u)).join('')}</select>`;
      html += `<div class="tc-panel"><div class="tc-panel-head">${unitSel}</div>${lineChart({
        title: list.map((x) => x.q.label).join(', '), xLabel, yLabel: list.length === 1 ? `${list[0].q.label}${u ? ' (' + F.unit(u) + ')' : ''}` : (u ? F.unit(u) : ''),
        series: series.map((x) => ({ name: x.name, pts: x.pts, color: x.color, width: 2 })),
        points: series.map((x) => ({ x: x.at[0], y: x.at[1], color: x.color })), xTick,
      })}</div>`;
    }
    box.innerHTML = html;
    notes.textContent = tx('cursorNote', { t: UI.timeFormat.clock(run.times[ic]) });
  }

  // the name of a series: its object and its quantity
  function seriesName(run, s) {
    const [kid, k] = s.split('|'); const [kind, id] = kid.split(':');
    const q = quantities(run, kind, id).find((x) => x.k === k);
    return `${(kind === 'pipes' ? 'P' : 'J') + id} · ${q ? q.label : k}`;
  }
  // a time on the clock, without the seconds
  function clockShort(sec) {
    const s = Math.round(sec / 60) * 60;
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    const hm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return d ? `${d} ${U.label('d')} ${hm}` : hm;
  }

  function bind() {
    const pf = () => (app.prefs.timeChart = app.prefs.timeChart || { series: [] });
    document.addEventListener('change', (e) => {
      if (e.target.id === 'tch-obj') { pf().obj = e.target.value; app.savePrefs(); app.renderView(); }
      if (e.target.id === 'tch-x') { pf().x = e.target.value; app.savePrefs(); app.renderView(); }
    });
    document.addEventListener('click', (e) => {
      if (e.target.id === 'tch-add') {
        const o = document.getElementById('tch-obj'), q = document.getElementById('tch-q');
        if (!o || !q || !q.value) return;
        const s = o.value + '|' + q.value, p = pf();
        p.series = (p.series || []).filter((x) => x !== s).concat([s]);
        app.savePrefs(); app.renderView();
      }
      const del = e.target.closest('[data-tcdel]');
      if (del) { const p = pf(); p.series = (p.series || []).filter((x) => x !== del.dataset.tcdel); app.savePrefs(); app.renderView(); }
    });
  }

  UI.timeChart = { render, bind };
})(typeof window !== 'undefined' ? window : globalThis);
