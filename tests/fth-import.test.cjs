// Import of .fth model files (src/core/import/fth.js). Usage: node tests/fth-import.test.cjs
//
// Every file of these checks is synthetic: this script writes it from the layout of Annex A of the specification
// (docs/fth-import.md). No file of another program is read.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ROOT, loadCore } = require('./load-core');

const PumpIt = loadCore();
const M = PumpIt.model, S = PumpIt.solver, U = PumpIt.units, FTH = PumpIt.importers.fth;
const q = M.q;
const LBM = 0.45359237, FT = 0.3048, PSI = U.PSI;

let passed = 0, failed = 0;
function ok(name, cond, detail = '') {
  if (cond) passed++; else failed++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}
const relDiff = (a, b, scale) => Math.abs(a - b) / (scale || Math.max(Math.abs(a), Math.abs(b), 1e-30));

// ---------- writer of the format (Annex A): records with the documented positions set and every other one '0'

function fields(set) {
  const n = Math.max(...Object.keys(set).map(Number)) + 4;
  const f = Array(n).fill('0');
  for (const [i, v] of Object.entries(set)) f[i] = String(v);
  return f.join(',');
}
// pipe: fields 0–9 fixed (9 = npts), then b = 10 + 3·npts
function pipeRecord(p) {
  const npts = p.npts || 0, b = 10 + 3 * npts;
  const set = { 0: p.id, 1: p.name ?? `Pipe ${p.id}`, 2: p.lenUnit ?? 'meters', 3: p.elevUnit ?? 'meters', 4: p.zIn ?? 0, 5: 1, 6: p.L, 7: p.zOut ?? 0, 9: npts };
  Object.assign(set, {
    [b + 3]: p.up, [b + 4]: p.down, [b + 5]: p.d ?? 0, [b + 6]: p.dUnit ?? 'mm', [b + 7]: p.area ?? 0, [b + 8]: p.areaUnit ?? 'meters2',
    [b + 9]: p.perim ?? 0, [b + 10]: p.perimUnit ?? 'meters', [b + 11]: 'Standard', [b + 12]: p.fcode ?? 0, [b + 13]: p.fval ?? 0.046,
    [b + 14]: p.funit ?? 'mm', [b + 16]: p.geo ?? 0, [b + 20]: p.Ksum ?? 0, [b + 21]: '06 None', [b + 26]: 'kg/sec',
  });
  return fields(set);
}
// junction: 0 type, 1 ID, 4 name, 5 np, then np signed pipe IDs (+ enters, − leaves); b = 6 + np
function junctionRecord(j) {
  const np = j.pipes.length, b = 6 + np;
  const set = { 0: j.type, 1: j.id, 4: j.name ?? `J${j.id}`, 5: np };
  j.pipes.forEach((pid, i) => { set[6 + i] = pid; });
  Object.assign(set, { [b]: j.x ?? 0, [b + 1]: j.y ?? 0, [b + 7]: j.elev ?? 0, [b + 9]: j.elevUnit ?? 'meters', [b + 99]: 0 });
  for (const [k, v] of Object.entries(j.at || {})) set[b + Number(k)] = v;
  return fields(set);
}
// a whole file; plain = sections without the scenario suffix
function fthFile({ pipes, junctions, archive, fluid = {}, app = {}, children = [], scenario = 'Base Scenario', plain = false }) {
  const L = ['Synthetic file written by tests/fth-import.test.cjs'];
  const sec = (name) => (plain ? `[${name}]` : `[${name} -- SCENARIO #1 -- ${scenario}]`);
  L.push('[APPLICATION]', ...Object.entries(app).map(([k, v]) => `${k}= ${v}`));
  L.push('[SCENARIO MANAGER]', `Scenario #1= ${scenario}`, ...children.map((c, i) => `Scenario #${i + 2}= ${c},${scenario}`));
  L.push('[FLUID DATA]', ...Object.entries(fluid).map(([k, v]) => `${k}= ${v}`));
  L.push(sec('JUNCTIONS'), ...junctions.map(junctionRecord));
  L.push(sec('PIPES'), ...pipes.map(pipeRecord));
  if (archive) L.push(sec('PIPE ARCHIVE DATA'), ...archive);
  return L.join('\r\n') + '\r\n';
}
// stored results in the US units of the format, from a calculation of Pump It
function archiveOf(r, fl) {
  return Object.entries(r.pipes).map(([id, x]) => [id, x.m / LBM, 0, x.P0in / PSI, x.P0out / PSI, 527.67, 527.67,
    fl.rho / (LBM / FT ** 3), fl.mu / (LBM / FT), fl.pv / PSI, fl.pv / PSI].join(','));
}

