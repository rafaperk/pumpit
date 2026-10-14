// Suíte de verificação do núcleo de cálculo. Uso: node tests/run-tests.js
// Cada caso compara o solver de rede com uma solução independente (analítica ou por bisseção).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = vm.createContext({ console, Math, JSON, Number, Object, Array, Map, Set, Float64Array, Int32Array, Error });
for (const f of ['units', 'fluids', 'data', 'hydraulics', 'model', 'solver', 'examples']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'core', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
}
const HR = ctx.HR;
const { model: M, solver: S, hyd: H, units: U, fluids: F } = HR;
const q = M.q;

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log('  ok   ' + name + (detail ? '  ' + detail : '')); }
  else { fail++; console.log('  FALHA ' + name + (detail ? '  ' + detail : '')); }
}
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const bisect = (f, a, b) => { let fa = f(a); for (let i = 0; i < 200; i++) { const m = (a + b) / 2, fm = f(m); if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; };

function solveOk(m, sid = 'base') {
  const eff = M.effective(m, sid);
  const v = M.validate(eff);
  if (!v.ok) throw new Error('Modelo inválido: ' + JSON.stringify([...v.undef]));
  const r = S.run(eff);
  if (!r.ok) throw new Error('Falha: ' + r.errors.join('; '));
  return r;
}

console.log('\nPropriedades e correlações');
{
  check('ρ água 20 °C (Kell) ≈ 998,21 kg/m³', rel(F.waterDensity(20), 998.21) < 2e-4, F.waterDensity(20).toFixed(3));
  check('μ água 20 °C (Vogel) ≈ 1,002 mPa·s', rel(F.waterViscosity(20), 1.0016e-3) < 5e-3, (F.waterViscosity(20) * 1e3).toFixed(4));
  check('Psat 100 °C (IF97) = 101,418 kPa', rel(F.waterVaporPressure(100), 101418) < 1e-4, F.waterVaporPressure(100).toFixed(1));
  check('Psat 20 °C (IF97) ≈ 2,339 kPa', rel(F.waterVaporPressure(20), 2339.2) < 1e-3, F.waterVaporPressure(20).toFixed(1));
  // forma original de Colebrook: verificação direta da equação implícita
  const f = H.colebrook(1e5, 1e-4);
  const resid = 1 / Math.sqrt(f) - (1.14 - 2 * Math.log10(1e-4 + 9.35 / (1e5 * Math.sqrt(f))));
  check('Colebrook (1,14 / 9,35) satisfaz a equação', Math.abs(resid) < 1e-12, 'f = ' + f.toFixed(6));
  check('f_T de Crane, 2" sch 40 ≈ 0,019', Math.abs(H.craneFT(0.0525) - 0.019) < 0.0006, H.craneFT(0.0525).toFixed(4));
  check('Transição contínua em Re = 4000', rel(H.frictionFactor(4000, 1e-4), H.frictionFactor(4000.0001, 1e-4)) < 1e-6);
  check('Conversão gpm → m³/s', rel(U.toSI(100, 'gpm', 'volFlow'), 6.30902e-3) < 1e-5);
  check('Conversão bar(g) → Pa absoluto', U.toSI(1, 'bar(g)', 'pressure', { patm: 101325 }) === 201325);
  check('Conversão °F → K', rel(U.toSI(212, '°F', 'temperature'), 373.15) < 1e-12);
  const c = H.polyfit([0, 1, 2, 3], [5, 3, -3, -13], 2);
  check('Ajuste polinomial exato (5 − 2x²)', Math.abs(c[0] - 5) < 1e-9 && Math.abs(c[1]) < 1e-9 && Math.abs(c[2] + 2) < 1e-9);
}

console.log('\nTubo único entre reservatórios (Darcy + Colebrook)');
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
  check('Velocidade igual à da solução analítica', rel(r.pipes[1].V, V) < 1e-7, `${r.pipes[1].V.toFixed(6)} × ${V.toFixed(6)} m/s`);
  check('Convergiu', r.converged, r.iterations + ' iterações');
  // perdas de entrada e saída não são automáticas: P0 na ponta = P0 do tanque + ρg(z_sup − z_ponta)
  const P0exp = r.patm + fl.rho * g * 30;
  check('P0 na ponta de montante = P_sup + ρg·h', rel(r.pipes[1].P0in, P0exp) < 1e-9);
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
  // V = k·C·R^0,63·S^0,54 com S = Δz/L (ρ g h = ρ g0 h com gravidade padrão)
  const V = H.HW_K * 120 * Math.pow(0.05, 0.63) * Math.pow(20 / 1000, 0.54);
  check('Velocidade = fórmula clássica', rel(r.pipes[1].V, V) < 1e-7, `${r.pipes[1].V.toFixed(6)} × ${V.toFixed(6)} m/s`);
}

