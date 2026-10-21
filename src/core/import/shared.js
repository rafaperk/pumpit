// Pieces shared by the importers of scenario model files (.fth for liquids, .aro for gases). Both formats are
// Windows-1252 text in INI-style sections, with positional CSV records for pipes, junctions and stored results; both
// keep a base scenario whole and, for each child, only what differs from its parent. Their descriptions, written by the
// specification team, give the two the same records and scenarios (docs/fth-import.md and docs/aro-import.md; the
// decisions cited here are F-xx and A-xx of those files). Here: sections, keys and records, numbers, units written out
// in full, scenarios, the notes of an import, the drawing positions and the comparison with the stored results.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units;
  const { t } = PumpIt.i18n;
  const q = PumpIt.model.q;
  const FT = 0.3048, IN = 0.0254, LBM = 0.45359237, GAL = 3.785411784e-3, SLUG = 14.59390294;
  const blank = (unit) => ({ value: null, unit });

  // ---------- file structure

  // texts: 0x15 stands for a comma, 0x16 for a line break and 0x14 separates subfields (F-03)
  const unesc = (s) => String(s ?? '').replace(/\x15/g, ',').replace(/\x16/g, '\n').replace(/\x14/g, ' ').trim();
  // sections "[NAME]" with the lines that follow each one
  function readSections(text) {
    const out = {};
    let cur = '';
    for (const line of String(text).split(/\r?\n/)) {
      const h = line.match(/^\s*\[(.+)\]\s*$/);
      if (h) { cur = h[1].trim(); out[cur] = []; } else if (cur) out[cur].push(line);
    }
    return out;
  }
  // a section by its name, in any case
  const findKey = (S, name) => Object.keys(S).find((x) => x.toUpperCase() === name.toUpperCase());
  const sectionOf = (S, name) => { const k = findKey(S, name); return k ? S[k] : null; };
  // name of a section of scenario k: "NAME -- SCENARIO #k -- scenario name" or "NAME -- SCENARIO #k", in any case (so
  // that #1 is not #10); without `own`, the base scenario of a file without scenarios has the plain "NAME" (F-04)
  function scenarioKey(S, name, k = 1, own = false) {
    const pre = `${name} -- SCENARIO #${k}`.toUpperCase();
    const key = Object.keys(S).find((x) => { const u = x.toUpperCase(); return u === pre || u.startsWith(pre + ' --'); });
    return key || (k === 1 && !own ? findKey(S, name) || null : null);
  }
  const scenarioSection = (S, name, k = 1) => { const x = scenarioKey(S, name, k); return x ? S[x] : null; };
  // positional records start with an integer (a type or an ID)
  const records = (lines) => (lines || []).filter((l) => /^\s*-?\d+\s*,/.test(l)).map((l) => l.split(',').map((s) => s.trim()));
  // "key= value" lines hold settings: all of them (the keys as written), or one key in any case (F-04)
  const keyValues = (lines) => Object.fromEntries((lines || []).filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
  function kv(lines, name) {
    const k = name.toLowerCase();
    for (const l of lines || []) { const i = l.indexOf('='); if (i > 0 && l.slice(0, i).trim().toLowerCase() === k) return l.slice(i + 1).trim(); }
    return undefined;
  }
  // "value,unit": the unit is the last field and the rest, joined with a point, the number (a file saved with a decimal
  // comma; F-05)
  function valUnit(s) {
    if (s === undefined || s === null) return null;
    const parts = String(s).split(',');
    const unit = parts.pop().trim();
    const v = Number(parts.join('.').trim());
    return parts.length && parts.join('').trim() !== '' && Number.isFinite(v) ? { v, unit } : null;
  }
  // add-on modules switched on in the application section ("XYZ Use= -1"); their data are not imported (F-06)
  const addOns = (S) => Object.entries(keyValues(sectionOf(S, 'APPLICATION'))).filter(([k, v]) => /^[A-Z]{3} Use$/.test(k) && n0(v) !== 0).map(([k]) => k.slice(0, 3));
  // first line, "[maker] <program> VERSION n INPUT FILE": the version, and the program by a hash of its word, so that
  // the product names no other program (F-02, A-02)
  function wordHash(s) {
    let h = 0x811c9dc5;
    for (const ch of String(s).toUpperCase()) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return h;
  }
  function header(text) {
    const m = /^\s*(?:\S+\s+)?(\S+)\s+VERSION\s+(\d+)\s+INPUT\s+FILE\b/i.exec(String(text).split(/\r?\n/, 1)[0] || '');
    return m ? { version: Number(m[2]), program: wordHash(m[1]) } : null;
  }
  // the programs of the family: a liquid model (.fth) and a gas model (.aro)
  const PROGRAMS = { liquid: 0x9ed89e44, gas: 0x0eb41726 };

  // numbers: an empty field and the markers -9999 and -999999 mean "not given"; -9E+29 is an empty result
  function num(s) {
    if (s === undefined || s === null) return NaN;
    const x = String(s).trim();
    if (x === '') return NaN;
    const v = Number(x);
    return v === -9999 || v === -999999 || Math.abs(v) >= 1e29 ? NaN : v;
  }
  const n0 = (s) => { const v = num(s); return Number.isFinite(v) ? v : 0; };
  const str = (s) => (s === undefined || s === null ? '' : String(s).trim());
  const isInt = (v) => Number.isInteger(v);

  // ---------- units, written out in full in the file ("feet", "gal/min", "barG"...): [unit of Pump It, factor from the
  // unit of the file to it]. A unit Pump It does not list goes to a near unit of its own (F-07)

  const key = (s) => str(s).toLowerCase().replace(/\s+/g, '');
  const LENGTH = {
    meters: ['m', 1], meter: ['m', 1], m: ['m', 1], feet: ['ft', 1], foot: ['ft', 1], ft: ['ft', 1], inches: ['in', 1], inch: ['in', 1],
    in: ['in', 1], cm: ['cm', 1], mm: ['mm', 1], km: ['km', 1], miles: ['mi', 1], mile: ['mi', 1], mi: ['mi', 1],
    microns: ['mm', 1e-3], microinches: ['mm', 2.54e-5], yards: ['m', 0.9144],
  };
  const AREA = { meters2: ['m²', 1], feet2: ['ft²', 1], inches2: ['in²', 1], cm2: ['cm²', 1], mm2: ['mm²', 1] };
  // pressure: absolute, or gauge (relative to the ambient pressure of the file, which becomes system.patm); a column of
  // standard water is 1000 kg/m³ × g0
  const PRESSURE = {
    atm: ['atm', 1], bar: ['bar(a)', 1], mbar: ['kPa(a)', 0.1], pascals: ['Pa(a)', 1], kpa: ['kPa(a)', 1], mpa: ['MPa(a)', 1],
    psia: ['psia', 1], psfa: ['psia', 1 / 144], 'kg/cm2': ['kgf/cm²(a)', 1], 'dyn/cm2': ['Pa(a)', 0.1], mmhg: ['mmHg(a)', 1],
    'in.hg': ['kPa(a)', 3.386389],
    barg: ['bar(g)', 1], mbarg: ['kPa(g)', 0.1], 'pascals(g)': ['Pa(g)', 1], 'kpa(g)': ['kPa(g)', 1], 'mpa(g)': ['MPa(g)', 1],
    psig: ['psig', 1], psfg: ['psig', 1 / 144], 'kg/cm2(g)': ['kgf/cm²(g)', 1], 'dyn/cm2(g)': ['Pa(g)', 0.1],
    'mmhg(g)': ['kPa(g)', 0.133322387415], 'in.hg(g)': ['kPa(g)', 3.386389],
  };
  // pressure differences: their own units, and the absolute units without a reference
  const DP = {
    psid: ['psi', 1], psfd: ['psi', 1 / 144], psi: ['psi', 1], psia: ['psi', 1], bar: ['bar', 1], mbar: ['kPa', 0.1], pascals: ['Pa', 1],
    kpa: ['kPa', 1], mpa: ['MPa', 1], atm: ['kPa', 101.325], 'kg/cm2': ['kgf/cm²', 1], 'dyn/cm2': ['Pa', 0.1], mmhg: ['mmHg', 1],
    'in.hg': ['kPa', 3.386389],
  };
  for (const [n, h] of [['mm', 1e-3], ['cm', 0.01], ['m', 1], ['in.', IN], ['ft.', FT]]) {
    PRESSURE[n + 'h2ostd.'] = ['kPa(a)', 9.80665 * h];
    PRESSURE[n + 'h2ostd.(g)'] = ['mca(g)', h];
    DP[n + 'h2ostd.'] = ['mca', h];
  }
  // flow: volume or mass per second, minute, hour or day; one of Pump It, or else m³/h and kg/s
  const FLOW = {};
  {
    const own = {
      'm3/sec': 'm³/s', 'm3/hr': 'm³/h', 'liter/sec': 'L/s', 'liters/sec': 'L/s', 'liter/min': 'L/min', 'liters/min': 'L/min',
      'gal/min': 'gpm', 'ft3/sec': 'ft³/s', 'barrels/day': 'bbl/d', 'kg/sec': 'kg/s', 'kg/hr': 'kg/h', 'lbm/sec': 'lbm/s',
      'lbm/hr': 'lbm/h', 'm-ton/hr': 't/h',
    };
    const per = { sec: 1, min: 60, hr: 3600, day: 86400 };
    const volume = { m3: 1, liter: 1e-3, liters: 1e-3, ft3: FT ** 3, gal: GAL, 'gal-uk': 4.54609e-3, barrels: 0.158987294928, cm3: 1e-6, mm3: 1e-9, in3: IN ** 3, 'acre-ft': 1233.48183754752 };
    const mass = { kg: 1, gram: 1e-3, lbm: LBM, 'm-ton': 1000, ton: 907.18474, slug: SLUG };
    for (const [p, s] of Object.entries(per)) {
      for (const [n, f] of Object.entries(volume)) FLOW[`${n}/${p}`] = own[`${n}/${p}`] ? [own[`${n}/${p}`], 1] : ['m³/h', (f / s) * 3600];
      for (const [n, f] of Object.entries(mass)) FLOW[`${n}/${p}`] = own[`${n}/${p}`] ? [own[`${n}/${p}`], 1] : ['kg/s', f / s];
    }
    FLOW.mgd = ['m³/h', (1e6 * GAL / 86400) * 3600];
  }
  const VISCOSITY = {
    'pa-sec': ['Pa·s', 1], centipoise: ['cP', 1], 'lbm/s-ft': ['lbm/(ft·s)', 1], poise: ['cP', 100], 'kg/sec-m': ['cP', 1000],
    'kg/sec-cm': ['cP', 1e5], 'kg/sec-mm': ['cP', 1e6], 'lbf-s/ft2': ['cP', 47880.25898], 'lbf-hr/ft2': ['cP', 47880.25898 * 3600],
    'lbf-s/in2': ['cP', U.PSI * 1000], 'lbf-hr/in2': ['cP', U.PSI * 3.6e6], 'lbm/hr-ft': ['lbm/(ft·s)', 1 / 3600],
    'lbm/s-in': ['lbm/(ft·s)', 12], 'lbm/hr-in': ['lbm/(ft·s)', 12 / 3600],
  };
  const TEMPERATURE = { 'deg.c': '°C', 'deg.f': '°F', 'deg.k': 'K', 'deg.r': '°R' };
  const inTable = (table, unit) => Object.prototype.hasOwnProperty.call(table, key(unit));

  // quantities in the units of a file. The unit "None" leaves the value undefined in the file, and an unknown unit
  // leaves it blank: both with a note when the value is needed (obj given)
  function quantities(note) {
    const unknownUnit = (obj, unit) => note('missing', 'unit', obj, { unit: str(unit) || '?' });
    const undefinedUnit = (unit) => unit === undefined || key(unit) === 'none' || key(unit) === '';
    function qty(table, v, unit, obj, fb) {
      if (undefinedUnit(unit)) { if (obj) note('missing', 'notGiven', obj); return blank(fb); }
      const e = table[key(unit)];
      if (!e) { if (obj) unknownUnit(obj, unit); return blank(fb); }
      return Number.isFinite(v) ? q(v * e[1], e[0]) : blank(e[0]);
    }
    const len = (v, unit, obj) => qty(LENGTH, v, unit, obj, 'm');
    function area(v, unit, obj) {
      if (undefinedUnit(unit) || inTable(AREA, unit)) return qty(AREA, v, unit, obj, 'm²');
      const e = LENGTH[key(unit).replace(/\^?2$|²$/, '')];
      if (!e) { if (obj) unknownUnit(obj, unit); return blank('m²'); }
      const f = U.toSI(e[1], e[0], 'length');
      return Number.isFinite(v) ? q(v * f * f, 'm²') : blank('m²');
    }
    const pressure = (v, unit, obj) => qty(PRESSURE, v, unit, obj, 'kgf/cm²(g)');
    const dp = (v, unit, obj) => qty(DP, v, unit, obj, 'kgf/cm²');
    // a flow; "None" with no value is no flow (a node without a source)
    function flow(v, unit, obj) {
      if (undefinedUnit(unit) && !(Number.isFinite(v) && v !== 0)) return q(0, 'm³/h');
      return qty(FLOW, v, unit, obj, 'm³/h');
    }
    return { unknownUnit, undefinedUnit, qty, len, area, pressure, dp, flow };
  }

  // ---------- scenarios: the base scenario is complete, and each child keeps only what differs from its parent (F-08).
  // The base scenario may also have no network, the network being in its children (F-33, A-28)

  // a file of the family holds a model when it has a section of pipes or of junctions, of any scenario
  const hasNetwork = (S) => Object.keys(S).some((x) => /^(PIPES|JUNCTIONS)( -- SCENARIO #\d+( -- .*)?)?$/i.test(x));
  // deletions in a child: "DELETED,id,name" for a pipe, "DELETED,type,id,name" for a junction
  const DELETED_PIPE = /^\s*DELETED\s*,\s*([^,]+)/i, DELETED_JUNCTION = /^\s*DELETED\s*,[^,]*,\s*([^,]+)/i;
  // the IDs that the section of pipes or junctions of scenario k deletes and those of its records, read without
  // splitting the records: a pipe record starts with its ID, a junction record with its type and its ID
  function sectionIds(S, name, k) {
    const junction = name === 'JUNCTIONS', out = { del: [], ids: [] };
    for (const l of scenarioSection(S, name, k) || []) {
      const d = (junction ? DELETED_JUNCTION : DELETED_PIPE).exec(l);
      const r = !d && (junction ? /^\s*-?\d+\s*,([^,]*)/ : /^\s*(-?\d+)\s*,/).exec(l);
      if (d) out.del.push(d[1].trim()); else if (r) out.ids.push(r[1].trim());
    }
    return out;
  }
  // whether each scenario of the list has a network: a pipe or a junction left at the end of its chain
  function markNetworks(S, list) {
    const own = new Map(list.map((s) => [s.n, [sectionIds(S, 'PIPES', s.n), sectionIds(S, 'JUNCTIONS', s.n)]]));
    for (const s of list) {
      const sets = [new Set(), new Set()];
      for (const k of chainOf(list, s.n)) own.get(k).forEach((x, i) => { x.del.forEach((id) => sets[i].delete(id)); x.ids.forEach((id) => sets[i].add(id)); });
      s.network = sets[0].size + sets[1].size > 0;
    }
    return list;
  }

  // the scenario manager: "Scenario #n= name,parent path,L,description of L characters,control integers"
  function listScenarios(S) {
    const out = [];
    for (const l of sectionOf(S, 'SCENARIO MANAGER') || []) {
      const m = /^\s*scenario #(\d+)\s*=\s?(.*)$/i.exec(l);
      if (!m) continue;
      const s = m[2], n = Number(m[1]);
      const i1 = s.indexOf(','), i2 = i1 < 0 ? -1 : s.indexOf(',', i1 + 1), i3 = i2 < 0 ? -1 : s.indexOf(',', i2 + 1);
      const name = unesc(i1 < 0 ? s : s.slice(0, i1)) || '#' + n;
      const parent = i1 < 0 ? '' : unesc(s.slice(i1 + 1, i2 < 0 ? undefined : i2));
      const len = i3 < 0 ? 0 : Number(s.slice(i2 + 1, i3));
      out.push({ n, name, parent, path: parent ? `${parent}/${name}` : name, description: len > 0 ? unesc(s.slice(i3 + 1, i3 + 1 + len)) : '', results: records(scenarioSection(S, 'PIPE ARCHIVE DATA', n)).length > 0 });
    }
    if (!out.some((s) => s.n === 1)) {
      const k = scenarioKey(S, 'PIPES');
      const name = k ? k.split(' -- ').slice(2).join(' -- ').trim() : '';
      out.unshift({ n: 1, name, parent: '', path: name, description: '', results: records(scenarioSection(S, 'PIPE ARCHIVE DATA', 1)).length > 0 });
    }
    return markNetworks(S, out.sort((a, b) => a.n - b.n));
  }
  // the scenarios of a file, for the choice before the import: [{ n, name, parent, path, description, results,
  // network }]
  const scenarios = (text) => listScenarios(readSections(text));
  // the scenario to import: the one asked for (its number, name or path) or else the base scenario, or the first one
  // with a network when the base scenario has none. A file without a network, a scenario that is not in the file and a
  // scenario without a network are refused
  function targetScenario(list, scenario) {
    if (!list.some((s) => s.network)) throw new Error(t('core.import.noNetwork'));
    const given = scenario !== undefined && scenario !== null && scenario !== '';
    const target = !given ? list.find((s) => s.n === 1 && s.network) || list.find((s) => s.network)
      : typeof scenario === 'number' ? list.find((s) => s.n === scenario) : list.find((s) => s.path === scenario || s.name === scenario);
    if (!target) throw new Error(t('core.import.noScenario', { scenario: String(scenario) }));
    if (!target.network) {
      throw new Error(t('core.import.emptyScenario', { scenario: target.path || '#' + target.n, list: list.filter((s) => s.network).map((s) => `“${s.path || '#' + s.n}”`).join(', ') }));
    }
    return target;
  }
  // the chain of scenario n: the base scenario, the ancestors of n by its parent path (from the root down) and n
  function chainOf(list, n) {
    const target = list.find((s) => s.n === n);
    const byPath = new Map(list.map((s) => [s.path, s.n]));
    const out = [1];
    const parts = target && target.parent ? target.parent.split('/') : [];
    for (let i = 1; i <= parts.length; i++) { const k = byPath.get(parts.slice(0, i).join('/')); if (k !== undefined) out.push(k); }
    out.push(n);
    return [...new Set(out)];
  }

  // a field of a child: empty inherits, filled replaces; a count −n kept from the parent is not a new value (F-08)
  const negCount = (v, pv) => /^-\d+$/.test(v) && /^\d+$/.test(String(pv)) && Number(v) === -Number(pv);
  const put = (out, i, v) => { if (v !== '' && v !== undefined && !negCount(v, out[i])) out[i] = v; };
  const overlay = (a, b) => { const o = a.slice(); b.forEach((v, i) => put(o, i, v)); return o; };
  // a counted list of a child: n > 0 is a new list (an empty item inherits the item at its place), −n keeps the n items
  // of the parent (an empty item inherits, a filled one replaces), 0 leaves the list out of the record (inherited)
  function mergeList(pl, dl, dc) {
    if (n0(dc) > 0) return dl.map((v, i) => (v === '' && i < pl.length ? pl[i] : v));
    const out = pl.slice();
    if (n0(dc) < 0 || dc === '-0') dl.forEach((v, i) => { if (i < out.length) put(out, i, v); });
    return out;
  }

  // pipe record: [5] the number nT of segments, then nT pairs (length, elevation at the end of the segment), one field,
  // the number of drawing points and 3 fields per point; the block b starts after them (F-09)
  function pipeLayout(r) {
    const nT = Math.abs(n0(r[5])), iN = 7 + 2 * nT, npts = Math.abs(n0(r[iN]));
    return { nT, iN, npts, b: iN + 1 + 3 * npts };
  }
  function mergePipe(par, d) {
    const parts = (r) => { const { nT, iN, b } = pipeLayout(r); return { head: r.slice(0, 5), cT: r[5], pairs: r.slice(6, 6 + 2 * nT), mid: r[iN - 1], cN: r[iN], pts: r.slice(iN + 1, b), blk: r.slice(b) }; };
    const P = parts(par), D = parts(d);
    const head = P.head.slice();
    for (let i = 1; i < 5; i++) put(head, i, D.head[i]);
    const pairs = mergeList(P.pairs, D.pairs, D.cT), pts = mergeList(P.pts, D.pts, D.cN);
    const blk = P.blk.slice();
    D.blk.slice(0, 60).forEach((v, i) => put(blk, i, v)); // after b+60, packed tables of costs and sizing (not read)
    return [...head, String(pairs.length / 2), ...pairs, D.mid !== '' && D.mid !== undefined ? D.mid : P.mid, String(pts.length / 3), ...pts, ...blk];
  }

  // junction record: [5] the number np of pipes and their signed IDs (− leaves the junction, + arrives), the common
  // block from b = 6 + np, and the block of the type after the anchor −999 that closes the tables of the common block:
  // its first occurrence from b+46 (F-15)
  function junctionLayout(r) {
    const np = Math.abs(n0(r[5])), b = 6 + np;
    let a = -1;
    for (let i = b + 46; i < r.length; i++) if (r[i] === '-999') { a = i; break; }
    return { np, b, t: a >= 0 ? a + 1 : b + 69 };
  }
  // fields per pipe at the start of the block of the type (branch 3, reservoir 5, imposed pressure 3), realigned by the
  // pipe each group belongs to
  const PER_PIPE = { 1: 3, 2: 5, 4: 3 };
  function mergePerPipe(pT, dT, w, pList, list, dc, nP, nD) {
    const region = [];
    list.forEach((id, k) => {
      const kp = pList.findIndex((v) => Math.abs(n0(v)) === Math.abs(n0(id)));
      const out = kp >= 0 ? pT.slice(w * kp, w * kp + w) : Array(w).fill('0');
      if (n0(dc) !== 0 && k < nD) dT.slice(w * k, w * k + w).forEach((v, i) => put(out, i, v));
      region.push(...out);
    });
    return [...region, ...overlay(pT.slice(w * nP), dT.slice(w * nD))];
  }
  // a counted list of curve coefficients with its count at place i0 of the block (the place by type: `counted` of the
  // format)
  function mergeCounted(pT, dT, i0) {
    const nP = Math.abs(n0(pT[i0])), nD = Math.abs(n0(dT[i0]));
    const list = mergeList(pT.slice(i0 + 1, i0 + 1 + nP), dT.slice(i0 + 1, i0 + 1 + nD), dT[i0]);
    return [...overlay(pT.slice(0, i0), dT.slice(0, i0)), String(list.length), ...list, ...overlay(pT.slice(i0 + 1 + nP), dT.slice(i0 + 1 + nD))];
  }
  // pump (or compressor): a head of 13 fields, the configurations (count at t+12), each with three counted lists
  // (coefficients of head, NPSHR and efficiency), and the rest
  function pumpParts(T) {
    const cfgs = [];
    let c = 13;
    for (let k = 0, n = Math.abs(n0(T[12])); k < n && c < T.length; k++) {
      const nH = Math.abs(n0(T[c + 6])), p = c + 7 + nH;
      const nN = Math.abs(n0(T[p + 2])), r = p + 3 + nN;
      const nE = Math.abs(n0(T[r + 3])), e = r + 4 + nE;
      cfgs.push({ a: T.slice(c, c + 6), cH: T[c + 6], H: T.slice(c + 7, p), b: T.slice(p, p + 2), cN: T[p + 2], N: T.slice(p + 3, r), c3: T.slice(r, r + 3), cE: T[r + 3], E: T.slice(r + 4, e), d: T.slice(e, e + 13) });
      c = e + 13;
    }
    return { head: T.slice(0, 13), cfgs, rest: T.slice(c) };
  }
  function mergePump(pT, dT) {
    const P = pumpParts(pT), D = pumpParts(dT);
    const none = { a: [], H: [], b: [], N: [], c3: [], E: [], d: [] };
    const one = (pc = none, dcf) => (!dcf ? pc : {
      a: overlay(pc.a, dcf.a), H: mergeList(pc.H, dcf.H, dcf.cH), b: overlay(pc.b, dcf.b), N: mergeList(pc.N, dcf.N, dcf.cN),
      c3: overlay(pc.c3, dcf.c3), E: mergeList(pc.E, dcf.E, dcf.cE), d: overlay(pc.d, dcf.d),
    });
    const dc = n0(D.head[12]);
    const cfgs = dc > 0 ? D.cfgs.map((c, k) => one(P.cfgs[k], c)) : dc < 0 ? P.cfgs.map((c, k) => one(c, D.cfgs[k])) : P.cfgs;
    const head = overlay(P.head, D.head);
    head[12] = String(cfgs.length);
    const body = cfgs.flatMap((c) => [...c.a, String(c.H.length), ...c.H, ...c.b, String(c.N.length), ...c.N, ...c.c3, String(c.E.length), ...c.E, ...c.d]);
    return [...head, ...body, ...overlay(P.rest, D.rest)];
  }
  // counted: the place of the count of the curve coefficients in the block of each type of the format
  function mergeJunction(par, d, counted) {
    const P = junctionLayout(par), D = junctionLayout(d);
    const head = par.slice(0, 5);
    for (let i = 1; i < 5; i++) put(head, i, d[i]);
    const pList = par.slice(6, P.b), list = mergeList(pList, d.slice(6, D.b), d[5]);
    const common = par.slice(P.b, P.t); // the common block of the parent, up to its anchor
    for (let k = 0; k < 46 && D.b + k < d.length; k++) put(common, k, d[D.b + k]);
    const pT = par.slice(P.t), dT = d.slice(D.t), type = n0(par[0]);
    const block = PER_PIPE[type] ? mergePerPipe(pT, dT, PER_PIPE[type], pList, list, d[5], P.np, D.np)
      : type === 17 ? mergePump(pT, dT) : counted[type] ? mergeCounted(pT, dT, counted[type]) : overlay(pT, dT);
    return [...head, String(list.length), ...list, ...common, ...block];
  }
  // the records of a scenario: those of the base scenario, then the deletions, new records and changes of each child of
  // the chain, in order
  function scenarioRecords(S, chain, note, counted) {
    const P = new Map(), J = new Map();
    chain.forEach((n, k) => {
      const ps = scenarioSection(S, 'PIPES', n), js = scenarioSection(S, 'JUNCTIONS', n);
      for (const l of ps || []) { const m = DELETED_PIPE.exec(l); if (m) P.delete(m[1].trim()); }
      for (const l of js || []) { const m = DELETED_JUNCTION.exec(l); if (m) J.delete(m[1].trim()); }
      for (const r of records(ps)) P.set(r[0], k === 0 || !P.has(r[0]) ? r : mergePipe(P.get(r[0]), r));
      for (const r of records(js)) {
        const prev = J.get(r[1]);
        if (k > 0 && prev && n0(r[5]) > 0 && n0(r[5]) !== junctionLayout(prev).np) note('assumed', 'scenarioPipes', 'J' + r[1]);
        J.set(r[1], k === 0 || !prev ? r : mergeJunction(prev, r, counted));
      }
    });
    return { P, J };
  }
  // the fluid data of a scenario: the keys of the base, replaced by those of each child of the chain
  function fluidLines(S, chain) {
    const map = new Map();
    const add = (l) => { const i = l.indexOf('='); if (i > 0) map.set(l.slice(0, i).trim().toLowerCase(), l); };
    (sectionOf(S, 'FLUID DATA') || []).forEach(add);
    for (const n of chain) { const k = scenarioKey(S, 'FLUID DATA', n, true); if (k) S[k].forEach(add); }
    return [...map.values()];
  }
  // goal seek and control: variables applied in a control section of three letters (the base, then the chain)
  function goalSeek(S, chain) {
    const name = Object.keys(S).find((k) => /^[A-Z]{3} CONTROL$/i.test(k) && kv(S[k], 'VariablesApplied') !== undefined);
    if (!name) return 0;
    let n = n0(String(kv(S[name], 'VariablesApplied')).split(',')[0]);
    for (const k of chain.slice(1)) { const x = scenarioKey(S, name, k, true); const v = x && kv(S[x], 'VariablesApplied'); if (v !== undefined && v !== null) n = n0(String(v).split(',')[0]); }
    return n;
  }

  // pump or compressor (F-25, A-21): configurations (impeller or speed) from t+13, each with its largest flow and the
  // coefficients of head, NPSHR and efficiency; the one in use at t+11; after them, the relative speed (1 = 100 %)
  function pumpConfigs(r, tb) {
    const n = Math.max(0, n0(r[tb + 12]));
    const list = [];
    let c = tb + 13;
    for (let k = 0; k < n && c < r.length; k++) {
      const nH = Math.max(0, n0(r[c + 6]));
      const H = r.slice(c + 7, c + 7 + nH).map(num);
      let p = c + 9 + nH;
      const nN = Math.max(0, n0(r[p]));
      const N = r.slice(p + 1, p + 1 + nN).map(num);
      p += 4 + nN;
      const nE = Math.max(0, n0(r[p]));
      const E = r.slice(p + 1, p + 1 + nE).map(num);
      list.push({ name: unesc(r[c]), qmax: num(r[c + 4]), H, N, E });
      c = p + 14 + nE;
    }
    const sel = n0(r[tb + 11]), speed = num(r[c]);
    return { list, sel: sel >= 1 && sel <= list.length ? sel : 1, speed: speed > 0 ? speed : 1, post: c };
  }
  // flow at which a polynomial curve falls to zero (the end of its points), searched from the stored flow or from small
  // flows; without such a point, twice the stored flow (or 1 unit)
  function shutoffRange(H, qStored) {
    if (!(H(0) > 0)) return qStored > 0 ? 2 * qStored : 1;
    let lo = 0, hi = qStored > 0 ? qStored / 4 : 1e-3;
    for (let i = 0; i < 200 && H(hi) > 0; i++) { lo = hi; hi *= 1.25; if (hi > 1e12) return qStored > 0 ? 2 * qStored : 1; }
    for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (H(mid) > 0) lo = mid; else hi = mid; }
    return lo;
  }

  // ---------- notes: one entry per kind (and values), with the objects it concerns

  function makeNotes() {
    const list = [], byKey = new Map();
    function add(level, kind, obj, params = {}) {
      const k = kind + '|' + JSON.stringify(params);
      let n = byKey.get(k);
      if (!n) { n = { level, key: kind, params, objs: [] }; byKey.set(k, n); list.push(n); }
      if (obj && !n.objs.includes(obj)) n.objs.push(obj);
      return n;
    }
    return { add, list };
  }
  const LEVELS = ['missing', 'assumed', 'ignored', 'info'];
  const sortNotes = (list) => list.sort((x, y) => LEVELS.indexOf(x.level) - LEVELS.indexOf(y.level));
  // text of a note in the current language: numbers in its format (a list of [label, number] pairs too), the objects
  // listed up to a limit
  function noteText(n, limit = 12) {
    const objs = n.objs.slice(0, limit).join(', ') + (n.objs.length > limit ? ` (+${n.objs.length - limit})` : '');
    const fmt = new Intl.NumberFormat(PumpIt.i18n.numberLocale(), { maximumSignificantDigits: 4 });
    const one = (v) => (typeof v === 'number' ? fmt.format(v) : Array.isArray(v) ? v.map(one).join(' ') : v);
    const params = Object.fromEntries(Object.entries(n.params).map(([k, v]) => [k, Array.isArray(v) ? v.map(one).join('; ') : one(v)]));
    return t('core.import.notes.' + n.key, Object.assign({ objs }, params));
  }

  // a junction left without an open pipe stops, as in the file: no flow from its source, its pump or its control valve
  // (F-10)
  function stopIsolated(m, note) {
    for (const j of m.junctions) {
      const ps = m.pipes.filter((p) => p.up === j.id || p.down === j.id);
      if (!ps.length) continue;
      const allClosed = ps.every((p) => p.closed), anyClosed = ps.some((p) => p.closed);
      let stop = false;
      if (j.type === 'flow' && allClosed && j.Q.value) { j.Q = q(0, j.Q.unit); stop = true; }
      else if (j.type === 'branch' && allClosed && j.source.value) { j.source = q(0, j.source.unit); stop = true; }
      else if (j.type === 'pump' && anyClosed && j.state === 'on' && j.mode !== 'curve') { j.state = 'offClosed'; stop = true; }
      else if (j.type === 'control' && anyClosed && j.special === 'none') { j.special = 'closed'; stop = true; }
      if (stop) note('assumed', 'stopped', 'J' + j.id);
    }
  }

  // drawing positions: the coordinates of the file scaled so that neighbouring junctions sit about 160 units apart,
  // on the grid of the drawing; without usable coordinates, the junctions go on a grid (F-30). A junction the import
  // created goes beside the pump it serves, on its side
  function place(js, raw, note, created = []) {
    const GRID = 20, SPACING = 160, MARGIN = 100;
    const own = js.filter((j) => !created.some((c) => c.j === j));
    const pts = own.map((j) => raw.get(j.id) || [NaN, NaN]);
    const okPts = pts.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
    const spread = okPts && new Set(pts.map((p) => p.join(','))).size > 1;
    const used = new Set();
    if (!own.length) return;
    if (!spread) {
      const cols = Math.ceil(Math.sqrt(own.length));
      own.forEach((j, i) => { j.x = MARGIN + (i % cols) * SPACING; j.y = MARGIN + Math.floor(i / cols) * SPACING; used.add(j.x + ',' + j.y); });
      if (own.length > 1) note('assumed', 'layout', null);
    } else {
      // median distance to the nearest distinct neighbour (a sample of the junctions in large models)
      const sample = pts.length > 400 ? pts.filter((_, i) => i % Math.ceil(pts.length / 400) === 0) : pts;
      const near = sample.map((a) => Math.min(...pts.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1])).filter((x) => x > 0)));
      near.sort((x, y) => x - y);
      const d = near[Math.floor(near.length / 2)];
      const s = d > 0 && Number.isFinite(d) ? SPACING / d : 1;
      const x0 = Math.min(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1]));
      own.forEach((j, i) => {
        let x = MARGIN + Math.round(((pts[i][0] - x0) * s) / GRID) * GRID, y = MARGIN + Math.round(((pts[i][1] - y0) * s) / GRID) * GRID;
        while (used.has(x + ',' + y)) x += GRID; // two junctions on the same spot of the grid
        used.add(x + ',' + y);
        j.x = x; j.y = y;
      });
    }
    for (const c of created) {
      const of = js.find((j) => j.id === c.of);
      let x = (of ? of.x : MARGIN) + c.side * 4 * GRID, y = of ? of.y : MARGIN;
      while (used.has(x + ',' + y)) y += GRID;
      used.add(x + ',' + y);
      c.j.x = x; c.j.y = y;
    }
  }

  // largest differences between a calculation and the results stored in the file: the mass flow relative to the
  // largest stored flow, and the stagnation pressure at the pipe ends relative to the largest stored pressure drop in a
  // pipe (the measure of the validation of section 10)
  function compare(res, stored) {
    let mmax = 0, dpmax = 0;
    for (const x of stored.values()) {
      if (Number.isFinite(x.m)) mmax = Math.max(mmax, Math.abs(x.m));
      if (Number.isFinite(x.P0in - x.P0out)) dpmax = Math.max(dpmax, Math.abs(x.P0in - x.P0out));
    }
    const out = { n: 0, flow: 0, flowPipe: null, pressure: 0, pressurePipe: null };
    for (const [id, x] of stored) {
      const y = res.pipes && res.pipes[id];
      if (!y || !Number.isFinite(x.m)) continue;
      out.n++;
      const em = Math.abs(y.m - x.m) / (mmax || 1);
      if (em > out.flow) { out.flow = em; out.flowPipe = id; }
      const ep = Math.max(Math.abs(y.P0in - x.P0in), Math.abs(y.P0out - x.P0out)) / (dpmax || 1);
      if (Number.isFinite(ep) && ep > out.pressure) { out.pressure = ep; out.pressurePipe = id; }
    }
    return out;
  }

  PumpIt.importShared = {
    FT, IN, LBM, GAL, SLUG, blank,
    unesc, readSections, findKey, sectionOf, scenarioKey, scenarioSection, records, keyValues, kv, valUnit, addOns,
    wordHash, header, PROGRAMS, num, n0, str, isInt,
    key, LENGTH, AREA, PRESSURE, DP, FLOW, VISCOSITY, TEMPERATURE, inTable, quantities,
    hasNetwork, listScenarios, scenarios, targetScenario, chainOf, mergeList, overlay, pipeLayout, mergePipe,
    junctionLayout, mergeJunction, scenarioRecords, fluidLines, goalSeek, pumpConfigs, shutoffRange,
    makeNotes, LEVELS, sortNotes, noteText, stopIsolated, place, compare,
  };
})(typeof window !== 'undefined' ? window : globalThis);