// ---------- the network of the first checks: one of each type that Annex A describes
const WATER = { kind: 'user', name: 'Water', rho: q(998.2, 'kg/m³'), mu: q(1.002, 'cP'), pv: q(2.339, 'kPa(a)') };
const H = (Q) => 40 - 0.002 * Q * Q; // pump head (m) at Q (m³/h)
const PIPES = [
  { id: 1, up: 1, down: 2, L: 50, zIn: 8, zOut: 0, d: 154.05, Ksum: 1.2 },
  { id: 2, up: 2, down: 3, L: 200 / FT, lenUnit: 'feet', zIn: 0, zOut: 2, d: 6.065, dUnit: 'inches', fcode: 3, fval: 120 },
  { id: 3, up: 3, down: 4, L: 100, zIn: 2, zOut: 2, d: 102.26, fcode: 1, fval: 0.0005 },
  { id: 4, up: 3, down: 5, L: 80, zIn: 2, zOut: 1, d: 0.1, dUnit: 'meters', geo: 2, area: 0.01, perim: 0.4, fcode: 4, fval: 0.02 },
  { id: 5, up: 4, down: 7, L: 30, zIn: 2, zOut: 2, d: 102.26, fcode: 2 },
  { id: 6, up: 7, down: 6, L: 20, zIn: 2, zOut: 5, d: 102.26 },
  { id: 7, up: 3, down: 8, L: 40, zIn: 2, zOut: 3, d: 52.5 },
  { id: 8, up: 3, down: 9, L: 10, zIn: 2, zOut: 2, d: 52.5 },
];
const JUNCTIONS = (branchK = 0.4) => [
  { type: 2, id: 1, name: 'Suction tank', pipes: [-1], x: 0, y: 0, elev: 10, at: { 69: 0.5, 76: 0, 77: 'psig' } },
  { type: 17, id: 2, name: 'Pump', pipes: [1, -2], x: 300, y: 0, elev: 0, at: { 79: 'meters', 81: 'm3/hr', 92: 3, 93: 40, 94: 0, 95: -0.002 } },
  { type: 1, id: 3, pipes: [2, -3, -4, -7, -8], x: 600, y: 0, elev: 2, at: { 73: branchK, 85: -10, 86: 'm3/hr' } },
  { type: 8, id: 4, name: 'Valve', pipes: [3, -5], x: 900, y: -150, elev: 2, at: { 90: 5 } },
  { type: 3, id: 5, name: 'Consumer', pipes: [4], x: 900, y: 150, elev: 1, at: { 70: 20, 71: 'm3/hr', 72: 1, 75: 0 } },
  { type: 4, id: 6, name: 'Header', pipes: [6], x: 1500, y: -150, elev: 5, at: { 72: 0, 73: 2.5, 74: 'bar' } },
  { type: 6, id: 7, name: 'Bend', pipes: [5, -6], x: 1200, y: -150, elev: 2, at: { 70: 90, 72: 0.3 } },
  { type: 8, id: 8, name: 'Drain', pipes: [7], x: 600, y: 300, elev: 3, at: { 90: 2 } },
  { type: 11, id: 9, name: 'Stub', pipes: [8], x: 300, y: 300, elev: 2 },
];
const FLUID = { Gravity: 1, ReTransLam: 2300, ReTransTurb: 4000, AltLossFactorMethod: 0 };

