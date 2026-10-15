// Profile chart: HGL, EGL and elevation (or static and stagnation pressures) along a continuous path of pipes.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, UI = PumpIt.ui;
  const F = UI.format;
  const { lineChart } = UI.lineChart;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('charts.profile.' + key, params);

  // shortest chain of pipes between two junctions (breadth-first, any direction)
  function findPath(eff, a, b) {
    if (a === b) return [];
    const adj = new Map();
    for (const p of eff.pipes) {
      if (!adj.has(p.up)) adj.set(p.up, []);
      if (!adj.has(p.down)) adj.set(p.down, []);
      adj.get(p.up).push([p, p.down, true]);
      adj.get(p.down).push([p, p.up, false]);
    }
    const prev = new Map([[a, null]]);
    const queue = [a];
    while (queue.length) {
      const u = queue.shift();
      if (u === b) break;
      for (const [p, v, fwd] of adj.get(u) || []) {
        if (prev.has(v)) continue;
        prev.set(v, [u, p, fwd]);
        queue.push(v);
      }
    }
    if (!prev.has(b)) return null;
    const path = [];
    for (let v = b; prev.get(v); v = prev.get(v)[0]) path.unshift({ pipe: prev.get(v)[1], fwd: prev.get(v)[2] });
    return path;
  }

  // head or pressure lines along the pipes between two junctions
  function profileChart(box, ctl, notes) {
    const eff = app.eff();
    const js = eff.junctions;
    if (js.length < 2) { ctl.innerHTML = ''; box.innerHTML = `<div class="empty">${tx('needsTwo')}</div>`; return; }
    const pf = app.prefs.profile || {};
    let a = js.some((j) => j.id === pf.a) ? pf.a : js[0].id;
    let b = js.some((j) => j.id === pf.b) ? pf.b : js[js.length - 1].id;
    const what = pf.what || 'heads';
    app.prefs.profile = { a, b, what };
    const opt = (sel) => js.map((j) => `<option value="${j.id}"${j.id === sel ? ' selected' : ''}>J${j.id} ${F.esc(j.name)}</option>`).join('');
    const isHead = what === 'heads';
    const cat = isHead ? 'head' : 'pressure';
    const u = app.outUnit('profile.' + cat, cat);
    ctl.innerHTML = `<label>${tx('from')}<select id="pf-a">${opt(a)}</select></label><label>${tx('to')}<select id="pf-b">${opt(b)}</select></label>
      <label>${tx('quantity')}<select id="pf-what"><option value="heads"${isHead ? ' selected' : ''}>${tx('heads')}</option><option value="pressure"${!isHead ? ' selected' : ''}>${tx('pressures')}</option></select></label>
      <label>${tx('unit')}<select class="unit-sel" data-t="profile" data-c="${cat}" data-cat="${cat}">${U.list(cat).map((x) => F.option(x, F.unit(x), x === u)).join('')}</select></label>`;
    const res = app.currentResults();
    if (!res || !res.ok) { box.innerHTML = `<div class="empty">${tx('needsResults')}</div>`; notes.textContent = ''; return; }
    const path = findPath(eff, a, b);
    if (!path || !path.length) { box.innerHTML = `<div class="empty">${tx('noPath')}</div>`; notes.textContent = ''; return; }
    const ctx = { rho: res.fluid.rho, patm: res.patm };
    const cv = (v) => U.fromSI(v, u, cat, ctx);
    const lu = app.outUnit('profile.x', 'length');
    const ser = { a: [], b: [], z: [] };
    let s = 0;
    for (const { pipe, fwd } of path) {
      const r = res.pipes[pipe.id];
      const L = r.L;
      const st = fwd ? 'in' : 'out', en = fwd ? 'out' : 'in';
      const x0 = U.fromSI(s, lu, 'length'), x1 = U.fromSI(s + L, lu, 'length');
      if (isHead) {
        ser.a.push([x0, cv(r['HGL' + st])], [x1, cv(r['HGL' + en])]);
        ser.b.push([x0, cv(r['EGL' + st])], [x1, cv(r['EGL' + en])]);
        ser.z.push([x0, cv(r['z' + st])], [x1, cv(r['z' + en])]);
      } else {
        ser.a.push([x0, cv(r['P' + st])], [x1, cv(r['P' + en])]);
        ser.b.push([x0, cv(r['P0' + st])], [x1, cv(r['P0' + en])]);
      }
      s += L;
    }
    const series = isHead
      ? [{ name: tx('hgl'), pts: ser.a, color: 'var(--accent)' }, { name: tx('egl'), pts: ser.b, color: '#c0612b', dash: '6 4' }, { name: tx('pipeElevation'), pts: ser.z, color: 'var(--ink-3)', width: 1.8 }]
      : [{ name: tx('static'), pts: ser.a, color: 'var(--accent)' }, { name: tx('stagnation'), pts: ser.b, color: '#c0612b', dash: '6 4' }];
    if (!isHead && Number.isFinite(res.fluid.pv)) series.push({ name: tx('vapor'), pts: [[0, cv(res.fluid.pv)], [U.fromSI(s, lu, 'length'), cv(res.fluid.pv)]], color: 'var(--crit)', dash: '2 4', width: 1.6 });
    box.innerHTML = lineChart({ title: tx('title'), xLabel: tx('xLabel', { u: F.unit(lu) }), yLabel: tx(isHead ? 'yHead' : 'yPressure', { u: F.unit(u) }), series });
    notes.innerHTML = tx('notes', { path: path.map(({ pipe }) => 'P' + pipe.id).join(' → '), length: F.fmt(U.fromSI(s, lu, 'length'), 5), u: F.unit(lu) });
  }

  PumpIt.ui.profileChart = { render: profileChart, findPath };
})(typeof window !== 'undefined' ? window : globalThis);
