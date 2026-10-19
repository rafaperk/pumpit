/* Compressible (gas) flow in steady state: the reference physics of the compressible mode (specification of the
 * compressible mode, appendix A). Pure, no DOM. Derived from public physics (1D compressible flow in a duct of
 * constant area). Verified by tests/gas.test.cjs (appendix B). The statements are those of the appendix; only the
 * comments are in English and the module attaches itself to PumpIt.gas (decision G-01 in docs/decisoes-gas.md).
 *
 * Conventions (SI):
 *   P  absolute static pressure [Pa]         T  static temperature [K]
 *   G  mass flux = ṁ/A [kg/(m²·s)]           ṁ  mass flow [kg/s]
 *   V  velocity [m/s]    rho density [kg/m³]    a  speed of sound [m/s]   M  Mach number
 *   Perfect gas with a compressibility factor Z: rho = P·MW/(Z·Ru·T), R = Ru/MW.
 *   The friction factor f is always Darcy's (f_Darcy = 4·f_Fanning). */
(function (root) {
  'use strict';
  const Ru = 8314.462618;            // universal gas constant [J/(kmol·K)]
  const G0 = 9.80665;

  // gas = { MW [kg/kmol], k = cp/cv, Z (default 1), mu [Pa·s] }
  const Rspec = (gas) => Ru / gas.MW;                 // specific gas constant [J/(kg·K)]
  const density = (gas, P, T) => (P * gas.MW) / ((gas.Z || 1) * Ru * T);
  const sound = (gas, T) => Math.sqrt((gas.Z || 1) * gas.k * Rspec(gas) * T); // a = sqrt(Z·k·R·T)
  // from G and P, T to V, M
  const velocity = (gas, G, P, T) => G / density(gas, P, T);
  const mach = (gas, G, P, T) => velocity(gas, G, P, T) / sound(gas, T);

  // ------------------------------------------------------------------ ISOTHERMAL (constant T)
  // Closed form for a horizontal duct of constant area, ideal gas, isothermal:
  //   P1² − P2² = G²·Z·R·T·[ f·L/D + 2·ln(P1/P2) ]
  // Isothermal choking: M = 1/sqrt(k).
  function isoP2fromG(gas, P1, G, L, D, f, T) {
    // P2 for a given G, by Newton on g(P2)=P1²−P2²−G²ZRT[fL/D+2ln(P1/P2)]
    const ZRT = (gas.Z || 1) * Rspec(gas) * T;
    const rhs = (P2) => G * G * ZRT * (f * L / D + 2 * Math.log(P1 / P2));
    let P2 = P1 * 0.9;
    for (let i = 0; i < 200; i++) {
      const gP = P1 * P1 - P2 * P2 - rhs(P2);
      const dg = -2 * P2 - G * G * ZRT * (-2 / P2); // d/dP2
      const step = gP / dg;
      P2 -= step;
      if (!(P2 > 0)) P2 = 1e-3;
      if (Math.abs(step) < 1e-9 * P1) break;
    }
    return P2;
  }
  function isoGfromP(gas, P1, P2, L, D, f, T) {
    const ZRT = (gas.Z || 1) * Rspec(gas) * T;
    const denom = f * L / D + 2 * Math.log(P1 / P2);
    return Math.sqrt((P1 * P1 - P2 * P2) / (ZRT * denom));
  }
  // exact isothermal ODE dP/dx (horizontal). Denominator (1 − G²ZRT/P²) = (1 − k·M²) → choking at M=1/√k.
  function isoDpdx(gas, P, G, D, f, T) {
    const ZRT = (gas.Z || 1) * Rspec(gas) * T;
    return -(f / D) * (G * G * ZRT / (2 * P)) / (1 - G * G * ZRT / (P * P));
  }

  // ------------------------------------------------------------------ FANNO (adiabatic, no work)
  // Relations referred to the sonic point (*), ideal gas, constant area. Choking at M=1.
  const fannoT = (gas, M) => (gas.k + 1) / (2 + (gas.k - 1) * M * M);                 // T/T*
  const fannoP = (gas, M) => (1 / M) * Math.sqrt((gas.k + 1) / (2 + (gas.k - 1) * M * M)); // P/P*
  const fannoRho = (gas, M) => (1 / M) * Math.sqrt((2 + (gas.k - 1) * M * M) / (gas.k + 1)); // rho/rho*
  const fannoP0 = (gas, M) => (1 / M) * Math.pow((2 + (gas.k - 1) * M * M) / (gas.k + 1), (gas.k + 1) / (2 * (gas.k - 1))); // P0/P0*
  // f_Darcy·L*/D up to the sonic point, from M (Fanno function)
  function fannoFLD(gas, M) {
    const k = gas.k, M2 = M * M;
    return (1 - M2) / (k * M2) + (k + 1) / (2 * k) * Math.log((k + 1) * M2 / (2 + (k - 1) * M2));
  }
  // Fanno ODE: dM²/dx = M²·k·M²·(1+(k−1)/2·M²)/(1−M²)·(f/D)
  function fannoDm2dx(gas, M2, D, f) {
    const k = gas.k;
    return M2 * (k * M2 * (1 + (k - 1) / 2 * M2) / (1 - M2)) * (f / D);
  }
  const T0ofT = (gas, M) => 1 + (gas.k - 1) / 2 * M * M;  // T0/T

  // ------------------------------------------------------------------ stagnation
  const p0ofP = (gas, P, M) => P * Math.pow(1 + (gas.k - 1) / 2 * M * M, gas.k / (gas.k - 1));
  const t0ofT = (gas, T, M) => T * (1 + (gas.k - 1) / 2 * M * M);

  // ------------------------------------------------------------------ GENERAL MARCH along a pipe
  // Finite volume: integrates in nSeg steps solving, at each step dx, the coupled balance
  // {continuity, momentum, energy} for (P', T') by Newton. Valid for both thermal models, and includes
  // elevation (dz) and heat per unit mass (q) — reduces to Fanno (adiabatic) and to the isothermal closed
  // form when dz=0. Chokes when M reaches the limit of the thermal model.
  //   continuity:  rho·V = G (constant)
  //   momentum:    (P'−P) + G(V'−V) + (f/D)(rhō V̄²/2)dx + rhō·g·dz_step = 0
  //   energy:      isothermal  T'=T ;  adiabatic/heat  cp(T'−T) + (V'²−V²)/2 = q_step
  function marchPipe(gas, { P1, T1, G, L, D, f, mode = 'isotermico', dz = 0, q = 0 }, nSeg = 200) {
    const R = Rspec(gas), Z = gas.Z || 1, MW = gas.MW, cp = gas.k * R / (gas.k - 1);
    const Mmax = mode === 'isotermico' ? 1 / Math.sqrt(gas.k) : 1;
    const rho = (P, T) => P * MW / (Z * Ru * T);
    const Vof = (P, T) => G / rho(P, T);
    const h = L / nSeg, dzs = dz / nSeg, qs = q / nSeg;
    let P = P1, T = T1, choked = false, xChoke = null, x = 0;
    for (let i = 0; i < nSeg; i++) {
      const Po = P, To = T, Vo = Vof(Po, To), rhoO = rho(Po, To);
      const resid = (Pn, Tn) => {
        const Vp = Vof(Pn, Tn), ra = (rhoO + rho(Pn, Tn)) / 2, Va = (Vo + Vp) / 2;
        const F1 = (Pn - Po) + G * (Vp - Vo) + (f / D) * (ra * Va * Va / 2) * h + ra * G0 * dzs;
        const F2 = mode === 'isotermico' ? (Tn - To) : cp * (Tn - To) + (Vp * Vp - Vo * Vo) / 2 - qs;
        return [F1, F2];
      };
      let Pn = Math.max(Po * 0.5, Po - (f / D) * (rhoO * Vo * Vo / 2) * h - rhoO * G0 * dzs), Tn = To, done = false;
      for (let it = 0; it < 80; it++) {
        const F = resid(Pn, Tn);
        if (Math.hypot(F[0] / Po, F[1] / To) < 1e-10) { done = true; break; }
        const dP = Po * 1e-7, dT = To * 1e-7;
        const Fp = resid(Pn + dP, Tn), Ft = resid(Pn, Tn + dT);
        const J = [[(Fp[0] - F[0]) / dP, (Ft[0] - F[0]) / dT], [(Fp[1] - F[1]) / dP, (Ft[1] - F[1]) / dT]];
        const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
        if (!(Math.abs(det) > 0)) break;
        const sP = (F[0] * J[1][1] - F[1] * J[0][1]) / det, sT = (J[0][0] * F[1] - J[1][0] * F[0]) / det;
        Pn -= sP; Tn -= sT;
        if (!(Pn > 0)) break;
        if (Math.abs(sP / Po) + Math.abs(sT / To) < 1e-13) { done = true; break; }
      }
      const Mn = Pn > 0 ? mach(gas, G, Pn, Tn) : Infinity;
      if (!done || !(Pn > 0) || Mn >= Mmax - 1e-6) { choked = true; xChoke = x + h; if (Pn > 0) { P = Pn; T = Tn; } break; }
      P = Pn; T = Tn; x += h;
    }
    return { P2: P, T2: T, M1: mach(gas, G, P1, T1), M2: P > 0 ? mach(gas, G, P, T) : Infinity, choked, xChoke };
  }

  // maximum mass flux (choking) of a pipe, given P1,T1: the largest G that does not choke before L
  function chokedG(gas, opt, nSeg = 200) {
    let lo = 1e-6, hi = 1e7;
    for (let i = 0; i < 90; i++) {
      const mid = (lo + hi) / 2;
      if (marchPipe(gas, { ...opt, G: mid }, nSeg).choked) hi = mid; else lo = mid;
    }
    return lo;
  }

  // ------------------------------------------------------------------ isothermal NETWORK (classic gas method)
  // Nodes carry the STATIC pressure (kinetic energy neglected at the junction, as in gas distribution
  // networks). Each pipe gives ṁ by the closed isothermal relation with (f·L/D + ΣK). The pressures of the
  // free nodes are solved by Newton until the mass balance closes at every node.
  //   nodes: [{ id, P: Pa (fixed) | null, inflow: kg/s (injected; + enters) }]
  //   pipes: [{ from, to, L, D, f, A, K }]      A = area [m²], K = ΣK of local losses
  // Returns { P: Map(id→Pa), mdot: Map(index→kg/s, + in the from→to direction), iters, ok }.
  function solveGasNetworkIso(gas, T, nodes, pipes, opt = {}) {
    const ZRT = (gas.Z || 1) * Rspec(gas) * T;
    const pipeMdot = (Pi, Pj, p) => {
      if (Math.abs(Pi - Pj) < 1e-6) return 0;
      const hi = Math.max(Pi, Pj), lo = Math.min(Pi, Pj);
      const denom = p.f * p.L / p.D + (p.K || 0) + 2 * Math.log(hi / lo);
      const Gx = Math.sqrt((hi * hi - lo * lo) / (ZRT * denom));
      return (Pi > Pj ? 1 : -1) * p.A * Gx; // + = from→to direction
    };
    const idx = new Map(nodes.map((n, i) => [n.id, i]));
    const free = nodes.map((n, i) => (n.P == null ? i : -1)).filter((i) => i >= 0);
    const fixedPs = nodes.filter((n) => n.P != null).map((n) => n.P);
    const P = nodes.map((n) => (n.P != null ? n.P : (fixedPs.reduce((a, b) => a + b, 0) / Math.max(1, fixedPs.length)) || 2e5));
    const mdotAll = () => pipes.map((p) => pipeMdot(P[idx.get(p.from)], P[idx.get(p.to)], p));
    const resid = () => {
      const m = mdotAll();
      return free.map((ni) => {
        let s = nodes[ni].inflow || 0;
        pipes.forEach((p, k) => { if (idx.get(p.to) === ni) s += m[k]; if (idx.get(p.from) === ni) s -= m[k]; });
        return s; // = 0 at balance
      });
    };
    let ok = false, it = 0;
    for (; it < 200; it++) {
      const F = resid();
      if (Math.max(...F.map(Math.abs)) < 1e-10) { ok = true; break; }
      // numerical Jacobian ∂F/∂P_free
      const n = free.length, J = Array.from({ length: n }, () => new Array(n).fill(0));
      for (let c = 0; c < n; c++) {
        const d = Math.max(1, P[free[c]] * 1e-6);
        P[free[c]] += d; const Fp = resid(); P[free[c]] -= d;
        for (let r = 0; r < n; r++) J[r][c] = (Fp[r] - F[r]) / d;
      }
      const dx = solveLin(J, F.map((v) => -v));
      let relax = 1;
      for (let r = 0; r < n; r++) if (P[free[r]] + dx[r] <= 0) relax = Math.min(relax, 0.5 * P[free[r]] / Math.abs(dx[r]));
      for (let r = 0; r < n; r++) P[free[r]] += relax * dx[r];
    }
    return { P: new Map(nodes.map((n, i) => [n.id, P[i]])), mdot: new Map(pipes.map((p, k) => [k, mdotAll()[k]])), iters: it, ok };
  }
  // Gaussian elimination with partial pivoting
  function solveLin(A, b) {
    const n = b.length, M = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      [M[c], M[piv]] = [M[piv], M[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((row, i) => row[n] / row[i]);
  }

  const api = {
    Ru, G0, Rspec, density, sound, velocity, mach,
    isoP2fromG, isoGfromP, isoDpdx,
    fannoT, fannoP, fannoRho, fannoP0, fannoFLD, fannoDm2dx, T0ofT,
    p0ofP, t0ofT, marchPipe, chokedG, solveGasNetworkIso, solveLin,
  };
  // one global namespace (G-01): PumpIt.gas in the app and in the core tests; module.exports when required from Node
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root.PumpIt) root.PumpIt.gas = Object.assign(root.PumpIt.gas || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