// the same network built directly in Pump It
function reference(branchK = 0.4) {
  const m = M.newModel();
  m.system.fluid = JSON.parse(JSON.stringify(WATER));
  m.system.laminarK = 'none';
  m.solution.tolRel = 1e-10;
  const J = (type, id, props) => { const j = Object.assign(M.newJunction(type, id, 0, 0), props); m.junctions.push(j); return j; };
  J('reservoir', 1, { elevation: q(10, 'm'), liquidElev: q(10, 'm'), surfP: q(0, 'psig'), pipeK: { 1: { kOut: 0.5, kIn: 0, elev: q(8, 'm') } } });
  J('pump', 2, { elevation: q(0, 'm'), curve: { x: [0, 50, 100, 140], y: [0, 50, 100, 140].map(H), xUnit: 'm³/h', yUnit: 'm', fit: '2' }, eff: { x: [], y: [], xUnit: 'm³/h', fit: '2' }, npshr: { x: [], y: [], xUnit: 'm³/h', yUnit: 'm', fit: '2' } });
  J('branch', 3, { elevation: q(2, 'm'), source: q(-10, 'm³/h'), pipeK: branchK ? { 3: { kOut: branchK, kIn: branchK } } : {} });
  J('valve', 4, { elevation: q(2, 'm'), lossModel: 'K', K: 5 });
  J('flow', 5, { elevation: q(1, 'm'), Q: q(20, 'm³/h'), dir: 'out' });
  J('pressure', 6, { elevation: q(5, 'm'), P: q(2.5, 'bar(a)'), ptype: 'stagnation' });
  J('generic', 7, { elevation: q(2, 'm'), genModel: 'K', K: 0.3 });
  J('exitvalve', 8, { elevation: q(3, 'm'), lossModel: 'K', K: 2, Pout: q(0, 'kgf/cm²(g)') });
  J('flow', 9, { elevation: q(2, 'm'), Q: q(0, 'm³/h'), dir: 'out' });
  const P = (id, up, down, L, geometry, friction, fittings = []) => {
    const p = M.newPipe(id, up, down);
    Object.assign(p, { length: L, fittings });
    p.material = { kind: 'user', nps: '4', sch: '40' };
    Object.assign(p.geometry, geometry);
    Object.assign(p.friction, friction);
    m.pipes.push(p);
  };
  const rough = { model: 'roughness', eps: q(0.046, 'mm') };
  P(1, 1, 2, q(50, 'm'), { kind: 'circular', d: q(154.05, 'mm') }, rough, [{ model: 'K', value: 1.2, qty: 1 }]);
  P(2, 2, 3, q(200 / FT, 'ft'), { kind: 'circular', d: q(6.065, 'in') }, { model: 'hw', C: 120 });
  P(3, 3, 4, q(100, 'm'), { kind: 'circular', d: q(102.26, 'mm') }, { model: 'relRoughness', rel: 0.0005 });
  P(4, 3, 5, q(80, 'm'), { kind: 'noncircular', area: q(0.01, 'm²'), perim: q(0.4, 'm') }, { model: 'explicitF', f: 0.02 });
  P(5, 4, 7, q(30, 'm'), { kind: 'circular', d: q(102.26, 'mm') }, { model: 'smooth' });
  P(6, 7, 6, q(20, 'm'), { kind: 'circular', d: q(102.26, 'mm') }, rough);
  P(7, 3, 8, q(40, 'm'), { kind: 'circular', d: q(52.5, 'mm') }, rough);
  P(8, 3, 9, q(10, 'm'), { kind: 'circular', d: q(52.5, 'mm') }, rough);
  return m;
}
const run = (m) => S.run(M.effective(m, 'base'));
const hasNote = (res, key, obj) => res.notes.some((n) => n.key === key && (!obj || n.objs.includes(obj)));

