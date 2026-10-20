// Import of .fth model files, the text format described in Annex A of the specification: Windows-1252 text in
// INI-style sections, with positional CSV records for pipes, junctions and stored results. The base scenario becomes a
// Pump It model. Only what Annex A describes is read; whatever it leaves open is left blank for the checklist, assumed
// or left out, and every such case goes into the import notes, as Annex B asks ("best effort, reporting what was
// ignored"). The decisions are recorded in docs/fth-import.md (F-xx).
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, U = PumpIt.units;
  const { t } = PumpIt.i18n;
  const q = M.q;
  const FT = 0.3048, LBM = 0.45359237, GAL = 3.785411784e-3;
  const blank = (unit) => ({ value: null, unit });

  // ---------- file structure

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
  // positional records start with an integer (a type or an ID); "key= value" lines hold settings
  const records = (lines) => (lines || []).filter((l) => /^\s*-?\d+\s*,/.test(l)).map((l) => l.split(','));
  const keyValues = (lines) => Object.fromEntries((lines || []).filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
  // name of a section of scenario k, "NAME -- SCENARIO #k -- scenario name" (the base scenario is #1); a file without
  // scenarios has the plain "NAME"
  function scenarioKey(S, name, k = 1) {
    const pre = `${name} -- SCENARIO #${k} `;
    return Object.keys(S).find((x) => x.startsWith(pre)) || (k === 1 && S[name] ? name : null);
  }
  const scenarioSection = (S, name) => { const k = scenarioKey(S, name); return k ? S[k] : null; };
  // add-on modules switched on in the application section ("XYZ Use= -1"); their data are not imported (F-03)
  const addOns = (S) => Object.entries(keyValues(S.APPLICATION)).filter(([k, v]) => /^[A-Z]{3} Use$/.test(k) && v === '-1').map(([k]) => k.slice(0, 3));

  // numbers: an empty field and the markers -9999 and -999999 mean "not given"
  function num(s) {
    if (s === undefined || s === null) return NaN;
    const x = String(s).trim();
    if (x === '') return NaN;
    const v = Number(x);
    return v === -9999 || v === -999999 ? NaN : v;
  }
  const str = (s) => (s === undefined || s === null ? '' : String(s).trim());
  const isInt = (v) => Number.isInteger(v);

  // ---------- units, written out in full in the file ("feet", "gal/min", "psia"...)

  const key = (s) => str(s).toLowerCase().replace(/\s+/g, '');
  // a unit of Pump It, or a factor to SI when Pump It does not list the unit
  const LENGTH = {
    feet: 'ft', foot: 'ft', ft: 'ft', meters: 'm', meter: 'm', metres: 'm', m: 'm', inches: 'in', inch: 'in', in: 'in',
    mm: 'mm', millimeters: 'mm', cm: 'cm', centimeters: 'cm', km: 'km', kilometers: 'km', miles: 'mi', mile: 'mi', mi: 'mi',
  };
  const LENGTH_SI = { yards: 0.9144, yard: 0.9144 };
  const isLength = (s) => key(s) in LENGTH || key(s) in LENGTH_SI;
  const FLOW = {
    'gal/min': 'gpm', gpm: 'gpm', 'm3/sec': 'm³/s', 'm3/s': 'm³/s', 'm3/hr': 'm³/h', 'm3/h': 'm³/h', 'ft3/sec': 'ft³/s',
    'liters/sec': 'L/s', 'l/s': 'L/s', 'liters/min': 'L/min', 'l/min': 'L/min', 'barrels/day': 'bbl/d',
    'lbm/sec': 'lbm/s', 'lbm/hr': 'lbm/h', 'kg/sec': 'kg/s', 'kg/s': 'kg/s', 'kg/hr': 'kg/h', 'kg/h': 'kg/h', 'm-ton/hr': 't/h',
  };
  const FLOW_SI = { 'cm3/sec': 1e-6, 'ft3/min': FT ** 3 / 60, 'barrels/hr': 0.158987294928 / 3600, 'liter/sec': 1e-3, 'm3/min': 1 / 60, 'gal/hr': GAL / 3600, 'gal/sec': GAL };
  const HEAD = { feet: 'ft', foot: 'ft', ft: 'ft', meters: 'm', meter: 'm', m: 'm' };
  // pressure: a base unit with an optional gauge or absolute mark ("psig", "bar(g)", "kPa a", "kg/cm2g"...); a unit
  // without a mark is absolute (F-08). Returns { unit, assumed } or null
  function pressureUnit(name) {
    const k = key(name);
    if (k === 'atm') return { unit: 'atm', assumed: false };
    const mm = k.match(/^(mpa|kpa|pa|bar|kgf?\/cm2|kgf?\/cm²|psi|mmhg)(?:\(([ag])\)|([ag])|(abs)|(gauge))?$/);
    if (!mm) return null;
    const mark = mm[2] || mm[3] || (mm[4] ? 'a' : mm[5] ? 'g' : '');
    const base = { mpa: 'MPa', kpa: 'kPa', pa: 'Pa', bar: 'bar', psi: 'psi', mmhg: 'mmHg' }[mm[1]] || 'kgf/cm²';
    if (base === 'psi') return { unit: mark === 'g' ? 'psig' : 'psia', assumed: !mark };
    if (base === 'mmHg') return mark === 'g' ? null : { unit: 'mmHg(a)', assumed: !mark };
    return { unit: `${base}(${mark || 'a'})`, assumed: !mark };
  }

  // ---------- notes: one entry per kind, with the objects it concerns

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
  // text of a note in the current language; the objects are listed up to a limit
  function noteText(n, limit = 12) {
    const objs = n.objs.slice(0, limit).join(', ') + (n.objs.length > limit ? ` (+${n.objs.length - limit})` : '');
    return t('core.fth.notes.' + n.key, Object.assign({ objs }, n.params));
  }

  // ---------- records with a comma inside a name: the name is joined back while the fields after it make no sense

  function realign(f, nameAt, ok) {
    for (let k = 0; k <= 6 && nameAt + k < f.length; k++) {
      const g = k ? [...f.slice(0, nameAt), f.slice(nameAt, nameAt + k + 1).join(','), ...f.slice(nameAt + k + 1)] : f;
      if (ok(g)) return g;
    }
    return null;
  }
  // pipe: fields 2 and 3 are the units of length and elevation, field 9 the number of drawing points
  const pipeAligned = (g) => isLength(g[2]) && isLength(g[3]) && isInt(num(g[9])) && num(g[9]) >= 0;
  // junction: field 5 is the number of pipes, then their signed IDs, and the elevation unit at b+9 (b = 6 + np)
  function junctionAligned(g) {
    const np = num(g[5]);
    if (!(isInt(np) && np >= 0)) return false;
    for (let i = 0; i < np; i++) if (!isInt(num(g[6 + i]))) return false;
    return isLength(g[6 + np + 9]);
  }
  // a record whose units are not known is still read at its plain positions (the unit notes tell the rest)
  const pipeLoose = (g) => isInt(num(g[9])) && num(g[9]) >= 0;
  const junctionLoose = (g) => isInt(num(g[5])) && num(g[5]) >= 0;

  // kinds of junction of the format by their code (Annex A), for the notes
  const KINDS = {
    1: 'branch', 2: 'reservoir', 3: 'flow', 4: 'pressure', 5: 'areaChange', 6: 'bend', 7: 'tee', 8: 'valve',
    9: 'controlValve', 10: 'checkValve', 11: 'deadEnd', 12: 'orifice', 13: 'venturi', 14: 'screen', 15: 'heatExchanger',
    16: 'spray', 17: 'pump', 18: 'ejector', 19: 'volumeBalance', 20: 'generic', 21: 'reliefValve', 27: 'threeWayValve',
    28: 'weir',
  };
  // kinds whose loss data Annex A does not give: a K element of Pump It with the K left blank
  const BLANK_K = ['areaChange', 'checkValve', 'venturi', 'screen', 'heatExchanger', 'generic'];

  // ---------- reading

  // text of a .fth file → { model, notes, stored, counts }. stored: the results saved in the file for the base scenario
  // (Map pipe ID → { m [kg/s], P0in, P0out [Pa(a)] }), or null
  function read(text, { name = '' } = {}) {
    const S = readSections(text);
    const pipeKey = scenarioKey(S, 'PIPES'), jctKey = scenarioKey(S, 'JUNCTIONS');
    if (!pipeKey || !jctKey) throw new Error(t('core.fth.notFth'));
    const notes = makeNotes();
    const note = notes.add;
    const m = M.newModel();
    const title = name.replace(/\.[^.]*$/, '').trim();
    if (title) m.title = title;
    const scnName = pipeKey.split(' -- ').slice(2).join(' -- ').trim();
    if (scnName) m.scenarios.list[0].name = scnName;

    // quantities in the units of the file; an unknown unit leaves the field blank, with a note
    const unknownUnit = (obj, unit) => note('missing', 'unit', obj, { unit: str(unit) || '?' });
    function len(v, unit, obj) {
      const k = key(unit);
      if (LENGTH[k]) return Number.isFinite(v) ? q(v, LENGTH[k]) : blank(LENGTH[k]);
      if (LENGTH_SI[k]) return Number.isFinite(v) ? q(v * LENGTH_SI[k], 'm') : blank('m');
      if (Number.isFinite(v)) unknownUnit(obj, unit);
      return blank('m');
    }
    const lenSI = (v, unit) => { const x = len(v, unit, null); return x.value === null ? NaN : U.toSI(x.value, x.unit, 'length'); };
    function area(v, unit, obj) {
      const k = key(unit).replace(/\^?2$|²$/, '');
      const f = LENGTH[k] ? U.toSI(1, LENGTH[k], 'length') : LENGTH_SI[k];
      if (!f) { if (Number.isFinite(v)) unknownUnit(obj, unit); return blank('m²'); }
      return Number.isFinite(v) ? q(v * f * f, 'm²') : blank('m²');
    }
    function pressure(v, unit, obj) {
      const pu = pressureUnit(unit);
      if (!pu) { if (Number.isFinite(v)) unknownUnit(obj, unit); return blank('kgf/cm²(g)'); }
      if (pu.assumed && Number.isFinite(v)) note('assumed', 'absolute', obj, { unit: str(unit) });
      return Number.isFinite(v) ? q(v, pu.unit) : blank(pu.unit);
    }
    function flow(v, unit, obj) {
      const k = key(unit);
      if (FLOW[k]) return Number.isFinite(v) ? q(v, FLOW[k]) : blank(FLOW[k]);
      if (FLOW_SI[k]) return Number.isFinite(v) ? q(v * FLOW_SI[k], 'm³/s') : blank('m³/s');
      if (k === 'none' && (v === 0 || !Number.isFinite(v))) return q(0, 'm³/h');
      if (Number.isFinite(v)) unknownUnit(obj, unit);
      return blank('m³/h');
    }

    // ---- pipes (Annex A, "Registro de tubo"; b = 10 + 3·npts)
    const pipeRecs = new Map();
    for (const raw of records(S[pipeKey])) {
      const id = num(raw[0]);
      const f = realign(raw, 1, pipeAligned) || (pipeLoose(raw) ? raw : null);
      if (!f || !(isInt(id) && id > 0) || pipeRecs.has(id)) { note('missing', 'badRecord', 'P' + str(raw[0])); continue; }
      pipeRecs.set(id, f);
    }
    // ---- junctions (Annex A, "Registro de junção"; b = 6 + np)
    const jctRecs = new Map();
    for (const raw of records(S[jctKey])) {
      const id = num(raw[1]);
      const f = realign(raw, 4, junctionAligned) || (junctionLoose(raw) ? raw : null);
      if (!f || !(isInt(id) && id > 0) || jctRecs.has(id)) { note('missing', 'badRecord', 'J' + str(raw[1])); continue; }
      jctRecs.set(id, f);
    }

    // stored results of the base scenario, always in US units (Annex A, "Resultados gravados")
    const stored = new Map();
    for (const f of records(scenarioSection(S, 'PIPE ARCHIVE DATA'))) {
      const id = num(f[0]);
      if (!pipeRecs.has(id)) continue;
      stored.set(id, {
        m: num(f[1]) * LBM, P0in: num(f[3]) * U.PSI, P0out: num(f[4]) * U.PSI,
        rho: num(f[7]) * LBM / FT ** 3, mu: num(f[8]) * LBM / FT, pv: [num(f[9]) * U.PSI, num(f[10]) * U.PSI],
      });
    }

    const pipes = new Map(); // id → { p, zUp, zDown } with the pipe end elevations in metres
    for (const [id, f] of pipeRecs) {
      const obj = 'P' + id;
      const b = 10 + 3 * num(f[9]);
      const up = num(f[b + 3]), down = num(f[b + 4]);
      if (!jctRecs.has(up) || !jctRecs.has(down)) { note('missing', 'dangling', obj); continue; }
      const p = M.newPipe(id, up, down);
      p.name = str(f[1]);
      p.material = { kind: 'user', nps: '4', sch: '40' };
      p.length = len(num(f[6]), f[2], obj);
      // section: circular by its (hydraulic) diameter, or any other shape by its area and wetted perimeter (F-05)
      const geo = num(f[b + 16]);
      const A = area(num(f[b + 7]), f[b + 8], obj), Pw = len(num(f[b + 9]), f[b + 10], obj);
      const byArea = A.value > 0 && Pw.value > 0;
      if (geo === 2 || (geo !== 0 && byArea)) Object.assign(p.geometry, { kind: 'noncircular', area: A, perim: Pw });
      else Object.assign(p.geometry, { kind: 'circular', d: len(num(f[b + 5]), f[b + 6], obj) });
      if (geo !== 0 && geo !== 2) note('assumed', 'geometry', obj, { code: str(f[b + 16]) || '?' });
      // friction: 0 absolute roughness, 1 relative, 2 smooth, 3 Hazen-Williams, 4 given f, 7 frictionless (F-06)
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
      // fittings: the sum of their K values, as one item (F-07)
      const Ksum = num(f[b + 20]);
      p.fittings = Ksum > 0 ? [{ name: t('core.data.fittings.imported'), model: 'K', value: Ksum, qty: 1, id: 'imported' }] : [];
      pipes.set(id, { p, zUp: lenSI(num(f[4]), f[3]), zDown: lenSI(num(f[7]), f[3]), elevUnit: f[3] });
      m.pipes.push(p);
    }

    // ---- junctions
    const raw = new Map(); // id → [x, y] of the drawing in the file
    const kindName = (code) => t('core.fth.kinds.' + (KINDS[code] || 'unknown'), { code });
    for (const [id, f] of jctRecs) {
      const obj = 'J' + id;
      const type = num(f[0]);
      const np = num(f[5]), b = 6 + np;
      const at = (i) => f[b + i];
      const listed = f.slice(6, 6 + np).map((x) => Math.abs(num(x)));
      const conn = m.pipes.filter((p) => p.up === id || p.down === id);
      const n = conn.length;
      const ids = (xs) => [...new Set(xs)].sort((x, y) => x - y).join(',');
      if (ids(listed.filter((pid) => pipes.has(pid))) !== ids(conn.map((p) => p.id))) note('ignored', 'pipeList', obj);
      raw.set(id, [num(at(0)), num(at(1))]);
      const elevation = len(num(at(7)), at(9), obj);
      const zJ = elevation.value === null ? NaN : U.toSI(elevation.value, elevation.unit, 'length');
      const make = (pt, props = {}) => Object.assign(M.newJunction(pt, id, 0, 0), { name: str(f[4]), elevation }, props);
      // K given per listed pipe → the per-pipe loss table, the same K in both directions (F-11)
      const pipeK = (Ks) => {
        const out = {};
        Ks.forEach((K, i) => { if (K > 0 && pipes.has(listed[i])) out[listed[i]] = { kOut: K, kIn: K }; });
        if (Object.keys(out).length) note('assumed', 'pipeK', obj);
        return out;
      };
      // a node that only connects (or a closed end, with one pipe): the fallback for what Pump It cannot represent
      const plainNode = () => (n >= 2 ? make('branch') : make('flow', { Q: q(0, 'm³/h'), dir: 'out' }));
      const fits = (pt) => { const [lo, hi] = PumpIt.junctionTypes.get(pt).pipes; return n >= lo && n <= hi; };
      const fallback = (why) => { note('missing', why, obj, { kind: kindName(type) }); return plainNode(); };
      let j;
      switch (type) {
        case 1: { // branch: a block of 3 fields per pipe from b+70 (the first is the K), then the source (+ enters)
          const src = flow(num(at(70 + 3 * np)), at(71 + 3 * np), obj);
          const Ks = listed.map((_, i) => num(at(70 + 3 * i)));
          if (n >= 2) j = make('branch', { source: src, pipeK: pipeK(Ks) });
          else if (n === 1) {
            const v = src.value;
            j = make('flow', { Q: v === null ? src : q(Math.abs(v), src.unit), dir: v < 0 ? 'out' : 'in' });
            if (Ks[0] > 0) j.pipeK = pipeK(Ks);
          } else j = make('branch', { source: src });
          break;
        }
        case 2: { // reservoir: the liquid level is the junction elevation (F-09); with 1 pipe, the entrance K at b+69
          // and the surface pressure at b+76 and b+77
          note('assumed', 'reservoirLevel', obj);
          const pk = {};
          let surfP;
          if (np === 1) {
            surfP = pressure(num(at(76)), at(77), obj);
            const K = num(at(69));
            if (K > 0 && pipes.has(listed[0])) pk[listed[0]] = { kOut: K, kIn: 0 };
          } else {
            surfP = q(0, 'kgf/cm²(g)');
            note('assumed', 'reservoirMulti', obj);
          }
          // a pipe connected at another elevation than the junction's: its own elevation in the per-pipe table
          for (const p of conn) {
            const P = pipes.get(p.id), z = p.up === id ? P.zUp : P.zDown;
            if (Number.isFinite(z) && Number.isFinite(zJ) && Math.abs(z - zJ) > 1e-6) {
              const zq = len(num(pipeRecs.get(p.id)[p.up === id ? 4 : 7]), P.elevUnit, null);
              pk[p.id] = Object.assign({ kOut: 0, kIn: 0 }, pk[p.id], { elev: zq });
            }
          }
          j = make('reservoir', { liquidElev: Object.assign({}, elevation), surfP, pipeK: pk });
          break;
        }
        case 3: { // imposed flow: value and unit at b+70 and b+71, direction at b+72 (0 enters, 1 leaves), K at b+75
          const Q = flow(num(at(70)), at(71), obj);
          if (Q.value !== null) Q.value = Math.abs(Q.value);
          const dir = num(at(72)) === 0 ? 'in' : 'out';
          if (n === 1) {
            j = make('flow', { Q, dir });
            const K = num(at(75));
            if (K > 0) j.pipeK = pipeK([K]);
          } else j = make('branch', { source: Q.value === null ? Q : q(dir === 'in' ? Q.value : -Q.value, Q.unit) });
          break;
        }
        case 4: { // imposed pressure: kind at b+72 (1 static, 0 stagnation), value and unit at b+73 and b+74
          const st = num(at(72)) === 1;
          if (st && n !== 1) note('assumed', 'staticManyPipes', obj);
          j = make('pressure', { P: pressure(num(at(73)), at(74), obj), ptype: st && n === 1 ? 'static' : 'stagnation' });
          break;
        }
        case 6: // bend: K at b+72
          j = fits('generic') ? make('generic', { genModel: 'K', K: num(at(72)) >= 0 ? num(at(72)) : undefined }) : fallback('pipeCount');
          break;
        case 8: { // valve: K at b+90; with a single pipe, an exit valve to the atmosphere (F-10)
          const K = num(at(90)) >= 0 ? num(at(90)) : undefined;
          if (n === 2) j = make('valve', { lossModel: 'K', K });
          else if (n === 1) { j = make('exitvalve', { lossModel: 'K', K, Pout: q(0, 'kgf/cm²(g)') }); note('assumed', 'exitPressure', obj); }
          else j = fallback('pipeCount');
          break;
        }
        case 11: // dead end: no flow
          j = n === 1 ? make('flow', { Q: q(0, 'm³/h'), dir: 'out' }) : fallback('pipeCount');
          break;
        case 17: // pump: head unit at b+79, flow unit at b+81, number of coefficients at b+92, coefficients from b+93
          j = fits('pump') ? make('pump', pumpCurve(f, b, conn, obj)) : fallback('pipeCount');
          break;
        default: {
          // kinds without their data in Annex A: the nearest type of Pump It, with those data left blank (F-12)
          const kind = KINDS[type];
          const as = BLANK_K.includes(kind) ? (kind === 'checkValve' ? 'valve' : 'generic')
            : { orifice: 'orifice', controlValve: 'control', spray: 'spray', tee: 'branch' }[kind];
          if (!as) j = fallback('unsupported');
          else if (!fits(as)) j = fallback('pipeCount');
          else if (as === 'orifice') { j = make('orifice', { orModel: 'K', K: undefined }); note('missing', 'lossData', obj, { kind: kindName(type) }); }
          else if (as === 'control') { j = make('control', { setP: blank('kgf/cm²(g)') }); note('missing', 'controlValve', obj); }
          else if (as === 'spray') { j = make('spray', { sprayModel: 'K', Kf: blank('L/min/bar½'), Pext: q(0, 'kgf/cm²(g)') }); note('missing', 'spray', obj); }
          else if (as === 'branch') { j = make('branch'); note('ignored', 'tee', obj); }
          else { j = make(as, { K: undefined }); note('missing', kind === 'checkValve' ? 'checkValve' : 'lossData', obj, { kind: kindName(type) }); }
        }
      }
      // a pipe connected at another elevation than its junction: Pump It keeps one elevation per junction (F-13)
      if (j.type !== 'reservoir') {
        for (const p of conn) {
          const P = pipes.get(p.id), z = p.up === id ? P.zUp : P.zDown;
          if (Number.isFinite(z) && Number.isFinite(zJ) && Math.abs(z - zJ) > 1e-6) { note('ignored', 'elevations', obj); break; }
        }
      }
      m.junctions.push(j);
    }

    // pump curve: H = a0 + a1·Q + a2·Q² + ... in the units of the file, as points along the curve (F-14)
    function pumpCurve(f, b, conn, obj) {
      const props = { mode: 'curve', speed: 100, nPumps: 1, state: 'on', eff: { x: [], y: [], xUnit: 'm³/h', fit: '2' }, npshr: { x: [], y: [], xUnit: 'm³/h', yUnit: 'm', fit: '2' } };
      const nc = num(f[b + 92]);
      const a = isInt(nc) && nc >= 1 && nc <= 10 ? f.slice(b + 93, b + 93 + nc).map(num) : [];
      const hu = HEAD[key(f[b + 79])];
      const fu = key(f[b + 81]);
      const qUnit = FLOW[fu] || (FLOW_SI[fu] ? 'm³/s' : null), qf = FLOW_SI[fu] || 1;
      // a flow in SI (mass, kg/s) in the flow unit of the curve
      const inCurveUnit = (mSI, rho) => (FLOW_SI[fu] ? mSI / rho / qf : U.isVolumetric(qUnit) ? U.fromSI(mSI / rho, qUnit, 'volFlow') : U.fromSI(mSI, qUnit, 'massFlow'));
      const ok = nc >= 1 && a.length === nc && a.every(Number.isFinite) && hu && qUnit;
      if (!ok) {
        props.curve = { x: [], y: [], xUnit: 'm³/h', yUnit: 'm', fit: '2' };
        note('missing', 'pumpCurve', obj);
        return props;
      }
      const H = (x) => a.reduce((s, c, i) => s + c * x ** i, 0);
      // the stored flow through the pump, as a scale for the range of the points
      const st = conn.map((p) => stored.get(p.id)).find((r) => r && Number.isFinite(r.m) && r.rho > 0);
      const qStored = st ? inCurveUnit(Math.abs(st.m), st.rho) : NaN;
      const qEnd = shutoffRange(H, qStored);
      const pts = a.length - 1 <= 4 ? 11 : 41;
      const xs = Array.from({ length: pts }, (_, i) => (qEnd * i) / (pts - 1));
      let curve = { x: xs.map((x) => x * qf), y: xs.map(H), xUnit: qUnit, yUnit: hu, fit: a.length - 1 <= 4 ? String(Math.max(1, a.length - 1)) : 'xy' };
      // a mass flow becomes a volume flow at the density of the stored results, or the curve is left for the user
      if (!U.isVolumetric(qUnit)) {
        const rho = st ? st.rho : NaN;
        if (rho > 0) curve = Object.assign(curve, { x: curve.x.map((x) => U.toSI(x, qUnit, 'massFlow') / rho * 3600), xUnit: 'm³/h' });
        else { curve = { x: [], y: [], xUnit: 'm³/h', yUnit: hu, fit: '2' }; note('missing', 'pumpCurve', obj); }
      }
      props.curve = curve;
      return props;
    }

    // ---- system (F-15): the fluid of the stored results; gravity, transition and laminar correction of the fluid data
    const fd = Object.assign(keyValues(S['FLUID DATA']), keyValues(scenarioSection(S, 'FLUID DATA')));
    const props = [...stored.values()].filter((r) => r.rho > 0 && r.mu > 0);
    if (props.length) {
      const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
      const rho = mean(props.map((r) => r.rho)), mu = mean(props.map((r) => r.mu));
      const pvs = props.flatMap((r) => r.pv).filter((x) => x > 0);
      if (props.some((r) => Math.abs(r.rho - rho) > 1e-6 * rho || Math.abs(r.mu - mu) > 1e-6 * mu)) note('assumed', 'fluidMean', null);
      m.system.fluid = {
        kind: 'user', name: t('core.fth.fluidName'), rho: q(rho, 'kg/m³'), mu: q(mu * 1e3, 'cP'),
        pv: pvs.length ? q(mean(pvs) / 1e3, 'kPa(a)') : blank('kPa(a)'),
      };
      note('info', 'fluidStored', null);
    } else note('assumed', 'fluidDefault', null);
    const g = num(fd.Gravity), reLam = num(fd.ReTransLam), reTurb = num(fd.ReTransTurb), alt = num(fd.AltLossFactorMethod);
    if (g >= 0) m.system.gravity = g;
    if (reLam > 0) m.system.reLam = reLam;
    if (reTurb > 0) m.system.reTurb = reTurb;
    // the laminar correction of K: 0 = none (inferred in README, "Clean-room record"); any other code is not known
    if (alt === 0) m.system.laminarK = 'none';
    else if (Number.isFinite(alt)) note('assumed', 'laminarK', null, { code: String(alt) });

    // ---- what the file has and the import leaves out
    const children = [];
    for (const [k, v] of Object.entries(keyValues(S['SCENARIO MANAGER']))) {
      const mm = k.match(/^Scenario #(\d+)$/);
      if (mm && mm[1] !== '1') children.push(str(v.split(',')[0]) || '#' + mm[1]);
    }
    if (!children.length) for (const k of Object.keys(S)) { const mm = k.match(/^PIPES -- SCENARIO #(\d+) -- (.*)$/); if (mm && mm[1] !== '1') children.push(str(mm[2]) || '#' + mm[1]); }
    if (children.length) note('ignored', 'scenarios', null, { names: children.join(', ') });
    if (addOns(S).length) note('ignored', 'addOns', null);

    place(m.junctions, raw, note);
    return {
      model: m,
      notes: notes.list.sort((x, y) => LEVELS.indexOf(x.level) - LEVELS.indexOf(y.level)),
      stored: stored.size ? stored : null,
      counts: { pipes: m.pipes.length, junctions: m.junctions.length, scenario: m.scenarios.list[0].name },
    };
  }

  // flow at which the head of a polynomial curve falls to zero (the end of the points), searched from the stored flow
  // through the pump or from small flows; without such a point, twice the stored flow (or 1 unit)
  function shutoffRange(H, qStored) {
    if (!(H(0) > 0)) return qStored > 0 ? 2 * qStored : 1;
    let lo = 0, hi = qStored > 0 ? qStored / 4 : 1e-3;
    for (let i = 0; i < 200 && H(hi) > 0; i++) { lo = hi; hi *= 1.25; if (hi > 1e12) return qStored > 0 ? 2 * qStored : 1; }
    for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (H(mid) > 0) lo = mid; else hi = mid; }
    return lo;
  }

  // drawing positions: the coordinates of the file scaled so that neighbouring junctions sit about 160 units apart,
  // on the grid of the drawing; without usable coordinates, the junctions go on a grid (F-16)
  function place(js, raw, note) {
    const GRID = 20, SPACING = 160, MARGIN = 100;
    const pts = js.map((j) => raw.get(j.id) || [NaN, NaN]);
    const okPts = pts.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
    const spread = okPts && new Set(pts.map((p) => p.join(','))).size > 1;
    if (!js.length) return;
    if (!spread) {
      const cols = Math.ceil(Math.sqrt(js.length));
      js.forEach((j, i) => { j.x = MARGIN + (i % cols) * SPACING; j.y = MARGIN + Math.floor(i / cols) * SPACING; });
      if (js.length > 1) note('assumed', 'layout', null);
      return;
    }
    // median distance to the nearest distinct neighbour (a sample of the junctions in large models)
    const sample = pts.length > 400 ? pts.filter((_, i) => i % Math.ceil(pts.length / 400) === 0) : pts;
    const near = sample.map((a) => Math.min(...pts.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1])).filter((x) => x > 0)));
    near.sort((x, y) => x - y);
    const d = near[Math.floor(near.length / 2)];
    const s = d > 0 && Number.isFinite(d) ? SPACING / d : 1;
    const x0 = Math.min(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1]));
    const used = new Set();
    js.forEach((j, i) => {
      let x = MARGIN + Math.round(((pts[i][0] - x0) * s) / GRID) * GRID, y = MARGIN + Math.round(((pts[i][1] - y0) * s) / GRID) * GRID;
      while (used.has(x + ',' + y)) x += GRID; // two junctions on the same spot of the grid
      used.add(x + ',' + y);
      j.x = x; j.y = y;
    });
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

  PumpIt.importers = Object.assign(PumpIt.importers || {}, {
    fth: { encoding: 'windows-1252', read, compare, noteText, LEVELS, parse: { readSections, records, keyValues, scenarioKey, scenarioSection, addOns, num } },
  });
})(typeof window !== 'undefined' ? window : globalThis);
