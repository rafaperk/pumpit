// Verification suite of the calculation core. Usage: node tests/run-tests.js
// Each case compares the network solver with an independent solution (analytical or by bisection).
const { loadCore } = require('./load-core');

const PumpIt = loadCore('en'); // some checks read texts of the results (valve states, warnings)
const { model: M, solver: S, hyd: H, units: U, fluids: F } = PumpIt;
const q = M.q;

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log('  ok   ' + name + (detail ? '  ' + detail : '')); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  ' + detail : '')); }
}
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const bisect = (f, a, b) => { let fa = f(a); for (let i = 0; i < 200; i++) { const m = (a + b) / 2, fm = f(m); if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; };

function solveOk(m, sid = 'base') {
  const eff = M.effective(m, sid);
  const v = M.validate(eff);
  if (!v.ok) throw new Error('Invalid model: ' + JSON.stringify([...v.undef]));
  const r = S.run(eff);
  if (!r.ok) throw new Error('Failed: ' + r.errors.join('; '));
  return r;
}

console.log('\nProperties and correlations');
{
  check('water ρ at 20 °C (Kell) ≈ 998.21 kg/m³', rel(F.waterDensity(20), 998.21) < 2e-4, F.waterDensity(20).toFixed(3));
  check('water μ at 20 °C (Vogel) ≈ 1.002 mPa·s', rel(F.waterViscosity(20), 1.0016e-3) < 5e-3, (F.waterViscosity(20) * 1e3).toFixed(4));
  check('Psat at 100 °C (IF97) = 101.418 kPa', rel(F.waterVaporPressure(100), 101418) < 1e-4, F.waterVaporPressure(100).toFixed(1));
  check('Psat at 20 °C (IF97) ≈ 2.339 kPa', rel(F.waterVaporPressure(20), 2339.2) < 1e-3, F.waterVaporPressure(20).toFixed(1));
  // original form of Colebrook: direct check of the implicit equation
  const f = H.colebrook(1e5, 1e-4);
  const resid = 1 / Math.sqrt(f) - (1.14 - 2 * Math.log10(1e-4 + 9.35 / (1e5 * Math.sqrt(f))));
  check('Colebrook (1.14 / 9.35) satisfies the equation', Math.abs(resid) < 1e-12, 'f = ' + f.toFixed(6));
  check('Crane f_T, 2" sch 40 ≈ 0.019', Math.abs(H.craneFT(0.0525) - 0.019) < 0.0006, H.craneFT(0.0525).toFixed(4));
  check('Continuous transition at Re = 4000', rel(H.frictionFactor(4000, 1e-4), H.frictionFactor(4000.0001, 1e-4)) < 1e-6);
  check('Conversion gpm → m³/s', rel(U.toSI(100, 'gpm', 'volFlow'), 6.30902e-3) < 1e-5);
  check('Conversion bar(g) → absolute Pa', U.toSI(1, 'bar(g)', 'pressure', { patm: 101325 }) === 201325);
  check('Conversion °F → K', rel(U.toSI(212, '°F', 'temperature'), 373.15) < 1e-12);
  const c = H.polyfit([0, 1, 2, 3], [5, 3, -3, -13], 2);
  check('Exact polynomial fit (5 − 2x²)', Math.abs(c[0] - 5) < 1e-9 && Math.abs(c[1]) < 1e-9 && Math.abs(c[2] + 2) < 1e-9);
}

console.log('\nSingle pipe between reservoirs (Darcy + Colebrook)');
{
  const m = M.newModel();
  m.junctions.push(Object.assign(M.newJunction('reservoir', 1, 0, 0), { liquidElev: q(30, 'm'), elevation: q(0, 'm') }));
  m.junctions.push(Object.assign(M.newJunction('reservoir', 2, 100, 0), { liquidElev: q(10, 'm'), elevation: q(0, 'm') }));
  const p = M.newPipe(1, 1, 2);
  p.length = q(800, 'm'); p.geometry.d = q(150, 'mm'); p.friction.eps = q(0.05, 'mm');
  m.pipes.push(p);
  const r = solveOk(m);
  const fl = F.evaluate(m.system);
  const D = 0.15, L = 800, g = 9.80665, eps = 0.05e-3;
  const V = bisect((V) => { const Re = fl.rho * V * D / fl.mu; return H.frictionFactor(Re, eps / D) * L / D * V * V / 2 - g * 20; }, 0.01, 20);
  check('Velocity equals the analytical solution', rel(r.pipes[1].V, V) < 1e-7, `${r.pipes[1].V.toFixed(6)} × ${V.toFixed(6)} m/s`);
  check('Converged', r.converged, r.iterations + ' iterations');
  // entrance and exit losses are not automatic: P0 at the pipe end = tank P0 + ρg(z_surface − z_end)
  const P0exp = r.patm + fl.rho * g * 30;
  check('P0 at the upstream end = P_surface + ρg·h', rel(r.pipes[1].P0in, P0exp) < 1e-9);
}

console.log('\nReservoir connections by elevation and by depth');
{
  // two tanks and one pipe; r1 and r2 add to the tanks (surfaces at 30 m and 10 m, bottoms at 0 m)
  const build = (r1 = {}, r2 = {}) => {
    const m = M.newModel();
    m.junctions.push(Object.assign(M.newJunction('reservoir', 1, 0, 0), { liquidElev: q(30, 'm'), elevation: q(0, 'm') }, r1));
    m.junctions.push(Object.assign(M.newJunction('reservoir', 2, 100, 0), { liquidElev: q(10, 'm'), elevation: q(0, 'm') }, r2));
    const p = M.newPipe(1, 1, 2);
    p.length = q(800, 'm'); p.geometry.d = q(150, 'mm'); p.friction.eps = q(0.05, 'mm');
    m.pipes.push(p);
    return m;
  };
  const fl = F.evaluate(M.newModel().system);
  const g = 9.80665, D = 0.15, L = 800, eps = 0.05e-3;
  const P0at = (r, h) => r.patm + fl.rho * g * h; // stagnation pressure h metres under a surface at the atmospheric pressure
  const byElev = (z) => ({ pipeK: { 1: { kOut: 0, kIn: 0, elev: q(z, 'm') } } });
  const byDepth = (d, unit = 'm') => ({ connBy: 'depth', pipeK: { 1: { kOut: 0, kIn: 0, depth: q(d, unit) } } });
  const rE = solveOk(build(byElev(20))), rD = solveOk(build(byDepth(10)));
  check('A depth of 10 m under a surface at 30 m = an elevation of 20 m', rel(rD.pipes[1].m, rE.pipes[1].m) < 1e-12 && rel(rD.pipes[1].P0in, rE.pipes[1].P0in) < 1e-12);
  check('P0 at the connection = P_surface + ρg·depth', rel(rD.pipes[1].P0in, P0at(rD, 10)) < 1e-9);
  check('A depth in feet', rel(solveOk(build(byDepth(10 / 0.3048, 'ft'))).pipes[1].P0in, P0at(rD, 10)) < 1e-9);
  // the level 5 m higher: a depth goes with the surface, an elevation stays where it is
  const up = { liquidElev: q(35, 'm') };
  const rE2 = solveOk(build(Object.assign(byElev(20), up))), rD2 = solveOk(build(Object.assign(byDepth(10), up)));
  check('A higher level: the depth stays 10 m, the elevation 20 m', rel(rD2.pipes[1].P0in, P0at(rD2, 10)) < 1e-9 && rel(rE2.pipes[1].P0in, P0at(rE2, 15)) < 1e-9);
  // a blank cell is the bottom, and only the field of the reference in use counts
  const rB = solveOk(build({ connBy: 'depth', pipeK: { 1: { kOut: 0, kIn: 0, elev: q(20, 'm') } } }));
  check('By depth, a pipe without one connects at the bottom (its elevation is not used)', rel(rB.pipes[1].P0in, P0at(rB, 30)) < 1e-9);
  // a negative depth is above the surface: the pipe discharges in free fall, from 12 m
  const rF = solveOk(build({}, { connBy: 'depth', pipeK: { 1: { kOut: 0, kIn: 0, depth: q(-2, 'm') } } }));
  const V = bisect((V) => { const Re = fl.rho * V * D / fl.mu; return H.frictionFactor(Re, eps / D) * L / D * V * V / 2 - g * 18; }, 0.01, 20);
  check('A negative depth discharges in free fall above the surface', rel(rF.pipes[1].V, V) < 1e-7 && rel(rF.pipes[1].P0out, rF.patm) < 1e-9, `${rF.pipes[1].V.toFixed(6)} × ${V.toFixed(6)} m/s`);
  check('… as the same elevation does', rel(solveOk(build({}, byElev(12))).pipes[1].m, rF.pipes[1].m) < 1e-12);
}

console.log('\nHazen-Williams');
{
  const m = M.newModel();
  m.junctions.push(Object.assign(M.newJunction('reservoir', 1, 0, 0), { liquidElev: q(25, 'm') }));
  m.junctions.push(Object.assign(M.newJunction('reservoir', 2, 100, 0), { liquidElev: q(5, 'm') }));
  const p = M.newPipe(1, 1, 2);
  p.length = q(1000, 'm'); p.geometry.d = q(200, 'mm'); p.friction = { model: 'hw', C: 120 };
  m.pipes.push(p);
  const r = solveOk(m);
  // V = k·C·R^0.63·S^0.54 with S = Δz/L (ρ g h = ρ g0 h with standard gravity)
  const V = H.HW_K * 120 * Math.pow(0.05, 0.63) * Math.pow(20 / 1000, 0.54);
  check('Velocity = classic formula', rel(r.pipes[1].V, V) < 1e-7, `${r.pipes[1].V.toFixed(6)} × ${V.toFixed(6)} m/s`);
}

console.log('\nPump × system (intersection by bisection)');
{
  const m = M.newModel();
  m.junctions.push(Object.assign(M.newJunction('reservoir', 1, 0, 0), { liquidElev: q(2, 'm') }));
  m.junctions.push(Object.assign(M.newJunction('pump', 2, 0, 0), {
    curve: { x: [0, 0.01, 0.02, 0.03], y: [40, 39, 36, 31], xUnit: 'm³/s', yUnit: 'm', fit: '2' },
  }));
  m.junctions.push(Object.assign(M.newJunction('reservoir', 3, 0, 0), { liquidElev: q(22, 'm') }));
  const p1 = M.newPipe(1, 1, 2); p1.length = q(10, 'm'); p1.geometry.d = q(100, 'mm');
  const p2 = M.newPipe(2, 2, 3); p2.length = q(400, 'm'); p2.geometry.d = q(100, 'mm');
  m.pipes.push(p1, p2);
  const r = solveOk(m);
  const fl = F.evaluate(m.system);
  const a = H.polyfit([0, 0.01, 0.02, 0.03], [40, 39, 36, 31], 2);
  const loss = (Q, L) => { const V = Q / (Math.PI * 0.01 / 4); const Re = fl.rho * V * 0.1 / fl.mu; return H.frictionFactor(Re, 0.046e-3 / 0.1) * L / 0.1 * V * V / (2 * 9.80665); };
  const Q = bisect((Q) => H.polyval(a, Q) - 20 - loss(Q, 10) - loss(Q, 400), 1e-6, 0.05);
  check('Flow at the operating point', rel(r.pumps[2].Q, Q) < 1e-7, `${(r.pumps[2].Q * 3600).toFixed(4)} × ${(Q * 3600).toFixed(4)} m³/h`);
  check('Pump head = curve at the point', rel(r.pumps[2].dH, H.polyval(a, Q)) < 1e-6);
  // affinity laws: at 80 % speed, H(Q) = s²·H1(Q/s)
  m.junctions[1].speed = 80;
  const r2 = solveOk(m);
  const Q2 = bisect((Q) => 0.64 * H.polyval(a, Q / 0.8) - 20 - loss(Q, 10) - loss(Q, 400), 1e-6, 0.05);
  check('Affinity at 80 % speed', rel(r2.pumps[2].Q, Q2) < 1e-7);
  // system curve
  const sc = S.systemCurve(M.effective(m, 'base'), 2, 8);
  const [Qs, Hs] = sc.sys[4];
  check('System curve = static head + losses', rel(Hs, 20 + loss(Qs, 10) + loss(Qs, 400)) < 1e-6);
}

console.log('\nThree reservoirs (mass and energy balance)');
{
  const r = solveOk(PumpIt.examples.get('threeRes').build());
  const sum = r.pipes[1].m - r.pipes[2].m - r.pipes[3].m;
  check('Continuity at the junction', Math.abs(sum) < 1e-9 * r.pipes[1].m, `ΣQ = ${sum.toExponential(2)} kg/s`);
  check('Flow from A to C', r.pipes[1].m > 0 && r.pipes[3].m > 0);
  const P0j = r.junctions[4].P0in;
  check('Consistent pressures at the pipe ends', rel(r.pipes[1].P0out, P0j) < 1e-12 && rel(r.pipes[2].P0in, P0j) < 1e-12);
}

console.log('\nLooped network (Hazen-Williams)');
{
  const m = PumpIt.examples.get('loop').build();
  const r = solveOk(m);
  const demand = 175 / 3600 * r.fluid.rho;
  check('Reservoir outflow = sum of the demands', rel(r.pipes[1].m, demand) < 1e-8);
  // loop N2-N3-N6-N5: the head losses add up to zero
  const dh = (id) => r.pipes[id].P0in - r.pipes[id].P0out + r.fluid.rho * r.g * (r.pipes[id].zin - r.pipes[id].zout);
  const loop = dh(2) + dh(7) - dh(5) - dh(4);
  check('Energy closes around the loop', Math.abs(loop) < 1e-3, `${loop.toExponential(2)} Pa`);
  check('No mass imbalance warnings', !r.warnings.some((w) => /imbalance/.test(w.text)));
}

console.log('\nPressure-reducing valve and scenarios');
{
  const m = PumpIt.examples.get('prv').build();
  const r = solveOk(m);
  const Ps = r.pipes[2].Pin - r.patm;
  check('PRV keeps 3 kgf/cm²(g) static downstream', Math.abs(Ps - 3 * 98066.5) < 1, `${(Ps / 98066.5).toFixed(6)} kgf/cm²(g)`);
  check('State: controlling', r.valves[2].state === 'controlling');
  const r2 = solveOk(m, 's1');
  check('Peak: the PRV goes fully open', r2.valves[2].state === 'fully open', r2.valves[2].state);
  check('Peak: imposed flow respected', rel(r2.pipes[2].Q * 3600, 300) < 1e-9);
  // inheritance rule: editing with the inherited value relinks the attribute to the parent
  M.setField(m, 's1', 'j:3', 'Q', q(80, 'm³/h'));
  check('A value equal to the inherited one removes the override', !M.isOverridden(m, 's1', 'j:3', 'Q'));
}

console.log('\nExit valve and controlled flow');
{
  // reservoir → pipe → exit valve with a residual pressure
  const m = M.newModel();
  m.junctions.push(Object.assign(M.newJunction('reservoir', 1, 0, 0), { liquidElev: q(30, 'm') }));
  m.junctions.push(Object.assign(M.newJunction('exitvalve', 2, 0, 0), { elevation: q(5, 'm'), Pout: q(1, 'kgf/cm²(g)') }));
  const p = M.newPipe(1, 1, 2);
  p.material.kind = 'user'; p.length = q(500, 'm'); p.geometry.d = q(100, 'mm'); p.friction.eps = q(0.05, 'mm');
  m.pipes.push(p);
  const fl = F.evaluate(m.system);
  const g = 9.80665, D = 0.1;
  const Vfor = (K) => bisect((V) => { const Re = fl.rho * V * D / fl.mu; return (H.frictionFactor(Re, 0.05e-3 / D) * 500 / D + K) * fl.rho * V * V / 2 - (fl.rho * g * 25 - 98066.5); }, 0.01, 20);
  const r = solveOk(m);
  check('Stagnation pressure at the outlet = residual (K = 0)', rel(r.pipes[1].P0out - r.patm, 98066.5) < 1e-9);
  check('Flow equals the analytical solution (K = 0)', rel(r.pipes[1].V, Vfor(0)) < 1e-7, `${(r.pipes[1].Q * 3600).toFixed(3)} m³/h`);
  m.junctions[1].K = 2;
  const r2 = solveOk(m);
  check('Flow with a loss in the exit valve (K = 2)', rel(r2.pipes[1].V, Vfor(2)) < 1e-7, `${(r2.pipes[1].Q * 3600).toFixed(3)} m³/h`);
  // FCV between two tanks
  const m2 = M.newModel();
  m2.junctions.push(Object.assign(M.newJunction('reservoir', 1, 0, 0), { liquidElev: q(15, 'm') }));
  m2.junctions.push(Object.assign(M.newJunction('control', 2, 0, 0), { ctype: 'FCV', setQ: q(30, 'm³/h') }));
  m2.junctions.push(Object.assign(M.newJunction('reservoir', 3, 0, 0), { liquidElev: q(0, 'm') }));
  m2.pipes.push(Object.assign(M.newPipe(1, 1, 2), { length: q(50, 'm') }), Object.assign(M.newPipe(2, 2, 3), { length: q(50, 'm') }));
  const r3 = solveOk(m2);
  check('FCV imposes the flow', rel(r3.pipes[2].Q * 3600, 30) < 1e-12);
  check('FCV dissipates the excess energy', r3.valves[2].dP > 0);
  // fixed-flow pump: reports the required head and does not use a curve
  const m3 = PumpIt.examples.get('pump').build();
  Object.assign(m3.junctions.find((j) => j.id === 2), { mode: 'fixedFlow', fixedFlow: q(90, 'm³/h'), curve: { x: [], y: [], xUnit: 'm³/h', yUnit: 'm', fit: '2' } });
  const r4 = solveOk(m3);
  check('Fixed-flow pump needs no curve', rel(r4.pumps[2].Q * 3600, 90) < 1e-12 && r4.pumps[2].dH > 22, `${r4.pumps[2].dH.toFixed(3)} m`);
}

console.log('\nSprinklers');
{
  const r = solveOk(PumpIt.examples.get('sprinkler').build());
  const k = U.toSI(80, 'L/min/bar½', 'kfactor');
  const j = r.junctions[3];
  // Q = K·√ΔP for water (reference density 1000 kg/m³)
  const Qexp = k * Math.sqrt(j.dP) * Math.sqrt(1000 / r.fluid.rho);
  check('Sprinkler flow = K·√ΔP', rel(j.Q, Qexp) < 1e-9, `${(j.Q * 60000).toFixed(2)} L/min`);
}

console.log('\nLaminar correction of K in older models');
{
  // the names held by models saved until 19 October 2026 open as the current ones, also in a child scenario; an
  // unknown name goes back to the default
  const m = PumpIt.examples.get('pump').build();
  m.system.laminarK = 'improvedAtkf';
  m.scenarios.list.push({ id: 'old', name: 'Old', parent: 'base', overrides: { 'sys|laminarK': 'atkf' }, notes: '' });
  M.normalizeRegime(m);
  check('Old names read as craneFt and pipeFt', m.system.laminarK === 'craneFt' && m.scenarios.list.find((s) => s.id === 'old').overrides['sys|laminarK'] === 'pipeFt');
  m.system.laminarK = 'other';
  M.normalizeRegime(m);
  check('An unknown laminar correction goes back to the default', m.system.laminarK === 'craneFt');
}

console.log('\nPipe catalogues (docs/pipe-library.md)');
{
  const D = PumpIt.data;
  const dims = (kind, nps, sch) => D.pipeDims({ kind, nps: String(nps), sch });
  // the bore of carbon steel, (OD − 2·wall)·25.4 to 0.0001 mm
  const steelOk = D.B3610.every((r) => D.SCHEDULES.every((s, k) => Math.abs(dims('steel', r[0], s).id - (r[1] - 2 * r[2 + k]) * 25.4) < 5e-5));
  check('Carbon steel: bores of ASME B36.10M (4" Sch 40 102.26 mm as before, 8" Sch 80 193.68 mm)', steelOk && dims('steel', '4', '40').id === 102.2604
    && +dims('steel', '8', '80').id.toFixed(2) === 193.68);
  // inside diameters (in) of table 4.B.1 of the Hydraulic Institute, ASME B36.19M-2018
  const ss = [['1/8', '10S', 0.307], ['1/2', '5S', 0.71], ['2', '40S', 2.067], ['3 1/2', '80S', 3.364], ['4', '10S', 4.26], ['8', '10S', 8.329], ['12', '5S', 12.438], ['24', '80S', 23], ['30', '10S', 29.376]];
  check('Stainless steel: inside diameters of ASME B36.19M', ss.every(([n, s, id]) => Math.abs(dims('stainless', n, s).id - id * 25.4) < 1e-9));
  check('Stainless steel: schedules the standard does not have', dims('stainless', '1/4', '5S') === null && dims('stainless', '30', '80S') === null && D.pipeSeries('stainless', '22').join() === '5S,10S');
  // published walls: ISO 4437 and EN 12201-2 tables, SINAPI items of NBR 15561, PE 100 datasheets
  const pe = [[20, '11', 2], [32, '11', 3], [32, '17', 2], [75, '11', 6.8], [90, '17', 5.4], [110, '17', 6.6], [110, '11', 10], [125, '17', 7.4], [200, '17', 11.9], [250, '17', 14.8], [250, '11', 22.7], [280, '11', 25.4], [450, '11', 40.9], [560, '11', 50.8], [710, '11', 64.5]];
  check('HDPE: published walls', pe.every(([d, s, w]) => dims('hdpe', d, s).wall === w));
  // the universal wall table of ISO 4065: exact S of the R10 series, e rounded to 0.01 mm and then up to 0.1 mm, 2.0 mm
  // at least, 3.0 mm for 32 mm SDR 11; a series starts at 1.8 mm
  const R10 = { 41: 13, 33: 12, 26: 11, 21: 10, 17: 9, 13.6: 8, 11: 7, 9: 6, 7.4: 5 };
  const iso4065 = (d, sdr) => {
    const raw = d / (2 * 10 ** (R10[sdr] / 10) + 1);
    return raw < 1.8 ? null : d === 32 && sdr === '11' ? 3 : Math.max(Math.ceil(Math.round(raw * 100) / 10) / 10, 2);
  };
  const cells = D.HDPE.flatMap((row) => D.HDPE_SDRS.map((s, i) => [row[0], s, row[1 + i]]));
  const off = cells.filter(([d, s, w]) => w !== iso4065(d, s));
  check('HDPE: every wall follows ISO 4065', off.length === 0, `${cells.length} cells` + (off.length ? `, differ: ${off.map((c) => c.join(' ')).join('; ')}` : ''));
  check('HDPE: bore OD − 2e, nominal pressures of PE 100 and PE 80', dims('hdpe', 110, '11').id === 90 && dims('hdpe', 20, '17') === null
    && D.pipePN({ kind: 'hdpe', sch: '11', grade: 'PE100' }) === 16 && D.pipePN({ kind: 'hdpe', sch: '11', grade: 'PE80' }) === 12.5);
  // ductile iron: e = K(0.5 + 0.001 DN) with 5 mm (K7) and 6 mm (K9) at least, lining of NBR 7675:2022
  const di = (dn, cls) => dims('ductile', dn, cls);
  check('Ductile iron K9: 6.0, 6.3, 6.8, 7.2 and 15.3 mm', [[80, 6], [200, 6.3], [250, 6.8], [300, 7.2], [1200, 15.3]].every(([dn, e]) => di(dn, 'K9').wall === e));
  check('Ductile iron K7: 5.0 mm at least, 5.6 at DN 300, 6.0 at DN 350', di(150, 'K7').wall === 5 && di(300, 'K7').wall === 5.6 && di(350, 'K7').wall === 6);
  check('Ductile iron: bore DE − 2e − 2·lining (DN 100: 100.0, DN 400: 402.8, DN 1200: 1212.4 mm)', di(100, 'K9').id === 100 && di(400, 'K9').id === 402.8 && di(1200, 'K9').id === 1212.4);
  // every definition is complete, with a default pipe the catalogue has; larger sizes have larger outside diameters;
  // heavier series (in the order of each catalogue but carbon steel's) have smaller bores
  let ok = true;
  for (const kind of D.PIPE_KINDS) {
    const c = D.pipeCatalog(kind), dft = c.defaults;
    if (!(c.eps > 0) || !c.system || !c.seriesKind || !c.digits || !dims(kind, dft.nps, dft.sch) || (c.grades && !c.grades[dft.grade])) ok = false;
    let od = 0;
    for (const n of D.pipeSizes(kind)) {
      const ds = D.pipeSeries(kind, n).map((s) => dims(kind, n, s));
      if (!ds.length || !(ds[0].od > od) || ds.some((d) => !(d.id > 0 && d.wall > 0))) ok = false;
      if (kind !== 'steel' && ds.some((d, i) => i && !(d.id < ds[i - 1].id))) ok = false;
      od = ds[0].od;
    }
  }
  check('Every catalogue: a complete definition, sizes in order, positive walls and bores', ok);
  // a new material: the size whose bore is nearest, or the same NPS; a series the size lacks becomes the nearest one
  const fit = (m, o) => JSON.stringify(D.fitMaterial(m, o));
  check('Changing the material keeps a similar bore', fit({ kind: 'hdpe', nps: '4', sch: '40' }, { refId: 102.26, resize: true }) === '{"kind":"hdpe","nps":"125","sch":"11","grade":"PE100"}'
    && fit({ kind: 'ductile', nps: '4', sch: '40' }, { refId: 102.26, resize: true }) === '{"kind":"ductile","nps":"100","sch":"K9"}'
    && fit({ kind: 'stainless', nps: '4', sch: '40' }, { refId: 102.26 }) === '{"kind":"stainless","nps":"4","sch":"10S"}');
  check('A series the size lacks becomes the nearest one', fit({ kind: 'stainless', nps: '1/4', sch: '5S' }) === '{"kind":"stainless","nps":"1/4","sch":"10S"}'
    && fit({ kind: 'hdpe', nps: '20', sch: '17', grade: 'PE80' }) === '{"kind":"hdpe","nps":"20","sch":"11","grade":"PE80"}');
}

console.log('\nEvery example');
for (const ex of PumpIt.examples.EXAMPLES) {
  const m = ex.build();
  for (const s of m.scenarios.list) {
    const r = solveOk(m, s.id);
    check(`${ex.name} [${s.name}] converges`, r.converged, `${r.iterations} it., ${r.warnings.length} warnings`);
  }
}

console.log(`\n${pass} checks passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
