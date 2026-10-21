// Import of .fth model files: Windows-1252 text in INI-style sections, with positional CSV records for pipes,
// junctions and stored results. The layout follows only the descriptions written by the specification team (Annex A of
// the specification and the format description of 20 October 2026) and this repository. One scenario of the file (the
// base one, or a child rebuilt from the differences it keeps) becomes a Pump It model. What has no counterpart in Pump
// It is approximated or left out, and every such case goes into the import notes. The decisions are recorded in
// docs/fth-import.md (F-xx).
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, U = PumpIt.units;
  const { t } = PumpIt.i18n;
  const q = M.q;
  // sections, records and scenarios, the units written out in full, the notes and the drawing positions are shared with
  // the importer of .aro files (shared.js)
  const {
    FT, IN, LBM, GAL, SLUG, blank, unesc, readSections, sectionOf, scenarioKey, scenarioSection, records, keyValues, kv,
    valUnit, addOns, header, PROGRAMS, num, n0, str, isInt, key, LENGTH, PRESSURE, DP, FLOW, VISCOSITY, TEMPERATURE,
    inTable, quantities, listScenarios, scenarios, chainOf, pipeLayout, junctionLayout, scenarioRecords, fluidLines,
    goalSeek, pumpConfigs, shutoffRange, makeNotes, LEVELS, sortNotes, noteText, stopIsolated, place, compare,
  } = PumpIt.importShared;

  // ---------- units of a liquid

  // density ("S.G. water" is relative to 62.375 lbm/ft³, about 999.15 kg/m³)
  const DENSITY = {
    'kg/m3': ['kg/m³', 1], 'gram/cm3': ['g/cm³', 1], 'lbm/ft3': ['lbm/ft³', 1], 'gram/liter': ['kg/m³', 1], 'kg/liter': ['kg/m³', 1000],
    'kg/cm3': ['kg/m³', 1e6], 'lbm/gal': ['kg/m³', LBM / GAL], 'lbm/in3': ['kg/m³', LBM / IN ** 3], 'slug/ft3': ['kg/m³', SLUG / FT ** 3],
    's.g.water': ['kg/m³', 62.375 * LBM / FT ** 3],
  };
  // K factor of a nozzle: the unit of Pump It for the flow and pressure units of the record
  const KFACTOR = { 'liter/min|bar': 'L/min/bar½', 'liters/min|bar': 'L/min/bar½', 'gal/min|psid': 'gpm/psi½', 'gal/min|psi': 'gpm/psi½', 'm3/hr|bar': 'm³/h/bar½' };
  // the place of the count of the curve coefficients in the block of the types: valve, orifice, heat exchanger and
  // generic component t+8, nozzle t+11 (F-08)
  const COUNTED = { 8: 8, 12: 8, 15: 8, 20: 8, 16: 11 };

  // ---------- pumps
  // control of a pump by its speed: (kind, set point, unit), about 10 fields after the relative speed; its place moves in
  // the records of child scenarios, hence the search in a short window
  function pumpControl(r, from) {
    for (let i = from + 6; i < from + 18 && i + 2 < r.length; i++) {
      if (/^[1-9]$/.test(r[i]) && num(r[i + 1]) > 0 && (inTable(FLOW, r[i + 2]) || inTable(PRESSURE, r[i + 2]) || inTable(DP, r[i + 2]))) return { kind: Number(r[i]), v: num(r[i + 1]), unit: r[i + 2] };
    }
    return null;
  }
  // suction of a pump on a single pipe: (1, −1, mode, value, unit) after the configurations; mode 1 a pressure, 0 a
  // height of liquid above the pump
  function pumpSuction(r, from) {
    for (let i = from; i + 4 < r.length; i++) {
      if (r[i + 1] === '-1' && (r[i + 2] === '1' || r[i + 2] === '0') && Number.isFinite(num(r[i + 3])) && (inTable(PRESSURE, r[i + 4]) || inTable(LENGTH, r[i + 4]))) return { v: num(r[i + 3]), unit: r[i + 4] };
    }
    return null;
  }

  // kinds of junction of the format by their code, for the notes
  const KINDS = {
    1: 'branch', 2: 'reservoir', 3: 'flow', 4: 'pressure', 5: 'areaChange', 6: 'bend', 7: 'tee', 8: 'valve',
    9: 'controlValve', 10: 'checkValve', 11: 'deadEnd', 12: 'orifice', 13: 'venturi', 14: 'screen', 15: 'heatExchanger',
    16: 'spray', 17: 'pump', 18: 'ejector', 19: 'volumeBalance', 20: 'generic', 21: 'reliefValve', 27: 'threeWayValve',
    28: 'weir',
  };
  const CONTROL = { 0: 'PRV', 1: 'PSV', 2: 'FCV', 3: 'PDCV' };

  // ---------- reading

  // text of a .fth file → { model, notes, stored, counts, version, scenario, scenarios }. scenario: its number or its
  // name or path (the base scenario by default); calibrate: false keeps the stored results out of the losses of F-21
  // and F-23 (F-29). stored: the results saved in the file for that scenario (Map pipe ID → { m [kg/s], P0in, P0out
  // [Pa(a)] }), or null
  function read(text, { name = '', scenario, calibrate = true } = {}) {
    const hd = header(text);
    if (hd && hd.program !== PROGRAMS.liquid) throw new Error(t('core.fth.otherProgram'));
    const S = readSections(text);
    if (!scenarioKey(S, 'PIPES') || !scenarioKey(S, 'JUNCTIONS')) throw new Error(t('core.fth.notFth'));
    const list = listScenarios(S);
    const want = scenario === undefined || scenario === null || scenario === '' ? 1 : scenario;
    const target = typeof want === 'number' ? list.find((s) => s.n === want) : list.find((s) => s.path === want || s.name === want);
    if (!target) throw new Error(t('core.import.noScenario', { scenario: String(want) }));
    const chain = chainOf(list, target.n);
    const notes = makeNotes();
    const note = notes.add;
    const recs = scenarioRecords(S, chain, note, COUNTED);

    const m = M.newModel();
    const title = name.replace(/\.[^.]*$/, '').trim();
    if (title) m.title = target.n === 1 ? title : `${title} (${target.name})`;
    if (target.name) m.scenarios.list[0].name = target.name;
    if (list.length > 1) note('info', 'scenario', null, { n: target.n, path: target.path, count: list.length });

    // the add-on modules and settings that change the calculation of the program (F-06)
    const sized = n0(kv(sectionOf(S, 'SIZING CONTROL'), 'OptimizationLevel')) > 0 && addOns(S).length > 0;
    if (goalSeek(S, chain) > 0) note('ignored', 'goalSeek', null);
    if (kv(sectionOf(S, 'SETTINGS'), 'AnalysisType') === '2') note('ignored', 'timeAnalysis', null);
    if (sized) note('ignored', 'sizing', null);
    else if (addOns(S).length) note('ignored', 'addOns', null);

    // the results stored for the scenario, always in US units (F-29)
    const stored = new Map();
    for (const f of records(scenarioSection(S, 'PIPE ARCHIVE DATA', target.n))) {
      stored.set(num(f[0]), { m: num(f[1]) * LBM, P0in: num(f[3]) * U.PSI, P0out: num(f[4]) * U.PSI, rho: num(f[7]) * LBM / FT ** 3, mu: num(f[8]) * LBM / FT });
    }

    // ---- system and fluid (F-28): the ambient pressure is the reference of the gauge units; the properties evaluated
    // in the file
    const F = fluidLines(S, chain);
    const { unknownUnit, len, area, pressure, dp, flow } = quantities(note);
    let patm = U.PATM;
    const amb = valUnit(kv(F, 'Ambient Pressure'));
    if (amb && inTable(PRESSURE, amb.unit) && !PRESSURE[key(amb.unit)][0].endsWith('(g)')) {
      const [u, f] = PRESSURE[key(amb.unit)];
      m.system.patm = q(amb.v * f, u);
      patm = U.toSI(amb.v * f, u, 'pressure');
    } else if (amb) unknownUnit(null, amb.unit);
    const fluidName = unesc(String(kv(F, 'Fluid 1') || '').split(',')[0]);
    const dens = valUnit(kv(F, 'Density')), visc = valUnit(kv(F, 'Viscosity'));
    const rhoQ = dens && inTable(DENSITY, dens.unit) && dens.v > 0 ? q(dens.v * DENSITY[key(dens.unit)][1], DENSITY[key(dens.unit)][0]) : null;
    const muQ = visc && inTable(VISCOSITY, visc.unit) && visc.v > 0 ? q(visc.v * VISCOSITY[key(visc.unit)][1], VISCOSITY[key(visc.unit)][0]) : null;
    const props = [...stored.values()].filter((r) => r.rho > 0 && r.mu > 0);
    if (rhoQ && muQ) {
      m.system.fluid = { kind: 'user', name: fluidName || t('core.fth.fluidName'), rho: rhoQ, mu: muQ, pv: vapour(valUnit(kv(F, 'Vapor Pressure'))) };
      note('info', 'fluidKeys', null, { name: m.system.fluid.name });
      const T = valUnit(kv(F, 'Temperature'));
      if (T && TEMPERATURE[key(T.unit)]) note('info', 'fluidTemperature', null, { T: `${T.v} ${TEMPERATURE[key(T.unit)]}` });
    } else if (props.length) {
      const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
      m.system.fluid = { kind: 'user', name: fluidName || t('core.fth.fluidName'), rho: q(mean(props.map((r) => r.rho)), 'kg/m³'), mu: q(mean(props.map((r) => r.mu)) * 1e3, 'cP'), pv: vapour(valUnit(kv(F, 'Vapor Pressure'))) };
      note('assumed', 'fluidStored', null);
    } else note('missing', 'fluidDefault', null);
    // vapour pressure in an absolute unit: a gauge value (it may be negative) is added to the ambient pressure
    function vapour(pv) {
      if (!pv || !inTable(PRESSURE, pv.unit)) return blank('kPa(a)');
      const [u, f] = PRESSURE[key(pv.unit)];
      if (!u.endsWith('(g)')) return pv.v > 0 ? q(pv.v * f, u) : blank(u);
      const abs = U.toSI(pv.v * f, u, 'pressure', { patm });
      return abs > 0 ? q(abs / 1e3, 'kPa(a)') : blank('kPa(a)');
    }
    if (n0(kv(F, 'Properties')) !== 0) note('assumed', 'properties', null);
    if (n0(String(kv(F, 'Viscosity Model') || '0').split(',')[0]) !== 0) note('assumed', 'nonNewtonian', null);
    if (n0(kv(F, 'Number of Fluids')) > 1) note('assumed', 'fluids', null, { n: n0(kv(F, 'Number of Fluids')) });
    const g = num(kv(F, 'Gravity')), reLam = num(kv(F, 'ReTransLam')), reTurb = num(kv(F, 'ReTransTurb')), alt = num(kv(F, 'AltLossFactorMethod'));
    if (g >= 0) m.system.gravity = g;
    if (reLam > 0) m.system.reLam = reLam;
    if (reTurb > 0) m.system.reTurb = reTurb;
    // the laminar correction of K: 0 = none (inferred in README, "Clean-room record"); any other code is not known
    if (alt === 0) m.system.laminarK = 'none';
    else if (Number.isFinite(alt)) note('assumed', 'laminarK', null, { code: String(alt) });
    const rho = PumpIt.fluids.evaluate(m.system).rho;
    const grav = U.G0 * m.system.gravity;
    const ctx = { rho, patm };
    const si = (x, cat) => (x && Number.isFinite(x.value) ? U.toSI(x.value, x.unit, cat, ctx) : NaN);

    // SI per unit of the file: volume flow (m³/s, a mass flow at the density of the fluid) and pressure difference (Pa,
    // a head of the fluid through ρ·g)
    const flowSI = (unit) => { const e = FLOW[key(unit)]; if (!e) return NaN; return U.isVolumetric(e[0]) ? U.toSI(e[1], e[0], 'volFlow') : U.toSI(e[1], e[0], 'massFlow') / rho; };
    const dpSI = (unit) => { const d = DP[key(unit)], l = LENGTH[key(unit)]; return d ? U.toSI(d[1], d[0], 'dp') : l ? U.toSI(l[1], l[0], 'length') * rho * grav : NaN; };

    // ---- pipes (F-09 to F-14)
    // the junctions whose records can be read: a positive ID and the fields up to the special condition (b+24)
    const jctOk = (f) => { const id = num(f[1]); return isInt(id) && id > 0 && f.length > junctionLayout(f).b + 24; };
    const jctIds = new Set([...recs.J.values()].filter(jctOk).map((f) => num(f[1])));
    const pipes = new Map(); // id → { p, zIn, zOut (quantities), A [m²] }
    const computed = []; // pipes stopped or isolated in the file (conditions 3 and 4)
    const closedObjs = [], designs = [];
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
      // special condition: 1 closed by the user; 3 stopped by a closed junction, 4 isolated (states the program worked
      // out and saved, closed so that the flow stays at zero; F-10)
      const cond = num(f[b + 38]);
      if (cond === 1) { p.closed = true; closedObjs.push(obj); } else if (cond === 3 || cond === 4) { p.closed = true; computed.push(obj); }
      // section: circular by its (hydraulic) diameter, or any other shape by its area and wetted perimeter (F-12)
      const geo = num(f[b + 16]);
      if (geo === 2 || (geo !== 0 && num(f[b + 7]) > 0 && num(f[b + 9]) > 0)) Object.assign(p.geometry, { kind: 'noncircular', area: area(num(f[b + 7]), f[b + 8], obj), perim: len(num(f[b + 9]), f[b + 10], obj) });
      else Object.assign(p.geometry, { kind: 'circular', d: len(num(f[b + 5]), f[b + 6], obj) });
      if (geo !== 0 && geo !== 2) note('assumed', 'geometry', obj, { code: str(f[b + 16]) || '?' });
      // friction: 0 absolute roughness, 1 relative, 2 smooth, 3 Hazen-Williams, 4 given f, 7 frictionless (F-13)
      const code = num(f[b + 12]), val = num(f[b + 13]);
      const given = Number.isFinite(val) ? val : undefined;
      const fr = p.friction;
      if (code === 0) Object.assign(fr, { model: 'roughness', eps: len(val, f[b + 14], obj) });
      else if (code === 1) Object.assign(fr, { model: 'relRoughness', rel: given });
      else if (code === 2) fr.model = 'smooth';
      else if (code === 3) Object.assign(fr, { model: 'hw', C: given });
      else if (code === 4) Object.assign(fr, { model: 'explicitF', f: given });
      else if (code === 7) fr.model = 'frictionless';
      else { Object.assign(fr, { model: 'roughness', eps: blank('mm') }); note('missing', 'friction', obj, { code: str(f[b + 12]) || '?' }); }
      // length: the sum of the segments; without one, a frictionless or closed pipe loses nothing by its length and
      // takes 1 mm, and any other pipe is left for the user (F-11)
      let L = 0;
      for (let k = 0; k < nT; k++) L += n0(f[6 + 2 * k]);
      if (key(f[2]) === 'none' || !nT) {
        if (code === 7 || p.closed) p.length = q(1, 'mm');
        else { p.length = blank('m'); note('missing', 'noLength', obj); }
      } else p.length = len(L, f[2], obj);
      // fittings: the sum of their K values, as one item (F-14)
      const Ksum = num(f[b + 20]);
      p.fittings = Ksum > 0 ? [{ name: t('core.data.fittings.imported'), model: 'K', value: Ksum, qty: 1, id: 'imported' }] : [];
      const df = num(f[b + 22]);
      if (df > 0 && Math.abs(df - 1) > 1e-12) designs.push(obj);
      // the elevations of the ends: the inlet, and the end of the last segment
      const zIn = len(num(f[4]), f[3], null), zOut = nT ? len(num(f[5 + 2 * nT]), f[3], null) : zIn;
      const Asi = p.geometry.kind === 'circular' ? Math.PI * si(p.geometry.d, 'length') ** 2 / 4 : si(p.geometry.area, 'area');
      pipes.set(id, { p, zIn, zOut, A: Asi });
      m.pipes.push(p);
    }
    for (const id of [...stored.keys()]) if (!pipes.has(id)) stored.delete(id);
    const areaOf = (pid) => (pipes.has(pid) ? pipes.get(pid).A : NaN);
    // the stored volume flow through a pipe (m³/s at the density of the model), for the losses of F-21
    const storedQ = (pid) => { const r = calibrate && stored.get(pid); return r && Number.isFinite(r.m) ? Math.abs(r.m) / rho : NaN; };
    const doCalibrate = calibrate && stored.size > 0 && !sized;

    // a loss curve ΔP = Σ cᵢ·Qⁱ in the units of a record (ΔP or head pu, flow qu) as a function in SI; a pure square law
    // turns into an exact K (F-21)
    function lossCurve(coef, pu, qu) {
      const fq = flowSI(qu), fp = dpSI(pu);
      if (!(fq > 0) || !(fp > 0) || !coef.length || !coef.every(Number.isFinite)) return null;
      const big = Math.max(...coef.map(Math.abs));
      const square = big > 0 && coef.length >= 3 && coef[2] > 0 && coef.every((c, i) => i === 2 || Math.abs(c) < 1e-9 * big);
      return { coef, fq, fp, square, dp: (Q) => coef.reduce((s, c, i) => s + c * (Q / fq) ** i, 0) * fp };
    }
    const kSquare = (lc, A) => (2 * lc.coef[2] * lc.fp * A * A) / (rho * lc.fq * lc.fq);
    const kAt = (lc, A, Q) => (2 * lc.dp(Q) * A * A) / (rho * Q * Q);
    // the flow at which a curve that is not a square law becomes a K: the stored flow, or half of the largest flow of the
    // curve (an approximation); returns { Q [m³/s], stored }
    function curveFlow(pid, qmax, lc) {
      const Qs = doCalibrate ? storedQ(pid) : NaN;
      if (Qs > 0) return { Q: Qs, stored: true };
      return qmax > 0 ? { Q: 0.5 * qmax * lc.fq, stored: false } : null;
    }
    // the points of a loss curve for a generic component of Pump It, from zero to the largest flow of the curve (or twice
    // the stored flow)
    function curvePoints(lc, qu, pu, top) {
      const fe = FLOW[key(qu)], de = DP[key(pu)];
      const xUnit = fe && U.isVolumetric(fe[0]) ? fe[0] : 'm³/h', yUnit = de ? de[0] : 'kPa';
      const deg = lc.coef.length - 1, n = deg <= 4 ? 11 : 41;
      const xs = Array.from({ length: n }, (_, i) => (top * i) / (n - 1));
      return { x: xs.map((Q) => U.fromSI(Q, xUnit, 'volFlow')), y: xs.map((Q) => U.fromSI(lc.dp(Q), yUnit, 'dp')), xUnit, yUnit, fit: deg <= 4 ? String(Math.max(1, deg)) : 'xy' };
    }
    // the loss of a component given by a curve, referred to the pipe pid: an exact K for a pure square law; between two
    // pipes, the curve itself when it starts from zero; otherwise the K at the stored flow, or at half of the largest flow
    // of the curve. Returns { lossModel: 'K', K } or { curve }, or null when the curve cannot be read (with its note)
    function curveLoss(coef, pu, qu, qmax, pid, twoPort, obj) {
      const lc = lossCurve(coef, pu, qu), A = areaOf(pid);
      if (!lc || !(A > 0)) { note('assumed', 'curveFailed', obj); return null; }
      if (lc.square) return { lossModel: 'K', K: kSquare(lc, A) };
      const top = qmax > 0 ? qmax * lc.fq : 2 * storedQ(pid);
      if (twoPort && top > 0 && Math.abs(coef[0] * lc.fp) <= 1e-6 * Math.abs(lc.dp(top))) return { curve: curvePoints(lc, qu, pu, top) };
      const cf = curveFlow(pid, qmax, lc);
      if (!cf) { note('assumed', 'curveFailed', obj); return null; }
      if (cf.stored) note('assumed', 'curveK', obj, { Q: cf.Q * 3600 }); else note('assumed', 'curveHalf', obj, { Q: cf.Q * 3600 });
      return { lossModel: 'K', K: Math.max(0, kAt(lc, A, cf.Q)) };
    }

    // ---- junctions (F-15 to F-27)
    const raw = new Map(); // id → [x, y] of the drawing in the file
    const created = []; // junctions the import adds: { j, of, side }
    let nextJ = 1 + Math.max(0, ...jctIds), nextP = 1 + Math.max(0, ...[...recs.P.keys()].map(n0));
    const tees = [];
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
      // the elevation of the junction; that of a reservoir only stands in for a level or a bottom its fields do not give,
      // so its note waits until then (F-17)
      const elevation = len(num(f[b + 7]), f[b + 9], type === 2 ? null : obj);
      const zJ = si(elevation, 'length');
      // special condition: −1 does not apply, 0 none, 1 closed, 2 open without control (a control valve)
      const special = num(f[b + 24]), closed = special === 1;
      const df = num(f[b + 15]);
      if (df > 0 && Math.abs(df - 1) > 1e-12) designs.push(obj);
      const make = (pt, props = {}) => Object.assign(M.newJunction(pt, id, 0, 0), { name: unesc(f[4]), elevation }, props);
      const fits = (pt) => { const [lo, hi] = PumpIt.junctionTypes.get(pt).pipes; return n >= lo && n <= hi; };
      // the fallbacks: a node that only connects, or a closed end on a single pipe
      const deadEnd = () => make('flow', { Q: q(0, 'm³/h'), dir: 'out' });
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
      let j;
      switch (type) {
        case 1: { // branch: 3 fields per pipe of the list from t (a flag, the K of the connection, another field), then the
          // source (+ enters the network); the K uses the velocity of its own pipe, in both directions (F-16)
          const pk = {};
          for (let i = 0; i < np; i++) { const K = num(at(3 * i + 1)), pid = pidAt(i); if (K > 0 && pid) pk[pid] = { kOut: K, kIn: K }; }
          const src = closed ? q(0, 'm³/h') : flow(num(at(3 * np + 1)), at(3 * np + 2), obj);
          if (closed) closeAll();
          if (n >= 2) j = make('branch', { source: src, pipeK: pk });
          else if (n === 1) {
            const v = src.value;
            j = make('flow', { Q: v === null ? src : q(Math.abs(v), src.unit), dir: v < 0 ? 'out' : 'in', pipeK: pk });
          } else j = make('branch', { source: src });
          break;
        }
        case 2: { // reservoir: 5 fields per pipe (K entering the pipe, K entering the reservoir, two fields, the depth of the
          // connection below the surface), then the unit of the depths at t+6+o, the surface pressure at t+7+o and the
          // elevation of the liquid surface at t+21+o, o = 5·(np − 1). Each pipe connects at the elevation of its end, which
          // Pump It keeps as a depth below the surface; the bottom is the lowest connection, never above the surface, and a
          // pipe above the surface discharges at the surface pressure (F-17)
          const o = 5 * Math.max(0, np - 1);
          const surfP = pressure(num(at(7 + o)), at(8 + o), obj);
          let level = len(num(at(21 + o)), at(22 + o), null);
          if (level.value === null && elevation.value !== null) { level = Object.assign({}, elevation); note('assumed', 'reservoirLevel', obj); }
          const pk = {};
          const zLevel = si(level, 'length'), byDepth = Number.isFinite(zLevel);
          let bottom = null;
          for (let i = 0; i < np; i++) {
            const pid = pidAt(i);
            if (!pid) continue;
            const P = pipes.get(pid), zq = P.p.up === id ? P.zIn : P.zOut, z = si(zq, 'length');
            pk[pid] = { kOut: Math.max(0, n0(at(5 * i))), kIn: Math.max(0, n0(at(5 * i + 1))) };
            if (!Number.isFinite(z)) continue;
            if (!byDepth) { pk[pid].elev = Object.assign({}, zq); continue; }
            const d = zLevel - z;
            pk[pid].depth = q(+U.fromSI(d, level.unit, 'length').toPrecision(12), level.unit);
            if (!bottom || z < si(bottom, 'length')) bottom = zq;
            if (d < -1e-9) { note('info', 'aboveSurface', 'P' + pid); continue; }
            // the depth kept in the file (a probable reading) only checks the one given by the end of the pipe
            const dFile = si(len(num(at(5 * i + 4)), at(6 + o), null), 'length');
            if (Number.isFinite(dFile) && Math.abs(dFile - d) > 1e-3 * Math.max(1, d)) note('assumed', 'depthDiffers', 'P' + pid, { file: dFile, ends: d });
          }
          if (closed) closeAll();
          const props = { liquidElev: level, surfP, pipeK: pk };
          if (bottom) {
            Object.assign(props, { connBy: 'depth', elevation: Object.assign({}, si(bottom, 'length') > zLevel ? level : bottom) });
            note('info', 'connDepth', obj);
          }
          // what still comes in blank needs the user: the level, and the elevation of the junction when no pipe gives the
          // bottom. The note of its unit, or of a value not given
          const needed = (v, unit) => (LENGTH[key(unit)] ? note('missing', 'notGiven', obj) : len(v, unit, obj));
          if (level.value === null) needed(num(at(21 + o)), at(22 + o));
          if (!bottom && elevation.value === null) needed(num(f[b + 7]), f[b + 9]);
          j = make('reservoir', props);
          break;
        }
        case 3: { // imposed flow: t+1 and t+2 the flow (volume or mass), t+3 = 1 leaves the network, 0 enters; the K of the
          // connection at t+6 changes only the pressure of the junction
          let Q = closed ? q(0, 'm³/h') : flow(num(at(1)), at(2), obj);
          let dir = n0(at(3)) === 1 ? 'out' : 'in';
          if (Q.value < 0) { Q = q(-Q.value, Q.unit); dir = dir === 'out' ? 'in' : 'out'; }
          if (closed) { closedObjs.push(obj); note('info', 'closedEnd', obj); }
          const K = num(at(6));
          if (n === 1) {
            j = make('flow', { Q, dir });
            if (K > 0) j.pipeK = { [conn[0].id]: { kOut: K, kIn: K } };
          } else j = make('branch', { source: Q.value === null ? Q : q(dir === 'in' ? Q.value : -Q.value, Q.unit) });
          break;
        }
        case 4: { // imposed pressure: 3 fields per pipe (K entering the pipe, K entering the junction, a field), then at t+3np
          // the kind (1 static, 0 stagnation) and the pressure; a static pressure has one pipe and no losses (F-18)
          const st = n0(at(3 * np)) === 1;
          const P = pressure(num(at(3 * np + 1)), at(3 * np + 2), obj);
          let pk = {};
          for (let i = 0; i < np; i++) {
            const pid = pidAt(i), kOut = n0(at(3 * i)), kIn = n0(at(3 * i + 1));
            if (pid && (kOut > 0 || kIn > 0)) pk[pid] = { kOut: Math.max(0, kOut), kIn: Math.max(0, kIn) };
          }
          if (st && n !== 1) note('assumed', 'staticManyPipes', obj);
          const ptype = st && n === 1 ? 'static' : 'stagnation';
          if (ptype === 'static' && Object.keys(pk).length) { pk = {}; note('ignored', 'staticK', obj); }
          if (closed) closeAll();
          j = make('pressure', { P, ptype, pipeK: pk });
          break;
        }
        case 5: case 6: { // area change (K referred to the inlet pipe) and bend: the K at t+3
          const K = num(at(3)) >= 0 ? num(at(3)) : 0;
          j = lossElement('generic', { genModel: 'K', K }, K);
          break;
        }
        case 7: // tee or wye: t+3 = 2 simple, without losses; 1 detailed, whose losses come from the stored results (F-23)
          j = plainNode();
          if (n0(at(3)) === 1 && n >= 2) tees.push({ j, conn });
          break;
        case 8: { // valve: t+1 the loss model (1 K, 0 Cv, 3 curve), the units of the curve at t+3 and t+5, its largest flow
          // at t+6, the coefficients counted at t+8; after them (u = t+9+nc) the outlet pressure at u+1 and the K or Cv at
          // u+7. On a single pipe it is an exit valve (F-19)
          const lm = num(at(1)), nc = Math.abs(n0(at(8))), u = 9 + nc, val = num(at(u + 7));
          const inPipe = (conn.find((p) => p.down === id) || conn[0] || {}).id;
          let loss = null; // the loss as Pump It takes it: { lossModel, K | Cv }, or { curve } between two pipes
          if (lm === 1) loss = { lossModel: 'K', K: val >= 0 ? val : 0 };
          else if (lm === 0) loss = { lossModel: 'Cv', Cv: val > 0 ? val : undefined };
          else if (lm === 3) loss = curveLoss(f.slice(tb + 9, tb + 9 + nc).map(num), at(3), at(5), n0(at(6)), inPipe, n === 2, obj);
          else note('assumed', 'lossModel', obj, { code: str(at(1)) || '?' });
          if (!loss) loss = { lossModel: 'K', K: 0 };
          if (n === 2) {
            if (closed) { j = make('valve', Object.assign({}, loss.curve ? { lossModel: 'K', K: 0 } : loss, { closed: true })); closedObjs.push(obj); }
            else if (loss.curve) { j = make('generic', { genModel: 'curve', curve: loss.curve }); note('info', 'curveGeneric', obj); }
            else j = make('valve', loss);
          } else if (n === 1) {
            if (closed) { j = deadEnd(); closedObjs.push(obj); note('info', 'closedEnd', obj); }
            else j = make('exitvalve', Object.assign({ Pout: pressure(num(at(u + 1)), at(u + 2), obj) }, loss));
          } else j = pipeCount();
          break;
        }
        case 9: { // control valve: t+0 the kind (2 flow, 0 pressure reducing, 3 pressure drop, 1 pressure sustaining), the set
          // point at t+3 and t+4; a control valve that cannot reach it opens fully (F-20)
          const ctype = CONTROL[num(at(0))];
          if (n !== 2) { j = pipeCount(); break; }
          if (!ctype) { j = make('valve', { lossModel: 'K', K: 0, closed }); note('assumed', 'controlUnknown', obj, { code: str(at(0)) || '?' }); break; }
          const props = { ctype, alwaysControl: false, failAction: 'open', kOpen: 0, special: closed ? 'closed' : special === 2 ? 'open' : 'none' };
          if (ctype === 'FCV') props.setQ = flow(num(at(3)), at(4), obj);
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
        case 12: { // orifice: the coefficients counted at t+8; after them (u = t+9+nc) its diameter at u+3, u+4 and its K at u+6
          const u = 9 + Math.abs(n0(at(8))), K = num(at(u + 6)) >= 0 ? num(at(u + 6)) : 0;
          const dO = len(num(at(u + 3)), at(u + 4), null);
          j = lossElement('orifice', { orModel: 'K', K, dO: dO.value > 0 ? dO : q(25, 'mm') }, K);
          break;
        }
        case 15: case 20: { // heat exchanger and generic component: as the valve, t+1 = 3 a loss curve; only the pressure loss
          const lm = num(at(1)), nc = Math.abs(n0(at(8)));
          const inPipe = (conn.find((p) => p.down === id) || conn[0] || {}).id;
          let loss = null;
          if (lm === 3) loss = curveLoss(f.slice(tb + 9, tb + 9 + nc).map(num), at(3), at(5), n0(at(6)), inPipe, true, obj);
          else note('assumed', 'lossModel', obj, { code: str(at(1)) || '?' });
          if (!loss) loss = { lossModel: 'K', K: 0 };
          j = lossElement('generic', loss.curve ? { genModel: 'curve', curve: loss.curve } : { genModel: 'K', K: loss.K }, loss.K || 0);
          if (type === 15) note('ignored', 'heatExchanger', obj);
          break;
        }
        case 16: { // nozzle: t+4 the model (1 a K factor, Q = K·√ΔP; 3 a loss curve), the units of ΔP and flow at t+6 and t+8,
          // the coefficients counted at t+11; after them (v = t+12+nc) the K factor at v+3 and the outlet pressure at v+5
          if (!fits('spray')) { j = pipeCount(); break; }
          if (closed) { j = n === 1 ? deadEnd() : make('branch'); closedObjs.push(obj); note('info', 'closedEnd', obj); break; }
          const lm = num(at(4)), nc = Math.abs(n0(at(11))), v = 12 + nc;
          const Pext = pressure(num(at(v + 5)), at(v + 6), obj);
          const fq = flowSI(at(8)), fp = dpSI(at(6));
          if (!(fq > 0)) unknownUnit(obj, at(8));
          if (!(fp > 0)) unknownUnit(obj, at(6));
          let kSI = NaN;
          if (lm === 1) kSI = num(at(v + 3)) > 0 ? (num(at(v + 3)) * fq) / Math.sqrt(fp) : NaN;
          else if (lm === 3) {
            const lc = lossCurve(f.slice(tb + 12, tb + 12 + nc).map(num), at(6), at(8));
            if (lc && lc.square) kSI = lc.fq / Math.sqrt(lc.coef[2] * lc.fp);
            else if (lc) {
              const cf = curveFlow(conn[0] && conn[0].id, n0(at(9)), lc);
              if (cf && lc.dp(cf.Q) > 0) {
                kSI = cf.Q / Math.sqrt(lc.dp(cf.Q));
                if (cf.stored) note('assumed', 'curveK', obj, { Q: cf.Q * 3600 }); else note('assumed', 'curveHalf', obj, { Q: cf.Q * 3600 });
              }
            }
          }
          if (kSI > 0) {
            // Pump It refers a K factor to water (1000 kg/m³), the file to the fluid itself: ΔP = (Q/K)² (F-24)
            const unit = KFACTOR[`${key(at(8))}|${key(at(6))}`] || 'L/min/bar½';
            j = make('spray', { sprayModel: 'K', Kf: q(U.fromSI(kSI * Math.sqrt(rho / 1000), unit, 'kfactor'), unit), Pext });
            if (Math.abs(rho - 1000) > 1e-9) note('info', 'sprayDensity', obj);
          } else {
            j = make('spray', { sprayModel: 'K', Kf: blank('L/min/bar½'), Pext });
            note('missing', 'sprayKf', obj);
          }
          break;
        }
        case 17: { // pump: t+0 the mode (0 curve, 1 fixed flow), the fixed flow at t+2 and t+3, the units of the curve at t+6
          // (head) and t+8 (flow), the configurations from t+12; closed, it is off (F-25)
          const mode = num(at(0));
          const C = pumpConfigs(f, tb);
          const ctl = mode === 0 ? pumpControl(f, C.post) : null;
          const props = pumpCurves(C, at(6), at(8), conn, mode !== 1, obj);
          Object.assign(props, { speed: 100 * C.speed, state: closed ? 'offClosed' : 'on' });
          if (C.list.length > 1) note('info', 'pumpConfig', obj, { n: C.list.length, sel: C.sel, name: C.list[C.sel - 1].name || '—' });
          if (mode === 1) Object.assign(props, { mode: 'fixedFlow', fixedFlow: closed ? q(0, 'm³/h') : flow(num(at(2)), at(3), obj) });
          else if (mode === 0 && ctl && inTable(FLOW, ctl.unit)) Object.assign(props, { mode: 'controlFlow', setQ: flow(ctl.v, ctl.unit, obj) });
          else if (mode === 0) { props.mode = 'curve'; if (ctl) note('assumed', 'pumpControlOther', obj); }
          else if (props.curve.x.length) { props.mode = 'curve'; note('assumed', 'pumpMode', obj, { code: str(at(0)) || '?' }); }
          else { Object.assign(props, { mode: 'fixedFlow', fixedFlow: blank('m³/h') }); note('missing', 'pumpModeBlank', obj, { code: str(at(0)) || '?' }); }
          if (closed) closedObjs.push(obj);
          if (n === 1 && props.mode === 'fixedFlow') { // on a single pipe, a fixed flow is an imposed flow
            const v = props.fixedFlow, out = conn[0].up === id; // the pipe leaves the pump: the flow enters the network
            j = make('flow', { Q: v.value === null ? v : q(Math.abs(v.value), v.unit), dir: out === !(v.value < 0) ? 'in' : 'out' });
            note('info', 'pumpOnePipeFlow', obj);
          } else if (n === 1) {
            // on a single pipe, a curve: the missing end becomes an imposed pressure (the one the file gives after the
            // configurations, or the ambient pressure), through a frictionless pipe of 1 mm
            const P = conn[0], suction = P.up === id, sc = pumpSuction(f, C.post);
            let Pin = q(0, 'kgf/cm²(g)');
            if (sc && inTable(PRESSURE, sc.unit)) Pin = pressure(sc.v, sc.unit, obj);
            else if (sc && inTable(LENGTH, sc.unit)) Pin = q((si(len(sc.v, sc.unit, obj), 'length') * rho * grav) / 1e3, 'kPa(g)');
            const e = Object.assign(M.newJunction('pressure', nextJ++, 0, 0), { name: t(suction ? 'core.import.created.suction' : 'core.import.created.discharge', { name: unesc(f[4]) || obj }), elevation: Object.assign({}, elevation), P: Pin, ptype: 'stagnation' });
            const vp = M.newPipe(nextP++, suction ? e.id : id, suction ? id : e.id);
            Object.assign(vp, { name: t('core.import.created.pipe', { name: e.name }), length: q(1, 'mm'), material: { kind: 'user', nps: '4', sch: '40' }, fittings: [] });
            vp.geometry = JSON.parse(JSON.stringify(P.geometry));
            vp.friction.model = 'frictionless';
            m.junctions.push(e); m.pipes.push(vp);
            pipes.set(vp.id, { p: vp, zIn: elevation, zOut: elevation, A: areaOf(P.id) });
            created.push({ j: e, of: id, side: suction ? -1 : 1 });
            if (suction) note('assumed', 'pumpSuction', obj, { id: 'J' + e.id }); else note('assumed', 'pumpDischarge', obj, { id: 'J' + e.id });
            j = make('pump', props);
          } else j = n === 2 ? make('pump', props) : pipeCount();
          break;
        }
        default: // other kinds: a component without loss between two pipes, or a node (or a closed end)
          if (type === 27 || n !== 2) j = unsupported();
          else { j = make('generic', { genModel: 'K', K: 0 }); note('assumed', 'unknownLoss', obj, { kind: kindName(type) }); }
      }
      // a pipe connected at another elevation than its junction: Pump It keeps one elevation per junction (F-27)
      if (j.type !== 'reservoir') {
        for (const p of conn) {
          const z = si(p.up === id ? pipes.get(p.id).zIn : pipes.get(p.id).zOut, 'length');
          if (Number.isFinite(z) && Number.isFinite(zJ) && Math.abs(z - zJ) > 1e-6) { note('ignored', 'elevations', obj); break; }
        }
      }
      m.junctions.push(j);
    }

    // set point of a pressure control valve: a static or a stagnation pressure. The stored results tell which one, when
    // the valve was controlling at that point (the pressure next to it falls on one of the two); otherwise static (F-20)
    function controlBasis(ctype, setP, conn, id, obj) {
      const down = ctype === 'PRV';
      const P = conn.find((p) => (down ? p.up === id : p.down === id));
      const r = P && doCalibrate && stored.get(P.id), A = P && areaOf(P.id), set = si(setP, 'pressure');
      if (r && A > 0 && Number.isFinite(set) && Number.isFinite(r.m)) {
        const P0 = down ? r.P0in : r.P0out, V = r.m / (rho * A), dyn = (rho * V * V) / 2;
        const dStag = Math.abs(P0 - set), dStat = Math.abs(P0 - dyn - set);
        if (dStag < dStat && dStag < 0.25 * dyn) { note('info', 'controlStagnation', obj); return 'stagnation'; }
        if (dStat <= dStag && dStat < 0.25 * dyn) { note('info', 'controlStatic', obj); return 'static'; }
      }
      note('assumed', 'controlBasis', obj);
      return 'static';
    }

    // the pump curves of the configuration in use: head (11 points from zero to the largest flow of the curve, fitted with
    // its degree), efficiency in % and NPSHR in the unit of the head (F-25). need: the mode of the pump uses the curve
    function pumpCurves(C, hu, fu, conn, need, obj) {
      const props = { nPumps: 1, curve: { x: [], y: [], xUnit: 'm³/h', yUnit: 'm', fit: '2' }, eff: { x: [], y: [], xUnit: 'm³/h', fit: '2' }, npshr: { x: [], y: [], xUnit: 'm³/h', yUnit: 'm', fit: '2' } };
      const cf = C.list[C.sel - 1];
      const fq = flowSI(fu);
      const he = LENGTH[key(hu)], hp = DP[key(hu)];
      // the head unit: metres or feet as in the file, any other length in metres; a pressure rise as a head in metres
      const yUnit = he && (he[0] === 'm' || he[0] === 'ft') ? he[0] : 'm';
      const toHead = he ? (he[0] === yUnit ? (h) => h * he[1] : (h) => U.fromSI(U.toSI(h * he[1], he[0], 'length'), yUnit, 'head'))
        : hp ? (h) => U.toSI(h * hp[1], hp[0], 'dp') / (rho * grav) : null;
      if (!cf || !cf.H.length || !cf.H.every(Number.isFinite) || !(fq > 0) || !toHead) { if (need) note('missing', 'pumpCurve', obj); return props; }
      const poly = (a) => (x) => a.reduce((s, c, i) => s + c * x ** i, 0);
      const H = poly(cf.H);
      // the range: the largest flow of the configuration, or else zero head (searched from the stored flow)
      let top = cf.qmax > 0 ? cf.qmax : NaN;
      if (!(top > 0)) {
        const st = conn.map((p) => storedQ(p.id)).find((x) => x > 0);
        top = shutoffRange(H, st > 0 ? st / fq : NaN);
      }
      const deg = cf.H.length - 1, n = deg <= 4 ? 11 : 41;
      const xs = Array.from({ length: n }, (_, i) => (top * i) / (n - 1));
      const fe = FLOW[key(fu)];
      const xUnit = fe && U.isVolumetric(fe[0]) ? fe[0] : 'm³/h';
      const x = xs.map((v) => U.fromSI(v * fq, xUnit, 'volFlow'));
      // a polynomial up to degree 4 is fitted with its own degree, which gives it back; a higher one is interpolated
      const fitOf = (a) => (a.length - 1 <= 4 ? String(Math.max(1, a.length - 1)) : 'xy');
      props.curve = { x, y: xs.map((v) => toHead(H(v))), xUnit, yUnit, fit: fitOf(cf.H) };
      if (cf.E.length && cf.E.every(Number.isFinite)) props.eff = { x: x.slice(), y: xs.map(poly(cf.E)), xUnit, fit: fitOf(cf.E) };
      if (cf.N.length && cf.N.every(Number.isFinite) && he) {
        props.npshr = { x: x.slice(), y: xs.map((v) => toHead(poly(cf.N)(v))), xUnit, yUnit, fit: fitOf(cf.N) };
        note('assumed', 'npshr', obj);
      }
      return props;
    }

    // tees and wyes with detailed losses: the node takes the stored stagnation pressure of its only inflow (or only
    // outflow), and the loss of each path becomes a K at the end of its pipe. A gain of pressure goes into the fittings of
    // the pipe, within their K, and the stored pressure of that end moves to the junction side, where Pump It then reports
    // it (F-23)
    for (const { j, conn } of tees) {
      if (!doCalibrate) { note('assumed', 'teePlain', 'J' + j.id); continue; }
      const ends = conn.map((p) => {
        const r = stored.get(p.id), arrives = p.down === j.id;
        return r && Number.isFinite(r.m) ? { p, r, arrives, into: arrives ? r.m > 0 : r.m < 0, m: Math.abs(r.m), p0: arrives ? r.P0out : r.P0in } : null;
      });
      if (ends.some((e) => !e)) { note('assumed', 'teePlain', 'J' + j.id); continue; }
      const ins = ends.filter((e) => e.into && e.m > 0), outs = ends.filter((e) => !e.into && e.m > 0);
      if (!ins.length || !outs.length) continue;
      const P = ins.length === 1 ? ins[0].p0 : outs.length === 1 ? outs[0].p0 : Math.max(...outs.map((e) => e.p0));
      const ks = [];
      for (const e of [...ins, ...outs]) {
        const A = areaOf(e.p.id);
        let K = (2 * (e.into ? e.p0 - P : P - e.p0) * rho * A * A) / (e.m * e.m);
        if (!Number.isFinite(K) || Math.abs(K) < 1e-4) continue;
        if (K > 0) { j.pipeK[e.p.id] = { kOut: K, kIn: K }; ks.push(['P' + e.p.id, K]); continue; }
        const room = e.p.fittings.reduce((s, it) => s + (it.qty ?? 1) * it.value, 0);
        if (-K > room) { note('assumed', 'teeGain', 'P' + e.p.id, { tee: 'J' + j.id }); K = -room; }
        if (!(K < 0)) continue;
        e.p.fittings.push({ name: t('core.fth.teeLoss', { id: 'J' + j.id }), model: 'K', value: K, qty: 1, id: 'imported-tee' });
        // the end on the junction side: P = P0 of the pipe end − K·ρV²/2 for a flow into the tee, + for a flow out of it
        const shift = (e.into ? -1 : 1) * K * (e.m * e.m) / (2 * rho * A * A);
        if (e.arrives) e.r.P0out += shift; else e.r.P0in += shift;
        ks.push(['P' + e.p.id, K]);
      }
      if (ks.length) note('assumed', 'teeCalibrated', 'J' + j.id, { ks });
    }

    // a junction left without an open pipe stops, as in the file (F-10)
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
    fth: {
      encoding: 'windows-1252', read, scenarios, compare, noteText, LEVELS,
      parse: { readSections, records, keyValues, kv, scenarioKey, scenarioSection, addOns, num, unesc, header, pipeLayout, junctionLayout, pumpConfigs, listScenarios },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
