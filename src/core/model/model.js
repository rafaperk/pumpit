// Data model: factories for models, pipes and junctions, path access and topology helpers
// (specification sections 2, 3 and 6). Scenarios and validation extend PumpIt.model in their own files.
(function (root) {
  const PumpIt = root.PumpIt;
  const types = PumpIt.junctionTypes;
  const { t } = PumpIt.i18n;
  const q = (value, unit) => ({ value, unit });
  const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));

  function newJunction(type, id, x, y) {
    const j = { id, name: '', type, x, y, elevation: q(0, 'm') };
    const def = types.get(type);
    if (!def) throw new Error(t('core.model.unknownJunctionType', { type }));
    Object.assign(j, def.defaults());
    return j;
  }

  // Models saved before some junction types were removed: convert to the closest equivalent.
  function migrate(m) {
    const notes = [];
    for (const j of m.junctions) {
      const was = j.type;
      if (was === 'check') { j.type = 'valve'; j.closed = j.special === 'closed'; }
      else if (was === 'bend' || was === 'areachange') {
        Object.assign(j, { type: 'generic', genModel: 'K', K: was === 'bend' && j.bendModel === 'K' ? j.K : (was === 'bend' ? 0.3 : 0) });
        if (!j.curve) j.curve = newJunction('generic', 0, 0, 0).curve;
      } else if (was === 'deadend') Object.assign(j, { type: 'flow', Q: q(0, 'm³/h'), dir: 'out' });
      if (was !== j.type) notes.push(`J${j.id}: ${was} → ${types.table()[j.type].label}`);
      delete j.designFactor;
    }
    for (const p of m.pipes) delete p.factors;
    return notes;
  }

  function newPipe(id, up, down) {
    return {
      id, name: '', up, down,
      length: q(10, 'm'),
      material: { kind: 'steel', nps: '4', sch: '40' },
      geometry: {
        kind: 'circular', d: q(102.26, 'mm'), dOuter: q(100, 'mm'), dInner: q(50, 'mm'),
        width: q(100, 'mm'), height: q(50, 'mm'), area: q(50, 'cm²'), perim: q(30, 'cm'),
      },
      friction: { model: 'roughness', eps: q(0.046, 'mm'), rel: 0.0001, f: 0.02, C: 120 },
      fittings: [],
      idReduction: 0,
      nParallel: 1,
      closed: false,
    };
  }

  // Data of a pipe the user draws (R-13 of the 3D views): length, material, section and friction copied from the
  // reference pipe, never taken from the drawing. Without a reference (or with an invalid length) the length is
  // 100 m, and the rest comes from newPipe.
  function pipeDefaults(prev) {
    const base = newPipe(0, 0, 0);
    const pick = (k) => clone(prev && prev[k] ? prev[k] : base[k]);
    const L = prev && prev.length ? Number(prev.length.value) : NaN;
    return { length: L > 0 ? pick('length') : q(100, 'm'), material: pick('material'), geometry: pick('geometry'), friction: pick('friction') };
  }

  // a new model; its default texts (title, fluid name, base scenario) are in the current language
  function newModel() {
    return {
      version: 1,
      title: t('core.model.untitled'),
      system: {
        fluid: { kind: 'water', T: q(20, '°C'), name: t('core.model.fluidName'), rho: q(998.2, 'kg/m³'), mu: q(1.002, 'cP'), pv: q(0.02386, 'kgf/cm²(a)') },
        patm: q(1.03323, 'kgf/cm²(a)'),
        gravity: 1,
        reLam: 2300,
        reTurb: 4000,
        laminarK: 'improvedAtkf',
      },
      solution: { tolRel: 1e-4, maxIter: 500, relax: 1, adaptive: true, checkMass: true },
      pipes: [],
      junctions: [],
      scenarios: { list: [{ id: 'base', name: t('core.model.baseScenario'), parent: null, overrides: {}, notes: '' }], current: 'base' },
      nextId: { p: 1, j: 1 },
    };
  }

  // ---------- path access ----------

  function getPath(o, path) {
    if (!path) return o;
    let cur = o;
    for (const k of path.split('.')) { if (cur == null) return undefined; cur = cur[k]; }
    return cur;
  }
  function setPath(o, path, v) {
    const ks = path.split('.');
    let cur = o;
    for (let i = 0; i < ks.length - 1; i++) {
      if (cur[ks[i]] == null || typeof cur[ks[i]] !== 'object') cur[ks[i]] = {};
      cur = cur[ks[i]];
    }
    cur[ks[ks.length - 1]] = v;
  }
  function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // objKey: 'sys' | 'sol' | 'p:ID' | 'j:ID'
  function getObj(m, key) {
    if (key === 'sys') return m.system;
    if (key === 'sol') return m.solution;
    const [k, id] = key.split(':');
    const n = Number(id);
    return k === 'p' ? m.pipes.find((p) => p.id === n) : m.junctions.find((j) => j.id === n);
  }

  // ---------- topology ----------

  function pipesAt(m, jid) { return m.pipes.filter((p) => p.up === jid || p.down === jid); }

  // inlet and outlet pipes of a two-port junction, by reference direction
  function ports(m, j) {
    const ps = pipesAt(m, j.id);
    const inP = ps.filter((p) => p.down === j.id);
    const outP = ps.filter((p) => p.up === j.id);
    if (inP.length === 1 && outP.length === 1) return { in: inP[0], out: outP[0], consistent: true };
    if (ps.length === 2) return { in: ps[0], out: ps[1], consistent: false };
    return null;
  }

  PumpIt.model = Object.assign(PumpIt.model || {}, {
    q, clone, newJunction, newPipe, pipeDefaults, newModel, migrate,
    getPath, setPath, getObj, deepEqual,
    pipesAt, ports,
  });
  // { type: definition } in display order, built from the junction type registry
  Object.defineProperty(PumpIt.model, 'JT', { get: () => types.table(), enumerable: true, configurable: true });
})(typeof window !== 'undefined' ? window : globalThis);