console.log('\nReading the records of Annex A');
const ref = reference();
const rRef = run(ref);
ok('the reference network solves', rRef.ok && rRef.converged, rRef.ok ? `${rRef.iterations} iterations` : (rRef.errors || []).join('; '));
const fl = { rho: 998.2, mu: 1.002e-3, pv: 2339 };
const text1 = fthFile({ pipes: PIPES, junctions: JUNCTIONS(), fluid: FLUID, archive: archiveOf(rRef, fl) });
const res = FTH.read(text1, { name: 'Pumping station.fth' });
const m1 = res.model;
const jt = (id) => m1.junctions.find((j) => j.id === id);
const pp = (id) => m1.pipes.find((p) => p.id === id);
ok('title from the file name, scenario from the sections', m1.title === 'Pumping station' && res.counts.scenario === 'Base Scenario' && m1.scenarios.list[0].name === 'Base Scenario');
ok('9 junctions and 8 pipes with the IDs of the file', res.counts.junctions === 9 && res.counts.pipes === 8 && [1, 2, 3, 4, 5, 6, 7, 8, 9].every((id) => jt(id)));
ok('junction types', ['reservoir', 'pump', 'branch', 'valve', 'flow', 'pressure', 'generic', 'exitvalve', 'flow'].every((type, i) => jt(i + 1).type === type),
  m1.junctions.map((j) => j.id + ':' + j.type).join(' '));
ok('names kept', jt(1).name === 'Suction tank' && jt(3).name === 'J3' && pp(1).name === 'Pipe 1');
ok('reservoir: level = junction elevation, surface pressure, entrance K and the elevation of its pipe',
  jt(1).liquidElev.value === 10 && jt(1).surfP.unit === 'psig' && jt(1).surfP.value === 0 && jt(1).pipeK[1].kOut === 0.5 && jt(1).pipeK[1].elev.value === 8);
ok('pipe units kept as in the file', pp(2).length.unit === 'ft' && pp(2).geometry.d.unit === 'in' && pp(1).geometry.d.unit === 'mm');
ok('friction models 0, 1, 2, 3, 4', pp(1).friction.model === 'roughness' && pp(3).friction.model === 'relRoughness' && pp(3).friction.rel === 0.0005
  && pp(5).friction.model === 'smooth' && pp(2).friction.model === 'hw' && pp(2).friction.C === 120 && pp(4).friction.model === 'explicitF' && pp(4).friction.f === 0.02);
ok('non-circular section by its area and perimeter', pp(4).geometry.kind === 'noncircular' && pp(4).geometry.area.value === 0.01 && pp(4).geometry.perim.value === 0.4);
ok('fittings: the sum of K as one item', pp(1).fittings.length === 1 && pp(1).fittings[0].value === 1.2 && pp(1).fittings[0].id === 'imported' && pp(2).fittings.length === 0);
const c = jt(2).curve;
ok('pump: polynomial turned into 11 points up to zero head, fit of degree 2', c.x.length === 11 && c.fit === '2' && c.xUnit === 'm³/h' && c.yUnit === 'm'
  && Math.abs(c.x[10] - Math.sqrt(40 / 0.002)) < 1e-6 && c.y.every((y, i) => Math.abs(y - H(c.x[i])) < 1e-9), `last point ${c.x[10].toFixed(4)} m³/h`);
ok('branch: source (− leaves) and the K of one pipe in both directions', jt(3).source.value === -10 && jt(3).source.unit === 'm³/h'
  && jt(3).pipeK[3].kOut === 0.4 && jt(3).pipeK[3].kIn === 0.4 && Object.keys(jt(3).pipeK).length === 1);
