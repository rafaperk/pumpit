// Compressible mode: the gas physics (T1–T11, appendix B of the specification of the compressible mode, with its names and messages in English)
// and the calculation of models in the compressible regime (T12 onwards). Usage:
//   node tests/gas.test.cjs            the module of this repository (src/core/gas/gas.js, loaded with the core)
//   node tests/gas.test.cjs <file.js>  T1–T11 on another implementation of the same functions (a CommonJS module; thermal models 'isothermal' and 'adiabatic')
const path = require('path');
const { loadCore } = require('./load-core');
const PumpIt = process.argv[2] ? null : loadCore();
const G = process.argv[2] ? require(path.resolve(process.argv[2])) : PumpIt.gas;
let fails = 0;
const ok = (name, cond, info = '') => { if (!cond) fails++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? ` — ${info}` : ''}`); };
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-30, Math.abs(b));
const near = (a, b, tol = 1e-3) => rel(a, b) <= tol;

const air = { MW: 28.9647, k: 1.4, Z: 1, mu: 1.8e-5 };     // air
const gn = { MW: 16.9, k: 1.30, Z: 0.9, mu: 1.1e-5 };     // approximate natural gas

// T1 ideal gas: density, speed of sound, Mach
ok('T1 rho of air at 101325 Pa, 300 K', near(G.density(air, 101325, 300), 1.1766, 2e-3), `${G.density(air, 101325, 300).toFixed(4)} kg/m³`);
ok('T1 a of air at 300 K ≈ 347 m/s', near(G.sound(air, 300), 347.2, 3e-3), `${G.sound(air, 300).toFixed(1)} m/s`);
const Gflux = 1.1766 * 50; // rho·V with V=50 m/s
ok('T1 Mach from G, P, T', near(G.mach(air, Gflux, 101325, 300), 50 / 347.2, 3e-3), `${G.mach(air, Gflux, 101325, 300).toFixed(4)}`);
ok('T1 Z enters rho and a', G.density(gn, 5e6, 320) > 0 && near(G.sound(gn, 320), Math.sqrt(0.9 * 1.30 * (8314.462618 / 16.9) * 320), 1e-9));

// T2 isothermal: closed form there and back (G→P2→G) and consistency of P1²−P2²
{
  const P1 = 5e5, L = 200, D = 0.1, f = 0.02, T = 300;
  const Gm = G.isoGfromP(air, P1, 3e5, L, D, f, T);
  const P2 = G.isoP2fromG(air, P1, Gm, L, D, f, T);
  ok('T2 isothermal G↔P2 consistent', near(P2, 3e5, 1e-6), `P2=${P2.toFixed(1)} Pa`);
}
// T3 isothermal: the march equals the closed form
{
  const P1 = 8e5, L = 500, D = 0.15, f = 0.018, T = 310;
  const Gm = G.isoGfromP(air, P1, 6e5, L, D, f, T);
  const r = G.marchPipe(air, { P1, T1: T, G: Gm, L, D, f, mode: 'isothermal' }, 400);
  ok('T3 isothermal march = closed form', near(r.P2, 6e5, 2e-4), `march ${r.P2.toFixed(1)} vs closed 600000`);
  ok('T3 not choked (M<1/√k)', !r.choked && r.M2 < 1 / Math.sqrt(air.k), `M2=${r.M2.toFixed(3)}, limit ${(1 / Math.sqrt(air.k)).toFixed(3)}`);
}
// T4 isothermal choking happens at M→1/√k (asymptotic approach of the uniform-step march)
{
  const P1 = 5e5, L = 50, D = 0.1, f = 0.02, T = 300, Mlim = 1 / Math.sqrt(air.k);
  const Gc = G.chokedG(air, { P1, T1: T, L, D, f, mode: 'isothermal' }, 4000);
  const r = G.marchPipe(air, { P1, T1: T, G: Gc, L, D, f, mode: 'isothermal' }, 8000);
  ok('T4 critical flow: outlet M close to 1/√k, not beyond', r.M2 > Mlim * 0.95 && r.M2 <= Mlim + 1e-6, `outlet M ${r.M2.toFixed(4)} (1/√k=${Mlim.toFixed(4)})`);
  ok('T4 2% above the critical flow → chokes', G.marchPipe(air, { P1, T1: T, G: Gc * 1.02, L, D, f, mode: 'isothermal' }, 8000).choked);
  ok('T4 90% of the critical flow → does not choke', !G.marchPipe(air, { P1, T1: T, G: Gc * 0.9, L, D, f, mode: 'isothermal' }, 8000).choked);
}
// T5 Fanno: consistent sonic relations (M=1 → ratios=1; derivatives with the right sign)
{
  ok('T5 Fanno T/T*, P/P*, P0/P0* = 1 at M=1', near(G.fannoT(air, 1), 1, 1e-12) && near(G.fannoP(air, 1), 1, 1e-12) && near(G.fannoP0(air, 1), 1, 1e-12));
  ok('T5 Fanno fL*/D = 0 at M=1 and > 0 at M<1', Math.abs(G.fannoFLD(air, 1)) < 1e-12 && G.fannoFLD(air, 0.3) > 0 && G.fannoFLD(air, 0.5) > G.fannoFLD(air, 0.8));
  ok('T5 Fanno P0/P0* minimum at M=1 (subsonic, falls to 1)', G.fannoP0(air, 0.4) > G.fannoP0(air, 0.7) && G.fannoP0(air, 0.7) > 1);
}
// T6 Fanno: the march of M equals the length of the Fanno function, and the ratios P2/P1, T2/T1 agree
{
  const M1 = 0.3, D = 0.1, f = 0.02;
  const Lstar = G.fannoFLD(air, M1) * D / f;              // length up to choking
  const Luse = Lstar * 0.6;
  // march of M² by RK4 over Luse
  let M2v = M1 * M1, h = Luse / 4000;
  for (let i = 0; i < 4000; i++) {
    const k1 = G.fannoDm2dx(air, M2v, D, f);
    const k2 = G.fannoDm2dx(air, M2v + h / 2 * k1, D, f);
    const k3 = G.fannoDm2dx(air, M2v + h / 2 * k2, D, f);
    const k4 = G.fannoDm2dx(air, M2v + h * k3, D, f);
    M2v += h / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
  }
  const M2 = Math.sqrt(M2v);
  const LfromFn = (G.fannoFLD(air, M1) - G.fannoFLD(air, M2)) * D / f;
  ok('T6 Fanno march of M ↔ function fL*/D', near(LfromFn, Luse, 2e-3), `L march ${Luse.toFixed(3)} vs function ${LfromFn.toFixed(3)}`);
  const P2P1 = G.fannoP(air, M2) / G.fannoP(air, M1), T2T1 = G.fannoT(air, M2) / G.fannoT(air, M1);
  ok('T6 subsonic Fanno: P falls, T falls, M rises', P2P1 < 1 && T2T1 < 1 && M2 > M1, `P2/P1=${P2P1.toFixed(3)} T2/T1=${T2T1.toFixed(3)} M2=${M2.toFixed(3)}`);
}
// T7 Fanno by marchPipe (adiabatic): constant T0 and choking at M=1
{
  const gas = air, P1 = 6e5, T1 = 320, D = 0.1, f = 0.02;
  // G for M1≈0.3
  const a1 = G.sound(gas, T1), rho1 = G.density(gas, P1, T1), Gm = rho1 * 0.3 * a1;
  const M1 = G.mach(gas, Gm, P1, T1);
  const T01 = T1 * G.T0ofT(gas, M1);
  const Lstar = G.fannoFLD(gas, M1) * D / f;
  const r = G.marchPipe(gas, { P1, T1, G: Gm, L: Lstar * 0.98, D, f, mode: 'adiabatic' }, 3000);
  const T02 = r.T2 * G.T0ofT(gas, r.M2);
  ok('T7 adiabatic: T0 constant along the pipe', near(T02, T01, 2e-3), `T0 in ${T01.toFixed(2)} K, out ${T02.toFixed(2)} K`);
  // M expected at 0.98·L* by the exact Fanno function: fannoFLD(M2)=0.02·fannoFLD(M1)
  const target = 0.02 * G.fannoFLD(gas, M1);
  let mlo = M1, mhi = 1;
  for (let i = 0; i < 80; i++) { const mm = (mlo + mhi) / 2; if (G.fannoFLD(gas, mm) > target) mlo = mm; else mhi = mm; }
  ok('T7 adiabatic: M of the march = exact Fanno at 0.98·L*', near(r.M2, mlo, 3e-3), `march M2=${r.M2.toFixed(4)} vs Fanno ${mlo.toFixed(4)}`);
  const rc = G.marchPipe(gas, { P1, T1, G: Gm, L: Lstar * 1.2, D, f, mode: 'adiabatic' }, 3000);
  ok('T7 adiabatic chokes beyond L*', rc.choked && near(rc.M2, 1, 2e-2), `choked=${rc.choked}, M=${rc.M2.toFixed(3)}`);
}
// T8 incompressible limit: small ΔP → the same Darcy loss as the incompressible model
{
  const P1 = 1e7, L = 100, D = 0.2, f = 0.015, T = 300; // high pressure, ΔP<<P1
  const Gm = 200; // kg/(m²s) moderate
  const r = G.marchPipe(air, { P1, T1: T, G: Gm, L, D, f, mode: 'isothermal' }, 400);
  const rho = G.density(air, P1, T), V = Gm / rho;
  const dpInc = f * L / D * rho * V * V / 2;           // incompressible Darcy
  ok('T8 compressible ΔP ≈ incompressible Darcy when ΔP<<P1', near(P1 - r.P2, dpInc, 5e-3), `comp ${(P1 - r.P2).toFixed(0)} Pa vs inc ${dpInc.toFixed(0)} Pa (${(100 * (P1 - r.P2) / P1).toFixed(2)}% of P1)`);
}
// T9 two pipes in series (isothermal): the same ṁ in both, a single intermediate P
{
  const P1 = 7e5, P3 = 4e5, T = 300, D = 0.1, f = 0.02, L1 = 150, L2 = 150;
  // P2 such that G(pipe1,P1→P2) == G(pipe2,P2→P3)
  let lo = P3 + 1, hi = P1 - 1, P2 = 0;
  for (let i = 0; i < 100; i++) {
    P2 = (lo + hi) / 2;
    const g1 = G.isoGfromP(air, P1, P2, L1, D, f, T), g2 = G.isoGfromP(air, P2, P3, L2, D, f, T);
    if (g1 > g2) lo = P2; else hi = P2;
  }
  const g1 = G.isoGfromP(air, P1, P2, L1, D, f, T), g2 = G.isoGfromP(air, P2, P3, L2, D, f, T);
  ok('T9 series: the same mass flux in both pipes', near(g1, g2, 1e-4), `G1=${g1.toFixed(3)} G2=${g2.toFixed(3)}, P2=${(P2 / 1e3).toFixed(1)} kPa`);
  // check by march: pipe 1 with G1 arrives at P2
  const r = G.marchPipe(air, { P1, T1: T, G: g1, L: L1, D, f, mode: 'isothermal' }, 300);
  ok('T9 series checked by the march', near(r.P2, P2, 1e-3), `march P2=${r.P2.toFixed(0)} vs ${P2.toFixed(0)}`);
}

// T10 isothermal network: two pipes in series reproduce the intermediate P of T9
{
  const T = 300, D = 0.1, f = 0.02, A = Math.PI * D * D / 4;
  const nodes = [{ id: 'A', P: 7e5 }, { id: 'B', P: null, inflow: 0 }, { id: 'C', P: 4e5 }];
  const pipes = [{ from: 'A', to: 'B', L: 150, D, f, A, K: 0 }, { from: 'B', to: 'C', L: 150, D, f, A, K: 0 }];
  const r = G.solveGasNetworkIso(air, T, nodes, pipes);
  ok('T10 series network converges', r.ok, `${r.iters} iter`);
  ok('T10 intermediate P ≈ 570.8 kPa (as in T9)', near(r.P.get('B'), 570805, 2e-3), `P_B=${(r.P.get('B') / 1e3).toFixed(1)} kPa`);
  ok('T10 the same ṁ in both pipes', near(r.mdot.get(0), r.mdot.get(1), 1e-6), `ṁ1=${r.mdot.get(0).toFixed(4)} ṁ2=${r.mdot.get(1).toFixed(4)} kg/s`);
}
// T11 branched isothermal network: the mass balance closes at every node
{
  const T = 288, D = 0.08, f = 0.02, A = Math.PI * D * D / 4;
  //  S1(high) ─1─ J ─2─ D1 ;  S2(high) ─3─ J ;  J ─4─ D2(low)
  const nodes = [
    { id: 'S1', P: 6e5 }, { id: 'S2', P: 55e4 }, { id: 'J', P: null, inflow: 0 },
    { id: 'D1', P: 3e5 }, { id: 'D2', P: 2.5e5 },
  ];
  const pipes = [
    { from: 'S1', to: 'J', L: 100, D, f, A }, { from: 'J', to: 'D1', L: 120, D, f, A },
    { from: 'S2', to: 'J', L: 80, D, f, A }, { from: 'J', to: 'D2', L: 150, D, f, A },
  ];
  const r = G.solveGasNetworkIso(air, T, nodes, pipes);
  ok('T11 branched network converges', r.ok, `${r.iters} iter, P_J=${(r.P.get('J') / 1e3).toFixed(1)} kPa`);
  const into = (id) => pipes.reduce((s, p, k) => s + (p.to === id ? r.mdot.get(k) : p.from === id ? -r.mdot.get(k) : 0), 0);
  ok('T11 the mass balance closes at node J', Math.abs(into('J')) < 1e-9, `residual ${into('J').toExponential(2)} kg/s`);
  ok('T11 sum of the sources = sum of the consumers', near(-(into('S1') + into('S2')), into('D1') + into('D2'), 1e-6),
    `sources ${(-(into('S1') + into('S2'))).toFixed(4)} = consumers ${(into('D1') + into('D2')).toFixed(4)} kg/s`);
}

// ------------------------------------------------------------------ models of the app (T12 onwards)
if (PumpIt) {
  const { model: M, solver: S, hyd: H } = PumpIt;
  const q = M.q;
  const Ru = 8314.462618;
  const same = (a, b) => JSON.stringify(Object.assign({}, a, { history: 0 })) === JSON.stringify(Object.assign({}, b, { history: 0 }));
  // a compressible model built from junction rows [id, type, props] and pipe rows [id, up, down, L (m), D (mm), set]
  function gasModel(js, ps, sys = {}) {
    const m = M.newModel();
    Object.assign(m.system, { regime: 'compressible', gasMode: 'isothermal' }, sys);
    for (const [id, type, props] of js) m.junctions.push(Object.assign(M.newJunction(type, id, 0, 0), props));
    for (const [id, a, b, L, Dmm, set] of ps) {
      const p = M.newPipe(id, a, b);
      Object.assign(p, { material: { kind: 'user', nps: '4', sch: '40' }, length: q(L, 'm') });
      p.geometry.d = q(Dmm, 'mm');
      if (set) set(p);
      m.pipes.push(p);
    }
    return m;
  }
  const solve = (m, sid = 'base') => {
    const eff = M.effective(m, sid);
    const v = M.validate(eff);
    if (!v.ok) return { ok: false, errors: ['incomplete model: ' + JSON.stringify([...v.undef])] };
    return S.run(eff);
  };
  const customAir = { kind: 'gas', gas: 'custom', name: 'Air', MW: 28.9647, k: 1.4, Z: 1, mu: q(1.8e-5, 'Pa·s'), T: q(300, 'K') };

  // T12 the calculation follows the regime of the model (appendix C): the incompressible one does not see the gas path
  {
    const m = PumpIt.examples.get('threeRes').build();
    const r1 = S.run(M.effective(m, 'base'));
    m.system.regime = 'compressible';
    const r2 = S.run(M.effective(m, 'base'));
    m.system.regime = 'incompressible';
    const r3 = S.run(M.effective(m, 'base'));
    ok('T12 incompressible regime: the same result as before', r1.ok && same(r1, r3));
    ok('T12 compressible regime: follows the gas path', r2.ok && r2.regime === 'compressible' && !same(r1, r2), r2.ok ? 'solved' : (r2.errors || []).join('; '));
  }

  // T13 appendix D (example "air"): solves, closes the mass balance, and the pressure of the branch equals an
  // independent calculation (bisection on that pressure, closed isothermal form, isentropic entrance from the vessel),
  // in absolute pressures: the gauge ones of the example plus the atmospheric pressure of the model (R-13)
  {
    const m = PumpIt.examples.get('air').build();
    m.system.fluidGas = Object.assign({}, customAir);
    const r = solve(m);
    ok('T13 example D solves in the compressible mode', r.ok && r.converged, r.ok ? `${r.iterations} iterations` : r.errors.join('; '));
    if (r.ok) {
      const bal = r.pipes[1].m - r.pipes[2].m - r.pipes[3].m;
      ok('T13 the mass balance closes at the branch', Math.abs(bal) < 1e-9 * r.pipes[1].m, `${bal.toExponential(2)} kg/s`);
      const ZRT = Ru / 28.9647 * 300, k = 1.4, e = k / (k - 1), mu = 1.8e-5;
      const fOf = (Gf, D) => H.frictionFactor(Gf * D / mu, 0.046e-3 / D, 2300, 4000);
      const fluxSS = (P1, P2, L, D) => { let Gf = 100; for (let i = 0; i < 100; i++) Gf = Math.sqrt((P1 * P1 - P2 * P2) / (ZRT * (fOf(Gf, D) * L / D + 2 * Math.log(P1 / P2)))); return Gf; };
      const fluxVS = (P0, P2, L, D) => {
        let lo = 0, hi = 2000;
        for (let i = 0; i < 200; i++) {
          const Gf = (lo + hi) / 2;
          let P1 = P0; for (let j = 0; j < 60; j++) { const M1 = Gf * Math.sqrt(ZRT) / (Math.sqrt(k) * P1); P1 = P0 * Math.pow(1 + (k - 1) / 2 * M1 * M1, -e); }
          if (P1 * P1 - P2 * P2 - Gf * Gf * ZRT * (fOf(Gf, D) * L / D + 2 * Math.log(P1 / P2)) > 0) lo = Gf; else hi = Gf;
        }
        return (lo + hi) / 2;
      };
      const A = (D) => Math.PI * D * D / 4;
      const pa = PumpIt.units.toSI(m.system.patm.value, m.system.patm.unit, 'pressure');
      const P0 = 5e5 + pa, PA = 2.5e5 + pa, PB = 2e5 + pa;
      let lo = PA, hi = P0;
      for (let i = 0; i < 100; i++) { const Pb = (lo + hi) / 2; if (fluxVS(P0, Pb, 200, 0.1) * A(0.1) > (fluxSS(Pb, PA, 150, 0.08) + fluxSS(Pb, PB, 180, 0.08)) * A(0.08)) lo = Pb; else hi = Pb; }
      const Pb = (lo + hi) / 2;
      ok('T13 pressure of the branch = independent calculation', near(r.junctions[2].Pin, Pb, 1e-7), `${(r.junctions[2].Pin / 1e3).toFixed(4)} × ${(Pb / 1e3).toFixed(4)} kPa`);
      ok('T13 flows = independent calculation', near(r.pipes[1].m, fluxVS(P0, Pb, 200, 0.1) * A(0.1), 1e-6) && near(r.pipes[3].m, fluxSS(Pb, PB, 180, 0.08) * A(0.08), 1e-6), `ṁ1=${r.pipes[1].m.toFixed(5)} kg/s`);
      ok('T13 the results carry Mach and stagnation', r.pipes[3].Mout > r.pipes[3].Min && r.pipes[3].P0out > r.pipes[3].Pout && r.junctions[2].T === 300);
    }
  }

  // T14 choking: a consumer far below the choke pressure; the outlet Mach stops at 1/√k, the flow at the critical one,
  // and a lower pressure downstream does not increase it (R-24)
  {
    const mk = (Pb) => gasModel([[1, 'reservoir', { surfP: q(5, 'bar(a)'), liquidElev: q(0, 'm') }], [2, 'pressure', { P: q(Pb, 'bar(a)'), ptype: 'static' }]], [[1, 1, 2, 30, 40]], { fluidGas: Object.assign({}, customAir) });
    const r1 = solve(mk(0.5)), r2 = solve(mk(0.2));
    ok('T14 choked pipe detected and warned', r1.ok && r1.pipes[1].choked && r1.warnings.some((w) => w.level === 'critical' && w.obj === 'p:1'));
    if (r1.ok) ok('T14 outlet Mach at the isothermal limit 1/√k', near(r1.pipes[1].Mout, 1 / Math.sqrt(1.4), 1e-6), `M=${r1.pipes[1].Mout.toFixed(6)}`);
    if (r1.ok && r2.ok) ok('T14 the flow does not exceed the critical one', near(r1.pipes[1].m, r2.pipes[1].m, 1e-6), `${r1.pipes[1].m.toFixed(5)} = ${r2.pipes[1].m.toFixed(5)} kg/s`);
    // the critical flux of the closed form, independently: the largest G for which h(P*) ≥ 0, with the isentropic
    // entrance from the vessel (inlet Mach found by bisection on the subsonic branch)
    if (r1.ok) {
      const ZRT = Ru / 28.9647 * 300, k = 1.4, e = k / (k - 1), D = 0.04, L = 30, Ml = 1 / Math.sqrt(k);
      const fOf = (Gf) => H.frictionFactor(Gf * D / 1.8e-5, 0.046e-3 / D, 2300, 4000);
      const chi = (Mx) => Mx * Math.pow(1 + (k - 1) / 2 * Mx * Mx, -e);
      const feasible = (Gf) => {
        const tau = Gf * Math.sqrt(ZRT / k) / 5e5;
        if (tau >= chi(Ml)) return false;
        let a = 0, b = Ml;
        for (let i = 0; i < 100; i++) { const c = (a + b) / 2; if (chi(c) < tau) a = c; else b = c; }
        const P1 = 5e5 * Math.pow(1 + (k - 1) / 2 * a * a, -e), Ps = Gf * Math.sqrt(ZRT);
        return P1 > Ps && P1 * P1 - Ps * Ps - Ps * Ps * (fOf(Gf) * L / D + 2 * Math.log(P1 / Ps)) >= 0;
      };
      let lo = 1, hi = 5000;
      for (let i = 0; i < 200; i++) { const Gf = (lo + hi) / 2; if (feasible(Gf)) lo = Gf; else hi = Gf; }
      const mc = (lo + hi) / 2 * Math.PI * D * D / 4;
      ok('T14 critical flow = independent closed form', near(r1.pipes[1].m, mc, 1e-6), `${r1.pipes[1].m.toFixed(6)} × ${mc.toFixed(6)} kg/s`);
    }
  }

  // T15 one pipe between two static pressures, with a given friction factor, equals isoGfromP (R-31)
  {
    const m = gasModel([[1, 'pressure', { P: q(7, 'bar(a)'), ptype: 'static' }], [2, 'pressure', { P: q(4, 'bar(a)'), ptype: 'static' }]],
      [[1, 1, 2, 150, 100, (p) => { p.friction = { model: 'explicitF', f: 0.02, eps: q(0.046, 'mm'), rel: 0, C: 120 }; }]], { fluidGas: Object.assign({}, customAir) });
    const r = solve(m);
    const ar2 = { MW: 28.9647, k: 1.4, Z: 1, mu: 1.8e-5 };
    const Gx = G.isoGfromP(ar2, 7e5, 4e5, 150, 0.1, 0.02, 300) * Math.PI * 0.01 / 4;
    ok('T15 single pipe = isothermal closed form', r.ok && near(r.pipes[1].m, Gx, 1e-9), r.ok ? `${r.pipes[1].m.toFixed(6)} × ${Gx.toFixed(6)} kg/s` : r.errors.join('; '));
  }

  // T16 regime fields: old models open as incompressible, a gas written as the active fluid (§8.1) becomes the gas of
  // the model, unknown values go back to the defaults, and a change of regime loses nothing (R-02, R-03, §8.5)
  {
    const old = M.newModel();
    delete old.system.regime; delete old.system.gasMode; delete old.system.fluidGas;
    M.normalizeRegime(old);
    ok('T16 an old model opens as incompressible', old.system.regime === 'incompressible' && old.system.gasMode === 'isothermal' && old.system.fluidGas.gas === 'air');
    const spec = M.newModel();
    delete spec.system.regime;
    spec.system.fluid = { kind: 'gas', name: 'Air', MW: 28.9647, k: 1.4, Z: 1, mu: 1.8e-5, T: 300 };
    M.normalizeRegime(spec);
    const g = spec.system.fluidGas;
    ok('T16 a gas in the layout of §8.1 becomes the gas of the model', spec.system.regime === 'compressible' && g.gas === 'custom' && g.MW === 28.9647 && g.mu.value === 1.8e-5 && g.mu.unit === 'Pa·s' && g.T.unit === 'K' && spec.system.fluid.kind === 'water');
    const bad = M.newModel();
    Object.assign(bad.system, { regime: 'gaseous', gasMode: 'polytropic' });
    M.normalizeRegime(bad);
    ok('T16 unknown values go back to the defaults', bad.system.regime === 'incompressible' && bad.system.gasMode === 'isothermal');
    // the Portuguese names of the specification, held by models saved before 19 October 2026, read as the English ones
    const legacy = PumpIt.examples.get('air').build();
    Object.assign(legacy.system, { regime: 'compressivel', gasMode: 'isotermico' });
    const child = legacy.scenarios.list.find((s) => 'sys|gasMode' in s.overrides);
    child.overrides['sys|gasMode'] = 'adiabatico';
    M.normalizeRegime(legacy);
    ok('T16 the old names of the values open as the English ones', legacy.system.regime === 'compressible' && legacy.system.gasMode === 'isothermal' && child.overrides['sys|gasMode'] === 'adiabatic');
    const m = PumpIt.examples.get('air').build();
    const before = JSON.stringify(m.system);
    m.system.regime = 'incompressible';
    const ri = S.run(M.effective(m, 'base'));
    m.system.regime = 'compressible';
    ok('T16 switching the regime erases nothing', JSON.stringify(m.system) === before && ri.ok && !ri.regime, ri.ok ? 'liquid solved' : ri.errors.join('; '));
  }

  // T17 gas library and checklist (R-10, R-11)
  {
    const sys = M.newModel().system;
    sys.fluidGas = Object.assign(M.newGasFluid(), { gas: 'air', T: q(300, 'K') });
    const fl = PumpIt.fluids.evaluateGas(sys);
    const muS = 1.716e-5 * Math.pow(300 / 273.15, 1.5) * (273.15 + 110.4) / (300 + 110.4);
    ok('T17 air of the library: MW, k and μ by Sutherland', fl.MW === 28.9647 && fl.k === 1.4 && near(fl.mu, muS, 1e-12), `μ=${fl.mu.toExponential(4)} Pa·s`);
    ok('T17 normal density of air ≈ 1.2923 kg/m³', near(PumpIt.fluids.normalDensity(28.9647), 1.2923, 1e-4));
    const m = PumpIt.examples.get('air').build();
    m.system.fluidGas = Object.assign({}, customAir, { k: 1 });
    const v = M.validate(M.effective(m, 'base'));
    ok('T17 a custom gas with k ≤ 1 stays pending in the checklist', !v.ok && v.items.some((i) => !i.ok && /k/.test(i.detail || '')));
  }

  // T18 low speed and small drop: the compressible flow is the incompressible one with the mean density (P6)
  {
    const mk = (regime) => gasModel([[1, 'reservoir', { surfP: q(10, 'bar(a)'), liquidElev: q(0, 'm') }], [2, 'pressure', { P: q(9.99, 'bar(a)') }]], [[1, 1, 2, 100, 100]],
      { regime, fluidGas: Object.assign({}, customAir) });
    const rg = solve(mk('compressible'));
    const mi = mk('incompressible');
    mi.system.fluid = { kind: 'user', name: 'air', rho: q(9.995e5 * 28.9647 / (Ru * 300), 'kg/m³'), mu: q(1.8e-5, 'Pa·s'), pv: q(null, 'Pa(a)') };
    const ri = solve(mi);
    ok('T18 low speed: compressible ≈ incompressible', rg.ok && ri.ok && near(rg.pipes[1].m, ri.pipes[1].m, 1e-4), rg.ok && ri.ok ? `${rg.pipes[1].m.toPrecision(7)} × ${ri.pipes[1].m.toPrecision(7)} kg/s, M=${rg.pipes[1].Mout.toFixed(4)}` : '');
  }

  // T19 valves, orifices and nozzles: a K valve is the closed form with f·L/D = 0 and F = K; the K of Cv equals the
  // liquid relation; a restriction orifice and a nozzle choke at the critical flow of their holes
  {
    const k = 1.4, ZRT = Ru / 28.9647 * 300, ar3 = { MW: 28.9647, k, Z: 1, mu: 1.8e-5 };
    // 5 bar(a) → pipe (f·L/D = 0,4) → valve K = 20 → pipe (0,4) → 4,5 bar(a), static nodes: in series by the closed
    // form, the valve being a length of f·L/D = K
    const fx = (p) => { p.friction = { model: 'explicitF', f: 0.02, eps: q(0, 'mm'), rel: 0, C: 120 }; };
    const mv = gasModel([[1, 'pressure', { P: q(5, 'bar(a)'), ptype: 'static' }], [2, 'valve', { lossModel: 'K', K: 20 }], [3, 'pressure', { P: q(4.5, 'bar(a)'), ptype: 'static' }]],
      [[1, 1, 2, 1, 50, fx], [2, 2, 3, 1, 50, fx]], { fluidGas: Object.assign({}, customAir) });
    const rv = solve(mv);
    let glo = 1, ghi = 500;
    const chain = (Gf) => G.isoP2fromG(ar3, G.isoP2fromG(ar3, G.isoP2fromG(ar3, 5e5, Gf, 1, 0.05, 0.02, 300), Gf, 20, 1, 1, 300), Gf, 1, 0.05, 0.02, 300);
    for (let i = 0; i < 200; i++) { const Gf = (glo + ghi) / 2; if (chain(Gf) > 4.5e5) glo = Gf; else ghi = Gf; }
    const mk = (glo + ghi) / 2 * Math.PI * 0.05 * 0.05 / 4;
    ok('T19 K valve = closed form with f·L/D = K', rv.ok && near(rv.pipes[1].m, mk, 1e-7), rv.ok ? `${rv.pipes[1].m.toFixed(6)} × ${mk.toFixed(6)} kg/s` : rv.errors.join('; '));
    const A = Math.PI * 0.05 * 0.05 / 4;
    const Kcv = PumpIt.junctionTypes.shared.gasValveK({ lossModel: 'Cv', Cv: 60 }, 0, A);
    const GAL = 3.785411784e-3 / 60, PSI = 6894.757293168, V = 3, rho = 999;
    const dPcv = (rho / 999) * Math.pow(V * A / GAL / 60, 2) * PSI;
    ok('T19 K of the Cv = liquid relation (Cv 60 in 2")', near(Kcv * rho * V * V / 2, dPcv, 1e-12), `K=${Kcv.toFixed(4)}`);
    // nozzle to the atmosphere from 4 bar(a): choked, m = Cd·A·P0·√(k/(ZRT0))·(2/(k+1))^((k+1)/(2(k−1)))
    const mn = gasModel([[1, 'reservoir', { surfP: q(4, 'bar(a)'), liquidElev: q(0, 'm') }], [2, 'spray', { sprayModel: 'CdA', Cd: 0.8, dHole: q(6, 'mm'), nHoles: 1, Pext: q(1, 'bar(a)') }]],
      [[1, 1, 2, 2, 50]], { fluidGas: Object.assign({}, customAir) });
    const rn = solve(mn);
    if (rn.ok) {
      const P0 = rn.junctions[2].Pin, CdA = 0.8 * Math.PI * 0.006 * 0.006 / 4;
      const mc = CdA * P0 * Math.sqrt(k / ZRT) * Math.pow(2 / (k + 1), (k + 1) / (2 * (k - 1)));
      ok('T19 choked nozzle: isentropic critical flow', rn.junctions[2].choked && near(rn.junctions[2].m, mc, 1e-9), `${rn.junctions[2].m.toFixed(6)} × ${mc.toFixed(6)} kg/s`);
    } else ok('T19 choked nozzle: isentropic critical flow', false, rn.errors.join('; '));
    // restriction orifice of 10 mm in a 50 mm line, 6 → 1 bar(a): choked at the hole (Cc 0.61 for a sharp edge)
    const mo = gasModel([[1, 'reservoir', { surfP: q(6, 'bar(a)'), liquidElev: q(0, 'm') }], [2, 'orifice', { orModel: 'sharp', dO: q(10, 'mm') }], [3, 'pressure', { P: q(1, 'bar(a)'), ptype: 'static' }]],
      [[1, 1, 2, 5, 50], [2, 2, 3, 5, 50]], { fluidGas: Object.assign({}, customAir) });
    const ro = solve(mo);
    if (ro.ok) {
      const j = ro.junctions[2];
      const mc = 0.61 * Math.PI * 0.01 * 0.01 / 4 * j.P0in * Math.sqrt(k / (ZRT * (j.T0in / 300))) * Math.pow(2 / (k + 1), (k + 1) / (2 * (k - 1)));
      ok('T19 restriction orifice chokes at the hole', j.choked && near(j.m, mc, 1e-6), `${j.m.toFixed(6)} × ${mc.toFixed(6)} kg/s`);
    } else ok('T19 restriction orifice chokes at the hole', false, ro.errors.join('; '));
  }

  // T20 a pressure-reducing valve keeps its set pressure downstream (static basis), and a flow control valve its flow
  {
    const m = gasModel([
      [1, 'reservoir', { surfP: q(8, 'bar(g)'), liquidElev: q(0, 'm') }], [2, 'control', { ctype: 'PRV', setP: q(3, 'bar(g)'), basis: 'static', kOpen: 1 }],
      [3, 'branch', {}], [4, 'pressure', { P: q(1, 'bar(g)'), ptype: 'static' }], [5, 'control', { ctype: 'FCV', setQ: q(500, 'kg/h'), kOpen: 1 }], [6, 'pressure', { P: q(0, 'bar(g)'), ptype: 'static' }],
    ], [[1, 1, 2, 50, 50], [2, 2, 3, 50, 50], [3, 3, 4, 100, 25], [4, 3, 5, 20, 40], [5, 5, 6, 20, 40]], { fluidGas: Object.assign({}, customAir) });
    const r = solve(m);
    ok('T20 reducing valve keeps the static pressure downstream', r.ok && near(r.pipes[2].Pin - r.patm, 3e5, 1e-9), r.ok ? `${((r.pipes[2].Pin - r.patm) / 1e5).toFixed(6)} bar(g), ${r.valves[2].state}` : r.errors.join('; '));
    ok('T20 flow control valve sets 500 kg/h', r.ok && near(r.valves[5].m * 3600, 500, 1e-12) && near(r.pipes[5].m * 3600, 500, 1e-9), r.ok ? `${(r.pipes[5].m * 3600).toFixed(9)} kg/h, ${r.valves[5].state}` : '');
  }

  // T21 the advice of §5: a gas-light fluid in the incompressible mode that is fast or loses much pressure, and a gas
  // in the compressible mode that is slow with small drops
  {
    const m = PumpIt.examples.get('air').build();
    m.system.regime = 'incompressible';
    m.system.fluid = { kind: 'user', name: 'air', rho: q(4.2, 'kg/m³'), mu: q(0.0185, 'cP'), pv: q(null, 'Pa(a)') };
    const ri = solve(m);
    ok('T21 incompressible with a fast gas: suggests the compressible mode', ri.ok && ri.warnings.some((w) => w.level === 'caution' && /P1/.test(w.text) && /Mach 0[.,]3/.test(w.text)));
    const ms = PumpIt.examples.get('air').build();
    ms.junctions[2].P = q(4.99, 'bar(g)'); ms.junctions[3].P = q(4.995, 'bar(g)');
    const rs = solve(ms);
    ok('T21 slow compressible: says the incompressible mode would give the same', rs.ok && rs.warnings.length === 1 && rs.warnings[0].level === 'info');
    const rf = solve(PumpIt.examples.get('air').build());
    ok('T21 example D does not get that information', rf.ok && !rf.warnings.some((w) => w.level === 'info'));
  }

  // T22 a flow given as a normal volume (Nm³/h at 0 °C and 101.325 kPa) is a mass flow of ρN·Q (§8.4)
  {
    const m = gasModel([[1, 'reservoir', { surfP: q(6, 'bar(g)'), liquidElev: q(0, 'm') }], [2, 'flow', { Q: q(500, 'Nm³/h'), dir: 'out' }]], [[1, 1, 2, 100, 50]],
      { fluidGas: Object.assign({}, customAir) });
    const r = solve(m);
    const rhoN = 101325 * 28.9647 / (Ru * 273.15);
    ok('T22 normal flow converted to mass', r.ok && near(r.pipes[1].m, 500 / 3600 * rhoN, 1e-9) && near(r.pipes[1].QN * 3600, 500, 1e-9), r.ok ? `${(r.pipes[1].m * 3600).toFixed(4)} kg/h` : r.errors.join('; '));
    const U = PumpIt.units;
    ok('T22 normal units: Nm³/h ↔ kg/s with the normal density', near(U.toSI(500, 'Nm³/h', 'flow', { rhoN }), 500 / 3600 * rhoN, 1e-12) && near(U.fromSI(500 / 3600 * rhoN, 'Nm³/h', 'flow', { rhoN }), 500, 1e-12));
  }

  // ---------------------------------------------------------------- adiabatic model (phase 3)
  const adiab = { gasMode: 'adiabatic', fluidGas: Object.assign({}, customAir) };
  const fx = (f) => (p) => { p.friction = { model: 'explicitF', f, eps: q(0, 'mm'), rel: 0, C: 120 }; };
  const k = 1.4, e = k / (k - 1), ZR = Ru / 28.9647;
  const fac = (Mx) => 1 + (k - 1) / 2 * Mx * Mx;
  // T23 one pipe from a vessel (P0, T0) to a static pressure equals exact Fanno flow with an isentropic entrance
  {
    const P0 = 5e5, T0 = 300, L = 30, D = 0.04, f = 0.02, P2set = 3e5;
    const m = gasModel([[1, 'reservoir', { surfP: q(5, 'bar(a)'), liquidElev: q(0, 'm') }], [2, 'pressure', { P: q(3, 'bar(a)'), ptype: 'static' }]], [[1, 1, 2, L, D * 1000, fx(f)]], adiab);
    const r = solve(m);
    const ar4 = { MW: 28.9647, k, Z: 1, mu: 1.8e-5 };
    const P2of = (M1) => {
      const P1 = P0 * Math.pow(fac(M1), -e);
      const target = G.fannoFLD(ar4, M1) - f * L / D;
      let lo = M1, hi = 1;
      for (let i = 0; i < 200; i++) { const mm = (lo + hi) / 2; if (G.fannoFLD(ar4, mm) > target) lo = mm; else hi = mm; }
      return P1 * G.fannoP(ar4, (lo + hi) / 2) / G.fannoP(ar4, M1);
    };
    let lo = 1e-4, hi = 0.99;
    for (let i = 0; i < 200; i++) { const mm = (lo + hi) / 2; if (G.fannoFLD(ar4, mm) - f * L / D < 0) hi = mm; else lo = mm; }
    let a = 1e-4, b = lo;
    for (let i = 0; i < 200; i++) { const mm = (a + b) / 2; if (P2of(mm) > P2set) a = mm; else b = mm; }
    const M1 = (a + b) / 2, Gx = P0 * Math.sqrt(k / (ZR * T0)) * M1 * Math.pow(fac(M1), -(k + 1) / (2 * (k - 1)));
    const mx = Gx * Math.PI * D * D / 4;
    ok('T23 adiabatic, single pipe: flow = exact Fanno with an isentropic entrance', r.ok && near(r.pipes[1].m, mx, 2e-4), r.ok ? `${r.pipes[1].m.toFixed(6)} × ${mx.toFixed(6)} kg/s` : r.errors.join('; '));
    if (r.ok) {
      const p = r.pipes[1];
      ok('T23 T0 kept in the pipe and the outlet static T = T0/(1+(k−1)/2·M²)', near(p.T0out, T0, 1e-6) && near(p.Tout, T0 / fac(p.Mout), 1e-9), `T0 out ${p.T0out.toFixed(4)} K, T out ${p.Tout.toFixed(3)} K, M ${p.Mout.toFixed(4)}`);
    }
  }

  // T24 a series of pipes: the same mass flow in all, T0 of the source at every junction, the static T falling as the
  // gas speeds up
  {
    const m = gasModel([[1, 'reservoir', { surfP: q(6, 'bar(a)'), liquidElev: q(0, 'm') }], [2, 'branch', {}], [3, 'branch', {}], [4, 'pressure', { P: q(2, 'bar(a)'), ptype: 'static' }]],
      [[1, 1, 2, 100, 50], [2, 2, 3, 100, 50], [3, 3, 4, 100, 50]], adiab);
    const r = solve(m);
    ok('T24 adiabatic series converges', r.ok && r.converged, r.ok ? `${r.iterations} iterations` : r.errors.join('; '));
    if (r.ok) {
      ok('T24 the same mass flow in the three pipes (R-40: 1e-8)', near(r.pipes[2].m, r.pipes[1].m, 1e-8) && near(r.pipes[3].m, r.pipes[1].m, 1e-8));
      ok('T24 T0 of the source at every junction', [2, 3].every((id) => near(r.junctions[id].T0, 300, 1e-9)), `T0 = ${r.junctions[2].T0.toFixed(6)}, ${r.junctions[3].T0.toFixed(6)} K`);
      ok('T24 the static T falls along the series', r.pipes[1].Tout > r.pipes[2].Tout && r.pipes[2].Tout > r.pipes[3].Tout && r.pipes[3].Tout < 300, `${r.pipes[1].Tout.toFixed(2)} > ${r.pipes[2].Tout.toFixed(2)} > ${r.pipes[3].Tout.toFixed(2)} K`);
    }
  }

  // T25 two sources at different temperatures meet at a node: its T0 is the mass-weighted mix (§10.3), and the energy
  // that leaves equals the energy that enters
  {
    const m = gasModel([
      [1, 'reservoir', { surfP: q(6, 'bar(a)'), liquidElev: q(0, 'm'), gasT: q(350, 'K') }], [2, 'reservoir', { surfP: q(5.5, 'bar(a)'), liquidElev: q(0, 'm'), gasT: q(280, 'K') }],
      [3, 'branch', {}], [4, 'pressure', { P: q(2, 'bar(a)'), ptype: 'static' }],
    ], [[1, 1, 3, 80, 50], [2, 2, 3, 60, 50], [3, 3, 4, 120, 65]], adiab);
    const r = solve(m);
    ok('T25 mixing converges', r.ok && r.converged, r.ok ? `${r.iterations} iterations` : r.errors.join('; '));
    if (r.ok) {
      const m1 = r.pipes[1].m, m2 = r.pipes[2].m, Tmix = (m1 * 350 + m2 * 280) / (m1 + m2);
      ok('T25 T0 of the node = mass-weighted mix', near(r.junctions[3].T0, Tmix, 1e-6), `${r.junctions[3].T0.toFixed(4)} × ${Tmix.toFixed(4)} K (ṁ ${m1.toFixed(4)} + ${m2.toFixed(4)} kg/s)`);
      ok('T25 the outlet pipe carries that T0 to its end', near(r.pipes[3].T0out, Tmix, 1e-6) && near(r.pipes[3].m, m1 + m2, 1e-9));
      ok('T25 each source delivers its own T0', near(r.pipes[1].T0in, 350, 1e-9) && near(r.pipes[2].T0in, 280, 1e-9));
    }
  }

  // T26 adiabatic choking: the outlet Mach stops at 1, the flow at the critical one
  {
    const mk = (Pb) => gasModel([[1, 'reservoir', { surfP: q(5, 'bar(a)'), liquidElev: q(0, 'm') }], [2, 'pressure', { P: q(Pb, 'bar(a)'), ptype: 'static' }]], [[1, 1, 2, 30, 40, fx(0.02)]], adiab);
    const r1 = solve(mk(0.5)), r2 = solve(mk(0.2));
    ok('T26 adiabatic choking: outlet Mach 1', r1.ok && r1.pipes[1].choked && near(r1.pipes[1].Mout, 1, 1e-4), r1.ok ? `M=${r1.pipes[1].Mout.toFixed(6)}` : r1.errors.join('; '));
    ok('T26 the flow does not exceed the critical one', r1.ok && r2.ok && near(r1.pipes[1].m, r2.pipes[1].m, 1e-6), r1.ok && r2.ok ? `${r1.pipes[1].m.toFixed(5)} = ${r2.pipes[1].m.toFixed(5)} kg/s` : '');
    // the critical flux of exact Fanno with the isentropic entrance: fannoFLD(M1) = f·L/D
    let lo = 1e-4, hi = 1;
    for (let i = 0; i < 200; i++) { const mm = (lo + hi) / 2; if (G.fannoFLD({ MW: 28.9647, k, Z: 1, mu: 1.8e-5 }, mm) > 0.02 * 30 / 0.04) lo = mm; else hi = mm; }
    const M1 = (lo + hi) / 2, mc = 5e5 * Math.sqrt(k / (ZR * 300)) * M1 * Math.pow(fac(M1), -(k + 1) / (2 * (k - 1))) * Math.PI * 0.04 * 0.04 / 4;
    ok('T26 critical flow = exact Fanno', r1.ok && near(r1.pipes[1].m, mc, 1e-4), r1.ok ? `${r1.pipes[1].m.toFixed(6)} × ${mc.toFixed(6)} kg/s` : '');
  }

  // T27 the example in both thermal models: at low Mach the two agree closely, the adiabatic gas is cooler where it is fast
  {
    const mi = PumpIt.examples.get('air').build();
    const ma = PumpIt.examples.get('air').build();
    ma.system.gasMode = 'adiabatic';
    const ri = solve(mi), ra = solve(ma);
    ok('T27 example D in both thermal models', ri.ok && ra.ok && near(ra.pipes[1].m, ri.pipes[1].m, 1e-2) && ra.pipes[3].Tout < 300 && near(ri.pipes[3].Tout, 300, 1e-12),
      ri.ok && ra.ok ? `ṁ1 iso ${ri.pipes[1].m.toFixed(4)} × adiab ${ra.pipes[1].m.toFixed(4)} kg/s; outlet T of P3 adiab ${ra.pipes[3].Tout.toFixed(2)} K` : '');
  }

  // T28 compressor (§10.5): fixed ratio, curve, flow and discharge control; heating of the gas in the adiabatic model
  {
    const curve = { x: [0, 1000, 2000, 3000], y: [20000, 19000, 16000, 11000], xUnit: 'm³/h', yUnit: 'm', fit: '2' };
    const mk = (mode, pump) => gasModel([[1, 'reservoir', { surfP: q(1, 'bar(a)'), liquidElev: q(0, 'm') }], [2, 'pump', pump], [3, 'pressure', { P: q(2.5, 'bar(a)'), ptype: 'static' }]],
      [[1, 1, 2, 20, 150], [2, 2, 3, 200, 100]], { gasMode: mode, fluidGas: Object.assign({}, customAir) });
    const ra = solve(mk('adiabatic', { mode: 'ratio', ratio: 3, etaGas: 75 }));
    ok('T28 fixed-ratio compressor: P0 out = 3·P0 in', ra.ok && near(ra.junctions[2].P0out / ra.junctions[2].P0in, 3, 1e-9), ra.ok ? `r = ${(ra.junctions[2].P0out / ra.junctions[2].P0in).toFixed(9)}` : ra.errors.join('; '));
    if (ra.ok) {
      const T0in = ra.pumps[2].T0in, T0out = T0in * Math.pow(3, (k - 1) / (k * 0.75));
      ok('T28 polytropic heating T0·r^((k−1)/(k·η)) carried by the next pipe', near(ra.pumps[2].T0out, T0out, 1e-9) && near(ra.pipes[2].T0in, T0out, 1e-6), `${ra.pumps[2].T0out.toFixed(3)} K`);
      ok('T28 power to the gas = ṁ·cp·ΔT0', near(ra.pumps[2].Pgas, ra.pumps[2].m * (k * ZR / (k - 1)) * (T0out - T0in), 1e-9), `${(ra.pumps[2].Pgas / 1e3).toFixed(3)} kW`);
    }
    const rc = solve(mk('isothermal', { mode: 'curve', curve }));
    if (rc.ok) {
      const pr = rc.pumps[2];
      const a2 = H.polyfit([0, 1000, 2000, 3000].map((v) => v / 3600), [20000, 19000, 16000, 11000], 2);
      ok('T28 curve: the isentropic head at the point = the curve at the suction flow', near(pr.dHs, H.polyval(a2, pr.Q), 1e-7), `${pr.dHs.toFixed(2)} × ${H.polyval(a2, pr.Q).toFixed(2)} m`);
    } else ok('T28 curve: the isentropic head at the point = the curve at the suction flow', false, rc.errors.join('; '));
    const rf = solve(mk('isothermal', { mode: 'fixedFlow', fixedFlow: q(1500, 'Nm³/h') }));
    ok('T28 fixed flow in Nm³/h', rf.ok && near(rf.pumps[2].m, 1500 / 3600 * 101325 * 28.9647 / (Ru * 273.15), 1e-9));
    const rd = solve(mk('adiabatic', { mode: 'controlDischarge', setP: q(3, 'bar(a)'), curve }));
    ok('T28 discharge control: static P = 3 bar(a) and the speed the curve asks for', rd.ok && near(rd.pipes[2].Pin, 3e5, 1e-9) && rd.pumps[2].speed > 50 && rd.pumps[2].speed < 100,
      rd.ok ? `P = ${(rd.pipes[2].Pin / 1e5).toFixed(6)} bar(a), speed ${rd.pumps[2].speed.toFixed(2)} %` : rd.errors.join('; '));
  }

  // T29 gauge and absolute pressures (R-13): the example is in gauge pressures; a gauge value is the absolute one less
  // the atmospheric pressure of the model, whatever that is; a pressure at or below vacuum, and an atmospheric pressure
  // that is not above zero, stay pending in the checklist of a gas, and a liquid is not affected
  {
    const tr = PumpIt.i18n.t;
    const ex = () => PumpIt.examples.get('air').build();
    const e0 = ex();
    ok('T29 example D in gauge pressures: 5, 2.5 and 2 bar(g)', [e0.junctions[0].surfP, e0.junctions[2].P, e0.junctions[3].P].map((x) => x.value + ' ' + x.unit).join(', ') === '5 bar(g), 2.5 bar(g), 2 bar(g)');
    // the same line typed in gauge and in absolute pressures, at sea level and at about 1400 m
    const typed = (unit, add, patm) => {
      const m = ex();
      m.system.patm = q(patm, 'bar(a)');
      m.junctions[0].surfP = q(5 + add, unit); m.junctions[2].P = q(2.5 + add, unit); m.junctions[3].P = q(2 + add, unit);
      return m;
    };
    for (const patm of [1.01325, 0.85]) {
      const rg = solve(typed('bar(g)', 0, patm)), ra = solve(typed('bar(a)', patm, patm));
      ok(`T29 gauge = absolute − atmospheric (${patm} bar(a))`, rg.ok && ra.ok && near(rg.pipes[1].m, ra.pipes[1].m, 1e-9) && near(rg.junctions[2].Pin, ra.junctions[2].Pin, 1e-9) && near(rg.patm, patm * 1e5, 1e-12),
        rg.ok && ra.ok ? `ṁ1 ${rg.pipes[1].m.toFixed(6)} × ${ra.pipes[1].m.toFixed(6)} kg/s` : '');
    }
    const vac = (key) => tr('core.checklist.junction.vacuum', { what: tr(key) });
    const pending = (v, id, key) => (v.undef.get('j:' + id) || []).includes(vac(key));
    const below = ex();
    below.junctions[0].surfP = q(-1.5, 'bar(g)');            // −0.49 bar(a)
    below.junctions[2].P = q(0, 'bar(a)');                   // vacuum
    below.junctions[3].P = q(-0.5, 'bar(g)');                // 0.51 bar(a): a vacuum line, which a gas allows
    const vb = M.validate(M.effective(below, 'base'));
    ok('T29 a vessel and a consumer at or below vacuum stay pending, with the field named', !vb.ok && pending(vb, 1, 'junctions.reservoir.check.gasP') && pending(vb, 3, 'junctions.pressure.check.P') && !vb.undef.has('j:4'),
      JSON.stringify([...vb.undef]));
    below.system.regime = 'incompressible';
    ok('T29 a liquid is not checked', M.validate(M.effective(below, 'base')).ok);
    const dev = gasModel([
      [1, 'reservoir', { surfP: q(8, 'bar(g)'), liquidElev: q(0, 'm') }], [2, 'control', { ctype: 'PRV', setP: q(-1.2, 'bar(g)'), basis: 'static', kOpen: 1 }],
      [3, 'branch', {}], [4, 'exitvalve', { Pout: q(-1.1, 'bar(g)') }], [5, 'spray', { sprayModel: 'CdA', Cd: 0.8, dHole: q(6, 'mm'), nHoles: 1, Pext: q(0, 'bar(a)') }],
      [6, 'pump', { mode: 'controlDischarge', setP: q(-2, 'bar(g)') }], [7, 'pressure', { P: q(1, 'bar(g)'), ptype: 'static' }],
    ], [[1, 1, 2, 10, 50], [2, 2, 3, 10, 50], [3, 3, 4, 10, 50], [4, 3, 5, 10, 50], [5, 3, 6, 10, 50], [6, 6, 7, 10, 50]], { fluidGas: Object.assign({}, customAir) });
    const vd = M.validate(M.effective(dev, 'base'));
    ok('T29 set and outside pressures at or below vacuum stay pending: reducing valve, exit valve, nozzle, compressor',
      pending(vd, 2, 'junctions.control.check.setP') && pending(vd, 4, 'junctions.exitvalve.check.Pout') && pending(vd, 5, 'junctions.spray.check.Pext') && pending(vd, 6, 'junctions.pump.check.setP')
      && !vd.undef.has('j:1') && !vd.undef.has('j:7'), JSON.stringify([...vd.undef]));
    const thin = ex();
    thin.system.patm = q(0, 'bar(a)');
    const vs = M.validate(M.effective(thin, 'base'));
    ok('T29 an atmospheric pressure of zero stays pending for a gas', !vs.ok && vs.items.find((i) => i.key === 'sys').detail.includes(tr('core.checklist.gas.patm')));
  }
}

console.log(fails ? `\n${fails} failed` : '\nAll tests passed.');
process.exit(fails ? 1 : 0);
