// Drawing-only data (3D views specification §7, as adapted in docs/3D-VIEWS.md): the schematic position (x, y), the
// roll of a junction symbol (icon3), the route of a pipe in the 3D views (bends3, snap3) and the settings of the 3D
// views (view3). The calculation never reads them: PumpIt.solver.run starts from a copy without them (stripLayout,
// R-10). The 3D scene itself is not stored: X and Y come from the schematic, which is its plan, and the height from
// the elevation of each junction, which is calculation data (decision D-20).
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model;

  // every drawing field; a drawing field added in the future (2D bends, label offsets...) goes in this list
  const LAYOUT_KEYS = Object.freeze({
    model: Object.freeze(['view3']),
    junction: Object.freeze(['x', 'y', 'icon3']),
    pipe: Object.freeze(['bends3', 'snap3']),
  });

  // deep copy of a model (or of an effective model) without the drawing fields
  function stripLayout(model) {
    const c = JSON.parse(JSON.stringify(model));
    for (const k of LAYOUT_KEYS.model) delete c[k];
    for (const j of c.junctions || []) for (const k of LAYOUT_KEYS.junction) delete j[k];
    for (const p of c.pipes || []) for (const k of LAYOUT_KEYS.pipe) delete p[k];
    return c;
  }

  // settings of the 3D views (§7.4): grid step and major lines (du), working level (m: the elevation of the plane where
  // new junctions go), vertical scale (du per metre of elevation) and the camera of each view
  function newView3() {
    return {
      mode: '2d', step: 1, major: 5, level: 0, zScale: 1,
      iso: { azimuth: -45, style: 'true', scale: 40, target: [0, 0, 0], grid: true, shadows: true },
      free: { projection: 'persp', azimuth: -60, elevation: 30, distance: 60, fov: 35, scale: 40, target: [0, 0, 0], grid: true, snap: true, stems: false, shadows: true },
    };
  }

  // ---------- validation of a loaded model (§7.5): an invalid drawing value is dropped or reset, never guessed
  const ISO_AZIMUTHS = [-45, 45, 135, -135];
  const ROLLS = [0, 90, 180, 270];
  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
  const isPoint = (p) => Array.isArray(p) && p.length === 3 && p.every(isNum);
  const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
  // a bend kept relative to the ends of its pipe: which end each coordinate follows, and the offset (du)
  const isBend = (b) => isObj(b) && typeof b.ref === 'string' && /^[ab]{3}$/.test(b.ref) && isPoint(b.d);
  const range = (v, lo, hi, def) => (isNum(v) ? Math.min(hi, Math.max(lo, v)) : def);
  const oneOf = (v, list, def) => (list.includes(v) ? v : def);
  const bool = (v, def) => (typeof v === 'boolean' ? v : def);
  const angleGap = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
  // nearest allowed azimuth of the isometric view, around the circle
  const isoAzimuth = (v) => (isNum(v) ? ISO_AZIMUTHS.reduce((best, a) => (angleGap(a, v) < angleGap(best, v) ? a : best)) : -45);

  function normalizeLayout(m) {
    for (const j of m.junctions) {
      delete j.pos3; // stored 3D positions of an earlier version: the scene now comes from the plan and the elevation
      if ('icon3' in j && !(isObj(j.icon3) && ROLLS.includes(j.icon3.roll))) delete j.icon3;
    }
    for (const p of m.pipes) {
      if ('bends3' in p) {
        const bends = Array.isArray(p.bends3) ? p.bends3.filter(isBend).map((b) => ({ ref: b.ref, d: b.d })) : [];
        if (bends.length) p.bends3 = bends; else delete p.bends3;
      }
      if ('snap3' in p && typeof p.snap3 !== 'boolean') delete p.snap3;
    }
    if (!('view3' in m)) return m;
    if (!isObj(m.view3)) { delete m.view3; return m; }
    const v = m.view3, d = newView3();
    const iso = isObj(v.iso) ? v.iso : {}, free = isObj(v.free) ? v.free : {};
    m.view3 = {
      mode: oneOf(v.mode, ['2d', 'iso', '3d'], d.mode),
      step: isNum(v.step) && v.step > 0 && v.step <= 100 ? v.step : d.step,
      major: Number.isInteger(v.major) && v.major >= 2 && v.major <= 20 ? v.major : d.major,
      level: isNum(v.level) ? v.level : d.level,
      zScale: isNum(v.zScale) && v.zScale > 0 && v.zScale <= 1000 ? v.zScale : d.zScale,
      iso: {
        azimuth: isoAzimuth(iso.azimuth),
        style: oneOf(iso.style, ['true', '2:1'], d.iso.style),
        scale: range(iso.scale, 2, 400, d.iso.scale),
        target: isPoint(iso.target) ? iso.target : d.iso.target,
        grid: bool(iso.grid, d.iso.grid),
        shadows: bool(iso.shadows, d.iso.shadows),
      },
      free: {
        projection: oneOf(free.projection, ['persp', 'ortho'], d.free.projection),
        azimuth: isNum(free.azimuth) ? free.azimuth : d.free.azimuth,
        elevation: range(free.elevation, -90, 90, d.free.elevation),
        distance: range(free.distance, 0.5, 5000, d.free.distance),
        fov: range(free.fov, 15, 90, d.free.fov),
        scale: range(free.scale, 2, 400, d.free.scale),
        target: isPoint(free.target) ? free.target : d.free.target,
        grid: bool(free.grid, d.free.grid),
        snap: bool(free.snap, d.free.snap),
        stems: bool(free.stems, d.free.stems),
        shadows: bool(free.shadows, d.free.shadows),
      },
    };
    return m;
  }

  Object.assign(M, { LAYOUT_KEYS, stripLayout, newView3, normalizeLayout });
})(typeof window !== 'undefined' ? window : globalThis);