ok('valve K, bend K, imposed flow leaving, dead end', jt(4).K === 5 && jt(7).K === 0.3 && jt(5).Q.value === 20 && jt(5).dir === 'out' && jt(9).Q.value === 0);
ok('imposed pressure: stagnation, a unit without a mark read as absolute', jt(6).ptype === 'stagnation' && jt(6).P.value === 2.5 && jt(6).P.unit === 'bar(a)');
ok('valve with one pipe: exit valve to the atmosphere', jt(8).K === 2 && jt(8).Pout.value === 0 && jt(8).Pout.unit === 'kgf/cm²(g)');
ok('fluid from the stored results', m1.system.fluid.kind === 'user' && relDiff(m1.system.fluid.rho.value, 998.2) < 1e-12
  && relDiff(m1.system.fluid.mu.value, 1.002) < 1e-12 && relDiff(m1.system.fluid.pv.value, 2.339) < 1e-12);
ok('laminar correction code 0 = none; gravity and transition read', m1.system.laminarK === 'none' && m1.system.gravity === 1 && m1.system.reLam === 2300 && m1.system.reTurb === 4000);
ok('notes: the assumptions of this file, and nothing that needs the user', hasNote(res, 'reservoirLevel', 'J1') && hasNote(res, 'absolute', 'J6')
  && hasNote(res, 'pipeK', 'J3') && hasNote(res, 'exitPressure', 'J8') && hasNote(res, 'fluidStored') && !res.notes.some((n) => n.level === 'missing'),
  res.notes.map((n) => n.key).join(', '));
ok('every note reads in every language', ['pt-BR', 'en', 'es'].every((lang) => {
  PumpIt.i18n.setLanguage(lang);
  const all = res.notes.map((n) => FTH.noteText(n));
  return all.every((s) => s && !/\{\w+\}/.test(s));
}));
PumpIt.i18n.setLanguage('en');

console.log('\nCalculating the imported model');
m1.solution.tolRel = 1e-10;
const v1 = M.validate(M.effective(m1, 'base'));
ok('the imported model is complete', v1.ok, v1.ok ? '' : JSON.stringify([...v1.undef].slice(0, 3)));
const r1 = run(m1);
ok('it solves', r1.ok && r1.converged, r1.ok ? `${r1.iterations} iterations` : (r1.errors || []).join('; '));
let dQ = 0, dP = 0;
const Pscale = Math.max(...Object.values(rRef.junctions).map((x) => Math.abs(x.P0 || 0)));
for (const id of Object.keys(rRef.pipes)) {
  dQ = Math.max(dQ, relDiff(r1.pipes[id].m, rRef.pipes[id].m, 1));
  dP = Math.max(dP, relDiff(r1.pipes[id].P0in, rRef.pipes[id].P0in, Pscale), relDiff(r1.pipes[id].P0out, rRef.pipes[id].P0out, Pscale));
}
ok('same flows and pressures as the network built in Pump It', dQ < 1e-9 && dP < 1e-9, `flow ${dQ.toExponential(1)} kg/s, pressure ${dP.toExponential(1)}`);
const cmp = FTH.compare(r1, res.stored);
ok('the comparison with the stored results finds them equal', cmp.n === 8 && cmp.flow < 1e-8 && cmp.pressure < 1e-8, `flow ${cmp.flow.toExponential(1)}, pressure ${cmp.pressure.toExponential(1)}`);
const m1b = FTH.read(text1, { name: 'x.fth' }).model;
m1b.junctions.find((j) => j.id === 4).K = 50; // a different valve: the comparison has to show it
const c2 = FTH.compare(run(m1b), res.stored);
ok('a model that differs from the stored results shows the difference', c2.flow > 1e-3 && c2.pressure > 1e-3, `flow ${(c2.flow * 100).toFixed(2)} %, pressure ${(c2.pressure * 100).toFixed(2)} %`);

