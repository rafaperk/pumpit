// Helpers shared by several junction types (valve loss models, equivalent Cv, discharge results).
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units;
  const { GAL_MIN } = PumpIt.solver.util;

  // a valve given by its opening and its characteristic (§7.2 of the time simulation): the Cv at the opening x (0 to 1),
  // linear (Cv = Cvmax·x) or of equal percentage (Cv = Cvmax·R^(x−1), R the rangeability); no opening closes it
  const CHARS = ['linear', 'equalPct'];
  function cvAtOpening(char, CvMax, R, x) {
    if (!(x > 0)) return 0;
    const xx = Math.min(1, x);
    return char === 'equalPct' ? CvMax * Math.pow(R, xx - 1) : CvMax * xx;
  }
  // the opening (0 to 1) of a Cv, by the inverse of the characteristic
  function openingOfCv(char, CvMax, R, Cv) {
    if (!(Cv > 0)) return 0;
    const r = Cv / CvMax;
    const x = char === 'equalPct' ? 1 + Math.log(r) / Math.log(R) : r;
    return Math.min(1, Math.max(0, x));
  }
  // the Cv of a valve by opening, and whether it is shut
  const openingCv = (j) => cvAtOpening(j.char, j.CvMax, j.R, j.open / 100);
  const shutByOpening = (j) => j.lossModel === 'opening' && !(j.open > 0);

  // valve loss: Cv (US, water SG at 60 °F), Kv (metric), the Cv of an opening, or K through the given function
  function valveLoss(j, kFn, rho) {
    const cvLoss = (Cv) => (m) => { const Qg = Math.abs(m) / rho / GAL_MIN; return Math.sign(m) * (rho / 999.0) * (Qg / Cv) ** 2 * U.PSI; };
    if (j.lossModel === 'Cv') return cvLoss(j.Cv);
    if (j.lossModel === 'opening') return cvLoss(openingCv(j));
    if (j.lossModel === 'Kv') return (m) => { const Qh = Math.abs(m) / rho * 3600; return Math.sign(m) * (rho / 1000) * (Qh / j.Kv) ** 2 * 1e5; };
    return kFn;
  }

  // checklist entries of the valve loss model
  function checkValveLoss(j, miss) {
    if (j.lossModel === 'K' && !(j.K >= 0)) miss.push('K');
    if (j.lossModel === 'Cv' && !(j.Cv > 0)) miss.push('Cv');
    if (j.lossModel === 'Kv' && !(j.Kv > 0)) miss.push('Kv');
    if (j.lossModel === 'opening') checkCharacteristic(j, miss, true);
  }
  // the characteristic of a valve (and its opening, when the opening is the loss model)
  function checkCharacteristic(j, miss, opening) {
    const T = PumpIt.i18n.t;
    if (!(j.CvMax > 0)) miss.push(T('junctions.lossModel.check.CvMax'));
    if (!CHARS.includes(j.char)) miss.push(T('junctions.lossModel.check.char'));
    else if (j.char === 'equalPct' && !(j.R > 1)) miss.push(T('junctions.lossModel.check.R'));
    if (opening && !(Number.isFinite(j.open) && j.open >= 0 && j.open <= 100)) miss.push(T('junctions.lossModel.check.open'));
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
    if (j.lossModel === 'Cv' || j.lossModel === 'opening') { const Cv = j.lossModel === 'Cv' ? j.Cv : openingCv(j); return 2 * A * A * U.PSI / (999.0 * GAL_MIN * GAL_MIN * Cv * Cv); }
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

  // ---------- time simulation (docs/time-simulation.md)
  // what a table drives in a valve (in-line or exit): the value of its loss model. K is interpolated in c = 1/√K (a
  // closing ramp in K behaves like the same ramp in Cv), with c = 0 for a closed valve (K < 0); a Cv or a Kv in its own
  // value. K < 0, Cv ≤ 0 or Kv ≤ 0 closes the valve, any other value opens it
  const K_SPACE = {
    to: (K) => (K < 0 ? 0 : 1 / Math.sqrt(K)),
    from: (c) => (c > 0 ? (Number.isFinite(c) ? 1 / (c * c) : 0) : -1),
  };
  function valveQuantities(j) {
    // by opening: the opening (%), which a table drives straight; 0 closes the valve
    if (j.lossModel === 'opening') {
      return [{
        what: 'open', cat: 'percent', min: 0, noNegative: true, steady: (x) => x.open,
        apply(jc, v) { jc.closed = !(v > 0); jc.open = Math.min(100, Math.max(0, v)); },
      }];
    }
    const field = j.lossModel === 'Cv' || j.lossModel === 'Kv' ? j.lossModel : 'K';
    const k = field === 'K';
    return [{
      what: field, cat: 'none', min: k ? undefined : 0, space: k ? K_SPACE : null,
      steady: (x) => x[field],
      apply(jc, v) {
        const shut = k ? v < 0 : !(v > 0);
        jc.closed = shut;
        if (!shut) jc[field] = v;
      },
    }];
  }
  const valveTime = {
    results: 'valves', states: ['open', 'closed'], log: 'valve', quantities: valveQuantities,
    stateOf: (jc) => (jc.closed || shutByOpening(jc) ? 'closed' : 'open'),
    isClosed: (jc) => !!jc.closed || shutByOpening(jc),
    // its opening can be read (a condition on the opening): a valve given by its opening
    opening: (j) => j.lossModel === 'opening',
  };

  PumpIt.junctionTypes.shared = {
    valveTime, K_SPACE, CHARS, cvAtOpening, openingOfCv, openingCv, shutByOpening, checkCharacteristic,
    valveLoss, checkValveLoss, equivalentCv, inlineValveResult, dischargeResults,
    gasValveK, gasEquivalentCv, gasDischargeResults, gasNode, gasMachAt, gasBasisP,
  };
})(typeof window !== 'undefined' ? window : globalThis);
