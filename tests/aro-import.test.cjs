// Import of .aro model files (src/core/import/aro.js). Usage: node tests/aro-import.test.cjs
//
// Every file of these checks is synthetic: this script writes it from the layout of the records described by the
// specification team (the format description of 20 October 2026, version 1.1; decisions in docs/aro-import.md). No
// file of another program is read, and the gas of the files has properties of its own.
const fs = require('fs');
const path = require('path');
const { ROOT, loadCore } = require('./load-core');

const PumpIt = loadCore();
const M = PumpIt.model, S = PumpIt.solver, U = PumpIt.units, G = PumpIt.gas, X = PumpIt.importShared, ARO = PumpIt.importers.aro;
const q = M.q;
const LBM = 0.45359237, FT = 0.3048, PSI = U.PSI, Ru = 8314.462618;

let passed = 0, failed = 0;
function ok(name, cond, detail = '') {
  if (cond) passed++; else failed++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const relDiff = (a, b, scale) => Math.abs(a - b) / (scale || Math.max(Math.abs(a), Math.abs(b), 1e-30));
const allNotes = []; // every note of every import, to check their texts at the end
function read(text, opts = {}) { const r = ARO.read(text, Object.assign({ name: 'synthetic.aro' }, opts)); allNotes.push(...r.notes); return r; }
const hasNote = (res, key, obj) => res.notes.some((n) => n.key === key && (!obj || n.objs.includes(obj)));
const J = (m, id) => m.junctions.find((j) => j.id === id);
const P = (m, id) => m.pipes.find((p) => p.id === id);
const run = (m) => S.run(M.effective(m, 'base'));
const keysOf = (r) => r.notes.map((n) => n.key + (n.objs.length ? ':' + n.objs.join('+') : '')).join(' ');

// ---------- writer of the format: records with the documented positions set

// pipe: ID, name, length unit, elevation unit, inlet elevation, number of segments (0 or 1) and the pair (length,
// elevation at the end), one field, number of drawing points and the points (x, y, z), then the block b
function pipe(o) {
  const def = o.L != null;
  const pts = o.pts || [[0, 0, 0], [100, 0, 0]];
  const blk = new Array(64).fill('0');
  Object.assign(blk, { 0: 'None', 1: '-1', 3: o.from, 4: o.to, 5: o.D, 6: o.Du || 'cm', 8: 'None', 10: 'None', 11: 'None' });
  const [code, val, unit] = o.fric || ['0', 0.004572, 'cm'];
  Object.assign(blk, { 12: code, 13: val, 14: unit, 17: 'None', 18: 'None', 19: 'None', 20: o.K || 0, 21: '06 None', 22: o.df || 1, 23: 1, 24: 1, 32: 'None', 34: 'None', 36: 'None', 38: o.special || 0, 39: 'None' });
  Object.assign(blk, { 53: o.th || 0, 55: o.th === 2 ? 'W/m2-K' : 'None', 57: o.Tth ?? 0, 58: o.Tth != null ? o.Tthu || 'deg. C' : 'None' });
  if (o.rect) Object.assign(blk, { 7: o.rect[0], 8: 'cm', 9: o.rect[1], 10: 'cm', 16: 4 });
  if (o.area) Object.assign(blk, { 7: o.area, 8: 'cm2', 16: 3 });
  const head = [o.id, o.name || 'Pipe', def ? o.Lu || 'meters' : 'None', o.zu || 'meters', o.z1 || 0, def ? 1 : 0, ...(def ? [o.L, o.z2 ?? o.z1 ?? 0] : []), 0, pts.length, ...pts.flat()];
  return [...head, ...blk].join(',');
}
// junction: type, ID, two fields, name, number of pipes, signed list (− leaves, + arrives), common block b+0..b+45, its
// tables closed by the anchor −999 (at b+68), and the block of the type
const COMMON_TABLES = ['2', '-1', '3', '1', '%ALL%', '3', 'Percent', '1', '100', '2', '100', '3', '100', '0', '2', 'years', '-9999', '-9999', '4', '0', '5', '0', '-999'];
function junc(o) {
  const blk = new Array(46).fill('0');
  Object.assign(blk, { 0: o.x || 0, 1: o.y || 0, 2: 100, 3: -1, 4: -1, 5: -1, 7: o.z || 0, 9: o.zu || 'meters', 14: 'None', 15: o.df || 1, 16: 1, 18: 'None', 20: 'None', 22: 'None', 23: 'None', 24: o.spec == null ? -1 : o.spec, 25: o.spec === 1 ? 1 : 0, 26: '', 30: -999999, 31: -999999, 45: 255 });
  return [o.type, o.id, 6, 8, o.name || '', o.pipes.length, ...o.pipes, ...blk, ...COMMON_TABLES, ...o.t].join(',');
}
// blocks of the types: tank (5 fields per pipe, the first two its K), imposed pressure (3 per pipe), imposed flow,
// branch (3 per pipe, the K the second), bend, valve, control valve, compressor
const tank = ({ P, Pu = 'barG', T = 20, Tu = 'deg. C', ks = [[0, 0]] }) => [...ks.flatMap(([a, b]) => [a, b, 0, 0, 0]), 0, 'None', P, Pu, 0, 'None', T, Tu, 0, 0, 0, 0, 'NA', 'Gas', 0, 0];
const press = ({ P, Pu = 'barG', T = 20, Tu = 'deg. C', stat = 0, ks = [[0, 0]] }) => [...ks.flatMap(([a, b]) => [a, b, 0]), stat, P, Pu, T, Tu, 0, 0, 0, 'None', 'Gas', 0, 0];
const flow = ({ q: Q, qu, out = true, T = 0, Tu = 'None', K = 0 }) => [1, Q, qu, out ? 1 : 0, T, Tu, K, 'Gas', 0, 'NA'];
const branch = ({ np, ks = [], q: Q = 0, qu = 'None' }) => [...Array.from({ length: np }, (_, i) => [0, ks[i] || 0, 0]).flat(), 1, Q, qu, 'None', 0, 0, 'None', 'Gas', 'None', 0, 'NA'];
const bend = (K, angle = 90, rD = 1.5) => [0, angle, rD, K, 0, 'None', 0, 0];
const valve = ({ model = 1, nc = 5, coef, K = 0, P: Pout = 0, Pu = 'None', T = 0, Tu = 'None' }) =>
  [0, model, 1, model === 3 ? 'kPa' : 'None', 1, model === 3 ? 'kg/sec' : 'None', -1, 1, nc, ...(coef || new Array(nc).fill(0)), 1, Pout, Pu, T, Tu, 0, 'None', K, 0, 0];
const cvalve = (kind, set, unit) => [kind, 1, 1, set, unit, 0, 1, -2, 0, -1, 0, 'None', 3, 0, 'None', 'None', 'meters2'];
// compressor: a head of 13 fields (mode, fixed flow, units of the curve, the configuration in use and their count) and
// the configurations, each with its largest flow and the coefficients of the rise, of NPSHR and of efficiency
const cfg = ({ qmax = 0, H }) => ['', -1, -1, 'None', qmax, 1, H.length, ...H, 'Table1', 1, 0, 2, -9999, 1, 0, 0, -1, 'None', 0, 'None', -1, -1, -1, -1, -1, -1, -1, 'None'];
const comp = ({ mode, q: Q = 0, qu = 'None', dpu = 'kPa', fu = 'kg/sec', configs = [] }) =>
  [mode, 0, Q, qu, 0, 1, dpu, 1, fu, 0, 'Percent', 1, configs.length, ...configs.flatMap(cfg), 1, 0, 'None', 1, 5];

// a gas of its own, near air: molar mass 28.96, critical point 132.5 K and 3.77 MPa, acentric factor 0.035;
// μ = 3.5e-6 + 5e-8·T − 1e-11·T² [Pa·s] and cp = 1.005 kJ/(kg·K), T in K, valid from 200 to 1000 K. Blocks: density (no
// coefficients), viscosity, vapour pressure (none), specific heat, conductivity (none), then an enthalpy table
const GAS = 'Synthetic air,1,None,0,deg. K,1000,200,28.96,0,132.5,deg. K,3.77,MPa,0.035,0,0,-3,None,0,-3,Pa-sec,3,3.5E-06,5E-08,-1E-11,-7,None,0,-3,kJ/kg-K,1,1.005,-3,None,0,-3,kJ/kg,MPa,5,1,0,1,0,0,0,1,None,300,300,kJ/kg';
const muOf = (T) => 3.5e-6 + 5e-8 * T - 1e-11 * T * T;
const kOf = (cp, MW) => cp / (cp - Ru / MW);
// a whole file; header: its first line
function aro({ gas = GAS, src = 1, amb = '1,atm', stp = ['0.1013254,MPa', '15.55555,deg. C'], extraFluid = [], scen = [['Base Scenario', '']], secs, upper = false, header = '', extra = [] }) {
  const L = [header || 'Synthetic file written by tests/aro-import.test.cjs'];
  const k = (s) => (upper ? s.toUpperCase() : s);
  L.push('[SCENARIO MANAGER]', `Number of Scenarios= ${scen.length}`);
  scen.forEach(([n, p, d = ''], i) => L.push(`Scenario #${i + 1}= ${n},${p},${d.length},${d},0,0,0,0,0`));
  L.push('Starting Scenario = 1', '[SETTINGS]', 'AnalysisType=1', '[FLUID DATA]', `${k('Fluid Database Source')}= ${src}`, `${k('Number of Fluids')}= 1`, `${k('Fluid 1')}= ${gas}`,
    `${k('Ambient Pressure')}= ${amb}`, `${k('Fraction Units Type')}= 1`, `${k('Gravity')}= 1`, ...(stp ? [`${k('STP Pressure')}= ${stp[0]}`, `${k('STP Temperature')}= ${stp[1]}`] : []), ...extraFluid,
    '[OUTPUT PREFERENCES]', 'Analysis Title= Synthetic test', '[QRS CONTROL]', 'VariablesApplied = 0,', ...extra);
  for (const [name, lines] of secs) L.push(`[${name}]`, ...lines);
  return L.join('\r\n') + '\r\n';
}
const BASE = (name) => `${name} -- SCENARIO #1 -- Base Scenario`;
// results of a calculation in the columns of a stored result: ID, mass flow (lbm/s), stagnation pressure (psia) and
// temperature (°R) at both ends, enthalpies, speeds of sound, k, Mach at both ends, R, Z, components
const archiveOf = (r) => Object.entries(r.pipes).map(([id, x]) => [id, x.m / LBM, x.P0in / PSI, x.P0out / PSI, x.T0in * 1.8, x.T0out * 1.8, 0, 0, 0, 0, 1.4, 1.4, x.Min, x.Mout, 0.0686, 0.0686, 1, 1, 0, 0, 0, 0].join(','));

console.log('\nFile, system and gas');
{
  const f1 = aro({
    amb: '0.9,atm',
    secs: [
      [BASE('JUNCTIONS'), ['NumberOfJunctions= 6',
        junc({ type: 2, id: 1, name: 'Vessel\x15 A', pipes: [-1], x: 10, y: 20, z: 2, t: tank({ P: 5, Pu: 'barG', T: 30 }) }),
        junc({ type: 1, id: 2, pipes: [1, -2, -3, -4], x: 110, y: 20, z: 2, t: branch({ np: 4 }) }),
        junc({ type: 4, id: 3, pipes: [2], x: 210, y: 20, z: 2, t: press({ P: 14.7, Pu: 'psia', T: 70, Tu: 'deg. F', stat: 1 }) }),
        junc({ type: 3, id: 4, pipes: [3], x: 110, y: 120, z: 10, zu: 'feet', t: flow({ q: 1000, qu: 'sm3/h' }) }),
        junc({ type: 6, id: 5, pipes: [4, -5], x: 110, y: -80, z: 2, t: bend(0.25) }),
        junc({ type: 11, id: 6, pipes: [5], x: 210, y: -80, z: 2, t: [] }),
      ]],
      [BASE('PIPES'), ['NumberOfPipes= 5',
        pipe({ id: 1, from: 1, to: 2, L: 100, D: 10.22604, K: 1.5, z1: 2 }),
        pipe({ id: 2, from: 2, to: 3, L: 50, D: 7.79272, fric: ['1', 0.0002, 'None'], z1: 2 }),
        pipe({ id: 3, from: 2, to: 4, L: 50, D: 7.79272, fric: ['4', 0.02, 'None'], th: 2, Tth: 20, z1: 2, z2: 3.048 }),
        pipe({ id: 4, from: 2, to: 5, L: 10, D: 5, rect: [4, 6.25], z1: 2 }),
        pipe({ id: 5, from: 5, to: 6, L: 5, D: 2.54, Du: 'inches', z1: 2 }),
      ]],
      [BASE('PIPE ARCHIVE DATA'), ['NumberOfArchivePipes= 1', '1,2.2046226,87.0226,86,540,539,0,0,0,0,1.4,1.4,0.1,0.11,0.0686,0.0686,1,1,0,0,0,0']],
    ],
  });
  const r1 = read(f1, { name: 'Gas plant.aro' });
  const m1 = r1.model, s1 = m1.system;
  ok('a gas model in the compressible mode, titled after the file', s1.regime === 'compressible' && m1.title === 'Gas plant' && r1.version === null);
  ok('the ambient pressure of the file is the atmospheric pressure, the reference of the gauge units', s1.patm.unit === 'atm' && s1.patm.value === 0.9);
  ok('0x15 in a name is a comma', J(m1, 1).name === 'Vessel, A', JSON.stringify(J(m1, 1).name));
  ok('reservoir: its gauge pressure as given, the temperature of its gas, the pressure at the elevation of the junction', J(m1, 1).type === 'reservoir'
    && J(m1, 1).surfP.unit === 'bar(g)' && J(m1, 1).surfP.value === 5 && J(m1, 1).gasT.unit === '°C' && J(m1, 1).gasT.value === 30
    && J(m1, 1).liquidElev.value === 2 && J(m1, 1).elevation.value === 2, JSON.stringify(J(m1, 1)));
  ok('imposed static pressure in psia with its temperature in °F', J(m1, 3).type === 'pressure' && J(m1, 3).ptype === 'static' && J(m1, 3).P.unit === 'psia'
    && J(m1, 3).P.value === 14.7 && J(m1, 3).gasT.unit === '°F' && J(m1, 3).gasT.value === 70);
  const Qn = 1000 * (101325.4 / 101325) * (273.15 / (15.55555 + 273.15));
  ok('a standard volume flow (sm³/h, at the STP keys of the file) becomes a normal one', J(m1, 4).type === 'flow' && J(m1, 4).dir === 'out' && J(m1, 4).Q.unit === 'Nm³/h'
    && near(J(m1, 4).Q.value, Qn, 1e-12) && hasNote(r1, 'standardFlow', 'J4'), JSON.stringify(J(m1, 4).Q));
  ok('elevation in feet; a branch, a bend with its K and a dead end', J(m1, 4).elevation.unit === 'ft' && J(m1, 4).elevation.value === 10 && J(m1, 2).type === 'branch'
    && J(m1, 5).type === 'generic' && J(m1, 5).K === 0.25 && J(m1, 6).type === 'flow' && J(m1, 6).Q.value === 0);
  ok('pipe: length, diameter in cm, absolute roughness and the K of its fittings', P(m1, 1).length.value === 100 && P(m1, 1).geometry.d.unit === 'cm' && P(m1, 1).geometry.d.value === 10.22604
    && P(m1, 1).friction.model === 'roughness' && P(m1, 1).friction.eps.unit === 'cm' && P(m1, 1).friction.eps.value === 0.004572 && P(m1, 1).fittings[0].value === 1.5);
  ok('relative roughness and a fixed Darcy f', P(m1, 2).friction.model === 'relRoughness' && P(m1, 2).friction.rel === 0.0002 && P(m1, 3).friction.model === 'explicitF' && P(m1, 3).friction.f === 0.02);
  ok('a rectangular duct 4 × 6.25 cm, with its note; a diameter in inches', P(m1, 4).geometry.kind === 'rectangular' && P(m1, 4).geometry.width.value === 4 && P(m1, 4).geometry.height.value === 6.25
    && hasNote(r1, 'ductSection', 'P4') && P(m1, 5).geometry.d.unit === 'in' && P(m1, 5).geometry.d.value === 2.54);
  ok('heat transfer with the surroundings: a note, and the adiabatic model', s1.gasMode === 'adiabatic' && hasNote(r1, 'heatTransfer', 'P3'));
  const T1 = (303.15 + (70 - 32) / 1.8 + 273.15) / 2;
  const g1 = s1.fluidGas;
  ok('gas of a library: molar mass, k from the specific heat, μ of the polynomial, all at the mean temperature of the sources', g1.gas === 'custom' && g1.name === 'Synthetic air'
    && g1.MW === 28.96 && near(g1.k, kOf(1005, 28.96), 1e-5) && near(g1.mu.value * 1e-3, muOf(T1), 1e-4) && g1.T.unit === '°C' && near(g1.T.value, T1 - 273.15, 1e-9) && hasNote(r1, 'gasRead'), JSON.stringify(g1));
  ok('Z of the Pitzer–Abbott correlation, near 1 for this gas at these pressures', g1.Z > 0.99 && g1.Z <= 1.001 && !hasNote(r1, 'gasZ'), `Z = ${g1.Z}`);
  const st = r1.stored && r1.stored.get(1);
  ok('stored results: lbm/s, psia and °R to SI', st && near(st.m, 1, 1e-6) && near(st.P0in, 87.0226 * PSI) && near(st.T0in, 300) && near(st.Min, 0.1), JSON.stringify(st));
  ok('the list of scenarios tells which have stored results', ARO.scenarios(f1)[0].results === true);
  ok('drawing positions on the grid of the drawing, the layout of the file kept', m1.junctions.every((j) => j.x % 20 === 0 && j.y >= 100) && J(m1, 2).x - J(m1, 1).x === 160 && J(m1, 5).y < J(m1, 2).y);
  const v1 = M.validate(M.effective(m1, 'base'));
  ok('the model is complete', v1.ok, v1.ok ? '' : JSON.stringify([...v1.undef.keys()]));

  const up = read(aro({ upper: true, amb: '1,0337,kg/cm2', secs: [[BASE('JUNCTIONS'), [junc({ type: 2, id: 1, pipes: [-1], t: tank({ P: 1 }) }), junc({ type: 4, id: 2, pipes: [1], t: press({ P: 0 }) })]], [BASE('PIPES'), [pipe({ id: 1, from: 1, to: 2, L: 10, D: 5 })]]] }));
  ok('keys in capitals and a key with a decimal comma', up.model.system.patm.unit === 'kgf/cm²(a)' && up.model.system.patm.value === 1.0337 && up.model.system.fluidGas.name === 'Synthetic air');
  ok('the title of the file when there is no file name', read(aro({ secs: [[BASE('JUNCTIONS'), [junc({ type: 2, id: 1, pipes: [-1], t: tank({ P: 1 }) }), junc({ type: 4, id: 2, pipes: [1], t: press({ P: 0 }) })]], [BASE('PIPES'), [pipe({ id: 1, from: 1, to: 2, L: 10, D: 5 })]]] }), { name: '' }).model.title === 'Synthetic test');
}

console.log('\nFirst line and refusals');
{
  const body = aro({ secs: [[BASE('JUNCTIONS'), [junc({ type: 2, id: 1, pipes: [-1], t: tank({ P: 1 }) }), junc({ type: 4, id: 2, pipes: [1], t: press({ P: 0 }) })]], [BASE('PIPES'), [pipe({ id: 1, from: 1, to: 2, L: 10, D: 5 })]]] }).split('\r\n').slice(1).join('\r\n');
  const hd = ARO.parse.header('SOMEGAS VERSION 11 INPUT FILE\r\n[X]'), hd9 = ARO.parse.header('ABC SOMEGAS VERSION 9 INPUT FILE');
  ok('the version is read from the first line, with or without a maker word', hd && hd.version === 11 && hd9 && hd9.version === 9 && hd.program === hd9.program);
  // the words of the programs are not in the code: the hashes are set to words of this test for the checks
  const saved = Object.assign({}, X.PROGRAMS);
  let thrown = '';
  try {
    X.PROGRAMS.gas = X.wordHash('SOMEGAS'); X.PROGRAMS.liquid = X.wordHash('SOMELIQUID');
    const rg = read('ABC SOMEGAS VERSION 10 INPUT FILE\r\n' + body);
    ok('a model of the gas program is read, with its version', rg.version === 10 && rg.model.junctions.length === 2);
    try { read('ABC SOMELIQUID VERSION 10 INPUT FILE\r\n' + body); } catch (e) { thrown = e.message; }
    ok('a liquid model of the family is refused, with the extension to use', thrown === PumpIt.i18n.t('core.aro.liquidModel'), thrown);
    thrown = '';
    try { read('XYZ OTHER VERSION 9 INPUT FILE\r\n' + body); } catch (e) { thrown = e.message; }
    ok('a model of another program of the family is refused', thrown === PumpIt.i18n.t('core.aro.otherProgram'), thrown);
  } finally { Object.assign(X.PROGRAMS, saved); }
  thrown = '';
  try { read('[SOMETHING]\r\nkey= 1\r\n'); } catch (e) { thrown = e.message; }
  ok('a file without the network of the base scenario is refused', thrown === PumpIt.i18n.t('core.aro.notAro'));
  thrown = '';
  try { read(body, { scenario: 9 }); } catch (e) { thrown = e.message; }
  ok('a scenario that is not in the file is refused', thrown === PumpIt.i18n.t('core.import.noScenario', { scenario: '9' }));
}

console.log('\nScenarios');
{
  // #2, child of the base: the temperature of the tank (block of the type after the anchor, with packed tables), pipe 2
  // redrawn with 3 points and a new diameter, pipe 5 and junction 6 deleted, junction 7 and pipe 6 added. #3, grandchild:
  // the elevation of junction 3, the length of pipe 1 and its own ambient pressure
  const COMPACT = ['', '', '', '0', '0', '', '0', '-2', '', '', '', '', '', '', '-0', '-999'];
  const deltaJ = (type, id, np, common, block) => {
    const blk = new Array(46).fill('');
    for (const [k, v] of Object.entries(common || {})) blk[k] = v;
    const tb = new Array(16).fill('');
    for (const [k, v] of Object.entries(block || {})) tb[k] = v;
    return [type, id, '', '', '', -np, ...new Array(np).fill(''), ...blk, ...COMPACT, ...tb].join(',');
  };
  const deltaP = (id, { pts, D, L, z } = {}) => {
    const head = [id, '', '', '', z == null ? '' : z, L == null ? -1 : 1, L == null ? '' : L, '', ''];
    const p = pts ? [pts.length, ...pts.flat()] : [-2, '', '', '', '', '', ''];
    const blk = new Array(30).fill('');
    if (D != null) blk[5] = D;
    return [...head, ...p, ...blk].join(',');
  };
  const file = aro({
    scen: [['Base Scenario', ''], ['Hot', 'Base Scenario', 'Line 1\x16Line 2, with a comma'], ['High', 'Base Scenario/Hot']],
    secs: [
      [BASE('JUNCTIONS'), [
        junc({ type: 2, id: 1, pipes: [-1], t: tank({ P: 5, T: 30 }) }),
        junc({ type: 1, id: 2, pipes: [1, -2, -5], t: branch({ np: 3 }) }),
        junc({ type: 4, id: 3, pipes: [2], t: press({ P: 0 }) }),
        junc({ type: 11, id: 6, pipes: [5], t: [] }),
      ]],
      [BASE('PIPES'), [pipe({ id: 1, from: 1, to: 2, L: 10, D: 10 }), pipe({ id: 2, from: 2, to: 3, L: 20, D: 10 }), pipe({ id: 5, from: 2, to: 6, L: 5, D: 5 })]],
      ['JUNCTIONS -- SCENARIO #2 -- Hot', ['NumberOfJunctions= 3', 'DELETED,11,6,Dead End', deltaJ(2, 1, 1, {}, { 11: 80 }), junc({ type: 3, id: 7, pipes: [6], t: flow({ q: 2, qu: 'kg/sec' }) })]],
      ['PIPES -- SCENARIO #2 -- Hot', ['NumberOfPipes= 3', 'DELETED,5,Pipe', deltaP(2, { pts: [[0, 0, 0], [50, 0, 0], [50, 50, 0]], D: 7.5 }), pipe({ id: 6, from: 2, to: 7, L: 8, D: 5 })]],
      ['JUNCTIONS -- SCENARIO #3 -- High', ['NumberOfJunctions= 1', deltaJ(4, 3, 1, { 7: 35 }, {})]],
      ['PIPES -- SCENARIO #3 -- High', ['NumberOfPipes= 1', deltaP(1, { L: 12, z: 1 })]],
      ['FLUID DATA -- SCENARIO #3 -- High', ['Ambient Pressure= 0.8,atm']],
    ],
  });
  const list = ARO.scenarios(file);
  ok('the scenarios with their paths, and a description read by its length', list.length === 3 && list[2].path === 'Base Scenario/Hot/High' && list[1].description === 'Line 1\nLine 2, with a comma', JSON.stringify(list[1]));
  const r2 = read(file, { scenario: 2, name: 'Net.aro' }), s2 = r2.model;
  ok('child: the tank keeps its pressure and changes its temperature (the anchor realigns the block)', J(s2, 1).gasT.value === 80 && J(s2, 1).surfP.value === 5, JSON.stringify(J(s2, 1)));
  ok('child: pipe 2 redrawn with 3 points and a new diameter, the length inherited', P(s2, 2).geometry.d.value === 7.5 && P(s2, 2).length.value === 20 && P(s2, 2).down === 3);
  ok('child: deletions and new records', !P(s2, 5) && !J(s2, 6) && P(s2, 6).down === 7 && J(s2, 7).Q.unit === 'kg/s' && J(s2, 7).Q.value === 2, `${s2.pipes.map((p) => p.id)} | ${s2.junctions.map((j) => j.id)}`);
  ok('the title and the scenario take its name', s2.title === 'Net (Hot)' && s2.scenarios.list[0].name === 'Hot' && hasNote(r2, 'scenario'));
  const s3 = read(file, { scenario: 'High' }).model;
  ok('grandchild: what its parent changed, and its own change', J(s3, 1).gasT.value === 80 && !P(s3, 5) && J(s3, 3).elevation.value === 35, JSON.stringify(J(s3, 3).elevation));
  ok('grandchild: a length defined in the delta and an ambient pressure of its own', P(s3, 1).length.value === 12 && s3.system.patm.value === 0.8 && J(s3, 1).surfP.value === 5);
  const s1 = read(file).model;
  ok('the base scenario stays as it is', J(s1, 1).gasT.value === 30 && !!P(s1, 5) && !J(s1, 7));
}

console.log('\nValves, control valves, compressors and special conditions');
{
  const f = aro({
    secs: [
      [BASE('JUNCTIONS'), [
        junc({ type: 2, id: 1, pipes: [-1], t: tank({ P: 3 }) }),
        junc({ type: 8, id: 2, pipes: [1, -2], spec: 1, t: valve({ K: 8.3 }) }),
        junc({ type: 9, id: 3, pipes: [2, -3], spec: 0, t: cvalve(2, 500, 'kg/hr') }),
        junc({ type: 9, id: 4, pipes: [3, -4], spec: 2, t: cvalve(0, 1, 'barG') }),
        junc({ type: 8, id: 5, pipes: [4], spec: 0, t: valve({ model: 3, nc: 3, coef: [0, 0, 55], P: 0, Pu: 'barG', T: 21, Tu: 'deg. C' }) }),
        junc({ type: 8, id: 6, pipes: [-5], spec: 1, t: valve({}) }),
        junc({ type: 12, id: 7, pipes: [5, -6], t: [2, 1, 1] }),
        junc({ type: 17, id: 8, pipes: [6, -7], spec: 0, t: comp({ mode: 0, configs: [{ qmax: 0.8, H: [83, -28, -112] }] }) }),
        junc({ type: 6, id: 9, pipes: [7, -8], t: bend(-2) }),
        junc({ type: 4, id: 10, pipes: [8, 9, 10, 11], t: press({ P: 0, ks: [[0, 0], [0, 0], [0, 0], [0, 0]] }) }),
        junc({ type: 4, id: 11, pipes: [-10, -11], t: press({ P: 0, ks: [[0, 0], [0, 0]] }) }),
      ]],
      [BASE('PIPES'), [
        pipe({ id: 1, from: 1, to: 2, L: 5, D: 5 }), pipe({ id: 2, from: 2, to: 3, L: 5, D: 5 }), pipe({ id: 3, from: 3, to: 4, L: 5, D: 5 }),
        pipe({ id: 4, from: 4, to: 5, L: 5, D: 5 }), pipe({ id: 5, from: 6, to: 7, L: 5, D: 5 }), pipe({ id: 6, from: 7, to: 8, L: 5, D: 5 }),
        pipe({ id: 7, from: 8, to: 9, L: 5, D: 5 }), pipe({ id: 8, from: 9, to: 10, L: 5, D: 5 }),
        pipe({ id: 9, from: 0, to: 10, L: 5, D: 5 }), pipe({ id: 10, from: 11, to: 10, D: 0, Du: 'None' }), pipe({ id: 11, from: 11, to: 10, L: 5, D: 5, special: 1 }),
      ]],
    ],
  });
  const r = read(f), m = r.model;
  ok('a closed valve (special condition 1), its K read after the list of coefficients', J(m, 2).type === 'valve' && J(m, 2).closed === true && J(m, 2).K === 8.3 && hasNote(r, 'closed', 'J2'));
  ok('a flow control valve: an FCV of Pump It in kg/h, opening when it cannot control', J(m, 3).type === 'control' && J(m, 3).ctype === 'FCV' && J(m, 3).setQ.unit === 'kg/h'
    && J(m, 3).setQ.value === 500 && J(m, 3).alwaysControl === false && J(m, 3).failAction === 'open' && J(m, 3).special === 'none');
  ok('a pressure reducing valve set open without control (special condition 2): a PRV in that state', J(m, 4).type === 'control' && J(m, 4).ctype === 'PRV' && J(m, 4).special === 'open'
    && J(m, 4).setP.unit === 'bar(g)' && hasNote(r, 'openUncontrolled', 'J4') && hasNote(r, 'controlType', 'J4') && hasNote(r, 'controlBasis', 'J4'));
  ok('a discharge valve given by a curve: an exit valve with K = 0 and a note', J(m, 5).type === 'exitvalve' && J(m, 5).Pout.unit === 'bar(g)' && J(m, 5).Pout.value === 0 && J(m, 5).K === 0 && hasNote(r, 'valveCurve', 'J5'));
  ok('a closed discharge valve: a closed end', J(m, 6).type === 'flow' && J(m, 6).Q.value === 0 && hasNote(r, 'closedEnd', 'J6'));
  ok('an orifice, whose data the description does not give: a component with K = 0', J(m, 7).type === 'generic' && J(m, 7).K === 0 && hasNote(r, 'unknownLoss', 'J7'));
  const c8 = J(m, 8);
  // no source upstream (the closed valve 6 ends that side): the suction at the mean of the sources, tank 1 at 3 barG and
  // the imposed pressures 10 and 11 at 0 barG, all at 20 °C
  const P0s = 101325 + 1e5, T0s = 293.15, gx = PumpIt.fluids.evaluateGas(m.system), ZRT = gx.Z * gx.R * T0s;
  const headOf = (dPkPa) => (ZRT * gx.k / (gx.k - 1)) * ((1 + dPkPa * 1e3 / P0s) ** ((gx.k - 1) / gx.k) - 1) / U.G0;
  const rise = (x) => 83 - 28 * x - 112 * x * x;
  ok('a compressor curve of pressure rise against mass flow becomes the head against the volume flow at the suction', c8.type === 'pump' && c8.mode === 'curve' && c8.curve.x.length === 21
    && c8.curve.xUnit === 'm³/h' && c8.curve.yUnit === 'm' && near(c8.curve.y[0], headOf(83), 1e-8) && near(c8.curve.x[20], 0.8 * ZRT / P0s * 3600, 1e-8)
    && near(c8.curve.y[10], headOf(rise(0.4)), 1e-8) && hasNote(r, 'compressorSources', 'J8') && hasNote(r, 'compressorEta', 'J8'), `${c8.curve.x[20]} m³/h, ${c8.curve.y[0]} m`);
  const fT = PumpIt.hyd.craneFT(0.05);
  ok('a bend without a K: the Crane L/D of its r/D (1.5: 14) times fT of the inlet pipe', J(m, 9).type === 'generic' && near(J(m, 9).K, +(14 * fT).toPrecision(4), 1e-12) && hasNote(r, 'bendK', 'J9'), `K = ${J(m, 9).K}`);
  ok('a pipe to a junction that is not in the file is left out', !P(m, 9) && hasNote(r, 'dangling', 'P9'));
  ok('a diameter the file leaves undefined stays blank for the user', P(m, 10).geometry.d.value === null && hasNote(r, 'notGiven', 'P10') && hasNote(r, 'noLength', 'P10'));
  ok('a pipe closed in the file comes in closed, with a note', P(m, 11).closed === true && hasNote(r, 'closedPipe', 'P11'));
  ok('the bend K of Crane for other angles: in proportion below 90°, the rule for several bends beyond it', near(ARO.parse.bendK(0.02, 45, 1.5), 0.5 * 0.28, 1e-12)
    && near(ARO.parse.bendK(0.02, 180, 2), 0.25 * Math.PI * 0.02 * 2 + 1.5 * 0.24, 1e-12) && near(ARO.parse.bendK(0.02, 90, 2.5), 0.02 * 12, 1e-12));
}

console.log('\nNodes, sources, losses at connections and closed junctions');
{
  const f = aro({
    secs: [
      [BASE('JUNCTIONS'), [
        junc({ type: 2, id: 1, pipes: [-1, -2], t: tank({ P: 2, ks: [[0.5, 1], [0, 0]] }) }),
        junc({ type: 1, id: 2, pipes: [1, -3], t: branch({ np: 2, ks: [0, 0.7], q: 100, qu: 'Nm3/h' }) }),
        junc({ type: 3, id: 3, pipes: [3], t: flow({ q: 50, qu: 'kg/hr', out: false, T: 60, Tu: 'deg. C', K: 2 }) }),
        junc({ type: 7, id: 4, pipes: [2, -4, -5], t: [0, 90, 2, 0, 0, 'NA'] }),
        junc({ type: 4, id: 5, pipes: [4], spec: 1, t: press({ P: 0 }) }),
        junc({ type: 16, id: 6, pipes: [5], t: [0, 0, 0, 0, 1] }),
        junc({ type: 10, id: 7, pipes: [6, -7], t: [0, 0] }),
        junc({ type: 17, id: 8, pipes: [-6], t: comp({ mode: 2, q: 300, qu: 'scfm' }) }),
        junc({ type: 11, id: 9, pipes: [7], t: [] }),
      ]],
      [BASE('PIPES'), [
        pipe({ id: 1, from: 1, to: 2, L: 10, D: 5 }), pipe({ id: 2, from: 1, to: 4, L: 10, D: 5 }), pipe({ id: 3, from: 2, to: 3, L: 10, D: 5 }),
        pipe({ id: 4, from: 4, to: 5, L: 10, D: 5 }), pipe({ id: 5, from: 4, to: 6, L: 10, D: 5 }), pipe({ id: 6, from: 8, to: 7, L: 10, D: 5 }),
        pipe({ id: 7, from: 7, to: 9, L: 10, D: 5 }),
      ]],
    ],
  });
  const r = read(f), m = r.model;
  ok('losses K at the connections of a tank (entering the pipe, entering the tank), with a note', JSON.stringify(J(m, 1).pipeK) === JSON.stringify({ 1: { kOut: 0.5, kIn: 1 } }) && hasNote(r, 'connectionK', 'J1'));
  ok('a node with a source in Nm³/h (a hypothesis) and the K of a connection', J(m, 2).type === 'branch' && J(m, 2).source.unit === 'Nm³/h' && J(m, 2).source.value === 100
    && JSON.stringify(J(m, 2).pipeK) === JSON.stringify({ 3: { kOut: 0.7, kIn: 0.7 } }) && hasNote(r, 'nodeSource', 'J2'));
  ok('an imposed flow entering: its mass flow, the temperature of its gas and the K of its connection', J(m, 3).type === 'flow' && J(m, 3).dir === 'in' && J(m, 3).Q.unit === 'kg/h'
    && J(m, 3).Q.value === 50 && J(m, 3).gasT.value === 60 && J(m, 3).pipeK[3].kOut === 2 && hasNote(r, 'connectionK', 'J3'));
  ok('a tee: a node without losses of its own, with a note', J(m, 4).type === 'branch' && hasNote(r, 'teeNode', 'J4'));
  ok('a closed imposed pressure closes its pipe', J(m, 5).type === 'pressure' && P(m, 4).closed === true && hasNote(r, 'closedJunction', 'J5'));
  ok('a discharge nozzle on one pipe: an exit valve to the ambient pressure', J(m, 6).type === 'exitvalve' && J(m, 6).K === 0 && J(m, 6).Pout.value === 0 && hasNote(r, 'nozzleExit', 'J6'));
  ok('a check valve (no data in the description): a component with K = 0', J(m, 7).type === 'generic' && J(m, 7).K === 0 && hasNote(r, 'unknownLoss', 'J7'));
  const Qn = 300 * FT ** 3 * (101325.4 / 101325) * (273.15 / (15.55555 + 273.15));
  ok('a fixed-flow compressor on one pipe: an imposed flow entering, in normal m³/min from scfm', J(m, 8).type === 'flow' && J(m, 8).dir === 'in' && J(m, 8).Q.unit === 'Nm³/min'
    && near(J(m, 8).Q.value, Qn, 1e-12) && hasNote(r, 'pumpOnePipeFlow', 'J8'), JSON.stringify(J(m, 8).Q));
  ok('nothing else needs the user', !r.notes.some((n) => n.level === 'missing'), r.notes.filter((n) => n.level === 'missing').map((n) => n.key).join(' '));
}

console.log('\nThe gas: mixtures, isothermal pipes, temperatures');
{
  const two = (o) => aro(Object.assign({ secs: [[BASE('JUNCTIONS'), [junc({ type: 2, id: 1, pipes: [-1], t: tank({ P: o.P || 1, T: 40 }) }), junc({ type: 4, id: 2, pipes: [1], t: press({ P: 0, T: 40 }) })]],
    [BASE('PIPES'), [pipe(Object.assign({ id: 1, from: 1, to: 2, L: 10, D: 5 }, o.pipe || {}))]]] }, o));
  const mix = read(two({ src: 6, gas: 'hydrogen/methane,6,0,0,deg. C,1,2,Hydrogen (normal),Hydrogen (normal),1,0.11,Methane,Methane,2,0.89,9,0,0' }));
  const yH = (0.11 / 2.016) / (0.11 / 2.016 + 0.89 / 16.043), MWm = yH * 2.016 + (1 - yH) * 16.043;
  const g = mix.model.system.fluidGas;
  const cpm = (yH * 2.016 * 14307 + (1 - yH) * 16.043 * 2253.7) / MWm;
  const mum = (yH * 8.9e-6 * Math.sqrt(2.016) + (1 - yH) * 11.1e-6 * Math.sqrt(16.043)) / (yH * Math.sqrt(2.016) + (1 - yH) * Math.sqrt(16.043));
  ok('a mixture in mass fractions: molar mass, k from the specific heats, μ by Herning and Zipperer', near(g.MW, MWm, 1e-5) && near(g.k, kOf(cpm, MWm), 1e-5) && near(g.mu.value * 1e-3, mum, 1e-4) && g.Z === 1 && hasNote(mix, 'gasMixture'), JSON.stringify(g));
  const pure = read(two({ src: 6, gas: 'N2,6,0,0,deg. C,1,1,Nitrogen,Nitrogen,1,1,0,0,0' })).model.system.fluidGas;
  ok('a pure gas of the external source: the tables of Pump It', near(pure.MW, 28.014, 1e-9) && near(pure.k, kOf(1039, 28.014), 1e-5) && near(pure.mu.value, 0.0179, 1e-9));
  const minor = read(two({ src: 6, gas: 'NG,6,0,0,deg. C,1,3,Methane,Methane,1,0.95,Ethane,Ethane,2,0.02,Unobtainium,Unobtainium,3,0.03,0,0,0' }));
  ok('a component without data of at most 5 % is left out, with a note', hasNote(minor, 'gasMinor') && minor.notes.find((n) => n.key === 'gasMinor').params.names === 'Unobtainium' && !hasNote(minor, 'gasDefault'));
  const many = read(two({ src: 6, gas: 'X,6,0,0,deg. C,1,2,Methane,Methane,1,0.8,Unobtainium,Unobtainium,3,0.2,0,0,0' }));
  ok('more of it, and the gas becomes air, with a note', many.model.system.fluidGas.gas === 'air' && hasNote(many, 'gasComponents') && !hasNote(many, 'gasDefault'));
  const none = read(two({ src: 9, gas: 'Something,9,0' }));
  ok('a source that is not described: air, with a note', none.model.system.fluidGas.gas === 'air' && hasNote(none, 'gasDefault'));
  const iso = read(two({ pipe: { th: 1, Tth: 15 } }));
  ok('every pipe isothermal: an isothermal model at their temperature', iso.model.system.gasMode === 'isothermal' && iso.model.system.fluidGas.T.value === 15 && hasNote(iso, 'isothermal'));
  const isoF = read(two({ pipe: { th: 1, Tth: 59, Tthu: 'deg. F' } }));
  ok('…in the unit of the file', isoF.model.system.fluidGas.T.unit === '°F' && near(isoF.model.system.fluidGas.T.value, 59, 1e-9), JSON.stringify(isoF.model.system.fluidGas.T));
  const dense = read(two({ P: 5, gas: GAS.replace('132.5,deg. K,3.77,MPa', '300,deg. K,4,MPa') }));
  ok('a gas far from the ideal one gets Z of the correlation, with a note', dense.model.system.fluidGas.Z < 0.98 && hasNote(dense, 'gasZ'), `Z = ${dense.model.system.fluidGas.Z}`);
  const range = read(two({ gas: GAS.replace('deg. K,1000,200', 'deg. K,1000,350') }));
  ok('a temperature outside the range of the properties of the file is reported', hasNote(range, 'gasRange'));
  const stdNo = read(aro({ stp: null, secs: [[BASE('JUNCTIONS'), [junc({ type: 2, id: 1, pipes: [-1], t: tank({ P: 1 }) }), junc({ type: 3, id: 2, pipes: [1], t: flow({ q: 100, qu: 'sm3/h' }) })]], [BASE('PIPES'), [pipe({ id: 1, from: 1, to: 2, L: 10, D: 5 })]]] }));
  ok('standard volume flows without the standard conditions: 1 atm and 60 °F, with a note', near(J(stdNo.model, 2).Q.value, 100 * 273.15 / ((60 - 32) / 1.8 + 273.15), 1e-12) && hasNote(stdNo, 'standardDefault', 'J2'));
}

console.log('\nElevations, friction formulas and records');
{
  const f = aro({
    secs: [
      [BASE('JUNCTIONS'), [
        junc({ type: 2, id: 1, pipes: [-1], zu: 'None', t: tank({ P: 2 }) }),
        junc({ type: 1, id: 2, pipes: [1, -2, -3, -4], z: 4, t: branch({ np: 4 }) }),
        junc({ type: 4, id: 3, pipes: [2], z: 4, t: press({ P: 0 }) }),
        junc({ type: 4, id: 4, pipes: [3], z: 4, t: press({ P: 0 }) }),
        junc({ type: 5, id: 5, pipes: [4, -5], z: 4, t: [0] }),
        junc({ type: 4, id: 7, pipes: [5], z: 4, t: press({ P: 0 }) }),
        '3,6,6,8,,1,99',
      ]],
      [BASE('PIPES'), [
        pipe({ id: 1, from: 1, to: 2, L: 100, D: 20, z1: 7, z2: 4, fric: ['8', 0, 'None'] }),
        pipe({ id: 2, from: 2, to: 3, L: 100, D: 20, z1: 4, fric: ['9', 0, 'None'] }),
        pipe({ id: 3, from: 2, to: 4, L: 100, D: 20, z1: 4, fric: ['2', 0, 'None'] }),
        pipe({ id: 4, from: 2, to: 5, L: 10, D: 5, z1: 4, fric: ['7', 0, 'None'] }),
        pipe({ id: 5, from: 5, to: 7, L: 10, D: 5, z1: 4 }),
      ]],
    ],
  });
  const r = read(f), m = r.model;
  ok('an elevation the file leaves undefined comes from the ends of the pipes', J(m, 1).elevation.value === 7 && J(m, 1).liquidElev.value === 7 && hasNote(r, 'elevationFromPipes', 'J1'));
  ok('Weymouth: a fixed f = 0.032/d^(1/3), d in inches; Panhandle: commercial steel; code 2: smooth', P(m, 1).friction.model === 'explicitF' && near(P(m, 1).friction.f, 0.032 / Math.cbrt(0.2 / 0.0254), 1e-6)
    && hasNote(r, 'weymouth', 'P1') && P(m, 2).friction.eps.value === 0.046 && hasNote(r, 'panhandle', 'P2') && P(m, 3).friction.model === 'smooth' && hasNote(r, 'smooth', 'P3'));
  ok('a friction code that is not described: a blank roughness, with a note', P(m, 4).friction.eps.value === null && hasNote(r, 'friction', 'P4'));
  ok('a kind not described between two pipes: a component with K = 0; a broken record is left out', J(m, 5).type === 'generic' && hasNote(r, 'unknownLoss', 'J5') && !J(m, 6) && hasNote(r, 'badRecord', 'J6'));
  const fz = aro({ secs: [[BASE('JUNCTIONS'), [junc({ type: 2, id: 1, pipes: [-1], z: 5, t: tank({ P: 1 }) }), junc({ type: 4, id: 2, pipes: [1], z: 0, t: press({ P: 0 }) })]], [BASE('PIPES'), [pipe({ id: 1, from: 1, to: 2, L: 10, D: 5, z1: 6, z2: 0 })]]] });
  ok('a pipe connected at another elevation than its junction is reported', hasNote(read(fz), 'elevations', 'J1'));
}

console.log('\nThe calculation against the same network built in Pump It');
// supply tank, a node with a K at a connection, a valve, a flow control valve in normal m³/h, an imposed flow leaving,
// an imposed pressure and an exit valve, with pipes of several friction models and sections
const NET = () => [
  junc({ type: 2, id: 1, name: 'Supply', pipes: [-1], x: 0, y: 0, z: 0, t: tank({ P: 6, T: 40, ks: [[0.5, 1]] }) }),
  junc({ type: 1, id: 2, pipes: [1, -2, -5, -6], x: 100, y: 0, z: 5, t: branch({ np: 4, ks: [0, 0, 0.3, 0] }) }),
  junc({ type: 8, id: 3, pipes: [2, -3], x: 200, y: 0, z: 5, t: valve({ K: 3 }) }),
  junc({ type: 9, id: 4, pipes: [3, -4], x: 300, y: 0, z: 5, t: cvalve(2, 800, 'Nm3/h') }),
  junc({ type: 3, id: 5, pipes: [5], x: 100, y: 100, z: 2, t: flow({ q: 0.3, qu: 'kg/sec' }) }),
  junc({ type: 4, id: 6, pipes: [4], x: 400, y: 0, z: 3, t: press({ P: 2, T: 25 }) }),
  junc({ type: 8, id: 7, pipes: [6], x: 100, y: -100, z: 4, t: valve({ K: 4, P: 4, Pu: 'barG', T: 20, Tu: 'deg. C' }) }),
];
const PIPES = () => [
  pipe({ id: 1, from: 1, to: 2, L: 100, D: 15.405, z1: 0, z2: 5, fric: ['0', 0.0046, 'cm'], K: 1.2 }),
  pipe({ id: 2, from: 2, to: 3, L: 50, D: 6.065, Du: 'inches', z1: 5, fric: ['1', 0.0003, 'None'] }),
  pipe({ id: 3, from: 3, to: 4, L: 10, D: 15.405, z1: 5 }),
  pipe({ id: 4, from: 4, to: 6, L: 40, D: 15.405, z1: 5, z2: 3 }),
  pipe({ id: 5, from: 2, to: 5, L: 30, D: 13.3333, rect: [20, 10], z1: 5, z2: 2, fric: ['4', 0.02, 'None'] }),
  pipe({ id: 6, from: 2, to: 7, L: 20, D: 5.25, z1: 5, z2: 4 }),
];
function reference(gas) {
  const m = M.newModel();
  Object.assign(m.system, { regime: 'compressible', gasMode: 'adiabatic', patm: q(1, 'atm'), fluidGas: JSON.parse(JSON.stringify(gas)) });
  const add = (type, id, props) => { const j = Object.assign(M.newJunction(type, id, 0, 0), props); m.junctions.push(j); return j; };
  add('reservoir', 1, { elevation: q(0, 'm'), liquidElev: q(0, 'm'), surfP: q(6, 'bar(g)'), gasT: q(40, '°C'), pipeK: { 1: { kOut: 0.5, kIn: 1 } } });
  add('branch', 2, { elevation: q(5, 'm'), source: q(0, 'm³/h'), pipeK: { 5: { kOut: 0.3, kIn: 0.3 } } });
  add('valve', 3, { elevation: q(5, 'm'), lossModel: 'K', K: 3, closed: false });
  add('control', 4, { elevation: q(5, 'm'), ctype: 'FCV', setQ: q(800, 'Nm³/h'), alwaysControl: false, failAction: 'open', kOpen: 0, special: 'none' });
  add('flow', 5, { elevation: q(2, 'm'), Q: q(0.3, 'kg/s'), dir: 'out' });
  add('pressure', 6, { elevation: q(3, 'm'), P: q(2, 'bar(g)'), ptype: 'stagnation', gasT: q(25, '°C') });
  add('exitvalve', 7, { elevation: q(4, 'm'), Pout: q(4, 'bar(g)'), lossModel: 'K', K: 4 });
  const pp = (id, up, down, L, geometry, friction, fittings = []) => {
    const p = M.newPipe(id, up, down);
    Object.assign(p, { length: L, fittings });
    p.material = { kind: 'user', nps: '4', sch: '40' };
    Object.assign(p.geometry, geometry);
    Object.assign(p.friction, friction);
    m.pipes.push(p);
  };
  const rough = { model: 'roughness', eps: q(0.004572, 'cm') };
  pp(1, 1, 2, q(100, 'm'), { kind: 'circular', d: q(15.405, 'cm') }, { model: 'roughness', eps: q(0.0046, 'cm') }, [{ model: 'K', value: 1.2, qty: 1 }]);
  pp(2, 2, 3, q(50, 'm'), { kind: 'circular', d: q(6.065, 'in') }, { model: 'relRoughness', rel: 0.0003 });
  pp(3, 3, 4, q(10, 'm'), { kind: 'circular', d: q(15.405, 'cm') }, rough);
  pp(4, 4, 6, q(40, 'm'), { kind: 'circular', d: q(15.405, 'cm') }, rough);
  pp(5, 2, 5, q(30, 'm'), { kind: 'rectangular', width: q(20, 'cm'), height: q(10, 'cm') }, { model: 'explicitF', f: 0.02 });
  pp(6, 2, 7, q(20, 'm'), { kind: 'circular', d: q(5.25, 'cm') }, rough);
  return m;
}
{
  const res0 = read(aro({ secs: [[BASE('JUNCTIONS'), NET()], [BASE('PIPES'), PIPES()]] }));
  const ref = reference(res0.model.system.fluidGas);
  const rRef = run(ref);
  ok('the reference network solves', rRef.ok && rRef.converged, rRef.ok ? `${rRef.iterations} iterations` : (rRef.errors || []).join('; '));
  const res = read(aro({ secs: [[BASE('JUNCTIONS'), NET()], [BASE('PIPES'), PIPES()], [BASE('PIPE ARCHIVE DATA'), archiveOf(rRef)]] }), { name: 'Air network.aro' });
  const m1 = res.model;
  ok('7 junctions and 6 pipes with the IDs of the file, of the expected types', m1.junctions.length === 7 && m1.pipes.length === 6
    && ['reservoir', 'branch', 'valve', 'control', 'flow', 'pressure', 'exitvalve'].every((type, i) => J(m1, i + 1).type === type), m1.junctions.map((j) => j.id + ':' + j.type).join(' '));
  ok('the temperature of the gas is the mean of its sources, in their unit', m1.system.fluidGas.T.unit === '°C' && near(m1.system.fluidGas.T.value, 32.5, 1e-9));
  const v1 = M.validate(M.effective(m1, 'base'));
  ok('the imported model is complete', v1.ok, v1.ok ? '' : JSON.stringify([...v1.undef.keys()].slice(0, 3)));
  const r1 = run(m1);
  ok('it solves', r1.ok && r1.converged, r1.ok ? `${r1.iterations} iterations` : (r1.errors || []).join('; '));
  let dQ = 0, dP = 0;
  const Pscale = Math.max(...Object.values(rRef.pipes).map((x) => Math.abs(x.P0in || 0)));
  for (const id of Object.keys(rRef.pipes)) {
    dQ = Math.max(dQ, relDiff(r1.pipes[id].m, rRef.pipes[id].m, 1));
    dP = Math.max(dP, relDiff(r1.pipes[id].P0in, rRef.pipes[id].P0in, Pscale), relDiff(r1.pipes[id].P0out, rRef.pipes[id].P0out, Pscale));
  }
  ok('same flows and pressures as the network built in Pump It', dQ < 1e-9 && dP < 1e-9, `flow ${dQ.toExponential(1)} kg/s, pressure ${dP.toExponential(1)}`);
  const cmp = ARO.compare(r1, res.stored);
  ok('the comparison with the stored results finds them equal', cmp.n === 6 && cmp.flow < 1e-8 && cmp.pressure < 1e-8, `flow ${cmp.flow.toExponential(1)}, pressure ${cmp.pressure.toExponential(1)}`);
  const m2 = read(aro({ secs: [[BASE('JUNCTIONS'), NET()], [BASE('PIPES'), PIPES()]] })).model;
  J(m2, 7).K = 40; // a different exit valve: the comparison has to show it
  const c2 = ARO.compare(run(m2), res.stored);
  ok('a model that differs from the stored results shows the difference', c2.flow > 1e-3 && c2.pressure > 1e-3, `flow ${(c2.flow * 100).toFixed(2)} %, pressure ${(c2.pressure * 100).toFixed(2)} %`);
  ok('nothing needs the user in that file', !res.notes.some((n) => n.level === 'missing'), res.notes.filter((n) => n.level === 'missing').map((n) => n.key).join(' '));
}

console.log('\nThe basis of a pressure set point, from the stored results');
{
  // tank at 6 barG → PRV at 3 barG → an imposed flow of 0.5 kg/s leaving; the reference controls a static or a
  // stagnation pressure, and the import finds which one from its stored results
  const file = (archive) => aro({ secs: [
    [BASE('JUNCTIONS'), [junc({ type: 2, id: 1, pipes: [-1], t: tank({ P: 6 }) }), junc({ type: 9, id: 2, pipes: [1, -2], t: cvalve(0, 3, 'barG') }), junc({ type: 3, id: 3, pipes: [2], t: flow({ q: 0.5, qu: 'kg/sec' }) })]],
    [BASE('PIPES'), [pipe({ id: 1, from: 1, to: 2, L: 20, D: 5 }), pipe({ id: 2, from: 2, to: 3, L: 5, D: 5 })]],
    ...(archive ? [[BASE('PIPE ARCHIVE DATA'), archive]] : [])] });
  for (const basis of ['static', 'stagnation']) {
    const m0 = read(file()).model;
    J(m0, 2).basis = basis;
    const r0 = run(m0);
    const res = read(file(archiveOf(r0)));
    ok(`a valve that controlled a ${basis} pressure is read so`, r0.ok && J(res.model, 2).basis === basis && hasNote(res, basis === 'static' ? 'controlStatic' : 'controlStagnation', 'J2'),
      `M = ${r0.ok ? r0.pipes[2].Min.toFixed(3) : '?'}`);
  }
}

console.log('\nA compressor between two tanks');
{
  // the curve ΔP = 83 − 28·ṁ − 112·ṁ² kPa (ṁ in kg/s) between tanks at 0 and 0.5 barG. Converted at the stored suction
  // conditions, the compressor of Pump It gives back the rise of the curve at the flow it finds
  const file = (archive) => aro({ secs: [
    [BASE('JUNCTIONS'), [junc({ type: 2, id: 1, pipes: [-1], t: tank({ P: 0 }) }), junc({ type: 17, id: 2, pipes: [1, -2], t: comp({ mode: 0, configs: [{ qmax: 0.8, H: [83, -28, -112] }] }) }),
      junc({ type: 2, id: 3, pipes: [2], t: tank({ P: 0.5 }) })]],
    [BASE('PIPES'), [pipe({ id: 1, from: 1, to: 2, L: 10, D: 20 }), pipe({ id: 2, from: 2, to: 3, L: 10, D: 20 })]],
    ...(archive ? [[BASE('PIPE ARCHIVE DATA'), archive]] : [])] });
  const rise = (x) => (83 - 28 * x - 112 * x * x) * 1e3;
  const res0 = read(file());
  let r = run(res0.model);
  ok('without stored results the curve is converted at the source upstream, and the model solves', hasNote(res0, 'compressorSource', 'J2') && r.ok && r.converged && r.pipes[1].m > 0,
    r.ok ? `ṁ ${r.pipes[1].m.toFixed(4)} kg/s, rise ${(r.pumps[2].dP / 1e3).toFixed(3)} kPa, curve ${(rise(r.pipes[1].m) / 1e3).toFixed(3)} kPa` : (r.errors || []).join('; '));
  // twice from the stored results of the previous calculation: the suction of the conversion meets that of the solution
  let res = null, dp = NaN, m = NaN;
  for (let i = 0; i < 3 && r.ok; i++) {
    res = read(file(archiveOf(r)));
    r = run(res.model);
    m = r.ok ? r.pipes[1].m : NaN;
    dp = r.ok ? r.pumps[2].dP : NaN;
  }
  ok('converted at the stored suction, it gives back the rise of the curve at its flow', hasNote(res, 'compressorStored', 'J2') && Math.abs(dp - rise(m)) < 2e-3 * rise(m), `ṁ ${m.toFixed(4)} kg/s, rise ${(dp / 1e3).toFixed(3)} kPa, curve ${(rise(m) / 1e3).toFixed(3)} kPa`);
}

console.log('\nPhysics: Fanno flow of a textbook problem');
{
  // air at 1 atm and 273 K (static) enters a pipe of 0.15 m and 30 m with f = 0.02 at 2.27 kg/s: Mach 0.30 at the inlet
  const fanno = (archive) => aro({ secs: [
    [BASE('JUNCTIONS'), [junc({ type: 4, id: 1, pipes: [-1], t: press({ P: 1, Pu: 'atm', T: 273, Tu: 'deg. K', stat: 1 }) }), junc({ type: 3, id: 2, pipes: [1], t: flow({ q: 2.27, qu: 'kg/sec' }) })]],
    [BASE('PIPES'), [pipe({ id: 1, from: 1, to: 2, L: 30, D: 0.15, Du: 'meters', fric: ['4', 0.02, 'None'] })]],
    ...(archive ? [[BASE('PIPE ARCHIVE DATA'), [archive]]] : [])] });
  const r0 = read(fanno());
  const k = PumpIt.fluids.evaluateGas(r0.model.system).k;
  const s0 = run(r0.model);
  // without stored results, 273 K is a stagnation temperature, as for every source of Pump It: the static one is lower
  const M0 = s0.ok ? s0.pipes[1].Min : NaN;
  ok('without stored results, the temperature of a static pressure is taken as a stagnation one, with a note', hasNote(r0, 'staticTemperature', 'J1')
    && Math.abs(M0 - 0.3 / Math.sqrt(1 + ((k - 1) / 2) * M0 * M0)) < 1e-3, `M1 = ${M0.toFixed(4)}`);
  // stored results with the stagnation temperature of the state of the problem (273 K static at Mach 0.30)
  const T0 = 273 * (1 + ((k - 1) / 2) * 0.09);
  const res = read(fanno(['1', 2.27 / LBM, 0, 0, T0 * 1.8, T0 * 1.8, 0, 0, 0, 0, 1.4, 1.4, 0.3, 0.46, 0.0686, 0.0686, 1, 1, 0, 0, 0, 0].join(',')));
  const r = run(res.model);
  const gas = { k };
  const M1 = r.ok ? r.pipes[1].Min : NaN, M2 = r.ok ? r.pipes[1].Mout : NaN;
  ok('with the stagnation temperature stored at the end of its pipe: Mach 0.30 at the inlet', hasNote(res, 'staticTemperatureStored', 'J1') && Math.abs(M1 - 0.3) < 1e-3, `M1 = ${M1.toFixed(4)}`);
  // exact Fanno: f·L/D = fL*/D(M1) − fL*/D(M2), and the static pressures in the ratio of P/P*
  const fld = G.fannoFLD(gas, M1) - G.fannoFLD(gas, M2);
  const ratio = G.fannoP(gas, M2) / G.fannoP(gas, M1);
  ok('the calculation follows exact Fanno flow (length and pressure ratio)', Math.abs(fld - 0.02 * 30 / 0.15) < 2e-3 * 4 && Math.abs(r.pipes[1].Pout / r.pipes[1].Pin - ratio) < 2e-3,
    `fL/D ${fld.toFixed(4)} (4), p2/p1 ${(r.pipes[1].Pout / r.pipes[1].Pin).toFixed(4)}, Fanno ${ratio.toFixed(4)}, M2 ${M2.toFixed(3)}`);
}

console.log('\nTexts');
{
  const src = ['aro.js', 'shared.js'].map((f) => fs.readFileSync(path.join(ROOT, 'src/core/import', f), 'utf8')).join('\n');
  const noteKeys = [...src.matchAll(/note\('(\w+)', (?:'(\w+)'|[^,]+\? '(\w+)' : '(\w+)')/g)].flatMap((x) => [x[2], x[3], x[4]].filter(Boolean)).concat(['pipeCount', 'unsupported']);
  const kinds = [...src.match(/const KINDS = \{([\s\S]*?)\};/)[1].matchAll(/'(\w+)'/g)].map((x) => x[1]).concat(['unknown']);
  const missing = [];
  for (const { code } of PumpIt.i18n.languages()) {
    const cat = PumpIt.i18n.catalog(code);
    for (const k of noteKeys) if (!cat.has('core.import.notes.' + k)) missing.push(`${code}: notes.${k}`);
    for (const k of kinds) if (!cat.has('core.import.kinds.' + k)) missing.push(`${code}: kinds.${k}`);
    for (const k of ['notAro', 'otherProgram', 'liquidModel', 'gasName']) if (!cat.has('core.aro.' + k)) missing.push(`${code}: aro.${k}`);
  }
  ok(`every note (${new Set(noteKeys).size}) and kind (${kinds.length}) has its text in every language`, !missing.length, missing.slice(0, 4).join(', '));
  const bad = [];
  for (const lang of ['pt-BR', 'en', 'es']) {
    PumpIt.i18n.setLanguage(lang);
    for (const n of allNotes) { const s = ARO.noteText(n); if (!s || /\{\w+\}/.test(s)) bad.push(`${lang}: ${n.key} → ${s}`); }
  }
  PumpIt.i18n.setLanguage('en');
  ok(`every note of these imports (${new Set(allNotes.map((n) => n.key)).size} kinds) reads in every language`, !bad.length, bad.slice(0, 3).join(' | '));
  const decoded = new TextDecoder('windows-1252').decode(Buffer.from(aro({ secs: [[BASE('JUNCTIONS'), [junc({ type: 2, id: 1, name: 'Vaso de pressão nº 2 – ar', pipes: [-1], t: tank({ P: 1 }) }), junc({ type: 4, id: 2, pipes: [1], t: press({ P: 0 }) })]], [BASE('PIPES'), [pipe({ id: 1, from: 1, to: 2, L: 10, D: 5 })]]] }).replace('–', '\u0096'), 'latin1'));
  ok('Windows-1252 names', J(read(decoded).model, 1).name === 'Vaso de pressão nº 2 – ar');
}

console.log(`\n${passed} checks passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