console.log('\nBomba × sistema (interseção por bisseção)');
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
  check('Vazão no ponto de operação', rel(r.pumps[2].Q, Q) < 1e-7, `${(r.pumps[2].Q * 3600).toFixed(4)} × ${(Q * 3600).toFixed(4)} m³/h`);
  check('Altura da bomba = curva no ponto', rel(r.pumps[2].dH, H.polyval(a, Q)) < 1e-6);
  // leis de afinidade: a 80% da rotação, H(Q) = s²·H1(Q/s)
  m.junctions[1].speed = 80;
  const r2 = solveOk(m);
  const Q2 = bisect((Q) => 0.64 * H.polyval(a, Q / 0.8) - 20 - loss(Q, 10) - loss(Q, 400), 1e-6, 0.05);
  check('Afinidade a 80% da rotação', rel(r2.pumps[2].Q, Q2) < 1e-7);
  // curva do sistema
  const sc = S.systemCurve(M.effective(m, 'base'), 2, 8);
  const [Qs, Hs] = sc.sys[4];
  check('Curva do sistema = estática + perdas', rel(Hs, 20 + loss(Qs, 10) + loss(Qs, 400)) < 1e-6);
}

console.log('\nTrês reservatórios (balanço de massa e de energia)');
{
  const r = solveOk(HR.examples.get('threeRes').build());
  const sum = r.pipes[1].m - r.pipes[2].m - r.pipes[3].m;
  check('Continuidade na junção', Math.abs(sum) < 1e-9 * r.pipes[1].m, `ΣQ = ${sum.toExponential(2)} kg/s`);
  check('Escoamento de A para C', r.pipes[1].m > 0 && r.pipes[3].m > 0);
  const P0j = r.junctions[4].P0in;
  check('Pressões coerentes nas pontas', rel(r.pipes[1].P0out, P0j) < 1e-12 && rel(r.pipes[2].P0in, P0j) < 1e-12);
}

console.log('\nRede malhada (Hazen-Williams)');
{
  const m = HR.examples.get('loop').build();
  const r = solveOk(m);
  const demand = 175 / 3600 * r.fluid.rho;
  check('Vazão de saída do reservatório = soma das demandas', rel(r.pipes[1].m, demand) < 1e-8);
  // laço N2-N3-N6-N5: soma das perdas de altura = 0
  const dh = (id) => r.pipes[id].P0in - r.pipes[id].P0out + r.fluid.rho * r.g * (r.pipes[id].zin - r.pipes[id].zout);
  const loop = dh(2) + dh(7) - dh(5) - dh(4);
  check('Energia fecha no laço', Math.abs(loop) < 1e-3, `${loop.toExponential(2)} Pa`);
  check('Sem avisos de desbalanço', !r.warnings.some((w) => /desbalanceada/.test(w.text)));
}

