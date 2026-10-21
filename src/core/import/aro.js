// Import of .aro model files: networks of a gas, kept in the same family of files as .fth (Windows-1252 text in
// INI-style sections with positional CSV records, read by shared.js). The layout follows only the format description
// written by the specification team (version 1.1 of 20 October 2026) and this repository. One scenario of the file (the
// base one, or a child rebuilt from the differences it keeps) becomes a Pump It model in the compressible mode. What has
// no counterpart in Pump It is approximated or left out, and every such case goes into the import notes. The decisions
// are recorded in docs/aro-import.md (A-xx).
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, U = PumpIt.units, H = PumpIt.hyd, FL = PumpIt.fluids;
  const { t } = PumpIt.i18n;
  const q = M.q;
  const {
    FT, LBM, blank, unesc, readSections, sectionOf, scenarioKey, scenarioSection, records, kv, valUnit, addOns, header,
    PROGRAMS, num, n0, str, isInt, key, LENGTH, AREA, PRESSURE, DP, FLOW, VISCOSITY, TEMPERATURE, inTable, quantities,
    listScenarios, scenarios, chainOf, pipeLayout, junctionLayout, scenarioRecords, fluidLines, goalSeek, pumpConfigs,
    shutoffRange, makeNotes, LEVELS, sortNotes, noteText, stopIsolated, place, compare,
  } = PumpIt.importShared;
  const Ru = 8314.462618; // J/(kmol·K)

  // the place of the count of the curve coefficients in the block of the types: valve, orifice and heat exchanger t+8
  // (A-08)
  const COUNTED = { 8: 8, 12: 8, 15: 8 };
  // kinds of junction of the format by their code, for the notes (A-15)
  const KINDS = {
    1: 'branch', 2: 'reservoir', 3: 'flow', 4: 'pressure', 6: 'bend', 7: 'tee', 8: 'valve', 9: 'controlValve',
    10: 'checkValve', 11: 'deadEnd', 12: 'orifice', 13: 'venturi', 14: 'screen', 15: 'heatExchanger', 16: 'nozzle',
    17: 'compressor', 19: 'volumeBalance', 20: 'generic',
  };
  const CONTROL = { 0: 'PRV', 1: 'PSV', 2: 'FCV', 3: 'PDCV' };

  // ---------- units of a gas (A-05)

  // temperatures as quantities of Pump It
  const TEMP = Object.fromEntries(Object.entries(TEMPERATURE).map(([k, u]) => [k, [u, 1]]));
  // specific heat, J/(kg·K)
  const HEAT = { 'kj/kg-k': 1000, 'btu/lbm-r': 4186.8, 'cal/g-k': 4186.8, 'ft-lbf/lbm-r': (1.3558179483 / LBM) * 1.8 };
  // volume flows at reference conditions: s… standard, at the standard conditions of the file; N… normal, at 0 °C and
  // 1 atm, the normal conditions of Pump It (G-15). Each one becomes a normal volume flow of Pump It per day, hour,
  // minute or second (m is a minute)
  const REFERENCE = {};
  for (const [per, unit] of Object.entries({ d: 'Nm³/d', h: 'Nm³/h', m: 'Nm³/min', s: 'Nm³/s' })) {
    for (const ref of ['s', 'n']) {
      for (const [name, f] of [[`${ref}m3/${per}`, 1], [`${ref}cf${per}`, FT ** 3]]) {
        REFERENCE[name] = { ref, unit, f };
        REFERENCE['mm' + name] = { ref, unit, f: 1e6 * f };
      }
    }
  }

  // ---------- engineering data (README, engineering data)

  // components of a mixture, by their name in lower case without what is in parentheses: molar mass from the standard
  // atomic weights [kg/kmol], specific heat of the ideal gas at 300 K [J/(kg·K)] (Çengel & Boles, table A-2(a); NIST
  // Chemistry WebBook for isobutane, pentane, hydrogen sulfide and ammonia) and viscosity at 300 K and 100 kPa [µPa·s]
  // (Huber & Harvey, CRC Handbook, "Viscosity of Gases") (A-14)
  const COMPONENTS = {};
  for (const [names, MW, cp, mu] of [
    [['air'], 28.9647, 1005, 18.5],
    [['nitrogen', 'n2'], 28.014, 1039, 17.9],
    [['oxygen', 'o2'], 31.998, 918, 20.7],
    [['hydrogen', 'h2'], 2.016, 14307, 8.9],
    [['helium', 'he'], 4.0026, 5192.6, 19.9],
    [['argon', 'ar'], 39.948, 520.3, 22.7],
    [['carbon dioxide', 'co2'], 44.009, 846, 15.0],
    [['carbon monoxide', 'co'], 28.010, 1040, 17.8],
    [['methane', 'ch4'], 16.043, 2253.7, 11.1],
    [['ethane', 'c2h6'], 30.070, 1766.2, 9.4],
    [['ethylene', 'ethene', 'c2h4'], 28.054, 1548.2, 10.4],
    [['propane', 'c3h8'], 44.097, 1679.4, 8.2],
    [['n-butane', 'butane'], 58.124, 1716.4, 7.5],
    [['isobutane', 'i-butane'], 58.124, 1671.4, 7.5],
    [['n-pentane', 'pentane'], 72.151, 1671.8, 6.7],
    [['water', 'steam', 'water vapor', 'water vapour', 'h2o'], 18.015, 1872.3, 9.8],
    [['hydrogen sulfide', 'h2s'], 34.076, 1004.1, 12.5],
    [['ammonia', 'nh3'], 17.031, 2096.0, 10.2],
  ]) for (const n of names) COMPONENTS[n] = { MW, cp, mu: mu * 1e-6 };
  const compKey = (s) => unesc(s).toLowerCase().replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();

  // compressibility factor by the virial correlation of Pitzer and Abbott (Smith, Van Ness & Abbott), valid above
  // Tr = 0.8: NaN below it (A-14)
  function zVirial(T, P, Tc, Pc, w) {
    const Tr = T / Tc, Pr = P / Pc;
    if (!(Tr > 0.8) || !(Pr >= 0)) return NaN;
    const B0 = 0.083 - 0.422 / Tr ** 1.6, B1 = 0.139 - 0.172 / Tr ** 4.2;
    return 1 + ((B0 + w * B1) * Pr) / Tr;
  }

  // L/D of a 90° pipe bend by its r/D (Crane, Technical Paper 410)
  const BEND_LD = [[1, 20], [1.5, 14], [2, 12], [3, 12], [4, 14], [6, 17], [8, 24], [10, 30], [12, 34], [14, 38], [16, 42], [20, 50]];
  // K of a bend whose K the file does not keep (A-18): fT·L/D of a 90° bend of its r/D, in proportion to the angle up to
  // 90°; beyond it, the Crane rule for n 90° bends, K = (n − 1)·(0.25·π·fT·r/D + 0.5·K90) + K90
  function bendK(fT, angle, rD) {
    const x = Math.min(Math.max(rD, BEND_LD[0][0]), BEND_LD[BEND_LD.length - 1][0]);
    const K90 = fT * H.interp(BEND_LD.map((p) => p[0]), BEND_LD.map((p) => p[1]), x);
    const n = angle / 90;
    return n <= 1 ? K90 * n : (n - 1) * (0.25 * Math.PI * fT * rD + 0.5 * K90) + K90;
  }

  // ---------- the gas (A-14)

  // the gas of the file at the temperature T [K] and the pressure P [Pa(a)] of its sources: { name, MW, k, Z, mu [Pa·s] },
  // or null (air), each case with its note. Field 1 of "Fluid 1" (or the key of the source) tells the source: 1 a library
  // with polynomials, 2 and 6 a mixture of components
  function readGas(F, T, P, note) {
    const f = String(kv(F, 'Fluid 1') || '').split(',').map((s) => s.trim());
    const name = unesc(f[0]);
    const nf = n0(kv(F, 'Number of Fluids'));
    if (nf > 1) note('assumed', 'gasDynamic', null, { n: nf, name: name || '?' });
    const src = Number.isFinite(num(f[1])) ? num(f[1]) : num(kv(F, 'Fluid Database Source'));
    // null: not read (air, with its note); undefined: a mixture that already said why
    const gas = src === 1 ? libraryGas(f, name, T, P, note) : src === 2 || src === 6 ? mixtureGas(f, name, F, note) : null;
    if (gas === null) note('missing', 'gasDefault', null);
    return gas || null;
  }
  // a gas of a library (source 1): [4] the unit of temperature of its polynomials, [5] and [6] their range, [7] the molar
  // mass, [9] to [13] the critical temperature and pressure and the acentric factor; from [16], five blocks of code, unit,
  // count and coefficients (density, viscosity, vapour pressure, specific heat, conductivity), each a polynomial in T. k
  // comes from the specific heat, k = cp/(cp − R), and Z from the critical point at the conditions of the sources
  function libraryGas(f, name, T, P, note) {
    const tu = TEMPERATURE[key(f[4])], MW = num(f[7]);
    const blocks = [];
    for (let i = 16, k = 0; k < 5 && i + 2 < f.length; k++) {
      const n = Math.max(0, n0(f[i + 2]));
      blocks.push({ unit: f[i + 1], c: f.slice(i + 3, i + 3 + n).map(num) });
      i += 3 + n;
    }
    if (!tu || !(MW > 0) || blocks.length < 4) return null;
    const x = U.fromSI(T, tu, 'temperature');
    const poly = (bk) => (bk.c.length && bk.c.every(Number.isFinite) ? bk.c.reduce((s, c, j) => s + c * x ** j, 0) : NaN);
    const ve = VISCOSITY[key(blocks[1].unit)], ce = HEAT[key(blocks[3].unit)];
    const mu = ve ? U.toSI(poly(blocks[1]) * ve[1], ve[0], 'viscosity') : NaN;
    const cp = ce ? poly(blocks[3]) * ce : NaN;
    const R = Ru / MW, k = cp > R ? cp / (cp - R) : NaN;
    if (!(mu > 0) || !(k > 1)) return null;
    const hi = num(f[5]), lo = num(f[6]);
    if ((Number.isFinite(lo) && x < lo) || (Number.isFinite(hi) && x > hi)) {
      note('assumed', 'gasRange', null, { T: T - 273.15, min: U.toSI(lo, tu, 'temperature') - 273.15, max: U.toSI(hi, tu, 'temperature') - 273.15 });
    }
    const tc = TEMPERATURE[key(f[10])], pc = PRESSURE[key(f[12])];
    const Tc = tc ? U.toSI(num(f[9]), tc, 'temperature') : NaN;
    const Pc = pc && !pc[0].endsWith('(g)') ? U.toSI(num(f[11]) * pc[1], pc[0], 'pressure') : NaN;
    let Z = Tc > 0 && Pc > 0 ? zVirial(T, P, Tc, Pc, n0(f[13])) : 1;
    if (!(Z > 0.1)) { Z = 1; note('assumed', 'gasZRange', null); }
    else if (Math.abs(Z - 1) > 0.02) note('assumed', 'gasZ', null, { Z, P: P / 1e3, T: T - 273.15 });
    note('info', 'gasRead', null, { name: name || '?', MW, k, mu: mu * 1e6, Z, T: T - 273.15 });
    return { name, MW, k, Z, mu };
  }
  // a mixture (sources 2 and 6): [6] the number of components, then 4 fields each (two names, a code, the fraction), in
  // mass fractions when the fraction units are 1 and in molar ones otherwise. An ideal gas near 300 K: molar mass and
  // specific heat by the fractions, the viscosity by the rule of Herning and Zipperer. Components without data here are
  // left out when they are at most 5 % of the mixture
  function mixtureGas(f, name, F, note) {
    const all = [];
    for (let j = 0; j < n0(f[6]); j++) {
      const nm = unesc(f[7 + 4 * j]);
      all.push({ name: nm, x: Math.max(0, n0(f[10 + 4 * j])), d: COMPONENTS[compKey(nm)] });
    }
    const known = all.filter((c) => c.d && c.x > 0), unknown = all.filter((c) => !c.d && c.x > 0);
    const total = all.reduce((s, c) => s + c.x, 0);
    const share = total > 0 ? unknown.reduce((s, c) => s + c.x, 0) / total : 1;
    if (!known.length || share > 0.05) {
      note('missing', 'gasComponents', null, { names: unknown.map((c) => c.name).join(', ') || '—' });
      return undefined;
    }
    if (unknown.length) note('assumed', 'gasMinor', null, { names: unknown.map((c) => c.name).join(', '), pct: 100 * share });
    const mass = String(kv(F, 'Fraction Units Type') ?? '').trim() === '1';
    const w = known.map((c) => (mass ? c.x / c.d.MW : c.x)), sw = w.reduce((s, v) => s + v, 0);
    const y = w.map((v) => v / sw);
    const MW = known.reduce((s, c, i) => s + y[i] * c.d.MW, 0);
    const cp = known.reduce((s, c, i) => s + (y[i] * c.d.MW / MW) * c.d.cp, 0);
    const sq = known.map((c) => Math.sqrt(c.d.MW));
    const mu = known.reduce((s, c, i) => s + y[i] * c.d.mu * sq[i], 0) / known.reduce((s, c, i) => s + y[i] * sq[i], 0);
    const k = cp / (cp - Ru / MW);
    if (known.length === 1) note('assumed', 'gasPure', null, { name: known[0].name, MW, k });
    else note('assumed', 'gasMixture', null, { comps: known.map((c, i) => [c.name, 100 * y[i]]), MW, k });
    return { name: name || known.map((c) => c.name).join(' / '), MW, k, Z: 1, mu };
  }

  // ---------- reading

  // text of a .aro file → { model, notes, stored, counts, version, scenario, scenarios }. scenario: its number or its
  // name or path (the base scenario by default). stored: the results saved in the file for that scenario (Map pipe ID →
  // { m [kg/s], P0in, P0out [Pa(a)], T0in, T0out [K], Min, Mout }), or null
  function read(text, { name = '', scenario } = {}) {
    const hd = header(text);
    if (hd && hd.program !== PROGRAMS.gas) throw new Error(t(hd.program === PROGRAMS.liquid ? 'core.aro.liquidModel' : 'core.aro.otherProgram'));
    const S = readSections(text);
    if (!scenarioKey(S, 'PIPES') || !scenarioKey(S, 'JUNCTIONS')) throw new Error(t('core.aro.notAro'));
    const list = listScenarios(S);
    const want = scenario === undefined || scenario === null || scenario === '' ? 1 : scenario;
    const target = typeof want === 'number' ? list.find((s) => s.n === want) : list.find((s) => s.path === want || s.name === want);
    if (!target) throw new Error(t('core.import.noScenario', { scenario: String(want) }));
    const chain = chainOf(list, target.n);
    const notes = makeNotes();
    const note = notes.add;
    const recs = scenarioRecords(S, chain, note, COUNTED);
    const { unknownUnit, undefinedUnit, qty, len, area, pressure, dp, flow } = quantities(note);

    const m = M.newModel();
    const sys = m.system;
    sys.regime = 'compressible';
    const title = name.replace(/\.[^.]*$/, '').trim() || unesc(kv(sectionOf(S, 'OUTPUT PREFERENCES'), 'Analysis Title'));
    if (title) m.title = target.n === 1 ? title : `${title} (${target.name})`;
    if (target.name) m.scenarios.list[0].name = target.name;
    if (list.length > 1) note('info', 'scenario', null, { n: target.n, path: target.path, count: list.length });

    // what the program adjusts or replaces while it calculates (A-04)
    if (goalSeek(S, chain) > 0) note('ignored', 'goalSeek', null);
    if (kv(sectionOf(S, 'SETTINGS'), 'AnalysisType') === '2') note('ignored', 'timeAnalysis', null);
    if (addOns(S).length) note('ignored', 'addOns', null);

    // the results stored for the scenario, always in US units: mass flow (lbm/s), stagnation pressures (psia) and
    // temperatures (°R) at both ends, Mach numbers (A-24)
    const stored = new Map();
    for (const f of records(scenarioSection(S, 'PIPE ARCHIVE DATA', target.n))) {
      stored.set(num(f[0]), { m: num(f[1]) * LBM, P0in: num(f[2]) * U.PSI, P0out: num(f[3]) * U.PSI, T0in: num(f[4]) / 1.8, T0out: num(f[5]) / 1.8, Min: num(f[12]), Mout: num(f[13]) });
    }

    // ---- system (A-05, A-06): the ambient pressure, reference of the gauge units, gravity, the transition and the
    // standard conditions of the volume flows (1 atm and 60 °F when the file does not give them)
    const F = fluidLines(S, chain);
    let patm = U.PATM;
    const amb = valUnit(kv(F, 'Ambient Pressure'));
    if (amb && inTable(PRESSURE, amb.unit) && !PRESSURE[key(amb.unit)][0].endsWith('(g)')) {
      const [u, f] = PRESSURE[key(amb.unit)];
      sys.patm = q(amb.v * f, u);
      patm = U.toSI(amb.v * f, u, 'pressure');
    } else if (amb) unknownUnit(null, amb.unit);
    const g = num(kv(F, 'Gravity')), reLam = num(kv(F, 'ReTransLam')), reTurb = num(kv(F, 'ReTransTurb'));
    if (g > 0) sys.gravity = g;
    if (reLam > 0) sys.reLam = reLam;
    if (reTurb > 0) sys.reTurb = reTurb;
    const ctx = { patm };
    const si = (x, cat) => (x && Number.isFinite(x.value) ? U.toSI(x.value, x.unit, cat, ctx) : NaN);
    // a temperature; one left undefined stays blank without a note (the temperature of the gas applies, G-28)
    const temperature = (v, unit, obj) => qty(TEMP, v, unit, undefinedUnit(unit) ? null : obj, '°C');
    const stpP = valUnit(kv(F, 'STP Pressure')), stpT = valUnit(kv(F, 'STP Temperature'));
    const stp = { P: stpP ? si(pressure(stpP.v, stpP.unit, null), 'pressure') : NaN, T: stpT ? si(temperature(stpT.v, stpT.unit, null), 'temperature') : NaN };
    const stpGiven = stp.P > 0 && stp.T > 0;
    if (!(stp.P > 0)) stp.P = U.PATM;
    if (!(stp.T > 0)) stp.T = (60 - 32) / 1.8 + 273.15;
    const toNormal = (r) => (r.ref === 'n' ? 1 : (stp.P / FL.NORMAL.P) * (FL.NORMAL.T / stp.T));
    // a flow of gas: a mass flow, or a volume at the local conditions; a volume at reference conditions becomes a normal
    // volume of Pump It, a standard one through the standard conditions of the file (A-06)
    function gasFlow(v, unit, obj) {
      const r = REFERENCE[key(unit)];
      if (!r) return flow(v, unit, obj);
      if (r.ref === 's' && obj) note(stpGiven ? 'info' : 'assumed', stpGiven ? 'standardFlow' : 'standardDefault', obj, stpGiven ? { P: stp.P / 1e3, T: stp.T - 273.15 } : {});
      return Number.isFinite(v) ? q(v * r.f * toNormal(r), r.unit) : blank(r.unit);
    }

    // ---- pipes (A-09 to A-13)
    // the junctions whose records can be read: a positive ID and the fields up to the special condition (b+24)
    const jctOk = (f) => { const id = num(f[1]); return isInt(id) && id > 0 && f.length > junctionLayout(f).b + 24; };
    const jctIds = new Set([...recs.J.values()].filter(jctOk).map((f) => num(f[1])));
    const pipes = new Map(); // id → { p, zIn, zOut (quantities), A [m²], Dh [m] }
    const computed = [], closedObjs = [], designs = [];
    const thermal = { iso: [], isoT: [], hot: [], unit: '' };
    // area and hydraulic diameter of a section
    function section(gm) {
      if (gm.kind === 'rectangular') { const w = si(gm.width, 'length'), h = si(gm.height, 'length'); return { A: w * h, Dh: 2 * w * h / (w + h) }; }
      if (gm.kind === 'noncircular') { const A = si(gm.area, 'area'); return { A, Dh: 4 * A / si(gm.perim, 'length') }; }
      const D = si(gm.d, 'length');
      return { A: Math.PI * D * D / 4, Dh: D };
    }
    for (const [, f] of recs.P) {
      const id = num(f[0]);
      const { nT, b } = pipeLayout(f);
      // a record that ends before the section of the pipe (b+16) cannot be read
      if (!(isInt(id) && id > 0) || f.length <= b + 16) { note('missing', 'badRecord', 'P' + str(f[0])); continue; }
      const obj = 'P' + id;
      const up = num(f[b + 3]), down = num(f[b + 4]);
      if (!jctIds.has(up) || !jctIds.has(down)) { note('missing', 'dangling', obj); continue; }
      const p = M.newPipe(id, up, down);
      p.name = unesc(f[1]);
      p.material = { kind: 'user', nps: '4', sch: '40' };
      // special condition: 1 closed (a reading taken from .fth), 3 stopped by a closed junction (A-11)
      const cond = num(f[b + 38]);
      if (cond === 1) { p.closed = true; note('assumed', 'closedPipe', obj); } else if (cond === 3) { p.closed = true; computed.push(obj); }
      // section: circular by its (hydraulic) diameter; another shape by its two dimensions (a rectangle), or by its area
      // and the hydraulic diameter (A-12)
      const geo = num(f[b + 16]);
      if (geo > 0) {
        const w = len(num(f[b + 7]), f[b + 8], null), h = len(num(f[b + 9]), f[b + 10], null);
        const A = inTable(AREA, f[b + 8]) ? area(num(f[b + 7]), f[b + 8], null) : null, Dh = si(len(num(f[b + 5]), f[b + 6], null), 'length');
        if (!A && w.value > 0 && h.value > 0) Object.assign(p.geometry, { kind: 'rectangular', width: w, height: h });
        else if (A && A.value > 0 && Dh > 0) Object.assign(p.geometry, { kind: 'noncircular', area: A, perim: q(+((4 * si(A, 'area')) / Dh).toPrecision(12), 'm') });
        else Object.assign(p.geometry, { kind: 'circular', d: len(num(f[b + 5]), f[b + 6], obj) });
        if (geo === 4 && p.geometry.kind === 'rectangular') note('assumed', 'ductSection', obj);
        else note('assumed', 'geometry', obj, { code: str(f[b + 16]) });
      } else Object.assign(p.geometry, { kind: 'circular', d: len(num(f[b + 5]), f[b + 6], obj) });
      const sec = section(p.geometry);
      // friction (A-12): 0 absolute roughness, 1 relative, 2 smooth (a reading taken from .fth), 4 a Darcy f; 8 Weymouth,
      // a fixed f = 0.032/d^(1/3) with d in inches, and 9 Panhandle, commercial steel (probable readings)
      const code = num(f[b + 12]), val = num(f[b + 13]);
      const given = Number.isFinite(val) ? val : undefined;
      const fr = p.friction;
      if (code === 0) Object.assign(fr, { model: 'roughness', eps: len(val, f[b + 14], obj) });
      else if (code === 1) Object.assign(fr, { model: 'relRoughness', rel: given });
      else if (code === 2) { fr.model = 'smooth'; note('assumed', 'smooth', obj); }
      else if (code === 4) Object.assign(fr, { model: 'explicitF', f: given });
      else if (code === 8) { Object.assign(fr, { model: 'explicitF', f: sec.Dh > 0 ? +(0.032 / Math.cbrt(sec.Dh / 0.0254)).toPrecision(6) : undefined }); note('assumed', 'weymouth', obj); }
      else if (code === 9) { Object.assign(fr, { model: 'roughness', eps: q(0.046, 'mm') }); note('assumed', 'panhandle', obj); }
      else { Object.assign(fr, { model: 'roughness', eps: blank('mm') }); note('missing', 'friction', obj, { code: str(f[b + 12]) || '?' }); }
      // length: the sum of the segments; without one, a closed pipe takes 1 mm and any other is left for the user (A-11)
      let L = 0;
      for (let k = 0; k < nT; k++) L += n0(f[6 + 2 * k]);
      if (key(f[2]) === 'none' || !nT) {
        if (p.closed) p.length = q(1, 'mm');
        else { p.length = blank('m'); note('missing', 'noLength', obj); }
      } else p.length = len(L, f[2], obj);
      // fittings: the sum of their K values, as one item; a design factor other than 1 is not applied (A-12)
      const Ksum = num(f[b + 20]);
      p.fittings = Ksum > 0 ? [{ name: t('core.data.fittings.imported'), model: 'K', value: Ksum, qty: 1, id: 'imported' }] : [];
      const df = num(f[b + 22]);
      if (df > 0 && Math.abs(df - 1) > 1e-12) designs.push(obj);
      // thermal model (A-13): 0 adiabatic, 1 isothermal at the temperature of b+57, 2 heat transfer with the surroundings
      const th = num(f[b + 53]);
      if (th === 1) {
        const Tx = temperature(num(f[b + 57]), f[b + 58], null);
        thermal.iso.push(obj); thermal.isoT.push(si(Tx, 'temperature'));
        if (Tx.value !== null && !thermal.unit) thermal.unit = Tx.unit;
      } else if (th === 2) thermal.hot.push(obj);
      // the elevations of the ends: the inlet, and the end of the last segment
      const zIn = len(num(f[4]), f[3], null), zOut = nT ? len(num(f[5 + 2 * nT]), f[3], null) : zIn;
      pipes.set(id, { p, zIn, zOut, A: sec.A, Dh: sec.Dh });
      m.pipes.push(p);
    }
    for (const id of [...stored.keys()]) if (!pipes.has(id)) stored.delete(id);

    // ---- the gas (A-13, A-14): the temperature of the model and the conditions of the sources. All pipes isothermal make
    // an isothermal model at their temperature; any other mix is adiabatic, with the temperature of the sources
    const Ts = [], Ps = [];
    const srcAt = new Map(); // junction ID → { P [Pa(a)], T [K] } of a source of fixed pressure
    let tUnit = '';
    const srcT = (v, u) => { const x = temperature(num(v), u, null); if (x.value !== null && !tUnit) tUnit = x.unit; return si(x, 'temperature'); };
    const srcP = (v, u) => si(pressure(num(v), u, null), 'pressure');
    for (const [, f] of recs.J) {
      if (!jctOk(f)) continue;
      const type = num(f[0]), { np, t: tb } = junctionLayout(f), at = (i) => f[tb + i];
      const add = (Px, Tx) => { Ps.push(Px); Ts.push(Tx); srcAt.set(num(f[1]), { P: Px, T: Tx }); };
      if (type === 2) { const o = 5 * Math.max(0, np - 1); add(srcP(at(7 + o), at(8 + o)), srcT(at(11 + o), at(12 + o))); }
      else if (type === 4) { const o = 3 * np; add(srcP(at(o + 1), at(o + 2)), srcT(at(o + 3), at(o + 4))); }
      else if (type === 3 && n0(at(3)) !== 1) Ts.push(srcT(at(4), at(5)));
    }
    const mean = (xs) => { const v = xs.filter((x) => Number.isFinite(x) && x > 0); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN; };
    const allIso = thermal.iso.length > 0 && thermal.iso.length === m.pipes.length;
    sys.gasMode = allIso ? 'isothermal' : 'adiabatic';
    let T = allIso ? mean(thermal.isoT) : NaN;
    if (allIso && new Set(thermal.isoT.filter((x) => x > 0).map((x) => x.toFixed(2))).size > 1) note('assumed', 'isoTemperatures', null, { T: T - 273.15 });
    if (!(T > 0)) T = mean(Ts);
    if (!(T > 0)) { T = 293.15; note('assumed', 'gasTemperature', null); }
    if (allIso) note('info', 'isothermal', null, { T: T - 273.15 });
    for (const o of thermal.hot) note('ignored', 'heatTransfer', o);
    if (!allIso) for (const o of thermal.iso) note('assumed', 'mixedThermal', o);
    const Pm = mean(Ps) || patm;
    const gas = readGas(F, T, Pm, note);
    const tu = (allIso && thermal.unit) || tUnit || '°C';
    const Tq = q(+U.fromSI(T, tu, 'temperature').toPrecision(10), tu);
    sys.fluidGas = gas
      ? { kind: 'gas', gas: 'custom', name: gas.name || t('core.aro.gasName'), MW: +gas.MW.toPrecision(6), k: +gas.k.toPrecision(6), Z: +gas.Z.toFixed(4), mu: q(+(gas.mu * 1e3).toPrecision(5), 'cP'), T: Tq }
      : Object.assign(M.newGasFluid(), { T: Tq });
    // the gas as the calculation takes it, for the conversions below
    const gx = FL.evaluateGas(sys);

    // set point of a pressure control valve (A-20): a static or a stagnation pressure. The stored results tell which one
    // when the valve was controlling at that point: the stagnation pressure stored next to it, or the static one from it
    // and the stored Mach number, falls on the set point within a quarter of the dynamic part; otherwise static
    function controlBasis(ctype, setP, conn, id, obj) {
      const down = ctype === 'PRV';
      const P = conn.find((p) => (down ? p.up === id : p.down === id));
      const r = P && stored.get(P.id), set = si(setP, 'pressure');
      if (r && Number.isFinite(set)) {
        const P0 = down ? r.P0in : r.P0out, Ma = down ? r.Min : r.Mout, k = gx.k;
        const dyn = P0 - P0 * (1 + ((k - 1) / 2) * Ma * Ma) ** (-k / (k - 1));
        const dStag = Math.abs(P0 - set), dStat = Math.abs(P0 - dyn - set);
        if (dyn > 0 && dStag < dStat && dStag < 0.25 * dyn) { note('info', 'controlStagnation', obj); return 'stagnation'; }
        if (dyn > 0 && dStat <= dStag && dStat < 0.25 * dyn) { note('info', 'controlStatic', obj); return 'static'; }
      }
      note('assumed', 'controlBasis', obj);
      return 'static';
    }

    // the nearest source of a fixed pressure upstream of a compressor: a search along the pipes from the end of its inlet
    // pipe, nearest first, that does not pass the compressor
    function upstreamSource(id, P) {
      const seen = new Set([id]);
      let front = [P.up];
      while (front.length) {
        const next = [];
        for (const jid of front) {
          if (seen.has(jid)) continue;
          seen.add(jid);
          const s = srcAt.get(jid);
          if (s && s.P > 0) return { id: jid, P: s.P, T: s.T };
          for (const p of m.pipes) if (!p.closed && (p.up === jid || p.down === jid)) next.push(p.up === jid ? p.down : p.up);
        }
        front = next;
      }
      return null;
    }
    // the suction of a compressor (A-21): the stagnation pressure and temperature stored at the end of its inlet pipe; or
    // those of the source upstream, without the losses of the suction line; or the mean of the sources
    function suctionOf(conn, id) {
      const P = conn.find((p) => p.down === id);
      const r = P && stored.get(P.id), m0 = r ? Math.abs(r.m) : NaN;
      if (r && r.P0out > 0 && r.T0out > 0) return { P0: r.P0out, T0: r.T0out, how: 'stored', m: m0 };
      const s = P && upstreamSource(id, P);
      if (s) return { P0: s.P, T0: s.T > 0 ? s.T : T, how: 'source', id: 'J' + s.id, m: m0 };
      return { P0: Pm, T0: T, how: 'sources', m: m0 };
    }
    // a compressor curve ΔP = Σ cᵢ·Qⁱ (pressure rise in the unit pu against the flow in the unit fu) as the head of Pump It
    // against the volume flow at the suction (G-27, A-21): at the suction conditions, the rise gives the ratio
    // r = 1 + ΔP/P0 and the isentropic head H = Z·R·T0·k/(k − 1)·(r^((k−1)/k) − 1)/g, and a flow its volume
    // Q = ṁ·Z·R·T0/P0 (a volume at the local conditions is taken as the one at the suction). 21 points from zero to the
    // largest flow of the curve, or to its zero rise
    function compressorCurve(cf, pu, fu, conn, id, obj) {
      const su = suctionOf(conn, id);
      const ZRT = gx.Z * gx.R * su.T0;
      const de = DP[key(pu)], fe = FLOW[key(fu)], re = REFERENCE[key(fu)];
      // the volume at the suction [m³/s] of one unit of the flow of the curve
      let phi = NaN;
      if (fe && U.isVolumetric(fe[0])) phi = U.toSI(fe[1], fe[0], 'volFlow');
      else if (fe) phi = (U.toSI(fe[1], fe[0], 'massFlow') * ZRT) / su.P0;
      else if (re) phi = (U.toSI(re.f * toNormal(re), re.unit, 'normFlow') * FL.normalDensity(gx.MW) * ZRT) / su.P0;
      if (!de || !(phi > 0) || !cf || !cf.H.length || !cf.H.every(Number.isFinite)) { note('missing', 'pumpCurve', obj); return null; }
      const fp = U.toSI(de[1], de[0], 'dp');
      const rise = (x) => cf.H.reduce((s, c, i) => s + c * x ** i, 0);
      const top = cf.qmax > 0 ? cf.qmax : shutoffRange(rise, su.m > 0 ? (su.m * ZRT) / su.P0 / phi : NaN);
      const k = gx.k, grav = U.G0 * sys.gravity;
      const head = (x) => { const r = 1 + (rise(x) * fp) / su.P0; return r > 0 ? ((ZRT * k) / (k - 1)) * (r ** ((k - 1) / k) - 1) / grav : NaN; };
      const xs = Array.from({ length: 21 }, (_, i) => (top * i) / 20);
      const curve = { x: xs.map((x) => +(x * phi * 3600).toPrecision(10)), y: xs.map((x) => +head(x).toPrecision(10)), xUnit: 'm³/h', yUnit: 'm', fit: 'xy' };
      if (!(top > 0) || !curve.y.every(Number.isFinite)) { note('missing', 'pumpCurve', obj); return null; }
      const where = { P: su.P0 / 1e3, T: su.T0 - 273.15 };
      if (su.how === 'stored') note('assumed', 'compressorStored', obj, where);
      else if (su.how === 'source') note('assumed', 'compressorSource', obj, Object.assign({ id: su.id }, where));
      else note('assumed', 'compressorSources', obj, where);
      return curve;
    }

    // ---- junctions (A-15 to A-23)
    const raw = new Map(); // id → [x, y] of the drawing in the file
    const created = []; // junctions the import adds: { j, of, side }
    let nextJ = 1 + Math.max(0, ...jctIds), nextP = 1 + Math.max(0, ...[...recs.P.keys()].map(n0));
    const kindName = (code) => t('core.import.kinds.' + (KINDS[code] || 'unknown'), { code });
    for (const [, f] of recs.J) {
      const type = num(f[0]), id = num(f[1]);
      const { np, b, t: tb } = junctionLayout(f);
      if (!jctOk(f)) { note('missing', 'badRecord', 'J' + str(f[1])); continue; }
      const obj = 'J' + id;
      const at = (i) => f[tb + i];
      const listed = f.slice(6, 6 + np).map((x) => Math.abs(num(x)));
      const conn = m.pipes.filter((p) => p.up === id || p.down === id);
      const n = conn.length;
      const ids = (xs) => [...new Set(xs)].sort((x, y) => x - y).join(',');
      if (ids(listed.filter((pid) => pipes.has(pid))) !== ids(conn.map((p) => p.id))) note('ignored', 'pipeList', obj);
      raw.set(id, [num(f[b]), num(f[b + 1])]);
      const endZ = (p) => (p.up === id ? pipes.get(p.id).zIn : pipes.get(p.id).zOut);
      // the elevation of the junction; left undefined in the file, that of the ends of its pipes (A-16)
      let elevation = len(num(f[b + 7]), f[b + 9], null);
      if (elevation.value === null) {
        const z = conn.map(endZ).find((x) => x.value !== null);
        if (z) { elevation = Object.assign({}, z); note('assumed', 'elevationFromPipes', obj); }
        else if (LENGTH[key(f[b + 9])]) note('missing', 'notGiven', obj);
        else len(num(f[b + 7]), f[b + 9], obj);
      }
      const zJ = si(elevation, 'length');
      // special condition: −1 does not apply, 0 none, 1 closed, 2 open without control (a control valve)
      const special = num(f[b + 24]), closed = special === 1;
      const df = num(f[b + 15]);
      if (df > 0 && Math.abs(df - 1) > 1e-12) designs.push(obj);
      const make = (pt, props = {}) => Object.assign(M.newJunction(pt, id, 0, 0), { name: unesc(f[4]), elevation }, props);
      // the fallbacks: a node that only connects, or a closed end on a single pipe
      const deadEnd = () => make('flow', { Q: q(0, 'kg/h'), dir: 'out' });
      const plainNode = () => (n >= 2 ? make('branch') : deadEnd());
      const pipeCount = () => { note('missing', 'pipeCount', obj, { kind: kindName(type) }); return plainNode(); };
      const unsupported = () => { note('ignored', 'unsupported', obj, { kind: kindName(type) }); return plainNode(); };
      // the pipes of a closed node, reservoir or imposed pressure close with it
      const closeAll = () => { for (const p of conn) p.closed = true; note('assumed', 'closedJunction', obj); };
      // a component with a loss between two pipes (type pt of Pump It, its fields, its K); closed, a closed valve
      function lossElement(pt, fields, K) {
        if (n !== 2) return pipeCount();
        if (closed) { closedObjs.push(obj); note('info', 'closedFitting', obj, { kind: kindName(type) }); return make('valve', { lossModel: 'K', K: K >= 0 ? K : 0, closed: true }); }
        return make(pt, fields);
      }
      // the pipe of the list at place i, when it was imported
      const pidAt = (i) => (pipes.has(listed[i]) ? listed[i] : null);
      // the losses K of the connections, (K entering the pipe, K entering the junction) in groups of w fields from t: positions
      // taken from .fth (A-17)
      function connectionK(w) {
        const pk = {};
        for (let i = 0; i < np; i++) {
          const pid = pidAt(i), kOut = n0(at(w * i)), kIn = n0(at(w * i + 1));
          if (pid && (kOut > 0 || kIn > 0)) pk[pid] = { kOut: Math.max(0, kOut), kIn: Math.max(0, kIn) };
        }
        if (Object.keys(pk).length) note('assumed', 'connectionK', obj);
        return pk;
      }
      // the temperature of the gas a source supplies (G-28), when the file gives it
      const withT = (j, Tx) => { if (Tx.value !== null) j.gasT = Tx; return j; };
      let j;
      switch (type) {
        case 1: { // branch: 3 fields per pipe (the K of the connection the second, as in .fth), then the source at t+3np+1
          // (+ enters the network; a hypothesis, A-17)
          const pk = {};
          for (let i = 0; i < np; i++) { const K = num(at(3 * i + 1)), pid = pidAt(i); if (K > 0 && pid) pk[pid] = { kOut: K, kIn: K }; }
          if (Object.keys(pk).length) note('assumed', 'connectionK', obj);
          const src = closed ? q(0, 'kg/h') : gasFlow(num(at(3 * np + 1)), at(3 * np + 2), obj);
          if (src.value) note('assumed', 'nodeSource', obj);
          if (closed) closeAll();
          if (n >= 2) j = make('branch', { source: src, pipeK: pk });
          else if (n === 1) {
            const v = src.value;
            j = make('flow', { Q: v === null ? src : q(Math.abs(v), src.unit), dir: v < 0 ? 'out' : 'in', pipeK: pk });
          } else j = make('branch', { source: src });
          break;
        }
        case 2: { // reservoir: a vessel of gas at rest (A-17). 5 fields per pipe from t, then the stagnation pressure at t+7+o
          // and the temperature at t+11+o, o = 5·(np − 1); its pressure applies at the elevation of the junction
          const o = 5 * Math.max(0, np - 1);
          const surfP = pressure(num(at(7 + o)), at(8 + o), obj);
          const pk = connectionK(5);
          if (closed) closeAll();
          j = withT(make('reservoir', { liquidElev: Object.assign({}, elevation), surfP, pipeK: pk }), temperature(num(at(11 + o)), at(12 + o), obj));
          break;
        }
        case 3: { // imposed flow (A-17): t+1, t+2 the flow, t+3 = 1 leaves the network, 0 enters; t+4, t+5 the temperature of
          // the gas that enters; t+6 the K of the connection (as in .fth)
          const Qf = gasFlow(num(at(1)), at(2), closed ? null : obj);
          let Q = closed ? q(0, Qf.unit) : Qf;
          let dir = n0(at(3)) === 1 ? 'out' : 'in';
          if (Q.value < 0) { Q = q(-Q.value, Q.unit); dir = dir === 'out' ? 'in' : 'out'; }
          if (closed) { closedObjs.push(obj); note('info', 'closedEnd', obj); }
          const Tin = dir === 'in' ? temperature(num(at(4)), at(5), obj) : blank('°C');
          const K = num(at(6));
          if (n === 1) {
            j = withT(make('flow', { Q, dir }), Tin);
            if (K > 0) { j.pipeK = { [conn[0].id]: { kOut: K, kIn: K } }; note('assumed', 'connectionK', obj); }
          } else j = withT(make('branch', { source: Q.value === null ? Q : q(dir === 'in' ? Q.value : -Q.value, Q.unit) }), Tin);
          break;
        }
        case 4: { // imposed pressure (A-17): 3 fields per pipe, then at t+3np the kind (1 static, 0 stagnation), the pressure
          // and the temperature of the gas it supplies; a static pressure has one pipe and no losses
          const o = 3 * np;
          const st = n0(at(o)) === 1;
          const P = pressure(num(at(o + 1)), at(o + 2), obj);
          let pk = connectionK(3);
          if (st && n !== 1) note('assumed', 'staticManyPipes', obj);
          const ptype = st && n === 1 ? 'static' : 'stagnation';
          if (ptype === 'static' && Object.keys(pk).length) { pk = {}; note('ignored', 'staticK', obj); }
          if (closed) closeAll();
          // the temperature of the gas it supplies: Pump It takes it as a stagnation temperature (G-28). The file keeps a
          // static one with a static pressure (A-17): the stagnation temperature stored at the end of its pipe replaces it
          let Tx = temperature(num(at(o + 3)), at(o + 4), obj);
          if (ptype === 'static' && sys.gasMode === 'adiabatic') {
            const p = conn[0], r = stored.get(p.id), T0 = r ? (p.up === id ? r.T0in : r.T0out) : NaN;
            if (T0 > 0) { Tx = q(+U.fromSI(T0, Tx.unit, 'temperature').toPrecision(10), Tx.unit); note('info', 'staticTemperatureStored', obj, { T: T0 - 273.15 }); }
            else if (Tx.value !== null) note('assumed', 'staticTemperature', obj);
          }
          j = withT(make('pressure', { P, ptype, pipeK: pk }), Tx);
          break;
        }
        case 6: { // bend (A-18): t+1 the angle, t+2 r/D, t+3 the K; without it (a negative K), the K of a bend of that geometry
          let K = num(at(3));
          if (!(K >= 0) && n === 2) {
            // fT of the inlet pipe, to which Pump It refers the K of a component
            const Dh = pipes.get((conn.find((p) => p.down === id) || conn[0]).id).Dh;
            const angle = num(at(1)) > 0 ? num(at(1)) : 90, rD = num(at(2)) > 0 ? num(at(2)) : 1.5;
            K = Dh > 0 ? +bendK(H.craneFT(Dh), angle, rD).toPrecision(4) : 0;
            note('assumed', 'bendK', obj);
          }
          j = lossElement('generic', { genModel: 'K', K: K >= 0 ? K : 0 }, K);
          break;
        }
        case 7: // tee or wye: a node without losses of its own (A-19)
          j = plainNode();
          if (closed) closeAll();
          else if (n >= 2) note('assumed', 'teeNode', obj);
          break;
        case 8: { // valve (A-19): t+1 the loss model (1 K, 3 a loss curve, 0 another one), the units of the curve at t+3 and
          // t+5, its coefficients counted at t+8; after them (u = t+9+nc) the outlet pressure (u+1) and the K (u+7). On a
          // single pipe it discharges: an exit valve
          const lm = num(at(1)), nc = Math.abs(n0(at(8))), u = 9 + nc, val = num(at(u + 7));
          let K = 0;
          if (lm === 1) K = val >= 0 ? val : 0;
          else if (lm === 3) note('assumed', 'valveCurve', obj);
          else note('assumed', 'lossModel', obj, { code: str(at(1)) || '?' });
          if (n === 2) {
            j = make('valve', { lossModel: 'K', K, closed });
            if (closed) closedObjs.push(obj);
          } else if (n === 1) {
            if (closed) { j = deadEnd(); closedObjs.push(obj); note('info', 'closedEnd', obj); }
            else j = make('exitvalve', { Pout: pressure(num(at(u + 1)), at(u + 2), obj), lossModel: 'K', K });
          } else j = pipeCount();
          break;
        }
        case 9: { // control valve (A-20): t+0 the kind (2 flow, 0 pressure reducing, 3 pressure drop, 1 pressure sustaining),
          // the set point at t+3 and t+4; a valve that cannot reach it opens fully
          const ctype = CONTROL[num(at(0))];
          if (n !== 2) { j = pipeCount(); break; }
          if (!ctype) { j = make('valve', { lossModel: 'K', K: 0, closed }); note('assumed', 'controlUnknown', obj, { code: str(at(0)) || '?' }); break; }
          const props = { ctype, alwaysControl: false, failAction: 'open', kOpen: 0, special: closed ? 'closed' : special === 2 ? 'open' : 'none' };
          if (ctype === 'FCV') props.setQ = gasFlow(num(at(3)), at(4), obj);
          else if (ctype === 'PDCV') props.setDP = dp(num(at(3)), at(4), obj);
          else { props.setP = pressure(num(at(3)), at(4), obj); props.basis = controlBasis(ctype, props.setP, conn, id, obj); }
          j = make('control', props);
          if (ctype !== 'FCV') note('assumed', 'controlType', obj, { ctype });
          if (closed) closedObjs.push(obj);
          else if (special === 2) note('info', 'openUncontrolled', obj);
          break;
        }
        case 11: // dead end: no flow
          j = n === 1 ? deadEnd() : pipeCount();
          break;
        case 17: { // compressor or fan (A-21): t+0 the mode (2 fixed flow, 0 curve), the fixed flow at t+2 and t+3, the
          // units of the curve at t+6 (pressure rise) and t+8 (flow), the configurations from t+12: the first one, with its
          // largest flow (t+17) and the coefficients of the rise (counted at t+19). Closed, it is off
          const mode = num(at(0));
          const C = pumpConfigs(f, tb);
          if (C.list.length > 1) note('assumed', 'compressorConfig', obj, { n: C.list.length });
          const props = { speed: 100, nPumps: 1, state: closed ? 'offClosed' : 'on' };
          if (mode === 2) Object.assign(props, { mode: 'fixedFlow', fixedFlow: gasFlow(num(at(2)), at(3), closed ? null : obj) });
          else {
            const curve = C.list.length ? compressorCurve(C.list[0], at(6), at(8), conn, id, obj) : null;
            if (curve) {
              Object.assign(props, { mode: 'curve', curve });
              note('assumed', 'compressorEta', obj);
              if (mode !== 0) note('assumed', 'pumpMode', obj, { code: str(at(0)) || '?' });
            } else {
              Object.assign(props, { mode: 'fixedFlow', fixedFlow: blank('kg/h') });
              if (mode !== 0) note('missing', 'pumpModeBlank', obj, { code: str(at(0)) || '?' });
              else if (!C.list.length) note('missing', 'pumpCurve', obj);
            }
          }
          if (closed) closedObjs.push(obj);
          if (n === 1 && props.mode === 'fixedFlow') { // on a single pipe, a fixed flow is an imposed flow
            const v = props.fixedFlow, out = conn[0].up === id; // the pipe leaves the compressor: the flow enters the network
            j = make('flow', { Q: v.value === null ? v : q(Math.abs(v.value), v.unit), dir: out === !(v.value < 0) ? 'in' : 'out' });
            note('info', 'pumpOnePipeFlow', obj);
          } else if (n === 1) {
            // on a single pipe, a curve: the missing end becomes the ambient pressure, through a frictionless pipe of 1 mm
            const P = conn[0], suction = P.up === id;
            const e = Object.assign(M.newJunction('pressure', nextJ++, 0, 0), { name: t(suction ? 'core.import.created.suction' : 'core.import.created.discharge', { name: unesc(f[4]) || obj }), elevation: Object.assign({}, elevation), P: q(0, 'kgf/cm²(g)'), ptype: 'stagnation' });
            const vp = M.newPipe(nextP++, suction ? e.id : id, suction ? id : e.id);
            Object.assign(vp, { name: t('core.import.created.pipe', { name: e.name }), length: q(1, 'mm'), material: { kind: 'user', nps: '4', sch: '40' }, fittings: [] });
            vp.geometry = JSON.parse(JSON.stringify(P.geometry));
            vp.friction.model = 'frictionless';
            m.junctions.push(e); m.pipes.push(vp);
            pipes.set(vp.id, Object.assign({}, pipes.get(P.id), { p: vp, zIn: elevation, zOut: elevation }));
            created.push({ j: e, of: id, side: suction ? -1 : 1 });
            note('assumed', suction ? 'pumpSuction' : 'pumpDischarge', obj, { id: 'J' + e.id });
            j = make('pump', props);
          } else j = n === 2 ? make('pump', props) : pipeCount();
          break;
        }
        default: // other kinds (A-22): a discharge nozzle on a single pipe becomes an exit valve to the ambient pressure; the
          // others a component without loss between two pipes, or a node (or a closed end)
          if (type === 16 && n === 1 && !closed) { j = make('exitvalve', { Pout: q(0, 'kgf/cm²(g)'), lossModel: 'K', K: 0 }); note('assumed', 'nozzleExit', obj); }
          else if (n !== 2) j = unsupported();
          else { j = lossElement('generic', { genModel: 'K', K: 0 }, 0); if (!closed) note('assumed', 'unknownLoss', obj, { kind: kindName(type) }); }
      }
      // a pipe connected at another elevation than its junction: Pump It keeps one elevation per junction (A-16)
      for (const p of conn) {
        const z = si(endZ(p), 'length');
        if (Number.isFinite(z) && Number.isFinite(zJ) && Math.abs(z - zJ) > 1e-6) { note('ignored', 'elevations', obj); break; }
      }
      m.junctions.push(j);
    }

    // a junction left without an open pipe stops, as in the file (A-23)
    stopIsolated(m, note);
    for (const o of computed) note('assumed', 'computedClosed', o);
    for (const o of closedObjs) note('info', 'closed', o);
    for (const o of designs) note('ignored', 'designFactor', o);

    place(m.junctions, raw, note, created);
    const base = list.find((s) => s.n === 1);
    return {
      model: m,
      notes: sortNotes(notes.list),
      stored: stored.size ? stored : null,
      counts: { pipes: m.pipes.length, junctions: m.junctions.length, scenario: target.name || (base && base.name) || m.scenarios.list[0].name },
      version: hd ? hd.version : null,
      scenario: target,
      scenarios: list,
    };
  }

  PumpIt.importers = Object.assign(PumpIt.importers || {}, {
    aro: {
      encoding: 'windows-1252', read, scenarios, compare, noteText, LEVELS,
      parse: { header, zVirial, bendK, COMPONENTS },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