console.log('\nDrawing positions');
const xs = m1.junctions.map((j) => j.x), ys = m1.junctions.map((j) => j.y);
ok('on the grid of the drawing, from the margin', m1.junctions.every((j) => j.x % 20 === 0 && j.y % 20 === 0) && Math.min(...xs) === 100 && Math.min(...ys) === 100);
ok('the layout of the file kept, neighbours about 160 apart', jt(2).x - jt(1).x === 160 && jt(3).x - jt(2).x === 160 && jt(4).y < jt(3).y && jt(5).y > jt(3).y);
const same = FTH.read(fthFile({ pipes: PIPES, junctions: JUNCTIONS().map((j) => (j.id === 9 ? Object.assign({}, j, { x: 600, y: 300 }) : j)), fluid: FLUID }), { name: 'same.fth' }).model;
const sj = (id) => same.junctions.find((j) => j.id === id);
ok('two junctions on one point: one grid step apart, the scale kept', sj(9).y === sj(8).y && Math.abs(sj(9).x - sj(8).x) === 20 && sj(2).x - sj(1).x === 160);
const flat = FTH.read(fthFile({ pipes: PIPES, junctions: JUNCTIONS().map((j) => Object.assign({}, j, { x: 5, y: 5 })), fluid: FLUID }), { name: 'flat.fth' });
ok('without usable positions: a grid, with a note', new Set(flat.model.junctions.map((j) => j.x + ',' + j.y)).size === 9 && hasNote(flat, 'layout'));

console.log('\nWhat the format leaves open');
const P2 = [
  { id: 1, up: 1, down: 2, L: 10, d: 100, name: 'Main, north' },
  { id: 2, up: 2, down: 3, L: 10, d: 100, fcode: 6 },
  { id: 3, up: 3, down: 4, L: 10, d: 100, lenUnit: 'furlongs' },
  { id: 4, up: 4, down: 5, L: 10, d: 100 },
  { id: 5, up: 5, down: 6, L: 10, d: 100 },
  { id: 6, up: 6, down: 7, L: 10, d: 100 },
  { id: 7, up: 7, down: 8, L: 10, d: 100 },
  { id: 8, up: 8, down: 9, L: 10, d: 100 },
  { id: 9, up: 9, down: 10, L: 10, d: 100 },
  { id: 10, up: 10, down: 11, L: 10, d: 100 },
  { id: 11, up: 1, down: 12, L: 10, d: 100 },
  { id: 12, up: 12, down: 77, L: 10, d: 100 },
  { id: 13, up: 4, down: 13, L: 10, d: 100 },
  { id: 14, up: 13, down: 14, L: 10, d: 100 },
  { id: 15, up: 14, down: 1, L: 10, d: 100 },
];
const J2 = [
  { type: 2, id: 1, pipes: [-1, -11, 15], x: 0, y: 0, elev: 5 },
  { type: 9, id: 2, pipes: [1, -2], x: 1, y: 0 },
  { type: 10, id: 3, pipes: [2, -3], x: 2, y: 0 },
  { type: 7, id: 4, pipes: [3, -4, -13], x: 3, y: 0 },
  { type: 12, id: 5, pipes: [4, -5], x: 4, y: 0 },
  { type: 5, id: 6, pipes: [5, -6], x: 5, y: 0 },
  { type: 17, id: 7, pipes: [6, -7], x: 6, y: 0, at: { 79: 'meters', 81: 'm3/hr', 92: 0 } },
  { type: 99, id: 8, pipes: [7, -8], x: 7, y: 0 },
  { type: 21, id: 9, pipes: [8, -9], x: 8, y: 0 },
  { type: 4, id: 10, pipes: [9, -10], x: 9, y: 0, at: { 72: 1, 73: 30, 74: 'psig' } },
  { type: 16, id: 11, pipes: [10], x: 10, y: 0 },
  { type: 21, id: 12, pipes: [11], x: 1, y: 1, name: 'Relief' },
  { type: 3, id: 13, pipes: [13, -14], x: 3, y: 1, at: { 70: 5, 71: 'm3/hr', 72: 1 } },
  { type: 1, id: 14, pipes: [14, -15], x: 4, y: 1, at: { 76: 3, 77: 'm3/hr' } },
];
const text2 = fthFile({ pipes: P2, junctions: J2, fluid: { AltLossFactorMethod: 2 }, app: { 'QRS Use': -1, 'TUV Use': 0 }, children: ['Peak', 'Night'] })
  + '[BROKEN -- SCENARIO #1 -- Base Scenario]\r\n';
