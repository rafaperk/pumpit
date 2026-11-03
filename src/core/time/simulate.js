// The time simulation (docs/time-simulation.md; its specification, "Simulação no tempo", version 1.0 of 2 November
// 2026): a sequence of steady states, one per time step. Between two steps the tables of the junctions give their new
// values, events start tables, the volumes of the finite tanks are integrated (with the gas of the closed ones) and the
// tanks close the pipes they uncover; in the compressible mode, the mass and the energy of the finite gas vessels. The
// inertia of the fluid and pressure waves are out of its scope.
//
//   PumpIt.time.run(eff, opts) → TimeRun                          at once (tests, Node)
//   PumpIt.time.start(eff, opts) → { N, k, done, step(budgetMs), cancel(), result() }   in slices (the interface)
//   TimeRun = { ok, errors, warnings, N, method, times, steps, series, extremes, totals, events, stopped, snapshot(k) }
//
// The same model gives the same results, bit for bit, in the browser and in Node: nothing depends on the clock of the
// machine (the budget of a slice only decides where it stops).
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, U = PumpIt.units;
  const types = PumpIt.junctionTypes;
  const { t } = PumpIt.i18n;
  const TM = PumpIt.time;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const MAX_STEPS = 100000;
  const MEMORY_LIMIT = 200e6; // bytes of recorded series above which a caution suggests recording fewer steps
  const DAY = 86400;

  const timeDef = (j) => { const d = types.get(j.type); return d && d.time ? d.time : null; };

  // ---------- preparation (§8.1): tables, conditions and tanks in SI, and the clock
  function prepare(eff0) {
    const eff = M.stripLayout(eff0);
    const tc = eff.solution.time;
    const errors = [];
    const sys = eff.system;
    const gas = M.isCompressible(eff);
    let ctx;
    try {
      const patm = U.toSI(sys.patm.value, sys.patm.unit, 'pressure');
      if (gas) ctx = { patm, rhoN: PumpIt.fluids.normalDensity(PumpIt.fluids.evaluateGas(sys).MW) };
      else ctx = { patm, rho: PumpIt.fluids.evaluate(sys).rho };
    } catch (e) { return { errors: [e.message] }; }
    const si = (x, cat) => U.toSI(x.value, x.unit, cat, ctx);
    let t0, tf, dt;
    try { t0 = si(tc.start, 'time'); tf = si(tc.stop, 'time'); dt = si(tc.step, 'time'); } catch (e) { return { errors: [e.message] }; }
    const N = Math.ceil((tf - t0) / dt - 1e-9);
    if (!(t0 >= 0 && tf > t0 && dt > 0 && dt <= (tf - t0) * (1 + 1e-12) && N >= 1 && N <= MAX_STEPS)) return { errors: [t('core.time.badControl')] };
    const plan = {
      eff, ctx, si, gas, t0, tf, dt, N, timeDef,
      timeOf: (k) => Math.min(t0 + k * dt, tf),
      // the gas vessels are integrated forward (§11): a gas takes that method
      saveEvery: tc.saveEvery, method: gas ? 'forward' : tc.method, methodAsked: tc.method, relTol: tc.relTol, absTol: si(tc.absTol, 'length'), relax: tc.relax, maxIter: tc.maxIter,
      jts: [], tanks: [], vessels: [], gp: null, warnings: [], tariff: null,
      // the exact time of the events on levels, an option of the forward method
      exact: !!tc.exactEvents && tc.method !== 'central',
    };
    for (const j of eff.junctions) {
      if (!TM.inputs.active(j)) continue;
      try { plan.jts.push(TM.inputs.prepare(j, eff, si, ctx, tc)); } catch (e) { errors.push(t('core.time.badData', { id: j.id, message: e.message })); }
    }
    if (!gas) {
      for (const j of eff.junctions) {
        const tm = timeDef(j);
        if (!(tm && tm.tank && TM.tanks.isFinite(j))) continue;
        const T = TM.tanks.prepare(j, eff, si);
        // a level or a pressure unknown at the start: in the first step the tank is a free node at its lowest connection
        T.free = !(T.known.level && T.known.pressure);
        T.zref = T.conns.length ? Math.min(...T.conns.map((c) => c.z)) : si(j.elevation, 'length');
        plan.tanks.push(T);
      }
    } else {
      // the gas of the model, for its finite vessels
      let fg;
      try { fg = PumpIt.fluids.evaluateGas(sys); } catch (e) { return { errors: [e.message] }; }
      const cv = fg.R / (fg.k - 1);
      plan.gp = { R: fg.R, Z: fg.Z, k: fg.k, cv, cp: fg.k * cv, T: fg.T, adiabatic: sys.gasMode === 'adiabatic' };
      for (const j of eff.junctions) {
        const tm = timeDef(j);
        if (tm && tm.tank && TM.vessels.isFinite(j)) plan.vessels.push(TM.vessels.prepare(j, eff, si, plan.gp));
      }
    }
    plan.tankIndex = new Map(plan.tanks.map((T, i) => [T.jid, i]));
    plan.tariff = TM.cost.prepare(tc.tariff);
    plan.json = JSON.stringify(eff);
    return Object.assign(plan, { errors });
  }

  // the warnings known before the first step (§9.4)
  function initialWarnings(P, R) {
    const W = (level, key, params, obj) => TM.record.warnOnce(R, level, key, params, obj);
    for (const jt of P.jts) {
      // a table by time whose value at the start differs from the steady state jumps between the first two steps (§4.5)
      if (jt.start !== 'time') continue;
      const v = TM.tables.valueAt(jt.tables[0], P.t0, jt.o).v;
      if (differs(v, jt.steady)) W('caution', 'core.time.warn.firstPoint', { id: jt.jid }, 'j:' + jt.jid);
    }
    for (const j of P.eff.junctions) if (j.alwaysControl && j.type && timeDef(j) && timeDef(j).results === 'valves') W('caution', 'core.time.warn.alwaysControl', { id: j.id }, 'j:' + j.id);
    if (P.method === 'central' && P.relax < 0.01) W('caution', 'core.time.warn.relaxation', { r: P.relax });
    if (P.gas && P.methodAsked === 'central') W('caution', 'core.time.warn.gasForward');
    for (const T of P.tanks) for (const c of T.conns) if (c.z < T.zb - 1e-9) W('caution', 'core.time.warn.belowBottom', { id: T.jid, pipe: c.pid }, 'p:' + c.pid);
  }
  // two values of a quantity differ (relative difference above 1e-6)
  const differs = (a, b) => a !== b && !(Math.abs(a - b) <= 1e-6 * Math.max(Math.abs(a), Math.abs(b)));

  // the pressure of the gas of each closed tank at the levels of a solution (NaN for an open tank)
  const pressOf = (P, st, levels) => P.tanks.map((T, i) => (T.closed ? TM.tanks.gasAt(T, TM.tanks.volumeOf(T, levels[i]), st.C[i], st.pMax[i]).P : NaN));

  // ---------- one steady state at the time t, with the rules of the tanks (§6.4): a pipe whose connection is above the
  // surface may not take liquid out of the tank, so it closes and the same step is solved again; a closed one opens again
  // when the surface covers it, or when the network would push liquid into the tank through it (decision T-09)
  function solveStep(P, st, k, t, levels, prev, sink) {
    P.tanks.forEach((T, i) => {
      const zs = T.zb + levels[i];
      for (const c of T.conns) if (st.closed.has(c.pid) && zs > c.z + 1e-9) st.closed.delete(c.pid);
    });
    const press = pressOf(P, st, levels);
    const vessels = P.vessels.map((Vs, i) => ({ P: st.vP[i], T: st.vT[i] }));
    const shut = new Set();
    for (let pass = 0; pass < 50; pass++) {
      const model = TM.inputs.stepModel(P, { trig: st.trig, closed: st.closed, press, vessels }, k, t, levels, sink);
      const json = JSON.stringify(model);
      let sol;
      // a step whose inputs did not change takes the solution of the step before (§8.4); the flows of the step before
      // start the next one (a gas starts from its own first pressures)
      if (prev && prev.json === json) sol = prev.sol;
      else {
        sol = PumpIt.solver.run(model, { guess: prev && !P.gas ? guessOf(prev.sol) : undefined, states: prev ? prev.sol.states : undefined, dropUnsupplied: true });
        if (!sol.ok) return { ok: false, errors: sol.errors };
      }
      let changed = false;
      P.tanks.forEach((T, i) => {
        if (k === 0 && T.free) return; // a free node in the first step has no surface
        const zs = T.zb + levels[i];
        for (const c of T.conns) {
          if (c.z < zs - 1e-9) continue; // under the surface
          const r = sol.pipes[c.pid];
          if (!r) continue;
          if (!st.closed.has(c.pid)) {
            const into = c.up ? -r.m : r.m;
            if (into < -1e-9 * sol.fluid.rho * r.A * r.N) { st.closed.add(c.pid); shut.add(c.pid); changed = true; }
          } else if (!shut.has(c.pid)) {
            // closed: the grade lines at its two ends say which way the liquid would go
            const drive = c.up ? r.EGLout - r.EGLin : r.EGLin - r.EGLout;
            if (drive > 1e-9) { st.closed.delete(c.pid); changed = true; }
          }
        }
      });
      if (!changed) return { ok: true, sol, model, json, levels: levels.slice(), press, vessels };
    }
    return { ok: false, errors: [t('core.time.uncoveredLoop', { t: fmtT(t) })] };
  }
  // the flows of the step before, where they are not zero, as the first guess of the next one (§8.4)
  function guessOf(sol) {
    const g = { pipes: {}, elems: {} };
    for (const id in sol.pipes) { const m = sol.pipes[id].m; if (m) g.pipes[id] = m; }
    for (const id in sol.junctions) { const r = sol.junctions[id]; if (r.Q !== undefined && r.m) g.elems[id] = r.m; }
    return g;
  }
  const fmtT = (x) => PumpIt.solver.util.fmtSI(x) + ' s';

  // net volume flow into a tank in a solution (m³/s), and what enters and leaves through its pipes
  function tankFlows(T, sol) {
    const rho = sol.fluid.rho;
    let qin = 0, qout = 0;
    for (const c of T.conns) {
      const r = sol.pipes[c.pid];
      if (!r || !Number.isFinite(r.m)) continue;
      const into = (c.up ? -r.m : r.m) / rho;
      if (into > 0) qin += into; else qout -= into;
    }
    const jr = sol.junctions[T.jid];
    const Qnet = jr && Number.isFinite(jr.net) ? -jr.net / rho : qin - qout;
    return { Qnet, qin, qout };
  }

  // a volume after an interval, limited to the tank (§6.4): what passes the top overflows, what goes below zero is a
  // deficit the network got without the tank having it
  function limit(T, V) {
    if (V > T.Vmax) return { V: T.Vmax, over: V - T.Vmax, def: 0 };
    if (V < 0) return { V: 0, over: 0, def: -V };
    return { V, over: 0, def: 0 };
  }
  const stateOfV = (T, V) => (V >= T.Vmax * (1 - 1e-12) ? 'full' : V <= T.Vmax * 1e-12 ? 'empty' : 'normal');

  // the new volumes of the tanks become the state: the accumulators, the warning of a deficit, the gas of the closed ones
  // and the log of full, empty, relief and vent. A closed tank full of liquid without a relief stops the run (§6.5)
  function commit(P, st, R, lims, tAt) {
    let error = null;
    lims.forEach((L, i) => {
      const T = P.tanks[i], o = R.totals.tanks[T.jid];
      st.V[i] = L.V;
      o.over += L.over; o.def += L.def;
      if (L.def > 0) TM.record.warnOnce(R, 'warning', 'core.time.warn.deficit', { id: T.jid }, 'j:' + T.jid);
      const s = stateOfV(T, L.V);
      if (s !== st.tankState[i]) { TM.record.log(R, tAt, 'j:' + T.jid, s === 'normal' ? 'event' : 'warning', 'core.time.log.tank.' + s); st.tankState[i] = s; }
      if (!T.closed) return;
      const g = TM.tanks.gasAt(T, L.V, st.C[i], st.pMax[i]);
      if (g.full && !(st.pMax[i] < Infinity)) { error = error || t('core.time.closedFull', { id: T.jid, t: fmtT(tAt) }); return; }
      st.C[i] = g.C;
      logValve(R, tAt, T, st.valve[i], g.valve);
      st.valve[i] = g.valve;
    });
    return error;
  }
  // the gas of the vessels after the interval dt (forward, §11); a vessel that would empty in it stops the run
  function commitVessels(P, st, info, dt, tAt) {
    for (let i = 0; i < P.vessels.length; i++) {
      const Vs = P.vessels[i];
      const s = TM.vessels.after(Vs, P.gp, { M: st.vM[i], U: st.vU[i], T: st.vT[i] }, info[i], dt);
      if (!s) return t('core.time.vesselEmpty', { id: Vs.jid, t: fmtT(tAt) });
      st.vM[i] = s.M; st.vU[i] = s.U; st.vT[i] = s.T; st.vP[i] = s.P;
    }
    return null;
  }

  // the relief and the vent of a closed tank opening and closing, in the log
  function logValve(R, tAt, T, was, now) {
    if (was === now) return;
    if (was) TM.record.log(R, tAt, 'j:' + T.jid, 'event', 'core.time.log.tank.' + was + 'End');
    if (now) TM.record.log(R, tAt, 'j:' + T.jid, 'event', 'core.time.log.tank.' + now);
  }

  // the level or the pressure of a tank unknown at the start, from the first step (§6.6): its node was free at its lowest
  // connection, so the stagnation pressure solved there gives the surface (level unknown) or the gas (pressure unknown)
  function resolveStart(P, st, R, out) {
    const rho = out.sol.fluid.rho, g = out.sol.g;
    for (let i = 0; i < P.tanks.length; i++) {
      const T = P.tanks[i];
      if (!T.free) continue;
      const jr = out.sol.junctions[T.jid];
      const P0 = jr ? jr.P0in : NaN;
      if (!Number.isFinite(P0)) return t('core.time.startUnknown', { id: T.jid });
      if (!T.known.level) {
        const Ps = T.closed ? T.P0 : P.si(P.eff.junctions.find((x) => x.id === T.jid).surfP, 'pressure');
        const zs = T.zref + (P0 - Ps) / (rho * g);
        if (!(zs >= T.zb - 1e-9 && zs <= T.zb + T.H + 1e-9)) return t('core.time.levelOut', { id: T.jid, z: PumpIt.solver.util.fmtSI(zs) });
        st.V[i] = Math.min(T.Vmax, Math.max(0, TM.tanks.volumeOf(T, Math.min(T.H, Math.max(0, zs - T.zb)))));
        if (T.closed) st.C[i] = T.P0 * Math.pow(T.Vmax - st.V[i], T.n);
      } else {
        const zs = T.zb + TM.tanks.levelOf(T, st.V[i]);
        const Ps = P0 - rho * g * (zs - T.zref);
        if (!(Ps > 0)) return t('core.time.pressureOut', { id: T.jid });
        st.C[i] = Ps * Math.pow(T.Vmax - st.V[i], T.n);
      }
      const o = R.totals.tanks[T.jid];
      o.V0 = o.Vf = st.V[i];
      st.tankState[i] = stateOfV(T, st.V[i]);
      if (T.closed) {
        const gs = TM.tanks.gasAt(T, st.V[i], st.C[i], st.pMax[i]);
        st.C[i] = gs.C;
        logValve(R, P.t0, T, st.valve[i], gs.valve);
        st.valve[i] = gs.valve;
      }
    }
    return null;
  }

  // the central method (§6.3): the step k is solved with the mean level of its interval, iterating on its final volume;
  // the gas of a closed tank takes the mean level too
  function centralStep(P, st, k, t, prev, sink) {
    const dt = t - P.timeOf(k - 1);
    const hPrev = P.tanks.map((T, i) => TM.tanks.levelOf(T, st.V[i]));
    let h = P.tanks.map((T, i) => TM.tanks.levelOf(T, limit(T, st.V[i] + dt * tankFlows(T, prev.sol).Qnet).V));
    for (let it = 1; it <= P.maxIter; it++) {
      const hbar = h.map((x, i) => (hPrev[i] + x) / 2);
      const out = solveStep(P, st, k, t, hbar, prev, sink);
      if (!out.ok) return out;
      let conv = true;
      const lims = P.tanks.map((T, i) => {
        const L = limit(T, st.V[i] + dt * tankFlows(T, out.sol).Qnet);
        L.h = TM.tanks.levelOf(T, L.V);
        const d = Math.abs(L.h - h[i]);
        if (!(d <= P.absTol || d <= P.relTol * Math.abs(L.h))) conv = false;
        return L;
      });
      if (conv) { out.lims = lims; return out; }
      h = h.map((x, i) => x + P.relax * (lims[i].h - x));
    }
    return { ok: false, errors: [t('core.time.centralFailed', { t: fmtT(t), n: P.maxIter })] };
  }

  // ---------- what each step shows, logs and records
  // the tanks at the time of a step: the level shown, the surface, the volume, the flows of the solution and, in a closed
  // tank, the volume and the pressure of the gas
  function tankInfo(P, st, out) {
    return P.tanks.map((T, i) => {
      const V = st.V[i], h = TM.tanks.levelOf(T, V);
      const f = tankFlows(T, out.sol);
      const x = { jid: T.jid, closed: T.closed, h, zs: T.zb + h, V, M: V * out.sol.fluid.rho, Qnet: f.Qnet, mnet: f.Qnet * out.sol.fluid.rho, qin: f.qin, qout: f.qout, state: st.tankState[i] };
      // the surface pressure of the step (a table may drive it), or the gas over the liquid
      if (T.closed) { x.Vg = T.Vmax - V; x.Pg = x.Ps = TM.tanks.gasAt(T, V, st.C[i], st.pMax[i]).P; }
      else x.Ps = P.si(out.model.junctions.find((j) => j.id === T.jid).surfP, 'pressure');
      return x;
    });
  }

  // the gas vessels at the time of a step: the pressure, the temperature, the mass and the density of the gas, and its
  // flows (the surface pressure of a condition is that of the vessel)
  function vesselInfo(P, st, out) {
    return P.vessels.map((Vs, i) => {
      const f = TM.vessels.flows(Vs, out.sol);
      return { jid: Vs.jid, vessel: true, Pv: st.vP[i], Ps: st.vP[i], Tv: st.vT[i], M: st.vM[i], rho: st.vM[i] / Vs.V, mnet: f.mnet, min: f.min, mout: f.mout, hin: f.hin };
    });
  }

  // the states of a step that the log follows: of the junctions with states, of the pumps under control and of the check
  // valves, the pipes the tanks closed and the junctions without supply
  function infoOf(P, st, out) {
    const states = new Map(), control = new Map(), check = new Map();
    for (const j of out.model.junctions) {
      const tm = timeDef(j);
      if (tm && tm.stateOf && tm.log) states.set(j.id, tm.stateOf(j, out.sol));
      if (tm && tm.checkOf) { const c = tm.checkOf(j, out.sol); if (c) check.set(j.id, c); }
      const pr = out.sol.pumps[j.id];
      if (pr && pr.control) control.set(j.id, pr.control);
    }
    return { states, control, check, closed: new Set(st.closed), unsup: new Set((out.sol.unsupplied || []).map((u) => u.jid)) };
  }
  function logChanges(P, R, tk, was, now, model) {
    const L = (obj, kind, key, params) => TM.record.log(R, tk, obj, kind, key, params);
    if (was.states) {
      for (const [id, s] of now.states) {
        const j = model.junctions.find((x) => x.id === id);
        if (was.states.has(id) && was.states.get(id) !== s && s !== undefined) L('j:' + id, 'event', 'core.time.log.' + timeDef(j).log + '.' + s);
      }
      for (const [id, c] of now.control) {
        const b = was.control.get(id);
        if (b && b !== c && (b === 'ok' || c === 'ok')) L('j:' + id, c === 'ok' ? 'event' : 'warning', c === 'ok' ? 'core.time.log.pump.regained' : 'core.time.log.pump.lost');
      }
      // the check valve of a pump closing and opening again (§7.4)
      for (const [id, c] of now.check) {
        const b = was.check.get(id);
        if (b && b !== c) L('j:' + id, 'event', 'core.time.log.check.' + c);
      }
    }
    for (const pid of now.closed) if (!was.closed.has(pid)) L('p:' + pid, 'event', 'core.time.log.pipe.closed');
    for (const pid of was.closed) if (!now.closed.has(pid)) L('p:' + pid, 'event', 'core.time.log.pipe.reopened');
    for (const id of now.unsup) if (!was.unsup.has(id)) L('j:' + id, 'warning', 'core.time.log.demand.unsupplied');
    for (const id of was.unsup) if (!now.unsup.has(id)) L('j:' + id, 'event', 'core.time.log.demand.supplied');
  }

  // the conditions watched now, on the state of step k; a table that starts applies from the next step (§5.3)
  function fireEvents(P, st, R, out, tk, tanks) {
    const byTank = new Map(tanks.map((x) => [x.jid, x]));
    for (const jt of P.jts) {
      const s = st.trig.get(jt.jid);
      const e = TM.events.armed(jt, s);
      if (e < 0) continue;
      const S = { t: tk, ta: s.ta, sol: out.sol, model: out.model, si: P.si, tank: (id) => byTank.get(id) };
      if (TM.events.holds(jt.conds[e], S)) fire(P, st, R, jt, e, tk);
    }
  }
  // event e of a junction fires at the time t: its table starts, in the log with the jump from the value in use (§4.5)
  function fire(P, st, R, jt, e, t) {
    st.trig.set(jt.jid, TM.events.after(e, t));
    TM.record.log(R, t, 'j:' + jt.jid, 'event', 'core.time.log.table.started', { n: e + 1 });
    const to = TM.tables.valueAt(jt.tables[e], 0, jt.o).v, from = st.used.get(jt.jid);
    if (differs(to, from)) TM.record.log(R, t, 'j:' + jt.jid, 'info', 'core.time.log.table.jump', { from, to, cat: jt.q.cat });
  }

  // the exact time of an event on the level or the volume of a tank (§5.3; an option of the forward method): where the
  // watched condition, false at tk, becomes true before tn, by a straight line between the values at both ends (the
  // volumes Vn at tn). The earliest crossing, or null
  const LEVELS = ['tankLevel', 'surfaceElev', 'tankVolume'];
  function crossing(P, st, Vn, tk, tn) {
    let best = null;
    for (const jt of P.jts) {
      const e = TM.events.armed(jt, st.trig.get(jt.jid));
      const pc = e < 0 ? null : jt.conds[e];
      if (!pc || pc.node || pc.second || !LEVELS.includes(pc.q) || !P.tankIndex.has(pc.id)) continue;
      const i = P.tankIndex.get(pc.id), T = P.tanks[i];
      const val = (V) => (pc.q === 'tankVolume' ? V : (pc.q === 'surfaceElev' ? T.zb : 0) + TM.tanks.levelOf(T, V));
      const a = val(st.V[i]), b = val(Vn[i]);
      if (a === b || TM.events.compare(pc.op, a, pc.v) || !TM.events.compare(pc.op, b, pc.v)) continue;
      const f = (pc.v - a) / (b - a);
      if (!(f > 0 && f < 1)) continue; // at a step of the clock: the usual rule
      const t = tk + f * (tn - tk);
      if (t > tk && t < tn && (!best || t < best.t)) best = { t, jt, e };
    }
    return best;
  }

  // ---------- the run
  function start(eff, opts = {}) {
    const P = prepare(eff);
    if (P.errors.length) {
      const res = { ok: false, errors: P.errors, warnings: [] };
      return { N: 0, k: 0, done: true, step: () => ({ done: true, k: 0, N: 0 }), cancel() {}, result: () => res };
    }
    const R = TM.record.create(P);
    const st = {
      V: P.tanks.map((T) => T.V0),
      tankState: P.tanks.map((T) => stateOfV(T, T.V0)),
      // the gas of the closed tanks: its constant, the valve open (relief or vent) and the relief pressure in use
      C: P.tanks.map((T) => (T.closed ? T.C0 : NaN)),
      valve: P.tanks.map(() => ''),
      pMax: P.tanks.map((T) => (T.closed ? T.pMax : Infinity)),
      // the gas of the finite vessels: mass, internal energy, temperature and pressure
      vM: P.vessels.map((Vs) => Vs.M0), vU: P.vessels.map((Vs) => Vs.U0), vT: P.vessels.map((Vs) => Vs.T0), vP: P.vessels.map((Vs) => Vs.P0),
      trig: new Map(P.jts.map((jt) => [jt.jid, TM.events.initial(jt, P.t0)])),
      closed: new Set(),
      used: new Map(P.jts.map((jt) => [jt.jid, jt.steady])),
    };
    for (const T of P.tanks) R.totals.tanks[T.jid] = { V0: T.V0, Vf: T.V0, Vin: 0, Vout: 0, over: 0, def: 0, sumQ: 0 };
    for (const Vs of P.vessels) R.totals.tanks[Vs.jid] = { vessel: true, M0: Vs.M0, Mf: Vs.M0, Min: 0, Mout: 0, sumM: 0 };
    initialWarnings(P, R);
    // what the tables gave in a step: the value in use, and the warnings of data that end or are extrapolated; the relief
    // pressure of a closed tank that follows a table becomes the one of the tank
    const sink = {
      value(jt, v, past) {
        st.used.set(jt.jid, v);
        if (jt.what === 'pMax' && P.tankIndex.has(jt.jid)) st.pMax[P.tankIndex.get(jt.jid)] = v;
        if (past === 'held') TM.record.warnOnce(R, 'caution', 'core.time.warn.dataEnd', { id: jt.jid }, 'j:' + jt.jid);
        if (past === 'extrapolated') TM.record.warnOnce(R, 'warning', 'core.time.warn.extrapolated', { id: jt.jid }, 'j:' + jt.jid);
      },
    };
    let k = 0, prev = null, info = { states: null, control: null, check: null, closed: new Set(), unsup: new Set() }, wasOn = null;
    let done = false, result = null;
    const job = { N: P.N, k: 0, done: false };

    function finish(stopped) {
      done = true; job.done = true;
      result = makeRun(P, R, st, stopped);
    }

    // the step solved now: k of the clock, or the exact time of an event between k and k + 1 (sub, at tSub)
    let sub = false, tSub = NaN;
    function advance() {
      const tk = sub ? tSub : P.timeOf(k);
      const kk = sub ? k + 0.5 : k; // a step between two of the clock is never the first one
      const central = P.method === 'central' && k > 0;
      const levels = P.tanks.map((T, i) => TM.tanks.levelOf(T, st.V[i]));
      const out = central ? centralStep(P, st, k, tk, prev, sink) : solveStep(P, st, kk, tk, levels, prev, sink);
      if (!out.ok) return finish({ k, t: tk, reason: 'error', errors: out.errors });
      if (k === 0 && !sub) {
        const err = resolveStart(P, st, R, out);
        if (err) return finish({ k, t: tk, reason: 'error', errors: [err] });
      }
      if (central) {
        const err = commit(P, st, R, out.lims, tk);
        if (err) return finish({ k, t: tk, reason: 'error', errors: [err] });
      }
      const last = k === P.N && !sub;
      const tanks = tankInfo(P, st, out).concat(vesselInfo(P, st, out));
      const now = infoOf(P, st, out);
      logChanges(P, R, tk, info, now, out.model);
      info = now;
      // the phases the step was solved with, then the events seen on it (§5.3)
      const trig = [...st.trig].map(([id, s]) => [id, Object.assign({}, s)]);
      if (!last) fireEvents(P, st, R, out, tk, tanks);
      // the end of the interval this step stands for: the next step of the clock, or with the exact time of events the
      // crossing of a level before it (forward method)
      let tn = last ? tk : P.timeOf(k + 1), cross = null;
      if (P.exact && !last) {
        const Vn = P.tanks.map((T, i) => limit(T, st.V[i] + (tn - tk) * tanks[i].Qnet).V);
        cross = crossing(P, st, Vn, tk, tn);
        if (cross) tn = cross.t;
      }
      // the interval this step stands for: [t_k, t_k+1] with the forward method, [t_k−1, t_k] with the central one
      const w = central ? tk - P.timeOf(k - 1) : P.method === 'central' ? 0 : tn - tk;
      wasOn = TM.record.recordTotals(R, P, w, out.sol, out.model, tanks, wasOn, tk);
      TM.record.recordExtremes(R, tk, out.sol, tanks);
      TM.record.recordStepWarnings(R, tk, out.sol);
      if (sub || TM.record.isRecorded(k, P.N, P.saveEvery)) {
        TM.record.recordSeries(R, k, tk, out.sol, tanks, P.jts.map((jt) => ({ jid: jt.jid, v: st.used.get(jt.jid) })), sub);
        R.snaps.push({ k, sub, t: tk, levels: out.levels, press: out.press, vessels: out.vessels, trig, closed: [...st.closed], states: out.sol.states, tanks });
      }
      if (k === 0 && !sub) memoryCheck(P, R, out.sol);
      if (last) return finish(null);
      if (P.method !== 'central') {
        const err = commit(P, st, R, P.tanks.map((T, i) => limit(T, st.V[i] + (tn - tk) * tanks[i].Qnet)), tn)
          || commitVessels(P, st, tanks.filter((x) => x.vessel), tn - tk, tn);
        if (err) return finish({ k: k + 1, t: tn, reason: 'error', errors: [err] });
      }
      prev = out;
      if (cross) {
        // the event fires at its exact time, and the step there is solved with its table
        fire(P, st, R, cross.jt, cross.e, tn);
        sub = true; tSub = tn;
        return;
      }
      sub = false;
      k++;
      job.k = k;
    }

    job.step = (budgetMs = Infinity) => {
      const t1 = now();
      while (!done) {
        advance();
        if (now() - t1 >= budgetMs) break;
      }
      return { done, k, N: P.N };
    };
    job.cancel = () => { if (!done) finish({ k, t: sub ? tSub : P.timeOf(k), reason: 'cancel', errors: [] }); };
    job.result = () => result;
    return job;
  }

  // a caution when the recorded series would take more than MEMORY_LIMIT (§8.4)
  function memoryCheck(P, R, sol) {
    const mb = estimateBytes(P.N, P.saveEvery, sol, P.tanks.length) / 1e6;
    if (mb * 1e6 > MEMORY_LIMIT) TM.record.warnOnce(R, 'caution', 'core.time.warn.memory', { mb: Math.round(mb) });
  }
  // bytes of the series: recorded steps × numeric fields of the objects × 8
  function estimateBytes(N, every, sol, nTanks) {
    let fields = nTanks * (TM.record.TANK_FIELDS.length + TM.record.GAS_FIELDS.length);
    for (const kind of TM.record.KINDS) for (const id in sol[kind]) for (const f in sol[kind][id]) if (typeof sol[kind][id][f] === 'number') fields++;
    return TM.record.recordedCount(N, every) * fields * 8;
  }

  // the result of a run, complete or stopped
  function makeRun(P, R, st, stopped) {
    const n = R.n;
    const cut = (o) => { for (const k in o) for (const id in o[k]) for (const f in o[k][id]) o[k][id][f] = o[k][id][f].subarray(0, n); return o; };
    P.tanks.forEach((T, i) => {
      const o = R.totals.tanks[T.jid];
      o.Vf = st.V[i]; o.dV = o.Vf - o.V0;
      o.closure = o.sumQ - (o.Vf - o.V0 + o.over - o.def);
    });
    // a gas vessel: its mass balance
    P.vessels.forEach((Vs, i) => {
      const o = R.totals.tanks[Vs.jid];
      o.Mf = st.vM[i]; o.dM = o.Mf - o.M0;
      o.closure = o.sumM - o.dM;
    });
    TM.cost.finish(R.totals, P);
    const cache = new Map();
    const run = {
      ok: n > 0, errors: n > 0 ? [] : (stopped && stopped.errors) || [], N: P.N, method: P.method, saveEvery: P.saveEvery, t0: P.t0, tf: P.tf, dt: P.dt,
      times: R.times.subarray(0, n), steps: R.steps.subarray(0, n), exact: R.exact.subarray(0, n), series: cut(R.series),
      extremes: R.extremes, totals: R.totals, events: R.events, warnings: TM.record.warningsOf(R), stopped: stopped || null,
      tanks: P.tanks.map((T) => ({ jid: T.jid, zb: T.zb, H: T.H, Vmax: T.Vmax, V0: R.totals.tanks[T.jid].V0, closed: T.closed })),
      vessels: P.vessels.map((Vs) => ({ jid: Vs.jid, V: Vs.V, M0: Vs.M0 })), gas: P.gas,
      // the index of the recorded step k of the clock (−1: not recorded)
      indexOf(k) { for (let i = 0; i < n; i++) if (R.steps[i] === k && !R.exact[i]) return i; return -1; },
      // the full steady result of the recorded step k, solved again from its snapshot (§9.1), with the time it stands for
      snapshot(k) { const i = run.indexOf(k); return i < 0 ? null : run.snapshotAt(i); },
      // the same, by the index of the recorded step (a step at the exact time of an event has one too)
      snapshotAt(i) {
        if (cache.has(i)) return cache.get(i);
        const s = R.snaps[i];
        if (!s) return null;
        const view = { trig: new Map(s.trig), closed: new Set(s.closed), press: s.press, vessels: s.vessels };
        const model = TM.inputs.stepModel(P, view, s.sub ? s.k + 0.5 : s.k, s.t, s.levels, null);
        const sol = PumpIt.solver.run(model, { states: s.states, dropUnsupplied: true });
        sol.time = { k: s.k, sub: s.sub, t: s.t, tanks: s.tanks };
        cache.set(i, sol);
        if (cache.size > 8) cache.delete(cache.keys().next().value);
        return sol;
      },
    };
    return run;
  }

  function run(eff, opts = {}) {
    const job = start(eff, opts);
    job.step(Infinity);
    return job.result();
  }

  // the size of a run before it is made: its steps, the recorded ones and the memory of their series (sol: a steady result
  // of the model, for the fields of its objects)
  function estimate(eff, sol) {
    const tc = eff.solution.time;
    const sec = (x) => U.toSI(x.value, x.unit, 'time');
    let N = NaN;
    try { N = Math.ceil((sec(tc.stop) - sec(tc.start)) / sec(tc.step) - 1e-9); } catch (e) { /* incomplete control: no estimate */ }
    if (!(N >= 1) || !(tc.saveEvery >= 1)) return { N: NaN, recorded: NaN, bytes: NaN };
    const gas = M.isCompressible(eff);
    const nT = eff.junctions.filter((j) => timeDef(j) && timeDef(j).tank && (gas ? TM.vessels.isFinite(j) : TM.tanks.isFinite(j))).length;
    return { N, recorded: TM.record.recordedCount(N, tc.saveEvery), bytes: sol ? estimateBytes(N, tc.saveEvery, sol, nT) : NaN };
  }

  // the checklist item of the time control (§3; src/core/model/validation.js adds it when the simulation is on), with
  // the tariff of the energy cost and the named events of the model
  function checkControl(tc, eff) {
    const out = [];
    const ok = (x) => x && Number.isFinite(x.value) && U.has('time', x.unit);
    const sec = (x) => U.toSI(x.value, x.unit, 'time');
    if (!ok(tc.start) || sec(tc.start) < 0) out.push('start');
    if (!ok(tc.stop) || (ok(tc.start) && !(sec(tc.stop) > sec(tc.start)))) out.push('stop');
    if (!ok(tc.step) || !(sec(tc.step) > 0)) out.push('step');
    else if (ok(tc.start) && ok(tc.stop) && sec(tc.stop) > sec(tc.start)) {
      const span = sec(tc.stop) - sec(tc.start);
      if (sec(tc.step) > span * (1 + 1e-12)) out.push('stepLong');
      else if (Math.ceil(span / sec(tc.step) - 1e-9) > MAX_STEPS) out.push('tooMany');
    }
    if (!(Number.isInteger(tc.saveEvery) && tc.saveEvery >= 1)) out.push('saveEvery');
    if (!M.TIME_METHODS.includes(tc.method)) out.push('method');
    if (tc.method === 'central') {
      if (!(tc.relTol > 0)) out.push('relTol');
      if (!(tc.absTol && Number.isFinite(tc.absTol.value) && tc.absTol.value > 0 && U.has('length', tc.absTol.unit))) out.push('absTol');
      if (!(Number.isInteger(tc.maxIter) && tc.maxIter >= 1)) out.push('maxIter');
    }
    if (!(tc.relax > 0 && tc.relax <= 1)) out.push('relax');
    if (!M.DATA_END.includes(tc.dataEnd)) out.push('dataEnd');
    if (tc.tariff && tc.tariff.use) for (const k of TM.cost.check(tc.tariff)) out.push(k);
    if (eff) for (const k of TM.events.checkNamed(eff)) out.push(k);
    return out;
  }

  Object.assign(TM, { MAX_STEPS, DAY, prepare, start, run, estimate, checkControl });
})(typeof window !== 'undefined' ? window : globalThis);
