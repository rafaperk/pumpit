// Helpers shared by several junction types (valve loss models, equivalent Cv, discharge results).
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units;
  const { GAL_MIN } = PumpIt.solver.util;

  // valve loss: Cv (US, water SG at 60 °F), Kv (metric) or K through the given function
  function valveLoss(j, kFn, rho) {
    if (j.lossModel === 'Cv') return (m) => { const Qg = Math.abs(m) / rho / GAL_MIN; return Math.sign(m) * (rho / 999.0) * (Qg / j.Cv) ** 2 * U.PSI; };
    if (j.lossModel === 'Kv') return (m) => { const Qh = Math.abs(m) / rho * 3600; return Math.sign(m) * (rho / 1000) * (Qh / j.Kv) ** 2 * 1e5; };
    return kFn;
  }

  // checklist entries of the valve loss model
  function checkValveLoss(j, miss) {
    if (j.lossModel === 'K' && !(j.K >= 0)) miss.push('K');
    if (j.lossModel === 'Cv' && !(j.Cv > 0)) miss.push('Cv');
    if (j.lossModel === 'Kv' && !(j.Kv > 0)) miss.push('Kv');
  }

  // Cv equivalent to a mass flow and a pressure drop
  function equivalentCv(m, dP, rho) {
    const Qg = Math.abs(m) / rho / GAL_MIN, dPpsi = dP / U.PSI;
    return dP > 0 ? Qg * Math.sqrt((rho / 999.0) / dPpsi) : NaN;
  }

  // valve result row of an in-line (two-port) valve
  function inlineValveResult(j, jr, rc) {
    const { rho } = rc.env;
    const vr = { type: j.type, m: rc.m, Q: rc.m / rho, dP: rc.dP, Pin: jr.Pin, P0in: rc.P0in, K: jr.K, state: PumpIt.i18n.t('junctions.states.open') };
    vr.Cv = equivalentCv(rc.m, rc.dP, rho);
    return vr;
  }

  // flow and pressure drop through the discharge link of a single-node junction (nozzle, exit valve)
  function dischargeResults(j, jr, rc) {
    const el = rc.links.find((l) => l.kind === 'ext' && l.jid === j.id);
    if (el) { jr.m = rc.mOf(el); jr.Q = jr.m / rc.env.rho; jr.dP = rc.P0 - rc.Pn(el.b); jr.Pext = rc.Pn(el.b); }
  }

  // ---------- compressible mode
  // K of a valve referred to the flow area A [m²]: the K given, or the K that the liquid relations of Cv (water at
  // 60 °F, 999 kg/m³) and Kv (1000 kg/m³) give at that area — the same loss as in the incompressible mode, flow-free
  //   Cv: ΔP = (ρ/999)·(Q/Cv)²·psi with Q in gpm → K = 2·A²·psi/(999·gpm²·Cv²)
  //   Kv: ΔP = (ρ/1000)·(Q/Kv)²·bar with Q in m³/h → K = 200·(3600·A/Kv)²
  function gasValveK(j, K, A) {
    if (j.lossModel === 'Cv') return 2 * A * A * U.PSI / (999.0 * GAL_MIN * GAL_MIN * j.Cv * j.Cv);
    if (j.lossModel === 'Kv') return 200 * (3600 * A / j.Kv) ** 2;
    return K;
  }
  // Cv equivalent to a K at the flow area A (the inverse of gasValveK)
  const gasEquivalentCv = (K, A) => (K > 0 ? Math.sqrt(2 * A * A * U.PSI / (999.0 * GAL_MIN * GAL_MIN * K)) : NaN);

  // flow and pressures through the discharge link of a single-node junction in the compressible mode
  function gasDischargeResults(j, jr, rc) {
    const el = rc.links.find((l) => l.kind === 'ext' && l.jid === j.id);
    if (!el) return;
    jr.m = rc.mOf(el);
    jr.Pext = rc.res.P[el.b];
    jr.dP = rc.P0 - jr.Pext;
    jr.Q = jr.rho > 0 ? jr.m / jr.rho : NaN;
    jr.QN = jr.m / rc.env.rhoN;
    const s = el.idx >= 0 ? rc.res.st[el.idx] : null;
    jr.choked = !!(s && s.choked);
    if (jr.choked && !rc.nd.isolated) rc.warn('warning', PumpIt.i18n.t('core.gas.chokedJunction', { id: j.id, m: PumpIt.solver.util.fmtSI(Math.abs(jr.m)) }), 'j:' + j.id);
  }

  // a node of the gas network as the relations see it, from a solution (pk: the kind of pressure of the node)
  const gasNode = (pk, sol, ix) => ({ P: sol.P[ix], pk, T0: sol.T0 ? sol.T0[ix] : NaN });
  // Mach number of a pipe at its end on node ix, from the current link states (0 when unknown)
  function gasMachAt(sol, P, ix) {
    const l = P && P.link;
    if (!l || l.idx === undefined || l.idx < 0) return 0;
    const r = sol.st[l.idx];
    if (!r || !r.s || !r.dir) return 0;
    return (r.dir > 0) === (l.a === ix) ? r.s.M1 || 0 : r.s.M2 || 0;
  }
  // pressure of a node on a basis ('static' | 'stagnation'), converted with the Mach number M of the gas there
  function gasBasisP(cx, nd, basis, M) {
    if (basis === nd.pk || !M) return nd.P;
    const f = Math.pow(1 + (cx.k - 1) / 2 * M * M, cx.e);
    return basis === 'static' ? nd.P / f : nd.P * f;
  }

  PumpIt.junctionTypes.shared = {
    valveLoss, checkValveLoss, equivalentCv, inlineValveResult, dischargeResults,
    gasValveK, gasEquivalentCv, gasDischargeResults, gasNode, gasMachAt, gasBasisP,
  };
})(typeof window !== 'undefined' ? window : globalThis);
