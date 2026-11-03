// The results of the time simulation in the results view (§9 and §10.4 of its specification): the summary of the run, the
// values of one object at every recorded step ("Over time", with the columns and units of its table), the event log by
// time or by object, the extremes and the totals, and the warnings of the run. The other tables show the step of the
// time cursor (src/ui/time/run.js).
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, M = PumpIt.model, U = PumpIt.units;
  const app = PumpIt.app;
  const F = UI.format;
  const C = UI.resultColumns;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('time.results.' + key, params);
  const TF = () => UI.timeFormat;

  const TABS = ['series', 'events', 'extremes', 'totals'];
  const KINDS = ['tanks', 'pipes', 'junctions', 'pumps', 'valves'];
  // the columns of a tank: its fields and their unit categories (state: a text); a closed tank adds its gas
  // a gas vessel has its pressure, its temperature and the density of its gas
  const TANK_COLS = [['h', 'length'], ['zs', 'length'], ['Ps', 'pressure'], ['V', 'volume'], ['Pv', 'pressure'], ['Tv', 'temperature'], ['M', 'mass'], ['rho', 'density'], ['Qnet', 'volFlow'], ['mnet', 'massFlow'], ['Vg', 'volume'], ['Pg', 'pressure'], ['state', 'txt']];
  // those a tank has in a run (its series)
  const tankCols = (s) => TANK_COLS.filter(([k]) => s && k in s);
  const tankLabel = (k) => (k === 'Vg' || k === 'Pg' ? tx('tankGas.' + k) : k === 'Pv' || k === 'Tv' || k === 'rho' ? tx('vesselCols.' + k) : tx('tank.' + k));

  const ctxOf = () => { const r = app.currentResults(); return r && r.ok ? C.ctxOf(r) : {}; };
  // a value in the unit chosen for its column key (prefs.colUnits)
  const unitOf = (k, cat) => app.outUnit(k, cat);
  const val = (v, cat, k, ctx) => (Number.isFinite(v) ? F.fmt(F.conv(v, cat, unitOf(k, cat), ctx), 5) : '—');
  const head = (label, k, cat) => `${F.esc(label)}${cat ? C.unitSelect(k.split('.')[0], { k: k.split('.').slice(1).join('.'), c: cat }, label) : ''}`;
  // the name of an object of the model
  function objName(key) {
    const o = M.getObj(app.eff(), key);
    return (key[0] === 'p' ? 'P' : 'J') + key.slice(2) + (o && o.name ? ' ' + o.name : '');
  }
  // the time of a row: the clock, and the time in the unit chosen for the run
  const timeUnit = (run) => app.prefs.timeUnit && U.has('time', app.prefs.timeUnit) ? app.prefs.timeUnit : TF().unitFor(run.tf - run.t0);
  const timeCells = (run, tk) => `<td class="num">${F.esc(TF().clock(tk))}</td><td class="num">${TF().num(tk, timeUnit(run))}</td>`;
  const timeHead = (run) => `<th>${F.esc(tx('clock'))}</th><th>${F.esc(tx('time'))} <select class="tr-tunit" aria-label="${F.esc(tx('timeUnit'))}">${U.list('time').map((u) => F.option(u, F.unit(u), u === timeUnit(run))).join('')}</select></th>`;

  // ------------------------------------------------------------ the summary of the run (in the summary tab)
  function summaryCard(run) {
    const r = run || app.timeResult();
    if (!r) return '';
    if (!r.ok) return `<div class="card"><div class="card-head"><h3>${F.esc(tx('summary'))}</h3></div><ul class="warn-list">${r.errors.map((e) => `<li><span class="lvl critical">${F.esc(t('results.error'))}</span><span>${F.esc(e)}</span></li>`).join('')}</ul></div>`;
    const kv = [
      [tx('method'), t('time.system.methods.' + r.method)],
      [tx('span'), `${TF().clock(r.t0)} → ${TF().clock(r.tf)}`],
      [tx('steps'), `${r.N} · ${tx('recorded', { n: r.times.length })}`],
      [tx('elapsed'), Number.isFinite(r.elapsed) ? `${F.fmt(r.elapsed / 1000, 3)} s` : '—'],
    ];
    if (r.stopped) kv.push([tx('stoppedAt'), `${TF().clock(r.stopped.t)}${r.stopped.errors.length ? ' · ' + r.stopped.errors.join(' ') : ''}`]);
    return `<div class="card"><div class="card-head"><h3>${F.esc(tx('summary'))}</h3><span class="muted small">${F.esc(tx('summaryHint'))}</span></div><div class="kv">${kv.map(([k, v]) => `<div><span class="eyebrow">${F.esc(k)}</span><b>${F.esc(v)}</b></div>`).join('')}</div></div>`;
  }

  // the warnings of the run, with the steps they came in (in the warnings tab)
  function warningsCard() {
    const r = app.timeRun();
    if (!r) return '';
    if (!r.warnings.length) return `<div class="card"><div class="card-head"><h3>${F.esc(tx('warnings'))}</h3></div><div class="empty">${F.esc(tx('noWarnings'))}</div></div>`;
    const li = r.warnings.map((w) => {
      const when = w.n ? ` <span class="muted small">${F.esc(tx('inSteps', { n: w.n, t1: TF().clock(w.t1), t2: TF().clock(w.t2) }))}</span>` : '';
      return `<li data-key="${w.obj || ''}"><span class="lvl ${w.level}">${C.level(w.level)}</span><span>${F.esc(w.text)}${when}</span></li>`;
    }).join('');
    return `<div class="card"><div class="card-head"><h3>${F.esc(tx('warnings'))}</h3><span class="muted small">${F.esc(tx('warningsHint'))}</span></div><ul class="warn-list">${li}</ul></div>`;
  }

  // ------------------------------------------------------------ over time: one object, every recorded step
  // the objects with series: tanks, pipes, junctions, pumps and valves
  function objects(run) {
    const out = [];
    for (const kind of KINDS) for (const id of Object.keys(run.series[kind] || {})) out.push({ v: kind + ':' + id, kind, id: +id, label: objName((kind === 'pipes' ? 'p:' : 'j:') + id) });
    return out;
  }
  // the row of an object at a recorded step, as the tables of the results build theirs
  function rowAt(run, kind, id, i) {
    const pick = (s) => { const o = {}; if (s) for (const f in s) o[f] = s[f][i]; return o; };
    const r = pick(run.series[kind][id]);
    const row = Object.assign({ id, key: (kind === 'pipes' ? 'p:' : 'j:') + id }, r);
    const res = app.currentResults();
    const rho = res && res.fluid ? res.fluid.rho : NaN;
    if (kind === 'junctions') {
      const j = M.getObj(app.eff(), 'j:' + id), v = j && UI.junctionTypes.get(j.type);
      const net = v && v.boundaryFlow ? v.boundaryFlow(r) : null;
      Object.assign(row, { Qt: r.m / rho, two: !('net' in r), mnet: net === null || net === undefined ? NaN : net, Qnet: net === null || net === undefined ? NaN : net / rho });
    }
    if (kind === 'pumps' || kind === 'valves') {
      const jr = pick(run.series.junctions[id]);
      for (const k of ['P0in', 'P0out', 'Pin', 'Pout']) if (!(k in row) && k in jr) row[k] = jr[k];
      if (kind === 'pumps') row.etaPct = r.etaAssumed ? NaN : r.eta * 100;
    }
    return row;
  }
  function seriesTab(run) {
    const objs = objects(run);
    if (!objs.length) return `<div class="card"><div class="empty">${F.esc(tx('noObjects'))}</div></div>`;
    let pick = objs.find((o) => o.v === app.prefs.timeObj) || objs[0];
    const ctx = ctxOf();
    const groups = KINDS.map((k) => {
      const os = objs.filter((o) => o.kind === k);
      return os.length ? `<optgroup label="${F.esc(tx('kinds.' + k))}">${os.map((o) => F.option(o.v, o.label, o === pick)).join('')}</optgroup>` : '';
    }).join('');
    const n = run.times.length;
    let th = timeHead(run), body = '';
    const rows = [];
    if (pick.kind === 'tanks') {
      const s = run.series.tanks[pick.id];
      th += tankCols(s).map(([k, cat]) => `<th${cat === 'txt' ? ' class="txt"' : ''}>${head(tankLabel(k), 'ttank.' + k, cat === 'txt' ? null : cat)}</th>`).join('');
      for (let i = 0; i < n; i++) rows.push(tankCols(s).map(([k, cat]) => (cat === 'txt' ? `<td class="txt">${F.esc(tx('tankStates.' + PumpIt.time.record.TANK_STATES[s.state[i]]))}</td>` : `<td class="num">${val(s[k][i], cat, 'ttank.' + k, ctx)}</td>`)).join(''));
    } else {
      const res = app.currentResults();
      const cols = C.colsFor(pick.kind, res).filter((c) => !c.t);
      // the value its table gave, for a junction with time data
      const inp = pick.kind === 'junctions' && run.series.inputs[pick.id] ? inputCol(pick.id) : null;
      th += cols.map((c) => `<th>${F.esc(C.colLabel(pick.kind, c))}${c.c ? C.unitSelect(pick.kind, c) : ''}</th>`).join('');
      if (inp) th += `<th>${head(inp.label, 'tin.' + inp.what, inp.cat)}</th>`;
      for (let i = 0; i < n; i++) {
        const row = rowAt(run, pick.kind, pick.id, i);
        let cells = cols.map((c) => { const x = C.cellValue(c, row, ctx, pick.kind); return `<td class="num${x === '—' ? ' na' : ''}">${F.esc(x)}</td>`; }).join('');
        if (inp) cells += `<td class="num">${inp.cat ? val(run.series.inputs[pick.id].v[i], inp.cat, 'tin.' + inp.what, ctx) : F.fmt(run.series.inputs[pick.id].v[i], 5)}</td>`;
        rows.push(cells);
      }
    }
    // a step at the exact time of an event stands out, with its title
    const cls = (i) => [i === app.cursorIndex() ? 'cur' : '', run.exact[i] ? 'exact' : ''].filter(Boolean).join(' ');
    body = rows.map((cells, i) => `<tr data-i="${i}"${cls(i) ? ` class="${cls(i)}"` : ''}${run.exact[i] ? ` title="${F.esc(tx('exactRow'))}"` : ''}>${timeCells(run, run.times[i])}${cells}</tr>`).join('');
    return `<div class="card"><div class="card-head"><h3>${F.esc(tx('tabs.series'))}</h3><div class="btn-row"><label class="muted small" for="tr-obj">${F.esc(tx('object'))}</label> <select id="tr-obj">${groups}</select><button class="btn small" data-tcopy type="button">${F.esc(t('results.copyTable'))}</button></div></div>
      <p class="muted small" style="margin:0 0 8px">${F.esc(tx('seriesHint'))}</p>
      <div class="table-scroll tr-scroll"><table class="grid" id="tr-table"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div></div>`;
  }
  // the column of the table values of a junction: the quantity of its time data, in a unit of its category
  function inputCol(id) {
    const j = M.getObj(app.eff(), 'j:' + id);
    const def = j && PumpIt.junctionTypes.get(j.type);
    const qt = j && j.time && def && def.time && def.time.quantities ? (def.time.quantities(j, { gas: M.isCompressible(app.eff()) }) || []).find((x) => x.what === j.time.what) : null;
    const what = j && j.time ? j.time.what : '';
    const cat = qt && qt.cat !== 'none' && qt.cat !== 'percent' ? qt.cat : null;
    return { what, cat, label: tx('input', { what: t('time.data.whats.' + what) }) };
  }

  // ------------------------------------------------------------ the event log
  // a value of the log, without trailing zeros ("from 100 % to 0 %")
  function short(v) {
    if (!Number.isFinite(v) || v === 0 || Math.abs(v) >= 1e7 || Math.abs(v) < 1e-4) return F.fmt(v, 5);
    const dec = Math.max(0, Math.min(6, 4 - Math.floor(Math.log10(Math.abs(v)))));
    return v.toLocaleString(PumpIt.i18n.numberLocale(), { maximumFractionDigits: dec }).replace('-', '−');
  }
  function fmtEvent(v, cat) {
    const ctx = ctxOf();
    if (cat === 'none') return short(v);
    if (cat === 'percent') return short(v) + ' %';
    const u = unitOf('tev.' + cat, cat === 'flow' ? 'volFlow' : cat);
    const c = cat === 'flow' ? 'flow' : cat;
    return `${short(F.conv(v, c, u, ctx))} ${F.unit(u)}`;
  }
  function eventsTab(run) {
    const by = app.prefs.timeEvents === 'object' ? 'object' : 'time';
    const ev = run.events.map((e, n) => Object.assign({ n }, e));
    if (by === 'object') ev.sort((a, b) => (a.obj < b.obj ? -1 : a.obj > b.obj ? 1 : a.t - b.t || a.n - b.n));
    const seg = `<div class="seg small" role="radiogroup">${['time', 'object'].map((k) => `<button type="button" data-tev="${k}" role="radio" aria-checked="${k === by}" class="${k === by ? 'on' : ''}">${F.esc(tx(k === 'time' ? 'byTime' : 'byObject'))}</button>`).join('')}</div>`;
    const kindTxt = { event: 'info', info: 'info', warning: 'warning' };
    const body = ev.map((e) => `<tr data-key="${e.obj}"><td class="num">${F.esc(TF().clock(e.t))}</td><td class="txt">${F.esc(objName(e.obj))}</td><td class="txt"><span class="lvl ${kindTxt[e.kind]}">${F.esc(tx('eventKinds.' + e.kind))}</span></td><td class="txt">${F.esc(PumpIt.time.record.eventText(e, fmtEvent))}</td></tr>`).join('');
    return `<div class="card"><div class="card-head"><h3>${F.esc(tx('tabs.events'))}</h3><div class="btn-row">${seg}</div></div>
      ${ev.length ? `<div class="table-scroll"><table class="grid"><thead><tr><th>${F.esc(tx('clock'))}</th><th class="txt">${F.esc(tx('object'))}</th><th class="txt">${F.esc(tx('eventKind'))}</th><th class="txt">${F.esc(tx('message'))}</th></tr></thead><tbody>${body}</tbody></table></div>` : `<div class="empty">${F.esc(tx('noEvents'))}</div>`}</div>`;
  }

  // ------------------------------------------------------------ extremes and totals
  // a table of rows: cols = [[label, k, cat]], each row { key, cells: [html] }
  function table(title, cols, rows, hint) {
    if (!rows.length) return '';
    const th = `<th class="txt">${F.esc(tx('object'))}</th>` + cols.map(([label, k, cat]) => `<th>${cat ? head(label, k, cat) : F.esc(label)}</th>`).join('');
    const body = rows.map((r) => `<tr data-key="${r.key}"><td class="txt">${F.esc(objName(r.key))}</td>${r.cells.map((c) => `<td class="num">${c}</td>`).join('')}</tr>`).join('');
    return `<div class="card"><div class="card-head"><h3>${F.esc(title)}</h3>${hint ? `<span class="muted small">${F.esc(hint)}</span>` : ''}</div><div class="table-scroll"><table class="grid"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div></div>`;
  }
  // an extreme: its value and the time it came
  const at = (x, cat, k, ctx) => (x ? `${val(x.v, cat, k, ctx)}` : '—');
  const when = (x) => (x ? F.esc(TF().clock(x.t)) : '—');
  function extremesTab(run) {
    const ctx = ctxOf();
    const X = run.extremes;
    const ends = (x) => (x && x.end ? ` <span class="muted">${F.esc(t('time.data.cond.ends.' + x.end))}</span>` : '');
    const liquid = Object.entries(X.tanks).filter(([, o]) => !o.Pmax), gasV = Object.entries(X.tanks).filter(([, o]) => o.Pmax);
    let html = table(tx('kinds.tanks'), [[tx('hmax'), 'tex.h', 'length'], [tx('at'), '', null], [tx('hmin'), 'tex.h', 'length'], [tx('at'), '', null]],
      liquid.map(([id, o]) => ({ key: 'j:' + id, cells: [at(o.hmax, 'length', 'tex.h', ctx), when(o.hmax), at(o.hmin, 'length', 'tex.h', ctx), when(o.hmin)] })));
    html += table(tx('vessels'), [[tx('Pvmax'), 'tex.P', 'pressure'], [tx('at'), '', null], [tx('Pvmin'), 'tex.P', 'pressure'], [tx('at'), '', null], [tx('Tvmax'), 'tex.T', 'temperature'], [tx('at'), '', null], [tx('Tvmin'), 'tex.T', 'temperature'], [tx('at'), '', null]],
      gasV.map(([id, o]) => ({ key: 'j:' + id, cells: [at(o.Pmax, 'pressure', 'tex.P', ctx), when(o.Pmax), at(o.Pmin, 'pressure', 'tex.P', ctx), when(o.Pmin), at(o.Tmax, 'temperature', 'tex.T', ctx), when(o.Tmax), at(o.Tmin, 'temperature', 'tex.T', ctx), when(o.Tmin)] })));
    html += table(tx('kinds.pipes'), [[tx('Pmax'), 'tex.P', 'pressure'], [tx('at'), '', null], [tx('Pmin'), 'tex.P', 'pressure'], [tx('at'), '', null], [tx('Qmax'), 'tex.Q', 'volFlow'], [tx('at'), '', null], [tx('Qmin'), 'tex.Q', 'volFlow'], [tx('at'), '', null], [tx('Vmax'), 'tex.V', 'velocity'], [tx('at'), '', null]],
      Object.entries(X.pipes).map(([id, o]) => ({ key: 'p:' + id, cells: [at(o.Pmax, 'pressure', 'tex.P', ctx) + ends(o.Pmax), when(o.Pmax), at(o.Pmin, 'pressure', 'tex.P', ctx) + ends(o.Pmin), when(o.Pmin), at(o.Qmax, 'volFlow', 'tex.Q', ctx), when(o.Qmax), at(o.Qmin, 'volFlow', 'tex.Q', ctx), when(o.Qmin), at(o.Vmax, 'velocity', 'tex.V', ctx), when(o.Vmax)] })), tx('pipesHint'));
    html += table(tx('kinds.junctions'), [[tx('P0max'), 'tex.P0', 'pressure'], [tx('at'), '', null], [tx('P0min'), 'tex.P0', 'pressure'], [tx('at'), '', null]],
      Object.entries(X.junctions).map(([id, o]) => ({ key: 'j:' + id, cells: [at(o.Pmax, 'pressure', 'tex.P0', ctx), when(o.Pmax), at(o.Pmin, 'pressure', 'tex.P0', ctx), when(o.Pmin)] })));
    html += table(tx('kinds.pumps'), [[tx('Qmax'), 'tex.Q', 'volFlow'], [tx('at'), '', null], [tx('Qmin'), 'tex.Q', 'volFlow'], [tx('at'), '', null], [tx('Hmax'), 'tex.H', 'head'], [tx('at'), '', null], [tx('Hmin'), 'tex.H', 'head'], [tx('at'), '', null], [tx('Wmax'), 'tex.W', 'power'], [tx('at'), '', null], [tx('Wmin'), 'tex.W', 'power'], [tx('at'), '', null]],
      Object.entries(X.pumps).map(([id, o]) => ({ key: 'j:' + id, cells: [at(o.Qmax, 'volFlow', 'tex.Q', ctx), when(o.Qmax), at(o.Qmin, 'volFlow', 'tex.Q', ctx), when(o.Qmin), at(o.Hmax, 'head', 'tex.H', ctx), when(o.Hmax), at(o.Hmin, 'head', 'tex.H', ctx), when(o.Hmin), at(o.Pmax, 'power', 'tex.W', ctx), when(o.Pmax), at(o.Pmin, 'power', 'tex.W', ctx), when(o.Pmin)] })));
    return html || `<div class="card"><div class="empty">${F.esc(tx('noObjects'))}</div></div>`;
  }
  function totalsTab(run) {
    const ctx = ctxOf();
    const T = run.totals;
    const v = (x, cat, k) => val(x, cat, k, ctx);
    // the cost of the energy, with the currency of the tariff
    const C = T.cost, money = (x) => (Number.isFinite(x) ? F.fixed(x, 2) : '—');
    const costHead = C ? [[C.currency ? `${tx('cost')} (${C.currency})` : tx('cost'), '', null]] : [];
    // a gas counts its mass where a liquid counts its volume
    const gas = !!run.gas;
    const amount = gas ? [tx('pumpedMass'), 'tto.M', 'mass'] : [tx('pumped'), 'tto.V', 'volume'];
    let html = table(tx('kinds.pumps'), [[tx('energy'), 'tto.E', 'energy'], [tx('energyIdeal'), 'tto.E', 'energy'], amount, [tx('ton'), 'tto.t', 'time'], [tx('starts'), '', null]].concat(costHead),
      Object.entries(T.pumps).map(([id, o]) => ({ key: 'j:' + id, cells: [v(o.E, 'energy', 'tto.E') + (o.noEff ? ' *' : ''), v(o.Eideal, 'energy', 'tto.E'), gas ? v(o.M, 'mass', 'tto.M') : v(o.V, 'volume', 'tto.V'), v(o.ton, 'time', 'tto.t'), String(o.starts)].concat(C ? [money(o.cost)] : []) })),
      Object.values(T.pumps).some((o) => o.noEff) ? tx('noEff') : '');
    if (C) {
      const cur = C.currency ? ' ' + F.esc(C.currency) : '';
      const kv = [[tx('costTotal'), money(C.total) + cur]];
      if (Number.isFinite(C.annual)) kv.push([tx('annual'), money(C.annual) + cur]);
      html += `<div class="card"><div class="card-head"><h3>${F.esc(tx('costTitle'))}</h3>${Number.isFinite(C.annual) ? `<span class="muted small">${F.esc(tx('annualHint'))}</span>` : ''}</div><div class="kv">${kv.map(([k, x]) => `<div><span class="eyebrow">${F.esc(k)}</span><b>${x}</b></div>`).join('')}</div></div>`;
    }
    html += table(tx('kinds.tanks'), [[tx('V0'), 'tto.V', 'volume'], [tx('Vf'), 'tto.V', 'volume'], [tx('dV'), 'tto.V', 'volume'], [tx('Vin'), 'tto.V', 'volume'], [tx('Vout'), 'tto.V', 'volume'], [tx('over'), 'tto.V', 'volume'], [tx('def'), 'tto.V', 'volume'], [tx('closure'), 'tto.V', 'volume']],
      Object.entries(T.tanks).filter(([, o]) => !o.vessel).map(([id, o]) => ({ key: 'j:' + id, cells: [v(o.V0, 'volume', 'tto.V'), v(o.Vf, 'volume', 'tto.V'), v(o.dV, 'volume', 'tto.V'), v(o.Vin, 'volume', 'tto.V'), v(o.Vout, 'volume', 'tto.V'), v(o.over, 'volume', 'tto.V'), v(o.def, 'volume', 'tto.V'), v(o.closure, 'volume', 'tto.V')] })), tx('tanksHint'));
    html += table(tx('vessels'), [[tx('M0'), 'tto.M', 'mass'], [tx('Mf'), 'tto.M', 'mass'], [tx('dM'), 'tto.M', 'mass'], [tx('Min'), 'tto.M', 'mass'], [tx('Mout'), 'tto.M', 'mass'], [tx('closure'), 'tto.M', 'mass']],
      Object.entries(T.tanks).filter(([, o]) => o.vessel).map(([id, o]) => ({ key: 'j:' + id, cells: [v(o.M0, 'mass', 'tto.M'), v(o.Mf, 'mass', 'tto.M'), v(o.dM, 'mass', 'tto.M'), v(o.Min, 'mass', 'tto.M'), v(o.Mout, 'mass', 'tto.M'), v(o.closure, 'mass', 'tto.M')] })), tx('vesselsHint'));
    html += table(tx('kinds.flows'), gas ? [[tx('deliveredMass'), 'tto.M', 'mass'], [tx('unmet'), 'tto.M', 'mass']] : [[tx('delivered'), 'tto.V', 'volume'], [tx('unmet'), 'tto.V', 'volume']],
      Object.entries(T.flows).map(([id, o]) => ({ key: 'j:' + id, cells: gas ? [v(o.M, 'mass', 'tto.M'), v(o.unmetM, 'mass', 'tto.M')] : [v(o.V, 'volume', 'tto.V'), v(o.unmet, 'volume', 'tto.V')] })));
    // the balance of the network: in volume for a liquid, in mass for a gas
    const [cl, sc, k2, cat] = gas ? [T.model.closureM || 0, T.model.scaleM || 0, 'tto.M', 'mass'] : [T.model.closure, T.model.scale, 'tto.V', 'volume'];
    const rel = sc > 0 ? Math.abs(cl) / sc : 0;
    html += `<div class="card"><div class="card-head"><h3>${F.esc(tx(gas ? 'massBalance' : 'balance'))}</h3><span class="muted small">${F.esc(tx('balanceHint'))}</span></div><div class="kv"><div><span class="eyebrow">${F.esc(tx('closure'))}</span><b>${v(cl, cat, k2)} ${F.esc(F.unit(unitOf(k2, cat)))}</b></div><div><span class="eyebrow">${F.esc(tx(gas ? 'relativeMass' : 'relative'))}</span><b>${F.fmt(rel, 3)}</b></div></div></div>`;
    return html;
  }

  function render(tab, container) {
    const run = app.timeRun();
    if (!run) { container.innerHTML = `<div class="card"><div class="empty">${F.esc(tx('noRun'))}</div></div>`; return; }
    if (tab === 'series') container.innerHTML = seriesTab(run);
    else if (tab === 'events') container.innerHTML = eventsTab(run);
    else if (tab === 'extremes') container.innerHTML = extremesTab(run);
    else container.innerHTML = totalsTab(run);
  }

  // the controls of these tabs (bound once, by results.js)
  function bind(view) {
    view.addEventListener('change', (e) => {
      if (e.target.id === 'tr-obj') { app.prefs.timeObj = e.target.value; app.savePrefs(); app.renderView(); }
      if (e.target.classList.contains('tr-tunit')) { app.prefs.timeUnit = e.target.value; app.savePrefs(); app.renderView(); }
    });
    view.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tev]');
      if (b) { app.prefs.timeEvents = b.dataset.tev; app.savePrefs(); app.renderView(); return; }
      if (e.target.closest('[data-tcopy]')) { UI.dialogs.copyText(tableText(document.getElementById('tr-table')), t('results.copied')); return; }
      // a row of the table over time takes the cursor to its step
      const r = e.target.closest('#tr-table tbody tr[data-i]');
      if (r && !e.target.closest('select')) app.setCursor(Number(r.dataset.i));
    });
  }
  // a table of the page as tab-separated text, to paste into a spreadsheet
  function tableText(tb) {
    if (!tb) return '';
    const cell = (c) => UI.resultExport.pasteText(c.querySelector('select') ? c.childNodes[0].textContent.trim() + ' (' + c.querySelector('select').selectedOptions[0].textContent + ')' : c.textContent.trim());
    return [...tb.rows].map((r) => [...r.cells].map(cell).join('\t')).join('\n');
  }

  // ------------------------------------------------------------ the sheets of the .xlsx file (§10.4): a sheet per kind of
  // object, the time in rows and a column per object and output (the outputs and units of its table), and the event log
  function sheets() {
    const run = app.timeRun();
    if (!run) return [];
    const res = app.currentResults(), ctx = C.ctxOf(res), n = run.times.length;
    const auto = UI.resultExport.autoFormat;
    const base = [{ header: tx('sheetTime'), width: 12, format: '0.###' }, { header: tx('clock'), width: 14, format: 'text' }];
    const out = [];
    const sheet = (name, cols) => {
      if (!cols.length) return;
      const rows = [];
      for (let i = 0; i < n; i++) rows.push([run.times[i], TF().clock(run.times[i])].concat(cols.map((c) => c.get(i))));
      out.push({ name, columns: base.concat(cols.map((c, k) => ({ header: c.header, width: Math.min(40, Math.max(12, c.header.length + 2)), format: c.text ? 'text' : auto(rows.map((r) => r[k + 2])) }))), rows });
    };
    const num = (v) => (Number.isFinite(v) ? v : '—');
    const tcols = [];
    for (const id of Object.keys(run.series.tanks)) {
      const s = run.series.tanks[id];
      for (const [k, cat] of tankCols(s)) {
        if (cat === 'txt') tcols.push({ header: `J${id} ${tankLabel(k)}`, text: true, get: (i) => tx('tankStates.' + PumpIt.time.record.TANK_STATES[s.state[i]]) });
        else { const u = unitOf('ttank.' + k, cat); tcols.push({ header: `J${id} ${tankLabel(k)} (${F.unit(u)})`, get: (i) => num(F.conv(s[k][i], cat, u, ctx)) }); }
      }
    }
    sheet(tx('sheets.tanks'), tcols);
    for (const kind of ['pipes', 'junctions', 'pumps', 'valves']) {
      const cs = C.colsFor(kind, res).filter((c) => !c.t);
      const cols = [];
      for (const id of Object.keys(run.series[kind])) {
        const tag = (kind === 'pipes' ? 'P' : 'J') + id;
        // the columns of one object come together in a row: its values are gathered once per row
        let memo = { i: -1, row: null };
        const rowOf = (i) => (memo.i === i ? memo.row : (memo = { i, row: rowAt(run, kind, +id, i) }).row);
        for (const c of cs) cols.push({ header: `${tag} ${C.colLabel(kind, c)}${c.c ? ' (' + F.unit(c.u) + ')' : ''}`, get: (i) => num(C.number(c, rowOf(i), ctx)) });
      }
      sheet(tx('sheets.' + kind), cols);
    }
    const ev = run.events.map((e) => [e.t, TF().clock(e.t), objName(e.obj), tx('eventKinds.' + e.kind), PumpIt.time.record.eventText(e, fmtEvent)]);
    if (ev.length) {
      out.push({ name: tx('sheets.events'), columns: [base[0], base[1], { header: tx('object'), width: 18, format: 'text' }, { header: tx('eventKind'), width: 14, format: 'text' }, { header: tx('message'), width: 60, format: 'text' }], rows: ev });
    }
    return out;
  }

  UI.timeResults = { TABS, render, bind, summaryCard, warningsCard, objects, rowAt, sheets, TANK_COLS, tankCols, tankLabel };
})(window);