const res2 = FTH.read(text2.replace('[PIPES -- SCENARIO #1 -- Base Scenario]\r\n', '[PIPES -- SCENARIO #1 -- Base Scenario]\r\n999,lost\r\n'), { name: 'open.fth' });
const m2 = res2.model;
const j2 = (id) => m2.junctions.find((j) => j.id === id);
const keys2 = res2.notes.map((n) => `${n.key}[${n.objs.join(' ')}]`).join(', ');
ok('a name with a comma is read whole', m2.pipes.find((p) => p.id === 1).name === 'Main, north');
ok('a broken record and a pipe to a missing junction are left out, with notes', hasNote(res2, 'badRecord', 'P999') && hasNote(res2, 'dangling', 'P12') && !m2.pipes.some((p) => p.id === 12 || p.id === 999));
ok('friction model not available: blank roughness, with a note', m2.pipes.find((p) => p.id === 2).friction.eps.value === null && hasNote(res2, 'friction', 'P2'));
ok('unknown unit: blank length, with a note', m2.pipes.find((p) => p.id === 3).length.value === null && hasNote(res2, 'unit', 'P3'));
ok('control valve with its set point blank', j2(2).type === 'control' && j2(2).setP.value === null && hasNote(res2, 'controlValve', 'J2'));
ok('check valve: a valve with its K blank', j2(3).type === 'valve' && j2(3).K === undefined && hasNote(res2, 'checkValve', 'J3'));
ok('tee: a node', j2(4).type === 'branch' && hasNote(res2, 'tee', 'J4'));
ok('orifice and area change with their K blank', j2(5).type === 'orifice' && j2(5).orModel === 'K' && j2(5).K === undefined && j2(6).type === 'generic' && j2(6).K === undefined
  && hasNote(res2, 'lossData', 'J5') && hasNote(res2, 'lossData', 'J6'));
ok('pump curve in another form: an empty curve, with a note', j2(7).type === 'pump' && j2(7).curve.x.length === 0 && hasNote(res2, 'pumpCurve', 'J7'));
ok('unknown and unsupported kinds: a node, or a closed end with one pipe', j2(8).type === 'branch' && j2(9).type === 'branch' && j2(12).type === 'flow' && j2(12).Q.value === 0
  && hasNote(res2, 'unsupported', 'J8') && hasNote(res2, 'unsupported', 'J9') && hasNote(res2, 'unsupported', 'J12'));
ok('static pressure with two pipes: stagnation, with a note', j2(10).ptype === 'stagnation' && j2(10).P.unit === 'psig' && hasNote(res2, 'staticManyPipes', 'J10'));
ok('spray nozzle with its K factor blank', j2(11).type === 'spray' && j2(11).Kf.value === null && hasNote(res2, 'spray', 'J11'));
ok('reservoir with three pipes: atmospheric surface, with a note', j2(1).surfP.value === 0 && hasNote(res2, 'reservoirMulti', 'J1'));
ok('imposed flow and branch with the wrong number of pipes for Pump It', j2(13).type === 'branch' && j2(13).source.value === -5 && j2(14).type === 'branch' && j2(14).source.value === 3);
ok('child scenarios, add-on modules, unknown laminar correction and no stored results are reported',
  hasNote(res2, 'scenarios') && res2.notes.find((n) => n.key === 'scenarios').params.names === 'Peak, Night' && hasNote(res2, 'addOns')
  && hasNote(res2, 'laminarK') && hasNote(res2, 'fluidDefault') && m2.system.fluid.kind === 'water' && m2.system.laminarK === 'craneFt' && res2.stored === null, keys2);
