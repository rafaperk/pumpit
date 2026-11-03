// Results of the time simulation (docs/time-simulation.md, §9 of its specification). The recorded steps keep a series of
// every numeric field of the steady results (pipes, junctions, pumps, valves; a yes or no as 1 or 0) and of the finite
// tanks, plus a snapshot
// from which the full result of the step is solved again on demand. Extremes, totals, the warnings and the event log
// take every calculated step, recorded or not.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const { fmtSI } = PumpIt.solver.util;

  const KINDS = ['pipes', 'junctions', 'pumps', 'valves'];
  // the fields recorded for a finite tank: level over the bottom, elevation of the surface, pressure at the surface,
  // volume, mass, net flow into the tank (volume and mass) and its state (0 normal, 1 full, 2 empty)
  const TANK_FIELDS = ['h', 'zs', 'Ps', 'V', 'M', 'Qnet', 'mnet', 'state'];
  const TANK_STATES = ['normal', 'full', 'empty'];
  // and for a closed tank, the volume and the pressure of its gas
  const GAS_FIELDS = ['Vg', 'Pg'];
  // a gas vessel (compressible mode): the pressure, the temperature, the mass and the density of its gas, its net mass flow
  const VESSEL_FIELDS = ['Pv', 'Tv', 'M', 'rho', 'mnet'];

  // the recorded steps: every saveEvery-th one, and always the last
  const recordedCount = (N, every) => Math.floor(N / every) + 1 + (N % every ? 1 : 0);
  const isRecorded = (k, N, every) => k % every === 0 || k === N;

  function create(plan) {
    const nRec = recordedCount(plan.N, plan.saveEvery);
    return {
      nRec, n: 0, times: new Float64Array(nRec), steps: new Int32Array(nRec), exact: new Uint8Array(nRec), series: { pipes: {}, junctions: {}, pumps: {}, valves: {}, tanks: {}, inputs: {} },
      snaps: [], extremes: { pipes: {}, junctions: {}, tanks: {}, pumps: {} },
      totals: { pumps: {}, tanks: {}, flows: {}, model: { closure: 0, scale: 0 } },
      events: [], warnings: [], stepWarn: new Map(), warned: new Set(),
    };
  }

  // ---------- series
  function put(R, kind, id, field, ri, v) {
    const byId = R.series[kind];
    const fs = byId[id] || (byId[id] = {});
    let a = fs[field];
    if (!a) { a = fs[field] = new Float64Array(R.nRec); a.fill(NaN); }
    a[ri] = v;
  }
  // more room for the series: the steps at the exact time of an event come on top of those of the clock
  function grow(R) {
    const n = R.nRec * 2;
    const more = (a) => { const b = new a.constructor(n); b.set(a); return b; };
    R.times = more(R.times); R.steps = more(R.steps); R.exact = more(R.exact);
    for (const kind in R.series) for (const id in R.series[kind]) for (const f in R.series[kind][id]) {
      const b = more(R.series[kind][id][f]);
      b.fill(NaN, R.nRec);
      R.series[kind][id][f] = b;
    }
    R.nRec = n;
  }
  // inputs: the value each junction with time data used in the step (SI), as { jid, v }; exact: a step at the exact time
  // of an event, between two steps of the clock (k is the one before it)
  function recordSeries(R, k, tk, sol, tanks, inputs, exact) {
    if (R.n >= R.nRec) grow(R);
    const ri = R.n++;
    R.times[ri] = tk; R.steps[ri] = k; R.exact[ri] = exact ? 1 : 0;
    for (const kind of KINDS) {
      const rows = sol[kind];
      for (const id in rows) {
        const r = rows[id];
        for (const f in r) {
          if (typeof r[f] === 'number') put(R, kind, id, f, ri, r[f]);
          else if (typeof r[f] === 'boolean') put(R, kind, id, f, ri, r[f] ? 1 : 0);
        }
      }
    }
    for (const x of tanks) {
      const fields = x.vessel ? VESSEL_FIELDS : x.closed ? TANK_FIELDS.concat(GAS_FIELDS) : TANK_FIELDS;
      for (const f of fields) put(R, 'tanks', x.jid, f, ri, f === 'state' ? TANK_STATES.indexOf(x.state) : x[f]);
    }
    for (const x of inputs) put(R, 'inputs', x.jid, 'v', ri, x.v);
    return ri;
  }

  // ---------- extremes (§9.2): the largest and smallest values with the time they occurred
  function ext(o, key, v, tk, more) {
    if (!Number.isFinite(v)) return;
    const big = key.endsWith('max');
    const cur = o[key];
    if (!cur || (big ? v > cur.v : v < cur.v)) o[key] = Object.assign({ v, t: tk }, more);
  }
  function recordExtremes(R, tk, sol, tanks) {
    const X = R.extremes;
    for (const id in sol.pipes) {
      const r = sol.pipes[id], o = X.pipes[id] || (X.pipes[id] = {});
      ext(o, 'Pmax', r.Pin, tk, { end: 'in' }); ext(o, 'Pmax', r.Pout, tk, { end: 'out' });
      ext(o, 'Pmin', r.Pin, tk, { end: 'in' }); ext(o, 'Pmin', r.Pout, tk, { end: 'out' });
      ext(o, 'Qmax', r.Q, tk); ext(o, 'Qmin', r.Q, tk);
      ext(o, 'Vmax', Math.abs(r.V), tk);
    }
    for (const id in sol.junctions) {
      const r = sol.junctions[id], o = X.junctions[id] || (X.junctions[id] = {});
      ext(o, 'Pmax', r.P0in, tk); ext(o, 'Pmax', r.P0out, tk);
      ext(o, 'Pmin', r.P0in, tk); ext(o, 'Pmin', r.P0out, tk);
    }
    for (const x of tanks) {
      const o = X.tanks[x.jid] || (X.tanks[x.jid] = {});
      if (x.vessel) { ext(o, 'Pmax', x.Pv, tk); ext(o, 'Pmin', x.Pv, tk); ext(o, 'Tmax', x.Tv, tk); ext(o, 'Tmin', x.Tv, tk); }
      else { ext(o, 'hmax', x.h, tk); ext(o, 'hmin', x.h, tk); }
    }
    for (const id in sol.pumps) {
      const r = sol.pumps[id], o = X.pumps[id] || (X.pumps[id] = {});
      const P = Number.isFinite(r.Pshaft) ? r.Pshaft : r.Pideal;
      ext(o, 'Qmax', r.Q, tk); ext(o, 'Qmin', r.Q, tk);
      ext(o, 'Hmax', r.dH, tk); ext(o, 'Hmin', r.dH, tk);
      ext(o, 'Pmax', P, tk); ext(o, 'Pmin', P, tk);
    }
  }

  // ---------- totals (§9.3), weighted by the interval each step stands for (w, s; §6.3); the cost of the energy takes the
  // tariff at the time of the step tk (§9.5)
  function recordTotals(R, plan, w, sol, model, tanks, wasOn, tk) {
    const T = R.totals, rho = sol.fluid.rho;
    const on = new Map();
    for (const j of model.junctions) {
      const tm = plan.timeDef(j);
      if (!tm) continue;
      if (tm.isOn) {
        const r = sol.pumps[j.id] || {};
        const run = tm.isOn(j);
        on.set(j.id, run);
        const o = T.pumps[j.id] || (T.pumps[j.id] = { E: 0, Eideal: 0, V: 0, M: 0, ton: 0, starts: 0, noEff: false, cost: plan.tariff ? 0 : NaN });
        if (run && wasOn && wasOn.get(j.id) === false) o.starts++;
        if (!(w > 0)) continue;
        if (run) o.ton += w;
        if (Number.isFinite(r.Q)) o.V += w * r.Q;
        if (Number.isFinite(r.m)) o.M += w * r.m;
        if (Number.isFinite(r.Pideal)) o.Eideal += w * r.Pideal;
        // the power of the shaft, the one given to the gas by a compressor, or the one given to the liquid without an
        // efficiency curve
        let pw = NaN;
        if (Number.isFinite(r.Pshaft)) pw = r.Pshaft;
        else if (Number.isFinite(r.Pgas)) pw = r.Pgas;
        else if (run && Number.isFinite(r.Pideal)) { pw = r.Pideal; o.noEff = true; }
        if (Number.isFinite(pw)) {
          o.E += w * pw;
          if (plan.tariff) o.cost += PumpIt.time.cost.of(plan.tariff, w, pw, tk);
        }
      }
      // an imposed flow (a free tank node of the first step is no imposed flow)
      if (tm.imposedFlow && w > 0 && !plan.tankIndex.has(j.id)) {
        const r = sol.junctions[j.id];
        // the volume delivered (a liquid) and the mass (a liquid or a gas)
        const o = T.flows[j.id] || (T.flows[j.id] = { V: 0, M: 0, unmet: 0, unmetM: 0 });
        if (r && Number.isFinite(r.net)) { o.V += w * Math.abs(r.net) / rho; o.M += w * Math.abs(r.net); }
      }
    }
    if (w > 0) {
      for (const u of sol.unsupplied || []) {
        const o = T.flows[u.jid];
        if (o) { o.unmet += w * Math.abs(u.m) / rho; o.unmetM += w * Math.abs(u.m); }
      }
      for (const x of tanks) {
        const o = T.tanks[x.jid];
        if (x.vessel) { o.sumM += w * x.mnet; o.Min += w * x.min; o.Mout += w * x.mout; continue; }
        o.sumQ += w * x.Qnet;
        o.Vin += w * x.qin; o.Vout += w * x.qout;
      }
      // the balance of the whole network: what every boundary and tank gives must add up to nothing
      let s = 0, a = 0;
      for (const id in sol.junctions) {
        const r = sol.junctions[id];
        if (Number.isFinite(r.net)) { s += r.net; a += Math.abs(r.net); }
      }
      T.model.closure += w * s / rho;
      T.model.scale += w * a / (2 * rho);
      // the same in mass (the balance of a gas)
      T.model.closureM = (T.model.closureM || 0) + w * s;
      T.model.scaleM = (T.model.scaleM || 0) + w * a / 2;
    }
    return on;
  }

  // ---------- warnings
  // a warning of the simulation itself (once per key and object)
  function warnOnce(R, level, key, params, obj) {
    const id = key + '|' + (obj || '');
    if (R.warned.has(id)) return;
    R.warned.add(id);
    R.warnings.push({ level, text: t(key, params), obj });
  }
  // the warnings of the steps, grouped by level, object and message (§9.4): a message is its text with the numbers left
  // out, which tells the messages of the catalogs apart as their keys would (decision T-16)
  const messageOf = (text) => String(text).replace(/[-+−]?\d+(?:[.,]\d+)*(?:e[-+]?\d+)?/gi, '#');
  function recordStepWarnings(R, tk, sol) {
    for (const w of sol.warnings || []) {
      const id = w.level + '|' + (w.obj || '') + '|' + messageOf(w.text);
      const g = R.stepWarn.get(id);
      if (g) { g.t2 = tk; g.n++; } else R.stepWarn.set(id, { level: w.level, text: w.text, obj: w.obj, t1: tk, t2: tk, n: 1 });
    }
  }

  // ---------- the event log (§5.5): { t, obj, kind ('event' | 'info' | 'warning'), key, params }
  const log = (R, tk, obj, kind, key, params) => R.events.push({ t: tk, obj, kind, key, params: params || {} });

  // the text of an entry of the log. fmt(v, cat) writes a value of a unit category (a value in SI without one)
  const SI = { pressure: 'Pa', dp: 'Pa', flow: 'kg/s', length: 'm', area: 'm²', percent: '%', none: '', time: 's', volume: 'm³' };
  const fmtDefault = (v, cat) => fmtSI(v) + (SI[cat] ? ' ' + SI[cat] : '');
  function eventText(e, fmt = fmtDefault) {
    const p = Object.assign({}, e.params);
    if (e.params.cat) { p.from = fmt(e.params.from, e.params.cat); p.to = fmt(e.params.to, e.params.cat); }
    return t(e.key, p);
  }

  const order = { critical: 0, warning: 1, caution: 2, info: 3 };
  function warningsOf(R) {
    const all = R.warnings.map((w) => Object.assign({ n: 0 }, w)).concat([...R.stepWarn.values()]);
    return all.sort((a, b) => order[a.level] - order[b.level]);
  }

  PumpIt.time = Object.assign(PumpIt.time || {}, {
    record: { KINDS, TANK_FIELDS, TANK_STATES, GAS_FIELDS, VESSEL_FIELDS, recordedCount, isRecorded, create, recordSeries, recordExtremes, recordTotals, warnOnce, recordStepWarnings, messageOf, log, eventText, warningsOf },
  });
})(typeof window !== 'undefined' ? window : globalThis);
