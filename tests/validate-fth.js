// Validation against results stored in .fth files of the reference software (specification section 10).
// Usage: node tests/validate-fth.js <folder> [<folder> ...]
//
// The files serve only as an output answer key and are never copied into the project. The reader follows the
// layout of Annex A. Boundaries: at reservoirs and assigned pressures, the stagnation pressure stored at the
// end of each pipe; everything else is calculated. Comparison: mass flow of each pipe (relative to the largest
// flow) and stagnation pressure at both ends (relative to the largest pressure drop in a pipe).
const fs = require('fs');
const path = require('path');

const { loadCore } = require('./load-core');

const { model: M, solver: S, units: U } = loadCore();
const q = M.q;

const PSI = 6894.757293168, LBM = 0.45359237, FT = 0.3048;
const UNIT = {
  length: { feet: 'ft', meters: 'm', inches: 'in', mm: 'mm', cm: 'cm', miles: 'mi', km: 'km' },
  flow: {
    'gal/min': 'gpm', 'm3/sec': 'm³/s', 'm3/hr': 'm³/h', 'ft3/sec': 'ft³/s', 'liters/sec': 'L/s', 'liters/min': 'L/min',
    'lbm/sec': 'lbm/s', 'lbm/hr': 'lbm/h', 'kg/sec': 'kg/s', 'kg/hr': 'kg/h', 'm-ton/hr': 't/h', 'barrels/day': 'bbl/d',
  },
  head: { feet: 'ft', meters: 'm' },
};
// volumetric flow units with no equivalent in the app list: factor to m3/s
const FLOW_SI = { 'cm3/sec': 1e-6, 'ft3/min': FT ** 3 / 60, 'barrels/hr': 0.158987294928 / 3600, 'liter/sec': 1e-3, 'm3/min': 1 / 60, 'gal/hr': 3.785411784e-3 / 3600, 'gal/sec': 3.785411784e-3 };
function flowQ(v, name) {
  if (name === 'None' && Number(v) === 0) return q(0, 'm³/h');
  if (FLOW_SI[name]) return q(Number(v) * FLOW_SI[name], 'm³/s');
  return q(Number(v), u('flow', name));
}
const unknownUnits = new Set();
function u(cat, name) {
  const v = UNIT[cat][name];
  if (!v) { unknownUnits.add(cat + ':' + name); throw new Error(`unit ${cat} "${name}"`); }
  return v;
}

