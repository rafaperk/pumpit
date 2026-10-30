// Tests of the result columns (docs/result-outputs.md): the catalog of outputs and its default columns, every output on
// every example, the formulas of the derived outputs against the core, the best efficiency point, the columns kept in
// the preferences (units, templates, profile file, the units of before) and the .xlsx file with one sheet per table.
// Usage: node tests/result-columns.test.cjs
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ROOT, coreScripts } = require('./load-core');

// the core, the language catalogs and the given interface files in one context (the interface files need no DOM)
function load(files, globals = {}, before) {
  const ctx = vm.createContext(Object.assign({ console }, globals));
  const run = (f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  coreScripts().forEach(run);
  ctx.PumpIt.i18n.setLanguage('en');
  for (const f of files) { if (before && before[f]) before[f](ctx.PumpIt); run(f); }
  return ctx.PumpIt;
}

let pass = 0, fail = 0;
function ok(name, cond, detail = '') {
  if (cond) pass++; else fail++;
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  ' + detail : ''));
}
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const near = (a, b, tol = 1e-9) => rel(a, b) <= tol;

const UI_FILES = ['src/ui/namespace.js', 'src/ui/common/format.js', 'src/ui/results/catalog.js'];
const PumpIt = load(UI_FILES);
const { model: M, solver: S, units: U, hyd: H, examples: EX } = PumpIt;
const Cat = PumpIt.ui.resultCatalog;
const base = PumpIt.i18n.catalog(PumpIt.i18n.BASE);
const q = M.q;

// what the interface gives the rows: designations, and the net flow into the network at the boundary junctions (as the
// junction views of src/ui/junctions/ give it)
const BOUNDARY = { reservoir: (r) => r.net, pressure: (r) => r.net, flow: (r) => r.net, branch: (r) => (Math.abs(r.net) > 1e-12 ? r.net : NaN), spray: (r) => -r.m };
const HOOKS = { dn: () => 'DN', series: () => 'S', boundary: (j, r) => (BOUNDARY[j.type] ? BOUNDARY[j.type](r) : NaN) };
const rowsOf = (table, res, eff) => Cat.rows(table, res, eff, HOOKS);
const regimeOf = (res) => (res.regime === 'compressible' ? 'gas' : 'liquid');
// the value of output k in a row
const val = (res, table, row, k) => Cat.value(Cat.find(regimeOf(res), table, k), row, Cat.ctxOf(res));
const solve = (m, sid = m.scenarios.current) => { const eff = M.effective(m, sid); return { eff, res: S.run(eff) }; };

console.log('\nCatalog of outputs');
{
  for (const rg of Cat.REGIMES) for (const tb of Cat.TABLES) {
    const outs = Cat.outputs(rg, tb);
    ok(`${rg} ${tb}: the identification first, each output once`, outs[0].k === 'id' && new Set(outs.map((e) => e.k)).size === outs.length, `${outs.length} outputs`);
    const key = (k) => (rg === 'gas' ? 'results.gasColumns.' : 'results.columns.') + tb + '.' + k;
    const bad = outs.filter((e) => !Cat.GROUPS.includes(e.g) || (e.c && !U.CATS[e.c]) || (e.u && !U.has(e.c, e.u)) || !base.has(key(e.k)));
    ok(`${rg} ${tb}: groups, unit categories, units and headers known`, !bad.length, bad.map((e) => e.k).join(', '));
    ok(`${rg} ${tb}: the default columns are outputs of the table`, Cat.defaults(rg, tb).every((k) => Cat.find(rg, tb, k)));
  }
  ok('every group has its name', Cat.GROUPS.every((g) => base.has('results.groups.' + g)));
  // the columns of the tables before they could be chosen, but for the gas pipes, which show those of a liquid pipe
  const BEFORE = {
    liquid: {
      pipes: 'id dn schTxt zin zout Q V P0in P0out K', junctions: 'id name typeLabel P0in P0out Pin Pout dP K Qt HGL z',
      pumps: 'id name Q dH dP speed etaPct Pideal Pshaft NPSHA NPSHR', valves: 'id name typeLabel state Q dP Pin Cv K',
    },
    gas: {
      pipes: 'id dn schTxt zin zout Q V P0in P0out K',
      junctions: 'id name typeLabel Pin Pout P0in P0out Tin T0in dP m Q massErr z', pumps: 'id name m Q ratio dP T0out Pgas stateTxt',
      valves: 'id name typeLabel state m Q dP Pin K chokedTxt',
    },
  };
  ok('the default columns are those the tables always had, a gas pipe those of a liquid pipe', Cat.REGIMES.every((rg) => Cat.TABLES.every((tb) => Cat.defaults(rg, tb).join(' ') === BEFORE[rg][tb])));
  ok('a gas pipe has the default columns of a liquid pipe', Cat.defaults('gas', 'pipes').join(' ') === Cat.defaults('liquid', 'pipes').join(' '));
  // and the names of its outputs, but for the flow (at the inlet) and the velocity (the higher of the two ends)
  const shared = Cat.outputs('gas', 'pipes').map((e) => e.k).filter((k) => Cat.find('liquid', 'pipes', k) && k !== 'Q' && k !== 'V');
  const differ = [];
  for (const { code } of PumpIt.i18n.languages()) {
    const c = PumpIt.i18n.catalog(code);
    for (const k of shared) if (c.get('results.gasColumns.pipes.' + k) !== c.get('results.columns.pipes.' + k)) differ.push(`${code} ${k}`);
  }
  ok('an output a gas pipe shares with a liquid pipe has the same name, in every language', shared.length > 20 && !differ.length, differ.join(', ') || `${shared.length} outputs`);
  const fixed = (rg) => Cat.outputs(rg, 'pipes').filter((e) => e.x).map((e) => `${e.k} ${e.x}`).join(', ');
  ok('the classic pipe columns keep their decimals', fixed('liquid') === 'zin 0.00, zout 0.00, Q 0.00, V 0.00, P0in 0.000, P0out 0.000, K 0.00', fixed('liquid'));
  ok('and a gas pipe shows them with the same decimals', fixed('gas') === fixed('liquid'), fixed('gas'));
}

console.log('\nEvery output on every example');
{
  let cells = 0, numbers = 0;
  const problems = [];
  for (const ex of EX.EXAMPLES) {
    const m = ex.build();
    for (const s of m.scenarios.list) {
      const { eff, res } = solve(m, s.id);
      if (!res.ok) { problems.push(`${ex.id}/${s.id}: ${res.errors.join('; ')}`); continue; }
      const rg = regimeOf(res), ctx = Cat.ctxOf(res);
      for (const tb of Cat.TABLES) for (const r of rowsOf(tb, res, eff)) for (const e of Cat.outputs(rg, tb)) {
        if (e.t === 'id') continue;
        let v;
        try { v = Cat.value(e, r, ctx); } catch (err) { problems.push(`${ex.id} ${tb} ${e.k}: ${err.message}`); continue; }
        cells++;
        if (e.t === 'txt' ? typeof v !== 'string' : v !== undefined && typeof v !== 'number') problems.push(`${ex.id} ${tb} ${e.k}: ${typeof v}`);
        if (typeof v === 'number' && Number.isFinite(v)) numbers++;
      }
    }
  }
  ok('every output of every table gives a number or a text, on every example and scenario', !problems.length, problems.slice(0, 4).join(' | ') || `${cells} cells, ${numbers} numbers`);
}

console.log('\nPipe of a liquid');
{
  // a pipe that climbs 5 m between two tanks, with fittings and losses at both ends
  const m = M.newModel();
  m.junctions.push(Object.assign(M.newJunction('reservoir', 1, 0, 0), { liquidElev: q(30, 'm'), elevation: q(0, 'm'), pipeK: { 1: { kOut: 0.5, kIn: 0 } } }));
  m.junctions.push(Object.assign(M.newJunction('reservoir', 2, 100, 0), { liquidElev: q(10, 'm'), elevation: q(5, 'm'), pipeK: { 1: { kOut: 0, kIn: 1 } } }));
  const p = M.newPipe(1, 1, 2);
  p.length = q(800, 'm'); p.geometry.d = q(150, 'mm'); p.friction.model = 'roughness'; p.friction.eps = q(0.05, 'mm');
  p.fittings = [{ model: 'K', value: 0.9, qty: 2 }];
  m.pipes.push(p);
  const { eff, res } = solve(m);
  const r = rowsOf('pipes', res, eff)[0];
  const v = (k) => val(res, 'pipes', r, k);
  const { rho, g } = Cat.ctxOf(res), A = Math.PI * 0.15 ** 2 / 4;
  ok('mass flow = ρ·Q', near(v('m'), rho * r.Q), `${v('m').toFixed(3)} kg/s`);
  ok('static drop = stagnation drop (one section)', near(v('dPs'), v('dP0'), 1e-9));
  ok('stagnation drop = elevation + friction + fittings (the end losses are outside P0 in and out)', near(v('dP0'), v('dPgrav') + v('dPfric') + v('dPfit'), 1e-9));
  ok('drop due to elevation = ρ·g·(z out − z in)', near(v('dPgrav'), rho * g * 5));
  ok('head loss = friction + fittings + ends', near(v('hL') * rho * g, v('dPfric') + v('dPfit') + v('dPend')));
  ok('loss at the ends = (0.5 + 1)·ρV²/2', near(v('dPend'), 1.5 * rho * r.V ** 2 / 2, 1e-9));
  ok('fitting loss = ΣK·ρV²/2, ΣK = 1.8', near(v('dPfit'), 1.8 * rho * r.V ** 2 / 2, 1e-9) && near(v('K'), 1.8));
  ok('EGL − HGL = V²/2g at both ends', near(v('EGLin') - v('HGLin'), r.V ** 2 / (2 * g), 1e-9) && near(v('EGLout') - v('HGLout'), r.V ** 2 / (2 * g), 1e-9));
  ok('highest and lowest static pressure at the ends', v('Pmax') === Math.max(r.Pin, r.Pout) && v('Pmin') === Math.min(r.Pin, r.Pout));
  ok('head loss gradient = hL / L, pressure loss per length = ρ·g·hL / L', near(v('hLgrad'), r.hL / 800) && near(v('dPgrad'), rho * g * r.hL / 800));
  ok('length, inner diameter, area and volume', v('L') === 800 && near(v('Dh'), 0.15) && near(v('A'), A) && near(v('vol'), A * 800));
  ok('relative roughness = ε / D', near(v('eD'), 0.05 / 150));
  ok('density and viscosity of the fluid', v('rho') === rho && v('mu') === res.fluid.mu);
  ok('a pipe of Hazen-Williams has no relative roughness', (() => {
    const m2 = JSON.parse(JSON.stringify(m)); m2.pipes[0].friction.model = 'hw';
    const s2 = solve(m2);
    return Number.isNaN(val(s2.res, 'pipes', rowsOf('pipes', s2.res, s2.eff)[0], 'eD'));
  })());
  const j = rowsOf('junctions', res, eff);
  ok('net flow into the network: what leaves the upper tank, as a mass and as a volume', near(val(res, 'junctions', j[0], 'mnet'), r.m) && near(val(res, 'junctions', j[0], 'Qnet'), r.Q));
  ok('and what enters the lower tank, negative', near(val(res, 'junctions', j[1], 'mnet'), -r.m));
  ok('a junction of one node has no static drop', val(res, 'junctions', j[0], 'dPs') === undefined);
}

console.log('\nPump and valve (example of the pump between tanks)');
{
  const m = EX.get('pump').build();
  const c = H.makeCurve([0, 40, 80, 120].map((x) => U.toSI(x, 'm³/h', 'volFlow')), [0, 0.58, 0.76, 0.70], '2');
  const peak = -c.a[1] / (2 * c.a[2]); // the vertex of the fitted parabola
  for (const s of m.scenarios.list) {
    const { eff, res } = solve(m, s.id);
    const r = rowsOf('pumps', res, eff)[0];
    const v = (k) => val(res, 'pumps', r, k);
    const sp = eff.junctions.find((j) => j.id === 2).speed / 100;
    ok(`${s.id}: pump rise of P0 = discharge P0 − suction P0`, near(v('dP'), v('P0out') - v('P0in')));
    ok(`${s.id}: static rise = discharge static P − suction static P`, near(v('dPs'), r.Pout - r.Pin));
    ok(`${s.id}: NPSH margin and ratio`, near(v('NPSHmargin'), r.NPSHA - r.NPSHR) && near(v('NPSHratio'), r.NPSHA / r.NPSHR), `${v('NPSHmargin').toFixed(2)} m`);
    ok(`${s.id}: BEP flow at the peak of the efficiency curve, at ${sp * 100} % speed`, near(v('QBEP'), peak * sp, 1e-12), `${(v('QBEP') * 3600).toFixed(2)} m³/h`);
    ok(`${s.id}: flow as a percentage of the BEP flow`, near(v('bepPct'), 100 * r.Q / (peak * sp), 1e-12), `${v('bepPct').toFixed(1)} %`);
    ok(`${s.id}: the state of the pump in words`, v('stateTxt') === 'On');
    const w = rowsOf('valves', res, eff)[0];
    const vv = (k) => val(res, 'valves', w, k);
    const Qh = w.m / res.fluid.rho * 3600;
    ok(`${s.id}: Kv of the valve = Q·√(SG/ΔP), m³/h and bar`, near(vv('Kv'), Qh * Math.sqrt((res.fluid.rho / 1000) / (w.dP / 1e5)), 1e-9), vv('Kv').toFixed(2));
    ok(`${s.id}: valve outlet pressures from its junction`, w.Pout === res.junctions[3].Pout && w.P0out === res.junctions[3].P0out && near(vv('dPs'), w.Pin - w.Pout));
    const jv = rowsOf('junctions', res, eff).find((x) => x.id === 3);
    const jl = (k) => val(res, 'junctions', jv, k);
    ok(`${s.id}: head loss of the valve = EGL in − EGL out`, near(jl('hL'), jl('EGLin') - jl('EGLout'), 1e-9) && near(val(res, 'valves', w, 'hL'), jl('hL')));
  }
  ok('Kv = 0.8645·Cv', Math.abs(Cat.KV_PER_CV - 0.8645) < 1e-4, Cat.KV_PER_CV.toFixed(6));
}

console.log('\nBest efficiency point of a curve');
{
  const exact = H.makeCurve([10, 20, 30], [0.5, 0.8, 0.7], '2'); // a parabola through three points
  const a = exact.a, top = -a[1] / (2 * a[2]);
  ok('the vertex of a fitted parabola, to the precision of the numbers', near(H.curveMax(exact).x, top, 1e-13), `${H.curveMax(exact).x} × ${top}`);
  const quartic = H.makeCurve([0, 1, 2, 3, 4], [0, 0.55, 0.8, 0.62, 0.1], '4');
  const q4 = H.curveMax(quartic), slope = H.polyval(H.polyder(quartic.a), q4.x);
  ok('the peak of a curve of order 4: no slope there', Math.abs(slope) < 1e-12 && q4.x > 1 && q4.x < 3, `x = ${q4.x.toFixed(6)}`);
  ok('the highest point given, for an interpolated curve', H.curveMax(H.makeCurve([0, 10, 20, 30], [0, 0.6, 0.8, 0.7], 'xy')).x === 20);
  ok('a curve highest at an end has no best point', Number.isNaN(H.curveMax(H.makeCurve([0, 10, 20], [0.2, 0.5, 0.7], '1')).x) && Number.isNaN(H.curveMax(H.makeCurve([0, 10, 20], [0.2, 0.5, 0.7], 'xy')).x));
  // a pump without an efficiency curve, and two pumps in parallel
  const m = EX.get('pump').build();
  const pump = m.junctions.find((j) => j.id === 2);
  pump.eff = { x: [], y: [], xUnit: 'm³/h', fit: '2' };
  let s = solve(m);
  ok('no efficiency curve: no BEP', s.res.pumps[2].QBEP === undefined && Number.isNaN(val(s.res, 'pumps', rowsOf('pumps', s.res, s.eff)[0], 'bepPct') ?? NaN));
  pump.eff = { x: [0, 10, 20, 30], y: [0, 60, 80, 70], xUnit: 'L/s', fit: 'xy' };
  pump.nPumps = 2; pump.speed = 80;
  s = solve(m);
  ok('two pumps at 80 %: BEP flow = 2 · 0.8 · the flow of the peak', near(s.res.pumps[2].QBEP, 2 * 0.8 * 0.020, 1e-12), `${(s.res.pumps[2].QBEP * 1000).toFixed(2)} L/s`);
}

console.log('\nGas');
{
  for (const id of ['air', 'airPlant']) {
    const m = EX.get(id).build();
    const { eff, res } = solve(m);
    const fl = res.fluid;
    const rows = rowsOf('pipes', res, eff).filter((r) => r.m > 0 && !r.isolated);
    const bad = rows.filter((r) => {
      const a = val(res, 'pipes', r, 'ain'), b = val(res, 'pipes', r, 'aout');
      return !near(a, Math.sqrt(fl.k * fl.Z * fl.R * r.Tin)) || !near(r.Min, Math.abs(r.Vin) / a, 1e-6) || !near(r.Mout, Math.abs(r.Vout) / b, 1e-6);
    });
    ok(`${id}: speed of sound √(kZRT) at both ends, and Mach = V / a`, rows.length && !bad.length, `${rows.length} pipes`);
    ok(`${id}: mass flow = Q at the inlet · density at the inlet`, rows.every((r) => near(r.m, r.Q * r.rhoIn, 1e-9)));
    ok(`${id}: the velocity of a pipe is the higher of its two ends`, rows.every((r) => {
      const v = val(res, 'pipes', r, 'V');
      return v > 0 && v === Math.max(Math.abs(r.Vin), Math.abs(r.Vout)) && near(Math.abs(r.Vout), r.Qout / (r.A * r.N), 1e-9);
    }));
    ok(`${id}: highest and lowest static pressure, from the profile`, rows.every((r) => {
      const hi = val(res, 'pipes', r, 'Pmax'), lo = val(res, 'pipes', r, 'Pmin');
      const ps = [r.Pin, r.Pout].concat(r.profile ? r.profile.map((x) => x[1]) : []);
      return hi === Math.max(...ps) && lo === Math.min(...ps) && hi >= lo;
    }));
    ok(`${id}: pressure loss per length = (friction + fittings) / L`, rows.every((r) => near(val(res, 'pipes', r, 'dPgrad'), (r.dPfric + r.dPfit) / r.L)));
    const src = rowsOf('junctions', res, eff).filter((r) => Number.isFinite(r.mnet) && r.mnet > 0);
    ok(`${id}: net normal flow of the sources = net mass flow / normal density`, src.length && src.every((r) => near(val(res, 'junctions', r, 'QNnet'), r.mnet / fl.rhoN)));
    const vr = rowsOf('valves', res, eff).filter((r) => Number.isFinite(r.Cv));
    ok(`${id}: Kv of the valves = 0.8645·Cv`, vr.every((r) => near(val(res, 'valves', r, 'Kv'), r.Cv * Cat.KV_PER_CV)), `${vr.length} valves`);
    const pr = rowsOf('pumps', res, eff);
    ok(`${id}: compressor pressures from its junction`, pr.every((r) => r.P0in === res.junctions[r.id].P0in && near(val(res, 'pumps', r, 'dPs'), r.Pout - r.Pin)), `${pr.length} compressors`);
  }
}

console.log('\nColumns kept in the preferences');
{
  let saves = 0;
  const prefs = { colUnits: { 'pipes.Q': 'L/s', 'pipes.P0in': 'bar(a)', 'junctions.HGL': 'ft', 'gen.patm': 'kPa(a)' } };
  const P = load(UI_FILES.concat(['src/ui/results/column-setup.js']), {}, {
    'src/ui/results/column-setup.js': (PI) => { PI.app = { prefs, savePrefs: () => { saves++; } }; },
  });
  const Su = P.ui.columnSetup;
  const unitOf = (rg, tb, k) => (Su.list(rg, tb).find((x) => x.k === k) || {}).u;
  ok('the units of before go to the columns of both fluids', unitOf('liquid', 'pipes', 'Q') === 'L/s' && unitOf('liquid', 'pipes', 'P0in') === 'bar(a)' && unitOf('gas', 'pipes', 'Q') === 'L/s' && unitOf('gas', 'pipes', 'P0in') === 'bar(a)' && unitOf('liquid', 'junctions', 'HGL') === 'ft');
  ok('and leave prefs.colUnits, which keeps the others', JSON.stringify(prefs.colUnits) === JSON.stringify({ 'gen.patm': 'kPa(a)' }));
  ok('a table never changed is not kept, and shows the default columns in the default units',
    !prefs.outputs.liquid.pumps && Su.list('liquid', 'pumps').map((x) => x.k).join(' ') === Cat.defaults('liquid', 'pumps').join(' ') && unitOf('liquid', 'pumps', 'NPSHA') === 'm');
  const col = Su.columns('gas', 'pipes').find((c) => c.k === 'P0in');
  ok('a column carries its output, its unit and its regime', col.c === 'pressure' && col.u === 'bar(a)' && col.regime === 'gas');
  Su.setUnit('liquid', 'pipes', 'V', 'ft/s');
  ok('a unit chosen in a header is kept at once', unitOf('liquid', 'pipes', 'V') === 'ft/s' && saves === 1);
  Su.setUnit('liquid', 'junctions', 'HGL', 'm');
  ok('a table back to its default is no longer kept', !prefs.outputs.liquid.junctions);
  const draft = Su.snapshot();
  draft.liquid.pipes = [{ k: 'Q', u: 'm³/s' }, { k: 'nonsense' }, { k: 'Dh' }, { k: 'Q', u: 'gpm' }, { k: 'A', u: 'kg' }, { k: 'hLgrad' }];
  Su.saveAll(draft);
  ok('saved: the identification first, unknown outputs and repeats dropped, units checked',
    JSON.stringify(Su.list('liquid', 'pipes')) === JSON.stringify([{ k: 'id', u: '' }, { k: 'Q', u: 'm³/s' }, { k: 'Dh', u: 'mm' }, { k: 'A', u: 'cm²' }, { k: 'hLgrad', u: 'm/100 m' }]));
  Su.saveTemplate('Report', 'liquid', { pipes: [{ k: 'm' }, { k: 'hL', u: 'ft' }] });
  Su.saveTemplate('Air', 'gas', {});
  Su.saveTemplate('Report', 'liquid', { pipes: [{ k: 'Re' }] });
  ok('templates by fluid, one per name', Su.templates('liquid').map((x) => x.name).join() === 'Report' && Su.templates('gas').map((x) => x.name).join() === 'Air');
  const tt = Su.templateTables('liquid', 'Report');
  ok('a template brings its four tables, the missing ones at their defaults', tt.pipes.map((x) => x.k).join() === 'id,Re' && tt.valves.map((x) => x.k).join(' ') === Cat.defaults('liquid', 'valves').join(' '));
  const file = JSON.parse(JSON.stringify(Su.profile()));
  Su.deleteTemplate('liquid', 'Report');
  ok('a template deleted', !Su.templates('liquid').length);
  draft.liquid.pipes = Su.defaults('liquid', 'pipes');
  Su.saveAll(draft);
  ok('importing a profile brings back its columns and templates', Su.importProfile(file) === 2 && unitOf('liquid', 'pipes', 'Dh') === 'mm' && Su.templates('liquid').length === 1);
  ok('a file that is not a profile is refused', Su.importProfile({ outputs: {} }) === -1 && Su.importProfile(null) === -1);
}

console.log('\nText pasted into a spreadsheet');
{
  const P = load(UI_FILES.concat(['src/ui/results/export.js']), {}, { 'src/ui/results/export.js': (PI) => { PI.app = {}; } });
  const { pasteText } = P.ui.resultExport;
  ok('a text that a spreadsheet would take for a formula stays text',
    ['=HYPERLINK("x")', '+1', '-P1', '@SUM(A1)'].every((s) => pasteText(s) === "'" + s));
  ok('tabs and line breaks do not split the cell', pasteText('P1\tx\r\ny') === 'P1 x y' && pasteText('\t=1') === ' =1');
  ok('any other text is unchanged', pasteText('Pump P-101') === 'Pump P-101' && pasteText('DN 100') === 'DN 100' && pasteText('') === '');
}

console.log('\nWorkbook with one sheet per table');
(async () => {
  const P = load(['src/ui/namespace.js', 'src/ui/common/xlsx.js'], { TextEncoder, Blob });
  // the files of an uncompressed zip
  async function unzip(blob) {
    const b = Buffer.from(await blob.arrayBuffer()), files = {};
    for (let i = 0; b.readUInt32LE(i) === 0x04034b50;) {
      const size = b.readUInt32LE(i + 18), nl = b.readUInt16LE(i + 26), xl = b.readUInt16LE(i + 28);
      files[b.toString('utf8', i + 30, i + 30 + nl)] = b.toString('utf8', i + 30 + nl + xl, i + 30 + nl + xl + size);
      i += 30 + nl + xl + size;
    }
    return files;
  }
  const cols = [{ header: 'P', width: 8, format: 'text' }, { header: 'Q (m³/h)', format: '0.00' }];
  const f = await unzip(P.ui.xlsx.workbook({ sheets: [
    { name: 'Pipes', columns: cols, rows: [['P1', 12.5], ['P2', '—']] },
    { name: 'Pumps', columns: [{ header: 'η', format: '0.000' }], rows: [[0.75]] },
    { name: 'Pipes', columns: cols, rows: [] },
  ] }));
  ok('one worksheet per sheet, in the content types and the relations', !!f['xl/worksheets/sheet3.xml'] && (f['[Content_Types].xml'].match(/worksheet\+xml/g) || []).length === 3 && /rId4" Type="[^"]+\/styles"/.test(f['xl/_rels/workbook.xml.rels']));
  ok('the sheets by name, a repeated name made different', /<sheet name="Pipes" sheetId="1"[^>]*\/><sheet name="Pumps" sheetId="2"[^>]*\/><sheet name="Pipes \(2\)" sheetId="3"/.test(f['xl/workbook.xml']), (f['xl/workbook.xml'].match(/<sheets>.*<\/sheets>/) || [''])[0]);
  ok('a filter range for each sheet', (f['xl/workbook.xml'].match(/_FilterDatabase/g) || []).length === 3 && f['xl/workbook.xml'].includes("'Pumps'!$A$1:$A$2"));
  ok('the number formats of every sheet', /formatCode="0.00"/.test(f['xl/styles.xml']) && /formatCode="0.000"/.test(f['xl/styles.xml']));
  ok('numbers as values, a missing one as text', /<c r="B2" s="\d+"><v>12.5<\/v><\/c>/.test(f['xl/worksheets/sheet1.xml']) && /<c r="B3" t="inlineStr"/.test(f['xl/worksheets/sheet1.xml']) && /<v>0.75<\/v>/.test(f['xl/worksheets/sheet2.xml']));
  ok('the first sheet is the one open', f['xl/worksheets/sheet1.xml'].includes('tabSelected="1"') && !f['xl/worksheets/sheet2.xml'].includes('tabSelected'));
  const one = await unzip(P.ui.xlsx.workbook({ sheet: 'Pipes', columns: cols, rows: [['P1', 1]] }));
  ok('a single sheet given as before', !!one['xl/worksheets/sheet1.xml'] && !one['xl/worksheets/sheet2.xml'] && one['xl/workbook.xml'].includes('<sheet name="Pipes" sheetId="1"'));
  const odd = (await unzip(P.ui.xlsx.workbook({ sheet: 'Pipes', columns: cols, rows: [['=1+1 <b>&', 2]] })))['xl/worksheets/sheet1.xml'];
  ok('a name that looks like a formula or markup is written as text, never as a formula',
    odd.includes('<c r="A2" t="inlineStr" s="2"><is><t>=1+1 &lt;b&gt;&amp;</t></is></c>') && !odd.includes('<f>'));

  console.log(`\n${pass} checks passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
