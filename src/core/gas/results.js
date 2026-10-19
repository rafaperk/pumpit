// Compressible mode: the results (R-25), in the shape of the incompressible ones (results.js of the solver) with the
// fields of a gas added: mass flow, volume flows at the local and normal conditions, velocity and Mach number at both
// ends, static and stagnation pressure and temperature at both ends, density, friction factor, losses and choking.
// The "in" and "out" ends of a pipe are those of its reference direction, as in the incompressible results. Heads
// (HGL, EGL) have no meaning for a gas and are left out (NaN). Warnings: choking (critical), Mach and velocity above
// the design limits, and those shared with the incompressible mode.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, M = PumpIt.model;
  const types = PumpIt.junctionTypes;
  const Fw = PumpIt.gas.flow;
  const { fmtSI } = PumpIt.solver.util;
  const { t } = PumpIt.i18n;

  function postprocess(prep, res, st, meta) {
    const { env, cx, links, nodes, eff, jNodes } = prep;
    const fl = env.fluid;
    const W = prep.warnings.slice();
    const warn = (level, text, obj) => W.push({ level, text, obj });
    if (!res.converged) warn('critical', t('core.solver.notConverged', { n: eff.solution.maxIter }));
    if (meta.cycling) warn('warning', t('core.solver.cycling'));

    const T0n = res.T0;
    const mOf = (l) => (l.isolated || l.idx < 0 ? 0 : res.m[l.idx]);
    const nodeOf = (ix) => ({ P: res.P[ix], pk: nodes[ix].pk, T0: T0n[ix] });
    // a static state, completed: stagnation pressure and temperature, density, velocity, volume flow
    const full = (P, T, Mach, m) => {
      const f = Fw.fac(cx, Mach), rho = Fw.rhoOf(cx, P, T);
      return { P, T, M: Mach, P0: P * Math.pow(f, cx.e), T0: T * f, rho, V: rho > 0 ? m / rho : NaN };
    };
    const pipes = {}, junctions = {}, pumps = {}, valves = {};
    const NAN_KEYS = ['P0in', 'P0out', 'Pin', 'Pout', 'dP0', 'Tin', 'Tout', 'T0in', 'T0out', 'Min', 'Mout', 'rhoIn', 'rhoOut', 'Vin', 'Vout', 'V', 'Q', 'Qout'];

    // ---- pipes
    const pipeEnds = new Map(); // pipe id → { a: state at end a, b: state at end b } (static states, for the junctions)
    for (const l of links) {
      if (l.kind !== 'pipe') continue;
      const P = l.P, p = P.p, m = mOf(l), A = P.A * P.N;
      const isolated = !!(l.isolated || (nodes[l.a].isolated && nodes[l.b].isolated));
      const r = {
        m, QN: m / env.rhoN, L: P.L, Dh: P.Dh, A: P.A, N: P.N, K: P.Ksum, zin: P.zUp, zout: P.zDown,
        nps: p.material && p.material.kind === 'steel' ? p.material.nps : null,
        sch: p.material && p.material.kind === 'steel' ? p.material.sch : null,
        isolated, closed: P.closed, choked: false, xChoke: null,
        HGLin: NaN, HGLout: NaN, EGLin: NaN, EGLout: NaN, hL: NaN,
      };
      const na = nodeOf(l.a), nb = nodeOf(l.b);
      let ea, eb, f = NaN, Re = 0, prof = null;
      const s0 = l.idx >= 0 ? res.st[l.idx] : null;
      if (!isolated && l.mode === 'loss' && s0 && s0.dir) {
        // the relation again at the solution, with its profile along the flow
        const up = s0.dir > 0 ? na : nb;
        const s = Fw.ductOut(cx, l.d, s0.dir, up, s0.G, true);
        const st2 = s.ok ? s : s0.s;
        const sIn = full(st2.P1, st2.T1, st2.M1, Math.abs(m) / A), sOut = full(st2.P2, st2.T2, st2.M2, Math.abs(m) / A);
        [ea, eb] = s0.dir > 0 ? [sIn, sOut] : [sOut, sIn];
        f = st2.f; Re = st2.Re; prof = st2.prof || null;
        // a pipe of the closed isothermal form: its profile from the same form over fractions of its length
        if (!prof && s.ok && cx.iso && P.L > 0) {
          const F = st2.f * P.L / P.Dh + st2.K, G = s0.G;
          prof = [];
          for (let i = 0; i <= 20; i++) {
            const Px = i ? Fw.isoClosed(cx, st2.P1, G, F * i / 20) : st2.P1;
            prof.push([P.L * i / 20, Px, cx.T, Fw.machOf(cx, G, Px, cx.T)]);
          }
        }
        r.choked = !!s0.choked;
        if (r.choked) r.xChoke = s0.dir > 0 ? P.L : 0;
      } else {
        // no flow (or a link without loss): both ends at the pressure of their node, at rest
        const atRest = (nd) => { const T = Fw.tempOf(cx, nd); return full(nd.P, T, 0, 0); };
        ea = atRest(na); eb = atRest(nb);
        if (!isolated && l.mode === 'dP') { const Mv = Fw.machOf(cx, Math.abs(m) / A, na.P, Fw.tempOf(cx, na)); ea = full(na.P, Fw.tempOf(cx, na), Mv, Math.abs(m) / A); eb = full(nb.P, Fw.tempOf(cx, nb), Mv, Math.abs(m) / A); }
      }
      const sg = m >= 0 ? 1 : -1;
      const inlet = m >= 0 ? ea : eb, outlet = m >= 0 ? eb : ea;
      Object.assign(r, {
        Pin: ea.P, Pout: eb.P, P0in: ea.P0, P0out: eb.P0, Tin: ea.T, Tout: eb.T, T0in: ea.T0, T0out: eb.T0,
        Min: ea.M, Mout: eb.M, rhoIn: ea.rho, rhoOut: eb.rho, Vin: sg * ea.V, Vout: sg * eb.V,
        V: sg * Math.max(Math.abs(ea.V) || 0, Math.abs(eb.V) || 0),
        Q: inlet.rho > 0 ? m / inlet.rho : NaN, Qout: outlet.rho > 0 ? m / outlet.rho : NaN,
        Re, f, regime: t('core.solver.regime.' + (Re < env.reLam ? 'laminar' : Re > env.reTurb ? 'turbulent' : 'transition')),
        profile: prof ? prof.map(([x, Px, Tx, Mx]) => [s0.dir > 0 ? x : P.L - x, Px, Tx, Mx]).sort((u, w) => u[0] - w[0]) : null,
      });
      r.dP0 = r.P0in - r.P0out;
      // the drop of stagnation pressure split between friction and the K values, in the ratio of f·L/D to ΣK
      // (gravity apart): an estimate, the march does not separate them
      const rhoMean = (ea.rho + eb.rho) / 2;
      r.dPgrav = rhoMean * env.g * (P.zDown - P.zUp);
      const Kd = l.d ? (m >= 0 ? l.d.K[0] : l.d.K[1]) * Fw.kFactor(l.d.lam[0], Re) : 0;
      const fl2 = Number.isFinite(f) ? f * P.L / P.Dh : 0;
      const loss = sg * (r.P0in - r.P0out) - sg * r.dPgrav;
      r.dPfric = fl2 + Kd > 0 ? loss * fl2 / (fl2 + Kd) : 0;
      r.dPfit = fl2 + Kd > 0 ? loss * Kd / (fl2 + Kd) : 0;
      if (isolated) for (const k of NAN_KEYS) r[k] = NaN;
      pipes[p.id] = r;
      pipeEnds.set(p.id, { a: ea, b: eb, m });
      if (isolated || P.closed) continue;
      if (r.choked) warn('critical', t('core.gas.chokedPipe', { id: p.id, m: fmtSI(Math.abs(m)) }), 'p:' + p.id);
      const Mmax = Math.max(r.Min || 0, r.Mout || 0);
      if (!r.choked && Mmax > env.machLimit) warn('warning', t('core.gas.highMach', { id: p.id, M: Mmax.toFixed(3), limit: env.machLimit }), 'p:' + p.id);
      if (Math.abs(r.V) > env.velLimit) warn('caution', t('core.gas.highVelocity', { id: p.id, V: Math.abs(r.V).toFixed(1), limit: env.velLimit.toFixed(1) }), 'p:' + p.id);
    }

    const pipeOf = (id) => pipes[id];
    // state of a pipe at the end that touches junction j (and whether the flow goes into the junction there)
    const endAt = (p, jid) => {
      const e = pipeEnds.get(p.id);
      if (!e) return null;
      const atB = p.down === jid;
      const into = atB ? e.m >= 0 : e.m < 0;
      return { s: atB ? e.b : e.a, into, m: Math.abs(e.m) };
    };
    const shared = { prep, env, cx, links, st, mOf, nodeOf, pipeOf, warn, pumps, valves, res };

    // ---- junctions
    for (const j of eff.junctions) {
      const jn = jNodes.get(j.id);
      if (!jn) continue;
      const def = types.get(j.type);
      const z = U.toSI(j.elevation.value, j.elevation.unit, 'length');
      const con = M.pipesAt(eff, j.id);
      if (jn.main) {
        const nd = jn.main, Pn = res.P[nd.ix];
        let inflow = 0, outflow = 0, Min = 0, Mout = 0;
        for (const p of con) {
          const e = endAt(p, j.id);
          if (!e) continue;
          if (e.into) { inflow += e.m; Min = Math.max(Min, e.s.M || 0); } else { outflow += e.m; Mout = Math.max(Mout, e.s.M || 0); }
        }
        const T0j = cx.iso ? NaN : T0n[nd.ix];
        const side = (Mach) => {
          // the pressure and temperature of the node seen from the pipes on one side
          if (nd.isRes) return { P0: nd.value, P: nd.value, T: Fw.tempOf(cx, nodeOf(nd.ix)), T0: Fw.tempOf(cx, nodeOf(nd.ix)) };
          const f = Fw.fac(cx, Mach);
          if (nd.pk === 'static') { const T = cx.iso ? cx.T : T0j / f; return { P: Pn, P0: Pn * Math.pow(f, cx.e), T, T0: T * f }; }
          return { P0: Pn, P: Pn / Math.pow(f, cx.e), T0: cx.iso ? cx.T * f : T0j, T: cx.iso ? cx.T : T0j / f };
        };
        const si = side(Min), so = side(Mout);
        const Tnode = Fw.tempOf(cx, nodeOf(nd.ix));
        const rho = Fw.rhoOf(cx, Pn, Tnode);
        const jr = {
          type: j.type, P0in: si.P0, P0out: so.P0, Pin: si.P, Pout: so.P, Tin: si.T, Tout: so.T, T0in: si.T0, T0out: so.T0,
          m: Math.max(inflow, outflow), net: outflow - inflow, z: nd.isRes ? nd.z : z, isolated: nd.isolated, rho,
          T: Tnode, T0: cx.iso ? cx.T : T0n[nd.ix],
        };
        jr.Q = rho > 0 ? jr.m / rho : NaN; jr.QN = jr.m / env.rhoN;
        jr.massErr = res.imb && res.imb.get(nd) ? res.imb.get(nd).err : 0;
        if (def.gas && def.gas.results) def.gas.results(j, jr, Object.assign({ nd, P0: Pn, con }, shared));
        jr.HGL = NaN;
        if (nd.isolated) Object.assign(jr, { P0in: NaN, P0out: NaN, Pin: NaN, Pout: NaN, Tin: NaN, Tout: NaN, T0in: NaN, T0out: NaN, Q: NaN });
        junctions[j.id] = jr;
        continue;
      }
      // two-port junction: pressures of its two nodes, seen through the pipes that touch it
      const el = links.find((l) => l.kind === 'elem' && l.jid === j.id);
      const m = mOf(el);
      const pinEnd = endAt(con.find((p) => p.id === jn.pin) || {}, j.id), poutEnd = endAt(con.find((p) => p.id === jn.pout) || {}, j.id);
      const Pa = res.P[jn.in.ix], Pb = res.P[jn.out.ix];
      const MinP = pinEnd ? pinEnd.s.M || 0 : 0, MoutP = poutEnd ? poutEnd.s.M || 0 : 0;
      const view = (Pn, Mach, ix) => {
        const f = Fw.fac(cx, Mach), T0v = cx.iso ? NaN : T0n[ix];
        if (nodes[ix].pk === 'static') { const T = cx.iso ? cx.T : T0v / f; return { P: Pn, P0: Pn * Math.pow(f, cx.e), T, T0: T * f }; }
        return { P0: Pn, P: Pn / Math.pow(f, cx.e), T0: cx.iso ? cx.T * f : T0v, T: cx.iso ? cx.T : T0v / f };
      };
      const vi = view(Pa, MinP, jn.in.ix), vo = view(Pb, MoutP, jn.out.ix);
      const rhoIn = Fw.rhoOf(cx, vi.P, vi.T);
      const Vin = pinEnd ? Math.abs(pinEnd.s.V) || 0 : 0;
      const dP = vi.P0 - vo.P0;
      const jr = {
        type: j.type, m, Q: rhoIn > 0 ? m / rhoIn : NaN, QN: m / env.rhoN, P0in: vi.P0, P0out: vo.P0, Pin: vi.P, Pout: vo.P,
        Tin: vi.T, Tout: vo.T, T0in: vi.T0, T0out: vo.T0, dP, K: Vin ? dP / (rhoIn * Vin * Vin / 2) : NaN, z,
        isolated: jn.in.isolated && jn.out.isolated, rho: rhoIn,
        choked: !!(el && el.idx >= 0 && el.mode === 'loss' && res.st[el.idx] && res.st[el.idx].choked),
      };
      jr.HGL = NaN;
      if (jr.isolated) Object.assign(jr, { P0in: NaN, P0out: NaN, Pin: NaN, Pout: NaN, dP: NaN, K: NaN, Q: NaN });
      junctions[j.id] = jr;
      if (m < 0 && def.reverseFlowCaution !== false && !jr.isolated) warn('caution', t('core.solver.reverseFlow', { id: j.id }), 'j:' + j.id);
      // a choked valve, fitting or orifice: a warning (a restriction orifice chokes by design; a pipe that chokes is critical)
      if (jr.choked && !jr.isolated) warn('warning', t('core.gas.chokedJunction', { id: j.id, m: fmtSI(Math.abs(m)) }), 'j:' + j.id);
      if (def.gas && def.gas.results) def.gas.results(j, jr, Object.assign({ el, m, P0in: vi.P0, P0out: vo.P0, dP }, shared));
    }

    // §5: everything slow (M < 0.1) and every drop — in the pipes, valves, fittings and discharges — below 2 % of the
    // absolute pressure, with no compressor: the incompressible mode would give practically the same (the limit of P6)
    {
      const live = Object.values(pipes).filter((r) => !r.isolated && !r.closed);
      const small = (dP, P) => !Number.isFinite(dP) || Math.abs(dP) < 0.02 * P;
      const slow = live.length && live.every((r) => Math.max(r.Min || 0, r.Mout || 0) < 0.1 && small(r.Pin - r.Pout, Math.max(r.Pin, r.Pout)))
        && Object.values(junctions).every((jr) => jr.isolated || small(jr.dP, jr.P0in))
        && !Object.values(pumps).some((pr) => pr.state === 'on');
      if (slow && res.converged) warn('info', t('core.gas.adviceIncompressible'));
    }

    // ---- mass balance per junction
    if (eff.solution.checkMass) {
      for (const [nd, b] of res.imb) {
        if (b.err > Math.max(1e-9, eff.solution.tolRel * b.thr)) warn('warning', t('core.solver.massImbalance', { id: nd.jid, err: fmtSI(b.err) }), 'j:' + nd.jid);
      }
    } else warn('critical', t('core.solver.massCheckOff'));

    const order = { critical: 0, warning: 1, caution: 2, info: 3 };
    W.sort((a, b) => order[a.level] - order[b.level]);
    return {
      ok: true, regime: 'compressible', gasMode: env.mode, converged: res.converged, iterations: meta.totalIt, passes: meta.passes,
      history: meta.hist,
      fluid: {
        name: fl.name, rho: meta.sc.rho, mu: fl.mu, pv: NaN, T: fl.T, MW: fl.MW, k: fl.k, Z: fl.Z, R: fl.R, rhoN: env.rhoN, gas: true,
      },
      patm: env.patm, g: env.g, pipes, junctions, pumps, valves, states: st, warnings: W,
    };
  }

  Object.assign(PumpIt.gas, { postprocess });
})(typeof window !== 'undefined' ? window : globalThis);
