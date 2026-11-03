// Inputs of the time simulation (docs/time-simulation.md, §4 and §8.2 of its specification): the checklist of the time
// data of a junction, their preparation in SI, and the model of a step, a copy of the effective model of the scenario
// with the values of the tables at the time t, the levels of the finite tanks and the pipes the tanks closed.
//
//   j.time = { use, what, basis: 'absolute' | 'relative', start: 'time' | 'single' | 'dualCyclic' | 'dualSequential' |
//              'combined', when: [condition], combined: name of an event of the model, tables: [{ t: [], v: [], tUnit,
//              vUnit }], repeat, interp: 'linear' | 'step' }
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, U = PumpIt.units;
  const types = PumpIt.junctionTypes;
  const q = M.q;
  const E = () => PumpIt.time.events;

  const BASES = ['absolute', 'relative'];
  const INTERP = ['linear', 'step'];

  // time data that count: present, in use, and of a type that takes them
  const active = (j) => !!(j && j.time && typeof j.time === 'object' && j.time.use && types.get(j.type) && types.get(j.type).time);

  // the quantity of the time data of j in its current mode and in the regime of the model eff (null: it does not take it)
  function quantityOf(j, eff) {
    const tm = types.get(j.type).time;
    return ((tm.quantities && tm.quantities(j, { gas: M.isCompressible(eff) })) || []).find((x) => x.what === j.time.what) || null;
  }

  // what is missing in the time data of a junction, as keys under core.checklist.time (an empty list: complete)
  function check(j, eff) {
    const d = j.time, out = [];
    const qt = quantityOf(j, eff);
    if (!qt) out.push('data.what');
    if (!BASES.includes(d.basis)) out.push('data.basis');
    if (!E().STARTS.includes(d.start)) { out.push('data.start'); return out; }
    if (!INTERP.includes(d.interp)) out.push('data.interp');
    const nE = E().EVENTS[d.start], nT = E().TABLES[d.start];
    const when = Array.isArray(d.when) ? d.when : [];
    if (when.length < nE) out.push('data.conditions');
    for (let i = 0; i < nE && i < when.length; i++) for (const k of E().check(when[i], eff)) out.push('condition.' + k);
    // a combined event: one of the events of the model, complete (§5.4)
    if (d.start === 'combined' && !E().namedOk(eff, d.combined)) out.push('data.combined');
    // a flow of a gas: a mass or a normal volume, in the junction as in its tables (a volume at the conditions of the pipe
    // changes with them, so a table cannot hold it)
    const gasFlow = qt && qt.cat === 'flow' && M.isCompressible(eff);
    if (gasFlow) {
      let vol = false;
      try { qt.steady(j, (x) => { if (x && U.isVolumetric(x.unit)) vol = true; return 0; }); } catch (e) { /* incomplete: its own checklist */ }
      if (vol) out.push('data.gasVolume');
    }
    const tables = Array.isArray(d.tables) ? d.tables : [];
    if (tables.length < nT) { out.push('data.tables'); return [...new Set(out)]; }
    for (let i = 0; i < nT; i++) {
      const tb = tables[i];
      const ok = tb && Array.isArray(tb.t) && Array.isArray(tb.v) && tb.t.length >= 1 && tb.t.length === tb.v.length
        && tb.t.every(Number.isFinite) && tb.v.every(Number.isFinite) && U.has('time', tb.tUnit);
      if (!ok) { out.push('data.table'); continue; }
      if (qt && d.basis === 'absolute' && !U.has(qt.cat, tb.vUnit)) out.push('data.table');
      else if (gasFlow && d.basis === 'absolute' && U.isVolumetric(tb.vUnit)) out.push('data.gasVolume');
      if (!tb.t.every((x, k) => k === 0 || x >= tb.t[k - 1])) out.push('data.order');
      if (tb.t[0] < 0) out.push('data.order');
      // a table started by an event counts its time from the event
      if (d.start !== 'time' && tb.t[0] !== 0) out.push('data.eventStart');
      if (d.repeat && tb.t.length > 1 && !(tb.t[tb.t.length - 1] > tb.t[0])) out.push('data.period');
      if (qt && qt.noNegative && tb.v.some((x) => x < 0)) out.push('data.negative');
    }
    return [...new Set(out)];
  }

  // the time data of junction j ready for the steps: its quantity, the tables in SI, the conditions and how the tables
  // end. steady: the steady value of the quantity in SI (base of the relative tables and of the first point check)
  function prepare(j, eff, si, ctx, tc) {
    const d = j.time;
    const qt = quantityOf(j, eff);
    const steady = qt.steady(j, si);
    const nT = E().TABLES[d.start], nE = E().EVENTS[d.start];
    return {
      jid: j.id, def: types.get(j.type), q: qt, steady, start: d.start, what: d.what,
      tables: d.tables.slice(0, nT).map((tb) => PumpIt.time.tables.prepare(tb, qt, { basis: d.basis, steady, ctx })),
      conds: d.start === 'combined' ? [E().prepareNamed(eff, d.combined, ctx)] : (d.when || []).slice(0, nE).map((c) => E().prepare(c, eff, ctx)),
      o: { repeat: !!d.repeat, interp: d.interp, dataEnd: tc.dataEnd },
    };
  }

  // the table that applies to a junction in its phase (null: none, the model as it is)
  const tableOf = (jt, s) => (s.phase >= 1 ? jt.tables[s.phase - 1] || null : null);
  // the time on the axis of a table: the clock for a table by time, the time since its event otherwise
  const tauOf = (jt, s, t) => (jt.start === 'time' ? t : t - s.te);

  // the model of step k at the time t (§8.2). plan: the prepared simulation; view: { trig (phase of each junction with
  // time data, by id), closed (pipes closed by the tanks), press (the gas pressure of each closed tank, NaN for an open
  // one) }; levels: the level of each finite tank used in the solution (over its bottom). sink (optional): { value(jt, v,
  // past) } learns what each table gave. Step 0 is the model of the scenario as it is, special conditions included
  // (§4.4); the tables apply from step 1. In step 0 a tank whose level or pressure is unknown is a free node, without
  // pressure and without flow of its own, at the elevation of its lowest connection (§6.6).
  function stepModel(plan, view, k, t, levels, sink) {
    const m = JSON.parse(plan.json);
    const byId = new Map(m.junctions.map((j) => [j.id, j]));
    if (k > 0) {
      for (const jt of plan.jts) {
        const s = view.trig.get(jt.jid);
        const tb = tableOf(jt, s);
        if (!tb) continue;
        const r = PumpIt.time.tables.valueAt(tb, tauOf(jt, s, t), jt.o);
        jt.q.apply(byId.get(jt.jid), r.v);
        if (sink) sink.value(jt, r.v, r.past);
      }
    }
    // finite tanks: the level of the solution, and their pipes connected at the elevations fixed at the start
    plan.tanks.forEach((T, i) => {
      const j = byId.get(T.jid);
      if (k === 0 && T.free) {
        Object.assign(j, { type: 'branch', source: q(0, 'kg/s'), elevation: q(T.zref, 'm') });
        for (const f of ['tank', 'pipeK', 'connBy', 'liquidElev', 'time']) delete j[f];
        return;
      }
      j.liquidElev = q(T.zb + levels[i], 'm');
      if (view.press && Number.isFinite(view.press[i])) j.surfP = q(view.press[i], 'Pa(a)');
      j.connBy = 'elevation';
      const pk = {};
      for (const c of T.conns) {
        const was = (j.pipeK && j.pipeK[c.pid]) || {};
        pk[c.pid] = { kOut: was.kOut || 0, kIn: was.kIn || 0, elev: q(c.z, 'm') };
      }
      j.pipeK = pk;
    });
    // finite gas vessels: the pressure and the temperature of their gas
    (plan.vessels || []).forEach((Vs, i) => {
      const j = byId.get(Vs.jid), v = view.vessels && view.vessels[i];
      if (!v) return;
      j.surfP = q(v.P, 'Pa(a)');
      j.gasT = q(v.T, 'K');
    });
    if (view.closed.size) for (const p of m.pipes) if (view.closed.has(p.id)) p.closed = true;
    // in the time simulation a control valve that cannot control takes its default action (§7.3)
    for (const j of m.junctions) if (j.alwaysControl) j.alwaysControl = false;
    return m;
  }

  PumpIt.time = Object.assign(PumpIt.time || {}, { inputs: { BASES, INTERP, active, quantityOf, check, prepare, tableOf, tauOf, stepModel } });
})(typeof window !== 'undefined' ? window : globalThis);