function readSections(text) {
  const out = {};
  let cur = '';
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^\s*\[(.+)\]\s*$/);
    if (h) { cur = h[1].trim(); out[cur] = []; } else if (cur) out[cur].push(line);
  }
  return out;
}
const records = (lines) => (lines || []).filter((l) => /^-?\d+,/.test(l)).map((l) => l.split(','));
const kv = (lines) => Object.fromEntries((lines || []).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const sec = (S, prefix) => { const k = Object.keys(S).find((x) => x.startsWith(prefix + ' -- SCENARIO #1 ')); return k ? S[k] : null; };

function buildCase(file) {
  const S = readSections(fs.readFileSync(file, 'latin1'));
  const app = kv(S.APPLICATION);
  for (const mod of ['ANS', 'SSL', 'GSC', 'XTS']) if (app[mod + ' Use'] === '-1') return { skip: 'module ' + mod };
  const pa = records(sec(S, 'PIPE ARCHIVE DATA'));
  if (!pa.length) return { skip: 'no stored results' };
  const fd = kv(S['FLUID DATA']);
  const rec = new Map(pa.map((f) => [+f[0], { m: +f[1] * LBM, P0in: +f[3] * PSI, P0out: +f[4] * PSI, rho: +f[7] * LBM / FT ** 3, mu: +f[8] * LBM / FT }]));
  const first = rec.values().next().value;
  if ([...rec.values()].some((r) => Math.abs(r.rho - first.rho) > 1e-6 * first.rho)) return { skip: 'properties vary per pipe' };

  const m = M.newModel();
  m.system.fluid = { kind: 'user', name: 'stored', rho: q(first.rho, 'kg/m³'), mu: q(first.mu, 'Pa·s'), pv: { value: null, unit: 'kPa(a)' } };
  m.system.patm = q(101325, 'Pa(a)');
  m.system.gravity = Number(fd['Gravity'] || 1);
  m.system.reLam = Number(fd['ReTransLam'] || 2300);
  m.system.reTurb = Number(fd['ReTransTurb'] || 4000);
  // laminar correction of the K values: 0 = none (inferred: stored effective K = given K in laminar flow)
  const alt = Number(fd['AltLossFactorMethod'] || 0);
  if (alt !== 0) return { skip: `laminar K correction (method ${alt})` };
  m.system.laminarK = 'none';
  m.solution.tolRel = 1e-8;

  // pipes
  const pipes = new Map();
  for (const f of records(sec(S, 'PIPES'))) {
    const id = +f[0];
    const b = 10 + 3 * +f[9];
    const p = M.newPipe(id, +f[b + 3], +f[b + 4]);
    p.material.kind = 'user';
    p.length = q(+f[6], u('length', f[2]));
    const geo = +f[b + 16];
    if (geo === 0) p.geometry = Object.assign(p.geometry, { kind: 'circular', d: q(+f[b + 5], u('length', f[b + 6])) });
    else if (geo === 2) p.geometry = Object.assign(p.geometry, { kind: 'noncircular', area: q(+f[b + 7] * U.toSI(1, u('length', f[b + 8].replace('2', '')), 'length') ** 2, 'm²'), perim: q(+f[b + 9], u('length', f[b + 10])) });
    else return { skip: `pipe geometry ${geo}` };
    const code = +f[b + 12], val = +f[b + 13];
    if (code === 0) p.friction = { model: 'roughness', eps: q(val, u('length', f[b + 14])) };
    else if (code === 1) p.friction = { model: 'relRoughness', rel: val };
    else if (code === 2) p.friction = { model: 'smooth' };
    else if (code === 3) p.friction = { model: 'hw', C: val };
    else if (code === 4) p.friction = { model: 'explicitF', f: val };
    else if (code === 7) p.friction = { model: 'frictionless' };
    else return { skip: `friction model ${code}` };
    const Ksum = +f[b + 20];
    p.fittings = Ksum ? [{ name: 'ΣK', model: 'K', value: Ksum, qty: 1 }] : [];
    pipes.set(id, { p, zIn: q(+f[4], u('length', f[3])), zOut: q(+f[7], u('length', f[3])) });
    m.pipes.push(p);
  }

  // junctions
  let nextJ = 100000;
  for (const f of records(sec(S, 'JUNCTIONS'))) {
    const type = +f[0], id = +f[1], np = +f[5], b = 6 + np;
    const pids = f.slice(6, 6 + np).map((x) => Math.abs(+x));
    const elev = q(+f[b + 7], u('length', f[b + 9]));
    const add = (t, props) => { const j = Object.assign(M.newJunction(t, id, 0, 0), { elevation: elev }, props); m.junctions.push(j); return j; };
    switch (type) {
      case 2: case 4: {
        // boundary: stored P0 at the end of each pipe, through its own assigned pressure
        for (const pid of pids) {
          const P = pipes.get(pid), r = rec.get(pid);
          if (!P || !r) return { skip: 'pipe without results' };
          const atUp = P.p.up === id;
          const nj = nextJ++;
          m.junctions.push(Object.assign(M.newJunction('pressure', nj, 0, 0), { elevation: atUp ? P.zIn : P.zOut, P: q(atUp ? r.P0in : r.P0out, 'Pa(a)'), ptype: 'stagnation' }));
          if (atUp) P.p.up = nj; else P.p.down = nj;
        }
        break;
      }
      case 1: {
        for (let i = 0; i < np; i++) if (+f[b + 70 + 3 * i]) return { skip: 'per-pipe K at a branch' };
        add('branch', { source: flowQ(f[b + 70 + 3 * np], f[b + 71 + 3 * np]) });
        break;
      }
      case 3: { const Q = flowQ(Math.abs(+f[b + 70]), f[b + 71]); add('flow', { Q, dir: +f[b + 72] === 0 ? 'in' : 'out' }); break; }
      case 6: add('generic', { genModel: 'K', K: +f[b + 72] }); break;
      case 8:
        if (np === 1) { // discharge valve: boundary at the pressure stored at the pipe end, like the reservoirs
          const pid = pids[0], P = pipes.get(pid), r = rec.get(pid);
          const atUp = P.p.up === id, nj = nextJ++;
          m.junctions.push(Object.assign(M.newJunction('pressure', nj, 0, 0), { elevation: atUp ? P.zIn : P.zOut, P: q(atUp ? r.P0in : r.P0out, 'Pa(a)'), ptype: 'stagnation' }));
          if (atUp) P.p.up = nj; else P.p.down = nj;
          break;
        }
        add('valve', { lossModel: 'K', K: +f[b + 90] }); break;
      case 11: add('flow', { Q: q(0, 'm³/h'), dir: 'out' }); break; // dead end
      case 17: {
        const n = +f[b + 92];
        const a = f.slice(b + 93, b + 93 + n).map(Number);
        if (!n || a.some((x) => !Number.isFinite(x))) return { skip: 'pump curve in another form' };
        const hu = u('head', f[b + 79]), qu = f[b + 81];
        if (!(qu in { 'gal/min': 1, 'm3/sec': 1, 'm3/hr': 1, 'ft3/sec': 1, 'liters/sec': 1, 'liters/min': 1 })) return { skip: `pump flow in ${qu}` };
        const pid = pids[0], r = rec.get(pid);
        const qop = U.fromSI(Math.abs(r.m) / first.rho, UNIT.flow[qu], 'volFlow') || 1;
        const xs = [0, 0.5, 1, 1.5, 2, 2.5].map((k) => k * qop);
        const ys = xs.map((x) => a.reduce((s, c, i) => s + c * x ** i, 0));
        add('pump', { curve: { x: xs, y: ys, xUnit: UNIT.flow[qu], yUnit: hu, fit: String(n - 1) }, eff: { x: [], y: [], xUnit: 'm³/h', fit: '2' }, npshr: { x: [], y: [], xUnit: 'm³/h', yUnit: 'm', fit: '2' } });
        break;
      }
      default: return { skip: `junction type ${type}` };
    }
  }
  return { model: m, rec };
}

function compare(c) {
  const eff = M.effective(c.model, 'base');
  const v = M.validate(eff);
  if (!v.ok) return { err: 'invalid model: ' + JSON.stringify([...v.undef].slice(0, 2)) };
  const r = S.run(eff);
  if (!r.ok) return { err: r.errors[0] };
  let mmax = 0, dpmax = 0;
  for (const x of c.rec.values()) { mmax = Math.max(mmax, Math.abs(x.m)); dpmax = Math.max(dpmax, Math.abs(x.P0in - x.P0out)); }
  let dm = 0, dp = 0;
  for (const [id, x] of c.rec) {
    const y = r.pipes[id];
    if (!y) continue;
    dm = Math.max(dm, Math.abs(y.m - x.m) / (mmax || 1));
    dp = Math.max(dp, Math.abs(y.P0in - x.P0in) / (dpmax || 1), Math.abs(y.P0out - x.P0out) / (dpmax || 1));
  }
  const hw = c.model.pipes.some((p) => p.friction.model === 'hw');
  return { worst: Math.max(dm, dp), dm, dp, it: r.iterations, conv: r.converged, hw };
}

module.exports = { buildCase, compare };
if (require.main !== module) return;
const dirs = process.argv.slice(2);
if (!dirs.length) { console.log('Usage: node tests/validate-fth.js <folder> [<folder> ...]'); process.exit(1); }
const rows = [];
for (const dir of dirs) {
  for (const name of fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.fth')).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))) {
    let c;
    try { c = buildCase(path.join(dir, name)); } catch (e) { c = { skip: e.message }; }
    if (c.skip) { rows.push({ name, skip: c.skip }); continue; }
    let res;
    try { res = compare(c); } catch (e) { res = { err: e.message }; }
    rows.push(Object.assign({ name }, res));
  }
}
const done = rows.filter((r) => r.worst !== undefined);
const darcy = done.filter((r) => !r.hw).map((r) => r.worst).sort((a, b) => a - b);
const hw = done.filter((r) => r.hw).map((r) => r.worst).sort((a, b) => a - b);
const med = (a) => (a.length ? a[Math.floor(a.length / 2)] : NaN);
for (const r of rows) {
  if (r.worst !== undefined) console.log(`${r.worst < 1e-4 || (r.hw && r.worst < 2e-3) ? 'ok  ' : 'FAIL'} ${r.name.padEnd(46)} worst ${r.worst.toExponential(2)}  (flow ${r.dm.toExponential(1)}, pressure ${r.dp.toExponential(1)})${r.hw ? ' HW' : ''}${r.conv ? '' : ' NOT CONVERGED'}`);
  else if (r.err) console.log(`ERR  ${r.name.padEnd(46)} ${r.err}`);
}
const skips = {};
for (const r of rows.filter((x) => x.skip)) skips[r.skip] = (skips[r.skip] || 0) + 1;
console.log(`\nCompared: ${done.length} of ${rows.length} files`);
console.log(`Darcy: ${darcy.length} cases, median ${med(darcy).toExponential(2)}, max ${darcy.length ? darcy[darcy.length - 1].toExponential(2) : '—'}`);
console.log(`Hazen-Williams: ${hw.length} cases, median ${med(hw).toExponential(2)}, max ${hw.length ? hw[hw.length - 1].toExponential(2) : '—'}`);
console.log('Not compared:', JSON.stringify(skips, null, 1));
if (unknownUnits.size) console.log('Unmapped units:', [...unknownUnits].join(', '));
