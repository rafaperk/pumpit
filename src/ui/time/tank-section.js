// The tank of a reservoir in the inspector (§6.1 of the specification of the time simulation): infinite (its level stays
// as given) or a finite tank whose level the simulation calculates, open or closed (a gas over the liquid, with its
// exponent and its relief and vent pressures), with its bottom, its height and its section: constant, a table of volume
// by height, or a horizontal cylinder. Its level or, closed, its pressure may be unknown at the start. Below them, the
// top, the capacity, the start and, with a run, the state at the time of the cursor. The section shows with the time
// simulation on, or for a finite tank kept while it is off.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, M = PumpIt.model, U = PumpIt.units;
  const I = UI.inspector;
  const app = PumpIt.app;
  const F = UI.format;
  const { el } = UI.dom;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('time.tank.' + key, params);
  const TK = () => PumpIt.time.tanks;

  I.addSection('junction', (host, id) => {
    const key = 'j:' + id;
    const j = app.effObj(key);
    const def = j && PumpIt.junctionTypes.get(j.type);
    if (!def || !def.time || !def.time.tank) return;
    // a gas: the vessel of the compressible mode instead
    if (M.isCompressible(app.eff())) { vesselSection(host, id, j); return; }
    const finite = TK().isFinite(j), on = app.timeOn();
    if (!on && !finite) return;
    const { section, qty, num, readout, hint, wrap } = UI.forms;
    const s = section(tx('title'), { info: tx('hint') });
    host.appendChild(s);
    if (!on) s.appendChild(hint(F.esc(tx('off'))));
    // the model: a finite tank starts from the bottom at the junction, with room for its level
    const model = el('select', { id: `tk-${id}-model` }, TK().MODELS.map((m) => F.option(m, tx('models.' + m), (j.tank && j.tank.model || 'infinite') === m)).join(''));
    model.addEventListener('change', () => {
      if (model.value === 'infinite' || (j.tank && typeof j.tank === 'object')) app.setVal(key, 'tank.model', model.value);
      else app.setVal(key, 'tank', Object.assign(TK().newTank(j), { model: model.value }));
    });
    s.appendChild(wrap(key, 'tank.model', tx('model'), model));
    if (!finite) return;
    const tk = j.tank, closed = tk.model === 'closed', cyl = tk.shape === 'horizontalCylinder';
    s.appendChild(qty(key, 'tank.bottom', tx('bottom'), 'length'));
    if (!cyl) s.appendChild(qty(key, 'tank.height', tx('height'), 'length'));
    // the section: a table starts from the constant section it replaces, when it has no points yet
    const shape = el('select', { id: `f-j_${id}-tank_shape` }, TK().SHAPES.map((x) => F.option(x, tx('shapes.' + x), tk.shape === x)).join(''));
    shape.addEventListener('change', () => {
      const pairs = [['tank.shape', shape.value]];
      const tb = tk.table;
      if (shape.value === 'table' && !(tb && Array.isArray(tb.h) && tb.h.length)) pairs.push(['tank.table', tableFrom(tk)]);
      app.setVals(key, pairs);
    });
    s.appendChild(wrap(key, 'tank.shape', tx('shape'), shape));
    if (tk.shape === 'table') {
      const tb = tk.table && Array.isArray(tk.table.h) ? tk.table : { h: [], V: [], hUnit: 'm', vUnit: 'm³' };
      s.appendChild(UI.pointTable.build({
        id: `tk-${id}-tb`,
        x: { label: tx('h'), cat: 'length', unit: tb.hUnit || 'm' },
        y: { label: tx('V'), cat: 'volume', unit: tb.vUnit || 'm³' },
        xs: tb.h, ys: tb.V, steps: false,
        onChange: (x) => app.setVal(key, 'tank.table', { h: x.xs, V: x.ys, hUnit: x.xUnit, vUnit: x.yUnit }),
      }));
    } else if (cyl) {
      s.appendChild(qty(key, 'tank.diameter', tx('diameter'), 'length', { info: tx('cylinderHint') }));
      s.appendChild(qty(key, 'tank.length', tx('length'), 'length'));
    } else s.appendChild(qty(key, 'tank.area', tx('area'), 'area'));
    // the gas of a closed tank
    if (closed) {
      s.appendChild(num(key, 'tank.gas.n', tx('gasN'), { info: tx('gasNHint') }));
      s.appendChild(qty(key, 'tank.gas.pMax', tx('pMax'), 'pressure', { info: tx('pHint') }));
      s.appendChild(qty(key, 'tank.gas.pMin', tx('pMin'), 'pressure', { info: tx('pHint') }));
    }
    // what is known at the start (both, unless the tank says otherwise; the pressure of an open tank is always known)
    const kn = TK().knownOf(tk);
    const known = (part, label) => {
      const c = el('input', { type: 'checkbox', id: `tk-${id}-known-${part}` });
      c.checked = kn[part];
      c.addEventListener('change', () => app.setVal(key, 'tank.known', Object.assign({}, kn, { [part]: c.checked })));
      return wrap(key, 'tank.known', label, c, { check: true, info: tx('knownHint') });
    };
    s.appendChild(known('level', tx('knownLevel')));
    if (closed) s.appendChild(known('pressure', tx('knownPressure')));
    // what the geometry gives, when it is complete
    let patm;
    try { patm = U.toSI(app.eff().system.patm.value, app.eff().system.patm.unit, 'pressure'); } catch (e) { /* the system checks it */ }
    if (TK().check(j, { patm }).length) return;
    try {
      const T = TK().prepare(j, app.eff(), (x, cat) => U.toSI(x.value, x.unit, cat, { patm }));
      const len = (v) => I.out(v, 'length'), vol = (v) => I.out(v, 'volume'), pr = (v) => I.out(v, 'pressure');
      s.appendChild(readout(tx('top'), len(T.zb + T.H)));
      s.appendChild(readout(tx('capacity'), vol(T.Vmax)));
      if (kn.level) s.appendChild(readout(tx('start'), tx('levelVolume', { h: len(TK().levelOf(T, T.V0)), V: vol(T.V0) }) + (closed && kn.pressure ? ' · ' + tx('gasAt', { V: vol(T.Vmax - T.V0), P: pr(T.P0) }) : '')));
      const run = app.timeRun(), i = app.cursorIndex();
      const sr = run && run.series.tanks[id];
      if (sr) {
        const gasNow = sr.Pg ? ' · ' + tx('gasAt', { V: vol(sr.Vg[i]), P: pr(sr.Pg[i]) }) : '';
        s.appendChild(readout(tx('atCursor', { t: UI.timeFormat.clock(run.times[i]) }), tx('levelVolume', { h: len(sr.h[i]), V: vol(sr.V[i]) }) + gasNow));
      }
      if (kn.level) s.appendChild(hint(F.esc(tx('levelIsStart'))));
    } catch (e) { s.appendChild(hint(F.esc(e.message))); }
  });

  // the gas vessel of a reservoir in the compressible mode (§11): infinite (its pressure as given) or of a fixed volume,
  // whose gas the simulation follows; with a run, its state at the time of the cursor
  const tv = (key, params) => t('time.vessel.' + key, params);
  function vesselSection(host, id, j) {
    const key = 'j:' + id;
    const VS = PumpIt.time.vessels;
    const finite = VS.isFinite(j), on = app.timeOn();
    if (!on && !finite) return;
    const { section, qty, readout, hint, wrap } = UI.forms;
    const s = section(tv('title'), { info: tv('hint') });
    host.appendChild(s);
    if (!on) s.appendChild(hint(F.esc(tv('off'))));
    if (TK().isFinite(j)) s.appendChild(hint(F.esc(tv('liquidKept'))));
    const model = el('select', { id: `vs-${id}-model` }, VS.MODELS.map((m) => F.option(m, tv('models.' + m), (j.vessel && j.vessel.model || 'infinite') === m)).join(''));
    model.addEventListener('change', () => {
      if (j.vessel && typeof j.vessel === 'object') app.setVal(key, 'vessel.model', model.value);
      else app.setVal(key, 'vessel', Object.assign(VS.newVessel(), { model: model.value }));
    });
    s.appendChild(wrap(key, 'vessel.model', tv('model'), model));
    if (!finite) return;
    s.appendChild(qty(key, 'vessel.volume', tv('volume'), 'volume'));
    if (VS.check(j).length) return;
    const run = app.timeRun(), i = app.cursorIndex();
    const sr = run && run.series.tanks[id];
    const state = (Mv, P, T) => tv('gasState', { M: I.out(Mv, 'mass'), P: I.out(P, 'pressure'), T: I.out(T, 'temperature') });
    if (sr && sr.Pv) {
      s.appendChild(readout(tv('start'), state(sr.M[0], sr.Pv[0], sr.Tv[0])));
      s.appendChild(readout(tv('atCursor', { t: UI.timeFormat.clock(run.times[i]) }), state(sr.M[i], sr.Pv[i], sr.Tv[i])));
    }
    s.appendChild(hint(F.esc(tv('startIsGiven'))));
  }

  // a table of volume by height with the bottom and the top of a constant section (m and m³)
  function tableFrom(tk) {
    try {
      const H = U.toSI(tk.height.value, tk.height.unit, 'length'), A = U.toSI(tk.area.value, tk.area.unit, 'area');
      if (H > 0 && A > 0) return { h: [0, +H.toPrecision(6)], V: [0, +(A * H).toPrecision(6)], hUnit: 'm', vUnit: 'm³' };
    } catch (e) { /* an incomplete section: the table of a new tank */ }
    return { h: [0, 10], V: [0, 100], hUnit: 'm', vUnit: 'm³' };
  }
})(window);
