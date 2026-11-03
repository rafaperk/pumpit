// Compressible mode: the flow relations of the links of a gas network (production code, built on the reference
// physics of gas.js and checked against it in tests/gas.test.cjs):
//   • the state at the inlet of a link, from the node it leaves: a static node gives the static pressure; a stagnation
//     node (gas at rest, a vessel) gives it through an isentropic entrance;
//   • a pipe by the closed isothermal form when it is horizontal (R-31), otherwise by the march (R-21, R-23, R-32),
//     with a finer step near the sonic point (§9.7);
//   • a K element (valve, fitting, orifice) by the closed forms: isothermal with f·L/D = 0, Fanno with f·L*/D = K;
//   • the mass flux of a link from the pressures of its two nodes (the inverse problem), capped at the critical flux
//     when the link chokes (R-24), with the derivatives the Newton method of the network needs;
//   • a nozzle discharging to an outside pressure (isentropic, choked below the critical pressure ratio).
// Pressures are absolute [Pa], temperatures [K]; a node is { P, pk: 'static' | 'stagnation', T0 }.
(function (root) {
  const PumpIt = root.PumpIt;
  const Gs = PumpIt.gas;
  const H = PumpIt.hyd;
  const Ru = Gs.Ru;
  // local names of the Math functions: the inner loops do not look them up in the global object
  const { abs, max, min, sqrt, exp, log, pow } = Math;
  const isFin = Number.isFinite;

  // gas context of one calculation: properties, thermal model, gravity [m/s²] and the temperature of the isothermal model
  function context(fl, mode, g) {
    const k = fl.k, iso = mode !== 'adiabatic';
    return {
      k, MW: fl.MW, Z: fl.Z, mu: fl.mu, ZR: fl.Z * Ru / fl.MW, cp: k * (Ru / fl.MW) / (k - 1), g, mode, iso, T: fl.T,
      Mlim: iso ? 1 / sqrt(k) : 1, e: k / (k - 1),
      ref: { MW: fl.MW, k, Z: fl.Z, mu: fl.mu }, // the gas object of the reference functions
    };
  }
  const fac = (cx, M) => 1 + (cx.k - 1) / 2 * M * M;            // T0/T
  const machOf = (cx, G, P, T) => G * sqrt(cx.ZR * T) / (P * sqrt(cx.k));
  const rhoOf = (cx, P, T) => P / (cx.ZR * T);
  const p0Of = (cx, P, M) => P * pow(fac(cx, M), cx.e);       // stagnation pressure from the static one
  const tempOf = (cx, node) => (cx.iso ? cx.T : node.T0);          // temperature of a node at rest

  // ------------------------------------------------------------------ the inlet of a link
  // static state where the gas enters a link of mass flux G, from the node it leaves; null when that flux cannot
  // enter (it would be sonic at the inlet already)
  function inlet(cx, node, G) {
    const { k, ZR } = cx;
    if (node.pk === 'static') {
      const P1 = node.P;
      let T1 = cx.T;
      if (!cx.iso) { const c = (k - 1) * G * G * ZR / (2 * k * P1 * P1); T1 = 2 * node.T0 / (1 + sqrt(1 + 4 * c * node.T0)); }
      const M1 = machOf(cx, G, P1, T1);
      return M1 < cx.Mlim ? { P1, T1, M1 } : null;
    }
    // stagnation node: solve τ = χ(M) for the inlet Mach number, χ increasing on [0, Mlim]
    const T0 = tempOf(cx, node);
    const n = cx.iso ? cx.e : (k + 1) / (2 * (k - 1));
    const chi = (M) => M * pow(fac(cx, M), -n);
    const dchi = (M) => pow(fac(cx, M), -n - 1) * (1 - (cx.iso ? (k + 1) / 2 : 1) * M * M);
    const tau = G * sqrt(ZR * T0 / k) / node.P;
    if (!(tau < chi(cx.Mlim))) return null;
    let lo = 0, hi = cx.Mlim, M = min(tau, cx.Mlim * 0.5);
    for (let i = 0; i < 100; i++) {
      const r = chi(M) - tau;
      if (r > 0) hi = M; else lo = M;
      let Mn = M - r / dchi(M);
      if (!(Mn > lo && Mn < hi)) Mn = (lo + hi) / 2;
      if (abs(Mn - M) <= 1e-15 * max(M, 1e-30) || hi - lo <= 1e-16) { M = Mn; break; }
      M = Mn;
    }
    const f = fac(cx, M);
    const T1 = cx.iso ? cx.T : T0 / f;
    return { P1: node.P * pow(f, -cx.e), T1, M1: M };
  }

  // ------------------------------------------------------------------ closed forms
  // isothermal pipe or element: P2 from P1, G and F = f·L/D + ΣK (§9.4); NaN when the flux chokes
  function isoClosed(cx, P1, G, F) {
    if (!(G > 0) || !(F > 0)) return P1;
    const a2 = G * G * cx.ZR * cx.T; // G²ZRT = P*², the pressure where M = 1/√k
    const Ps = sqrt(a2);
    if (!(P1 > Ps)) return NaN;
    const h = (P2) => P1 * P1 - P2 * P2 - a2 * (F + 2 * log(P1 / P2));
    if (h(Ps) < 0) return NaN; // the subsonic branch never closes the relation: choked
    // h is concave and decreasing on (P*, P1]: Newton from P1 converges from the right
    let P2 = P1;
    for (let i = 0; i < 200; i++) {
      const s = h(P2) / (-2 * P2 + 2 * a2 / P2);
      let Pn = P2 - s;
      if (!(Pn > Ps)) Pn = (P2 + Ps) / 2;
      if (abs(Pn - P2) <= 1e-15 * P1) { P2 = Pn; break; }
      P2 = Pn;
    }
    return P2;
  }

  // adiabatic element: Fanno with f·L/D = F from the inlet state; null when it chokes
  function fannoK(cx, P1, T1, G, F) {
    const M1 = machOf(cx, G, P1, T1);
    if (!(M1 < 1)) return null;
    if (!(F > 0) || !(G > 0)) return { P2: P1, T2: T1, M2: M1 };
    const g = cx.ref, k = cx.k;
    const target = Gs.fannoFLD(g, M1) - F;
    if (target < 0) return null;
    // fannoFLD decreases from M1 to 1; derivative −4(1−M²)/(k·M³·(2+(k−1)M²))
    let lo = M1, hi = 1, M = M1;
    for (let i = 0; i < 200; i++) {
      const r = Gs.fannoFLD(g, M) - target;
      if (r > 0) lo = M; else hi = M;
      const d = -4 * (1 - M * M) / (k * M * M * M * (2 + (k - 1) * M * M));
      let Mn = d < 0 ? M - r / d : (lo + hi) / 2;
      if (!(Mn > lo && Mn < hi)) Mn = (lo + hi) / 2;
      if (abs(Mn - M) <= 1e-15 || hi - lo <= 1e-15) { M = Mn; break; }
      M = Mn;
    }
    return { P2: P1 * Gs.fannoP(g, M) / Gs.fannoP(g, M1), T2: T1 * Gs.fannoT(g, M) / Gs.fannoT(g, M1), M2: M };
  }

  // ------------------------------------------------------------------ the march (§9.6, §9.7)
  // The finite volumes of gas.js marchPipe (the same balances and averages per step), with an analytic Jacobian per
  // step, the gravity of the model, and finer steps as the gas accelerates towards the sonic point (decision G-11):
  // a step changes M by at most 0.005 and by at most 5 % of what is left to the limit, and a step that has no subsonic
  // solution is cut by four. A pipe chokes when M reaches the limit before its end. keep: also return the profile.
  function march(cx, P1, T1, G, L, D, f, dz, nSeg = 100, keep = false) {
    const { ZR, cp, iso, Mlim } = cx;
    const g = cx.g, h0 = L / nSeg, slope = dz / L, hmin = L * 1e-12;
    const M1 = machOf(cx, G, P1, T1);
    const prof = keep ? [[0, P1, T1, M1]] : null;
    if (!(M1 < Mlim)) return { choked: true, xChoke: 0, P2: P1, T2: T1, M1, M2: M1, prof };
    // one finite volume of length hs: (Po, To) → [Pn, Tn], or null when the step has no subsonic solution
    function step(Po, To, hs) {
      const rhoO = Po / (ZR * To), Vo = G / rhoO;
      const cf = f * hs / (2 * D), gz = g * slope * hs;
      let Pn = max(Po * 0.5, Po - cf * rhoO * Vo * Vo - rhoO * gz), Tn = To;
      for (let it = 0; it < 60; it++) {
        const rhoN = Pn / (ZR * Tn), Vn = G / rhoN;
        const ra = (rhoO + rhoN) / 2, Va = (Vo + Vn) / 2;
        const F1 = (Pn - Po) + G * (Vn - Vo) + cf * ra * Va * Va + ra * gz;
        const dVdP = -Vn / Pn, drdP = rhoN / Pn;
        const a11 = 1 + G * dVdP + cf * (0.5 * drdP * Va * Va + ra * Va * dVdP) + 0.5 * drdP * gz;
        let sP, sT = 0;
        if (iso) sP = F1 / a11;
        else {
          const dVdT = Vn / Tn, drdT = -rhoN / Tn;
          const F2 = cp * (Tn - To) + (Vn * Vn - Vo * Vo) / 2;
          const a12 = G * dVdT + cf * (0.5 * drdT * Va * Va + ra * Va * dVdT) + 0.5 * drdT * gz;
          const a21 = Vn * dVdP, a22 = cp + Vn * dVdT;
          const det = a11 * a22 - a12 * a21;
          if (!(abs(det) > 0)) return null;
          sP = (F1 * a22 - F2 * a12) / det; sT = (a11 * F2 - a21 * F1) / det;
        }
        if (!isFin(sP) || !isFin(sT)) return null;
        Pn -= sP; Tn -= sT;
        if (!(Pn > 0) || !(Tn > 0)) return null;
        if (abs(sP) <= 1e-13 * Po && abs(sT) <= 1e-13 * To) return machOf(cx, G, Pn, Tn) < Mlim ? [Pn, Tn] : null;
      }
      return null;
    }
    // dM/dx at the inlet, from the ODE without gravity (the first step size)
    let dMdx = iso ? -(M1 / P1) * Gs.isoDpdx(cx.ref, P1, G, D, f, T1) : Gs.fannoDm2dx(cx.ref, M1 * M1, D, f) / (2 * M1);
    let P = P1, T = T1, M = M1, x = 0, n = 0;
    const maxSteps = nSeg + 4000;
    while (L - x > 1e-12 * L) {
      let hs = min(h0, L - x);
      if (dMdx > 0) hs = min(hs, max(hmin, min(0.005, 0.05 * (Mlim - M)) / dMdx));
      let r = step(P, T, hs);
      while (!r && hs > hmin) { hs /= 4; r = step(P, T, hs); }
      if (!r || ++n > maxSteps) return { choked: true, xChoke: x, P2: P, T2: T, M1, M2: M, prof };
      const Mn = machOf(cx, G, r[0], r[1]);
      dMdx = (Mn - M) / hs;
      P = r[0]; T = r[1]; M = Mn; x += hs;
      if (keep && (n % max(1, Math.round(nSeg / 20)) === 0 || L - x <= 1e-12 * L)) prof.push([x, P, T, M]);
      if (Mlim - M <= 1e-9 * Mlim && L - x > 1e-9 * L) return { choked: true, xChoke: x, P2: P, T2: T, M1, M2: M, prof };
    }
    return { choked: false, xChoke: null, P2: P, T2: T, M1, M2: M, prof };
  }

  // ------------------------------------------------------------------ a duct: pipe or K element
  // d = { L, A: [fwd, rev], D: [fwd, rev], K: [fwd, rev], lam: [fwd, rev], fm, eD, fx, dz }; dir = +1 (a → b) or −1.
  // A, D and lam are per direction because a K element is referred to the pipe it comes from.
  function friction(d, Re) {
    if (d.fm === 'explicit') return d.fx;
    if (d.fm === 'none') return 0;
    if (!(Re > 0)) return Infinity;
    return Re < d.reLam ? 64 / Re : H.frictionFactor(Re, d.eD, d.reLam, d.reTurb);
  }
  // laminar correction of the K values (the factor of the incompressible kTerm, network.js)
  function kFactor(lam, Re) {
    if (!lam || lam.mode === 'none' || Re >= lam.reTurb) return 1;
    const fref = lam.mode === 'craneFt' ? lam.fT : lam.fTurb;
    if (Re < lam.reLam) return max(1, (64 / Re) / fref);
    const cl = max(1, (64 / lam.reLam) / fref), w = (Re - lam.reLam) / (lam.reTurb - lam.reLam);
    return (1 - w) * cl + w;
  }

  // outlet of a duct for a mass flux G entering from the node `up`: { ok, P1, T1, M1, P2, T2, M2, f, Re, K, choked }
  function ductOut(cx, d, dir, up, G, keep = false) {
    const i = dir > 0 ? 0 : 1;
    const D = d.D[i];
    const Re = G * D / cx.mu;
    const f = d.L > 0 ? friction(d, Re) : 0;
    const K = d.K[i] * kFactor(d.lam[i], Re);
    const base = { f, Re, K };
    const s = inlet(cx, up, G);
    if (!s) return Object.assign(base, { ok: false, choked: true, entrance: true });
    // a smaller section inside the element (the hole of an orifice) may choke first: its critical flux
    if (d.cap && d.cap[i] && G > d.cap[i](cx, s)) return Object.assign(base, { ok: false, choked: true, throat: true });
    const out = Object.assign(base, s, { ok: true, choked: false });
    if (d.L > 0 && (!cx.iso || dir * d.dz !== 0)) {
      const r = march(cx, s.P1, s.T1, G, d.L, D, f + K * D / d.L, dir * d.dz, d.nSeg || 100, keep);
      if (r.choked) return Object.assign(out, { ok: false, choked: true, xChoke: r.xChoke });
      return Object.assign(out, { P2: r.P2, T2: r.T2, M2: r.M2, prof: r.prof });
    }
    const F = (d.L > 0 ? f * d.L / D : 0) + K;
    if (cx.iso) {
      const P2 = isoClosed(cx, s.P1, G, F);
      if (!(P2 > 0)) return Object.assign(out, { ok: false, choked: true });
      return Object.assign(out, { P2, T2: cx.T, M2: machOf(cx, G, P2, cx.T) });
    }
    const r = fannoK(cx, s.P1, s.T1, G, F);
    if (!r) return Object.assign(out, { ok: false, choked: true });
    return Object.assign(out, r);
  }
  // the pressure the outlet gives to a node of kind pk
  const outEq = (cx, s, pk) => (pk === 'static' ? s.P2 : p0Of(cx, s.P2, s.M2));
  // pressure a node would have at the other end of a link of elevation difference dz, with no flow (gas column)
  const restPressure = (cx, node, dz) => (dz ? node.P * exp(-cx.g * dz / (cx.ZR * tempOf(cx, node))) : node.P);

  // mass flux G ≥ 0 entering from `up` that gives the pressure Pd at a node of kind pkd; choked when Pd is below the
  // outlet pressure at the critical flux. G0: starting value (the last solution of the same link). Returns
  // { G, s (outlet state), choked }.
  function solveFlux(cx, d, dir, up, Pd, pkd, G0) {
    const P0 = up.P;
    const ev = (G) => { const s = ductOut(cx, d, dir, up, G); return s.ok ? { G, F: outEq(cx, s, pkd) - Pd, s } : null; };
    let lo = { G: 0, F: restPressure(cx, up, dir * d.dz) - Pd, s: null }, hi = null, choked = null, prev = null;
    // tolerance on the outlet pressure: relative to the drive (a small drop still gets a precise flow), above round-off
    const tol = max(1e-14 * max(P0, Pd), 1e-11 * lo.F);
    // first value: the last solution, or an incompressible estimate with f = 0.02
    let G = G0 > 0 ? G0 : (() => {
      const rho = rhoOf(cx, P0, tempOf(cx, up)), i = dir > 0 ? 0 : 1;
      const F = (d.L > 0 ? (d.fm === 'explicit' ? d.fx : 0.02) * d.L / d.D[i] : 0) + d.K[i] + 1;
      return sqrt(2 * rho * max(lo.F, 1e-9 * P0) / F);
    })();
    for (let it = 0; it < 200; it++) {
      const r = ev(G);
      if (!r) choked = choked === null ? G : min(choked, G);
      else {
        if (abs(r.F) <= tol) return { G, s: r.s, choked: false };
        if (r.F > 0) lo = r; else hi = r;
      }
      const top = hi ? hi.G : choked;
      // next value: secant on the last two valid points (or with the bracket ends), kept inside the bracket
      let Gn = NaN;
      if (r && prev && prev.G !== r.G) Gn = r.G - r.F * (r.G - prev.G) / (r.F - prev.F);
      else if (r && hi && lo.s) Gn = lo.G - lo.F * (hi.G - lo.G) / (hi.F - lo.F);
      if (r) prev = r;
      if (top === null || top === undefined) { if (!(Gn > lo.G)) Gn = max(lo.G, G) * 2 || 1e-6; else Gn = min(Gn, max(lo.G, G) * 4); }
      else if (!(Gn > lo.G && Gn < top)) Gn = (lo.G + top) / 2;
      if (top !== null && top !== undefined && top - lo.G <= 1e-14 * top) break;
      G = Gn;
    }
    // a bracket with a change of sign that cannot shrink further: the end with the smaller misfit
    if (hi) return !lo.s || abs(hi.F) < abs(lo.F) ? { G: hi.G, s: hi.s, choked: false } : { G: lo.G, s: lo.s, choked: false };
    // no subsonic solution: the link is choked at the largest flux that does not choke
    if (lo.s) return { G: lo.G, s: lo.s, choked: true };
    return { G: 0, s: ductOut(cx, d, dir, up, 0), choked: false };
  }

  // mass flow of a duct link (a → b positive) from its two nodes, with its derivatives when wanted (R-24 at choking)
  //   cache: { G, dir } of the previous call (warm start)
  // Returns { m, dPa, dPb, choked, dir, G, s }
  function ductFlow(cx, d, na, nb, cache, wantDer) {
    const restB = restPressure(cx, na, d.dz);
    const dir = nb.P < restB ? 1 : (na.P < restPressure(cx, nb, -d.dz) ? -1 : 0);
    if (!dir) return zeroFlow(cx, d, na, nb, cache, wantDer);
    const up = dir > 0 ? na : nb, dn = dir > 0 ? nb : na;
    const A = d.A[dir > 0 ? 0 : 1] * d.N;
    // very small drive: linear through zero (a finite slope where the relation has a square root)
    const drive = (dir > 0 ? restB : restPressure(cx, nb, -d.dz)) - dn.P;
    const tiny = 1e-9 * max(na.P, nb.P);
    if (drive < tiny) return zeroFlow(cx, d, na, nb, cache, wantDer);
    const G0 = cache && cache.dir === dir ? cache.G : 0;
    const r = solveFlux(cx, d, dir, up, dn.P, dn.pk, G0);
    if (cache) { cache.G = r.G; cache.dir = dir; }
    const out = { m: dir * A * r.G, choked: r.choked, dir, G: r.G, s: r.s, dPa: 0, dPb: 0 };
    if (!wantDer) return out;
    let dGdUp, dGdDn;
    if (r.choked) { dGdUp = r.G / up.P; dGdDn = 0; }
    else {
      // dF/dG and ∂F/∂P_up by differences at the solution; dG/dP_down = 1/(dF/dG), dG/dP_up = −(∂F/∂P_up)/(dF/dG)
      const F0 = outEq(cx, r.s, dn.pk);
      let hG = r.G * 1e-7, s1 = ductOut(cx, d, dir, up, r.G + hG);
      if (!s1.ok) { hG = -hG; s1 = ductOut(cx, d, dir, up, r.G + hG); }
      const dFdG = s1.ok ? (outEq(cx, s1, dn.pk) - F0) / hG : -Infinity;
      const hP = up.P * 1e-7;
      const s2 = ductOut(cx, d, dir, Object.assign({}, up, { P: up.P + hP }), r.G);
      const dFdUp = s2.ok ? (outEq(cx, s2, dn.pk) - F0) / hP : 1;
      dGdDn = isFin(dFdG) && dFdG < 0 ? 1 / dFdG : 0;
      dGdUp = isFin(dFdG) && dFdG < 0 ? -dFdUp / dFdG : r.G / up.P;
      // a drive too small for the differences of the march (a link of almost no loss: its change with the flux is of the
      // size of the rounding): the slopes of a quadratic loss, ΔP ∝ G²
      if (!(isFin(dFdG) && dFdG < 0) || drive < 1e-6 * up.P) { dGdDn = -r.G / (2 * drive); dGdUp = r.G / (2 * drive); }
    }
    if (dir > 0) { out.dPa = A * dGdUp; out.dPb = A * dGdDn; }
    else { out.dPb = -A * dGdUp; out.dPa = -A * dGdDn; }
    return out;
  }
  // flow in the band of tiny drives: linear between −m(δ) and +m(δ)
  function zeroFlow(cx, d, na, nb, cache, wantDer) {
    const Pm = max(na.P, nb.P), tiny = 1e-9 * Pm;
    const restB = restPressure(cx, na, d.dz);
    const drive = restB - nb.P; // > 0: towards b
    // flux for a drive of +tiny from a to b
    const r = solveFlux(cx, d, 1, na, restB - tiny, nb.pk, 0);
    const A = d.A[0] * d.N;
    const slope = A * r.G / tiny; // dm/d(drive)
    return { m: slope * drive, choked: false, dir: 0, G: abs(drive) / tiny * r.G, s: r.s, dPa: wantDer ? slope * restB / na.P : 0, dPb: wantDer ? -slope : 0 };
  }

  // ------------------------------------------------------------------ nozzle
  // mass flow through an effective area CdA from the node `up` to an outside static pressure Pext (isentropic; the
  // node is taken as the stagnation state ahead of the nozzle). Negative when the outside pressure is the higher one.
  function nozzleFlow(cx, up, Pext, CdA, Text) {
    const { k, ZR } = cx;
    const rc = pow(2 / (k + 1), cx.e);
    const flow = (P0, T0, Pb) => {
      const r = max(Pb / P0, rc);
      return CdA * P0 * sqrt(2 * k / ((k - 1) * ZR * T0) * max(0, pow(r, 2 / k) - pow(r, (k + 1) / k)));
    };
    if (up.P >= Pext) return { m: flow(up.P, tempOf(cx, up), Pext), choked: Pext / up.P < rc };
    return { m: -flow(Pext, Text, up.P), choked: up.P / Pext < rc };
  }

  Object.assign(PumpIt.gas, {
    flow: { context, fac, machOf, rhoOf, p0Of, tempOf, inlet, isoClosed, fannoK, march, friction, kFactor, ductOut, outEq, restPressure, solveFlux, ductFlow, nozzleFlow },
  });
})(typeof window !== 'undefined' ? window : globalThis);