const v2 = M.validate(M.effective(m2, 'base'));
ok('the checklist asks for what was left blank', !v2.ok && v2.undef.has('j:2') && v2.undef.has('j:3') && v2.undef.has('p:2') && v2.undef.has('p:3'), [...v2.undef.keys()].join(' '));
ok('notes ordered: needs the user, assumed, left out, read', res2.notes.every((n, i, a) => i === 0 || FTH.LEVELS.indexOf(a[i - 1].level) <= FTH.LEVELS.indexOf(n.level)));

console.log('\nFile variants');
const plain = FTH.read(fthFile({ pipes: PIPES, junctions: JUNCTIONS(), fluid: FLUID, plain: true }), { name: 'plain.fth' });
ok('sections without scenarios', plain.counts.pipes === 8 && plain.counts.junctions === 9);
let thrown = '';
try { FTH.read('[SOMETHING]\r\nkey= 1\r\n', { name: 'x.fth' }); } catch (e) { thrown = e.message; }
ok('a file without pipes and junctions is refused', thrown === PumpIt.i18n.t('core.fth.notFth'));
const accented = fthFile({ pipes: PIPES, junctions: JUNCTIONS().map((j) => (j.id === 2 ? Object.assign({}, j, { name: 'Bomba de recalque nº 2 – sucção' }) : j)), fluid: FLUID });
const decoded = new TextDecoder('windows-1252').decode(Buffer.from(accented.replace('–', '\u0096'), 'latin1'));
ok('Windows-1252 names', FTH.read(decoded, { name: 'x.fth' }).model.junctions.find((j) => j.id === 2).name === 'Bomba de recalque nº 2 – sucção');

console.log('\nTexts');
{
  const src = fs.readFileSync(path.join(ROOT, 'src/core/import/fth.js'), 'utf8');
  const noteKeys = [...src.matchAll(/note\('(\w+)', '(\w+)'/g)].map((x) => x[2]).concat([...src.matchAll(/fallback\('(\w+)'\)/g)].map((x) => x[1]));
  const kinds = [...src.match(/const KINDS = \{([\s\S]*?)\};/)[1].matchAll(/'(\w+)'/g)].map((x) => x[1]).concat(['unknown']);
  const missing = [];
  for (const { code } of PumpIt.i18n.languages()) {
    const cat = PumpIt.i18n.catalog(code);
    for (const k of noteKeys) if (!cat.has('core.fth.notes.' + k)) missing.push(`${code}: notes.${k}`);
    for (const k of kinds) if (!cat.has('core.fth.kinds.' + k)) missing.push(`${code}: kinds.${k}`);
  }
  ok(`every note (${new Set(noteKeys).size}) and kind (${kinds.length}) has its text in every language`, !missing.length, missing.slice(0, 4).join(', '));
}

console.log('\nThe validation script (tests/validate-fth.js) on a synthetic file');
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pumpit-fth-'));
  const ref0 = reference(0);
  const r0 = run(ref0);
  const file = path.join(dir, 'synthetic.fth');
  fs.writeFileSync(file, fthFile({ pipes: PIPES, junctions: JUNCTIONS(0), fluid: FLUID, archive: archiveOf(r0, fl) }), 'latin1');
  const { buildCase, compare } = require('./validate-fth.js');
  const cs = buildCase(file);
  const out = cs.skip ? { err: cs.skip } : compare(cs);
  ok('it reads the file and finds the stored results', out.worst !== undefined && out.worst < 1e-6, out.worst !== undefined ? `worst ${out.worst.toExponential(1)}` : out.err);
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(`\n${passed} checks passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