console.log('\nVálvula redutora de pressão e cenários');
{
  const m = HR.examples.get('prv').build();
  const r = solveOk(m);
  const Ps = r.pipes[2].Pin - r.patm;
  check('VRP mantém 3 kgf/cm²(g) estática a jusante', Math.abs(Ps - 3 * 98066.5) < 1, `${(Ps / 98066.5).toFixed(6)} kgf/cm²(g)`);
  check('Estado: controlando', r.valves[2].state === 'controlando');
  const r2 = solveOk(m, 's1');
  check('Pico: VRP passa a totalmente aberta', r2.valves[2].state === 'totalmente aberta', r2.valves[2].state);
  check('Pico: vazão imposta respeitada', rel(r2.pipes[2].Q * 3600, 300) < 1e-9);
  // regra de herança: editar com o valor herdado religa o atributo ao pai
  M.setField(m, 's1', 'j:3', 'Q', q(80, 'm³/h'));
  check('Valor igual ao herdado remove a sobrescrita', !M.isOverridden(m, 's1', 'j:3', 'Q'));
}

console.log('\nVálvula de saída e vazão controlada');
{
  // reservatório → tubo → válvula de saída com pressão residual
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
  check('Pressão de estagnação na saída = residual (K = 0)', rel(r.pipes[1].P0out - r.patm, 98066.5) < 1e-9);
  check('Vazão igual à solução analítica (K = 0)', rel(r.pipes[1].V, Vfor(0)) < 1e-7, `${(r.pipes[1].Q * 3600).toFixed(3)} m³/h`);
  m.junctions[1].K = 2;
  const r2 = solveOk(m);
  check('Vazão com perda na válvula de saída (K = 2)', rel(r2.pipes[1].V, Vfor(2)) < 1e-7, `${(r2.pipes[1].Q * 3600).toFixed(3)} m³/h`);
  // FCV entre dois tanques
  const m2 = M.newModel();
  m2.junctions.push(Object.assign(M.newJunction('reservoir', 1, 0, 0), { liquidElev: q(15, 'm') }));
  m2.junctions.push(Object.assign(M.newJunction('control', 2, 0, 0), { ctype: 'FCV', setQ: q(30, 'm³/h') }));
  m2.junctions.push(Object.assign(M.newJunction('reservoir', 3, 0, 0), { liquidElev: q(0, 'm') }));
  m2.pipes.push(Object.assign(M.newPipe(1, 1, 2), { length: q(50, 'm') }), Object.assign(M.newPipe(2, 2, 3), { length: q(50, 'm') }));
  const r3 = solveOk(m2);
  check('FCV impõe a vazão', rel(r3.pipes[2].Q * 3600, 30) < 1e-12);
  check('FCV dissipa o excesso de energia', r3.valves[2].dP > 0);
  // bomba em vazão fixa: informa a altura necessária e não usa curva
  const m3 = HR.examples.get('pump').build();
  Object.assign(m3.junctions.find((j) => j.id === 2), { mode: 'fixedFlow', fixedFlow: q(90, 'm³/h'), curve: { x: [], y: [], xUnit: 'm³/h', yUnit: 'm', fit: '2' } });
  const r4 = solveOk(m3);
  check('Bomba de vazão fixa dispensa a curva', rel(r4.pumps[2].Q * 3600, 90) < 1e-12 && r4.pumps[2].dH > 22, `${r4.pumps[2].dH.toFixed(3)} m`);
}

console.log('\nAspersores');
{
  const r = solveOk(HR.examples.get('sprinkler').build());
  const k = U.toSI(80, 'L/min/bar½', 'kfactor');
  const j = r.junctions[3];
  // Q = K·√ΔP para água (densidade de referência 1000 kg/m³)
  const Qexp = k * Math.sqrt(j.dP) * Math.sqrt(1000 / r.fluid.rho);
  check('Vazão do aspersor = K·√ΔP', rel(j.Q, Qexp) < 1e-9, `${(j.Q * 60000).toFixed(2)} L/min`);
}

console.log('\nTodos os exemplos');
for (const ex of HR.examples.EXAMPLES) {
  const m = ex.build();
  for (const s of m.scenarios.list) {
    const r = solveOk(m, s.id);
    check(`${ex.name} [${s.name}] converge`, r.converged, `${r.iterations} it., ${r.warnings.length} avisos`);
  }
}

console.log(`\n${pass} verificações aprovadas, ${fail} falhas`);
process.exit(fail ? 1 : 0);
