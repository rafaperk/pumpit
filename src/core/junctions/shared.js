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

  PumpIt.junctionTypes.shared = { valveLoss, checkValveLoss, equivalentCv, inlineValveResult, dischargeResults };
})(typeof window !== 'undefined' ? window : globalThis);
