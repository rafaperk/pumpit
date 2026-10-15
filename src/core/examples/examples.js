// Example models, built from scratch (they do not come from third-party files).
// Each example lives in its own file and registers { id, order, build } here; its name and the names inside the
// model come from the language catalogs (examples.<id>.*), so an example is built in the current language.
// The builder helpers below keep those files short.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, D = PumpIt.data;
  const q = M.q;

  const defs = new Map();
  let sorted = null;
  function register(ex) {
    if (!Object.getOwnPropertyDescriptor(ex, 'name')) {
      Object.defineProperty(ex, 'name', { get: () => PumpIt.i18n.t('examples.' + ex.id + '.name'), enumerable: true });
    }
    defs.set(ex.id, ex);
    sorted = null;
  }
  const list = () => sorted || (sorted = [...defs.values()].sort((a, b) => a.order - b.order));
  const get = (id) => defs.get(id);

  // model from junction rows [id, type, x, y, props] and pipe rows [id, up, down, setter]
  function model(title, js, ps, extra) {
    const m = M.newModel();
    m.title = title;
    for (const [id, type, x, y, props] of js) {
      const j = M.newJunction(type, id, x, y);
      Object.assign(j, props || {});
      m.junctions.push(j);
    }
    for (const [id, up, down, set] of ps) {
      const p = M.newPipe(id, up, down);
      if (set) set(p);
      m.pipes.push(p);
    }
    m.nextId = { p: Math.max(0, ...m.pipes.map((p) => p.id)) + 1, j: Math.max(0, ...m.junctions.map((j) => j.id)) + 1 };
    if (extra) extra(m);
    return m;
  }

  // ASME B36.10M steel pipe
  const steel = (nps, L, sch = '40', fittings = []) => (p) => {
    p.material = { kind: 'steel', nps, sch };
    p.geometry.kind = 'circular';
    p.geometry.d = q(+D.steelID(nps, sch).toFixed(2), 'mm');
    p.friction = { model: 'roughness', eps: q(0.046, 'mm'), rel: 0.0001, f: 0.02, C: 120 };
    p.length = q(L, 'm');
    p.fittings = fittings;
  };
  // pipe with a given inner diameter (user material)
  const plain = (dmm, L, frictionSet) => (p) => {
    p.material = { kind: 'user', nps: '4', sch: '40' };
    p.geometry.d = q(dmm, 'mm');
    p.length = q(L, 'm');
    if (frictionSet) frictionSet(p.friction);
  };
  // library fitting by its id (src/core/data/fittings.js)
  const fit = (id, qty) => Object.assign({ qty }, D.FITTINGS.find((f) => f.id === id));
  // text of an example from the catalogs: text('pump', 'title') → examples.pump.title
  const text = (id, key) => PumpIt.i18n.t('examples.' + id + '.' + key);

  PumpIt.examples = {
    register, list, get,
    builder: { model, steel, plain, fit, text },
  };
  // the examples in menu order
  Object.defineProperty(PumpIt.examples, 'EXAMPLES', { get: list, enumerable: true });
})(typeof window !== 'undefined' ? window : globalThis);
