// Post-processing (specification section 8): turns the converged mass flows and node pressures into pipe,
// junction, pump and valve results and collects the warnings. Junction-type specific results come from the
// type definition: nodeResults (single-node types) or elementResults (two-port types).
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, M = PumpIt.model;
  const types = PumpIt.junctionTypes;
  const { fmtSI } = PumpIt.solver.util;
  const { t } = PumpIt.i18n;

  function postprocess(prep, res, st, meta) {
    const { env, links, nodes, eff, jNodes } = prep;
    const { rho, g, pv, patm } = env;
    const W = prep.warnings.slice();
    const warn = (level, text, obj) => W.push({ level, text, obj });
    if (!res.converged) warn('critical', t('core.solver.notConverged', { n: eff.solution.maxIter }));
    if (meta.cycling) warn('warning', t('core.solver.cycling'));
    if (eff.solution.relax <= eff.solution.tolRel * 10) warn('critical', t('core.solver.relaxation'));

    const mOf = (l) => (l.isolated || l.idx < 0 ? 0 : res.m[l.idx]);
    const Pn = (ix) => res.P[ix];
    const rg = rho * g;
    const pipes = {}, junctions = {}, pumps = {}, valves = {};

    // ---- pipes
    for (const l of links) {
      if (l.kind !== 'pipe') continue;
      const P = l.P, p = P.p;
      const m = mOf(l);
      const lo = prep.pipeLoss(P, m, P.endK);
      const V = lo.V;
      const dyn = rho * V * V / 2;
      const kdyn = (K) => Math.abs(prep.kTerm(K, P, V));
      const Pa = Pn(l.a), Pb = Pn(l.b);
      const nA = nodes[l.a], nB = nodes[l.b];
      const P0jA = Pa + rho * g * (P.zaEff - P.zUp);
      const P0jB = Pb + rho * g * (P.zbEff - P.zDown);
      const P0in = V >= 0 ? P0jA - kdyn(P.pkA.out) : P0jA + kdyn(P.pkA.in);
      const P0out = V >= 0 ? P0jB + kdyn(P.pkB.in) : P0jB - kdyn(P.pkB.out);
      const r = {
        m, Q: m / rho, V, Re: lo.Re, f: lo.f,
        regime: t('core.solver.regime.' + (lo.Re < env.reLam ? 'laminar' : lo.Re > env.reTurb ? 'turbulent' : 'transition')),
        P0in, P0out, Pin: P0in - dyn, Pout: P0out - dyn,
        dP0: P0in - P0out, dPfric: lo.dpF, dPfit: lo.dpK, dPend: lo.dpE, dPgrav: rho * g * (P.zDown - P.zUp),
        zin: P.zUp, zout: P.zDown, L: P.L, Dh: P.Dh, A: P.A, N: P.N, K: P.Ksum, eD: P.fm === 'darcy' ? P.eD : NaN,
        hL: (lo.dpF + lo.dpK + lo.dpE) / rg,
        isolated: !!(l.isolated || (nA.isolated && nB.isolated)), closed: P.closed,
      };
      r.HGLin = r.Pin / rg + r.zin; r.HGLout = r.Pout / rg + r.zout;
      r.EGLin = r.P0in / rg + r.zin; r.EGLout = r.P0out / rg + r.zout;
      if (r.isolated) { for (const k of ['P0in', 'P0out', 'Pin', 'Pout', 'dP0', 'HGLin', 'HGLout', 'EGLin', 'EGLout']) r[k] = NaN; }
      pipes[p.id] = r;
      if (!r.isolated && Number.isFinite(pv)) {
        if (r.Pin < pv) warn('warning', t('core.solver.vaporInlet', { id: p.id }), 'p:' + p.id);
        if (r.Pout < pv) warn('warning', t('core.solver.vaporOutlet', { id: p.id }), 'p:' + p.id);
      }
      if (P.L < Math.abs(P.zDown - P.zUp) - 1e-9) warn('caution', t('core.solver.shortPipe', { id: p.id }), 'p:' + p.id);
      if (nA.isRes && P.zUp > nA.z && m < 0) warn('warning', t('core.solver.aboveLevel', { id: p.id, res: nA.jid }), 'p:' + p.id);
      if (nB.isRes && P.zDown > nB.z && m > 0) warn('warning', t('core.solver.aboveLevel', { id: p.id, res: nB.jid }), 'p:' + p.id);
    }

    // §5 of the compressible mode: a fluid as light as a gas (ρ < 50 kg/m³) in a pipe past Mach 0.3 (sound speed of an
    // ideal gas, √(k·P/ρ), k of the gas of the model) or with a drop above 10 % of its absolute pressure: that mode
    // would be the right one
    if (rho < 50) {
      const fg = eff.system.fluidGas || {}, lib = PumpIt.fluids.gasById && PumpIt.fluids.gasById(fg.gas);
      const k = lib ? lib.k : fg.k > 1 ? fg.k : 1.4;
      const fast = Object.entries(pipes).filter(([, r]) => {
        if (r.isolated || r.closed) return false;
        const Plo = Math.min(r.Pin, r.Pout), Phi = Math.max(r.Pin, r.Pout);
        return (Plo > 0 && Math.abs(r.V) / Math.sqrt(k * Plo / rho) > 0.3) || (Phi > 0 && (Phi - Plo) / Phi > 0.1);
      }).map(([id]) => 'P' + id);
      if (fast.length) warn('caution', t('core.solver.adviceCompressible', { pipes: fast.join(', ') }));
    }

    const pipeOf = (id) => pipes[id];
    const pipeV = (id) => (pipes[id] ? pipes[id].V : 0);
    // what a junction type sees while it adds its own results
    const shared = { prep, env, links, st, mOf, Pn, pipeOf, warn, pumps, valves };

    // ---- junctions
    for (const j of eff.junctions) {
      const jn = jNodes.get(j.id);
      if (!jn) continue;
      const def = types.get(j.type);
      const z = U.toSI(j.elevation.value, j.elevation.unit, 'length');
      const con = M.pipesAt(eff, j.id);
      if (jn.main) {
        // single-node junction
        const nd = jn.main;
        let inflow = 0, outflow = 0, vin = 0, vout = 0;
        for (const p of con) {
          const r = pipeOf(p.id); if (!r) continue;
          const into = p.down === j.id ? r.m : -r.m; // positive = flows into the junction
          if (into >= 0) { inflow += into; vin = Math.max(vin, Math.abs(r.V)); } else { outflow -= into; vout = Math.max(vout, Math.abs(r.V)); }
        }
        let P0 = Pn(nd.ix);
        if (nd.isRes) { P0 = nd.value; vin = vout = 0; } // at the liquid surface, at rest
        const zr = nd.isRes ? nd.z : z;
        const jr = {
          type: j.type, P0in: P0, P0out: P0, Pin: P0 - rho * vin * vin / 2, Pout: P0 - rho * vout * vout / 2,
          m: Math.max(inflow, outflow), net: outflow - inflow, z: zr, isolated: nd.isolated,
        };
        if (def.nodeResults) def.nodeResults(j, jr, Object.assign({ nd, P0, con }, shared));
        jr.HGL = jr.Pin / rg + zr;
        if (nd.isolated) Object.assign(jr, { P0in: NaN, P0out: NaN, Pin: NaN, Pout: NaN, HGL: NaN });
        junctions[j.id] = jr;
        continue;
      }
      // two-port junction
      const el = links.find((l) => l.kind === 'elem' && l.jid === j.id);
      const m = mOf(el);
      const P0in = Pn(jn.in.ix), P0out = Pn(jn.out.ix);
      const Vin = pipeV(jn.pin), Vout = pipeV(jn.pout);
      const dP = P0in - P0out;
      const jr = {
        type: j.type, m, Q: m / rho, P0in, P0out, Pin: P0in - rho * Vin * Vin / 2, Pout: P0out - rho * Vout * Vout / 2,
        dP, K: Vin ? dP / (rho * Vin * Vin / 2) : NaN, z, isolated: jn.in.isolated && jn.out.isolated,
      };
      jr.HGL = jr.Pin / rg + z;
      if (jr.isolated) Object.assign(jr, { P0in: NaN, P0out: NaN, Pin: NaN, Pout: NaN, dP: NaN, K: NaN, HGL: NaN });
      junctions[j.id] = jr;
      if (m < 0 && def.reverseFlowCaution !== false && !jr.isolated) warn('caution', t('core.solver.reverseFlow', { id: j.id }), 'j:' + j.id);
      if (def.elementResults) def.elementResults(j, jr, Object.assign({ el, m, P0in, P0out, dP }, shared));
    }

    // ---- mass balance per junction
    if (eff.solution.checkMass) {
      for (const [nd, b] of res.imb) {
        if (b.err > Math.max(1e-9, eff.solution.tolRel * b.thr)) warn('warning', t('core.solver.massImbalance', { id: nd.jid, err: fmtSI(b.err) }), 'j:' + nd.jid);
      }
    } else warn('critical', t('core.solver.massCheckOff'));

    const order = { critical: 0, warning: 1, caution: 2, info: 3 };
    W.sort((a, b) => order[a.level] - order[b.level]);
    const out = {
      ok: true, converged: res.converged, iterations: meta.totalIt, passes: meta.passes, history: meta.hist,
      fluid: { name: env.fluid.name, rho, mu: env.mu, pv, T: env.fluid.T }, patm, g,
      pipes, junctions, pumps, valves, states: st, warnings: W,
    };
    // imposed flows left without supply (the solver option dropUnsupplied of the time simulation)
    if (prep.unsupplied) out.unsupplied = prep.unsupplied;
    return out;
  }

  PumpIt.solver = Object.assign(PumpIt.solver || {}, { postprocess });
})(typeof window !== 'undefined' ? window : globalThis);
