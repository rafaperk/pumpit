// Pipe catalogues by material (the material.kind of a pipe).
//
// Every catalogue lives in its own file under src/core/data/ and registers one definition here; those files come after
// this one in index.html, and the list of materials follows their order. The rest of the app reads the definitions and
// never tests for a material, so adding a catalogue means adding its file, its <script> tag and its texts in every
// language: the material (core.data.pipes.materials.<kind>, inspector.pipe.materials.<kind>), and the kind of size,
// series or grade when it is a new one (tests/check-i18n.js lists any text that is missing). Sources and choices:
// docs/pipe-library.md.
//
// Every catalogue stores the same fields of a pipe: material.nps is the nominal size and material.sch the series, as
// strings; material.grade, in a catalogue with grades, only sets the nominal pressure.
//
// Definition contract:
//   sizes             nominal sizes, smallest first
//   all               every series, from the thinnest wall (the order in which the nearest series is sought)
//   series(size)      → the series that size has (none for an unknown size)
//   dims(size, s)     → { od, wall, lining } in mm, or null when the catalogue has no such pipe
//   digits            { od, wall }: the decimals the standard gives these dimensions with
//   eps               absolute roughness (mm) given to a pipe when its material is chosen
//   system            the kind of nominal size: 'nps' (inches), 'od' (the outside diameter in mm) or 'dn'. Catalogues
//                     of the same system share their sizes; the interface names a size by it (4", OD 110, DN 200)
//   seriesKind        the kind of series, which names it in the interface: 'schedule' (Sch. 40), 'sdr' (SDR 11) or
//                     'class' (K9)
//   grades            optional { grade: { series: nominal pressure (bar) } }
//   defaults          { nps, sch, grade? } of a pipe that takes the material
(function (root) {
  const PumpIt = root.PumpIt;
  const IN = 25.4;

  const CATALOGS = new Map();
  // the kinds in the order they registered: the order of the list of materials
  const PIPE_KINDS = [];
  function register(kind, def) {
    if (!CATALOGS.has(kind)) PIPE_KINDS.push(kind);
    CATALOGS.set(kind, def);
  }
  const get = (kind) => CATALOGS.get(kind);

  // the sizes, series and dimensions of a table of ASME B36 pipe in inches, [NPS, OD, walls...], with the schedules of
  // its wall columns; the metric tables of these standards give the outside diameter to 0.1 mm and the wall to 0.01 mm
  function inchCatalog(rows, schedules) {
    const byNps = new Map(rows.map((r) => [r[0], r]));
    return {
      sizes: rows.map((r) => r[0]),
      all: schedules,
      series: (nps) => { const r = byNps.get(nps); return r ? schedules.filter((_, k) => r[2 + k] !== null) : []; },
      dims(nps, sch) {
        const r = byNps.get(nps), k = schedules.indexOf(sch);
        if (!r || k < 0 || r[2 + k] === null) return null;
        return { od: r[1] * IN, wall: r[2 + k] * IN, lining: 0 };
      },
      digits: { od: 1, wall: 2 },
    };
  }

  // dimensions (mm) of the pipe of a material: outside diameter, wall, lining and bore; null for a material that is not
  // a pipe of a catalogue. They are rounded to 0.0001 mm, which only drops the binary noise of the conversion of the
  // inch tables (three decimals of an inch are exact to 0.0001 mm).
  const r4 = (x) => Math.round(x * 1e4) / 1e4;
  function pipeDims(mat) {
    const c = mat && CATALOGS.get(mat.kind);
    const d = c && c.dims(String(mat.nps), String(mat.sch));
    if (!d) return null;
    return { od: r4(d.od), wall: r4(d.wall), lining: d.lining, id: r4(d.od - 2 * d.wall - 2 * d.lining) };
  }

  // of the series a size has, the one nearest to sch in the order of the catalogue (the heavier one on a tie)
  function nearestSeries(c, avail, sch) {
    const at = c.all.indexOf(sch);
    let best = avail[0];
    for (const s of avail) if (Math.abs(c.all.indexOf(s) - at) <= Math.abs(c.all.indexOf(best) - at)) best = s;
    return best;
  }

  // the material with a size and a series that its catalogue has (its other fields kept). An unknown series becomes
  // the default one, and so does an unknown grade. With opts.resize, or when the size is not one of the catalogue, the
  // size is the one whose bore is closest to opts.refId (mm), or else the default; a series the size does not have
  // becomes the nearest one.
  function fitMaterial(mat, opts = {}) {
    const c = CATALOGS.get(mat.kind);
    if (!c) return mat;
    const out = Object.assign({}, mat, { nps: String(mat.nps), sch: String(mat.sch) });
    if (c.grades && !c.grades[out.grade]) out.grade = c.defaults.grade;
    if (!c.all.includes(out.sch)) out.sch = c.defaults.sch;
    if (opts.resize || !c.sizes.includes(out.nps)) {
      out.nps = c.defaults.nps;
      if (opts.refId > 0) {
        let err = Infinity;
        for (const s of c.sizes) {
          const d = c.series(s).includes(out.sch) && c.dims(s, out.sch);
          const e = d ? Math.abs(d.od - 2 * d.wall - 2 * d.lining - opts.refId) : Infinity;
          if (e < err) { err = e; out.nps = s; }
        }
      }
    }
    const avail = c.series(out.nps);
    if (!avail.includes(out.sch)) out.sch = nearestSeries(c, avail, out.sch);
    return out;
  }

  // nominal pressure (bar) of the series of a pipe in a catalogue with grades, or NaN
  function pipePN(mat) {
    const c = mat && CATALOGS.get(mat.kind);
    const pn = c && c.grades && c.grades[mat.grade];
    return pn && Number.isFinite(pn[mat.sch]) ? pn[mat.sch] : NaN;
  }

  PumpIt.data = Object.assign(PumpIt.data || {}, {
    registerPipes: register, pipeCatalog: get, inchCatalog, PIPE_KINDS,
    pipeSizes: (kind) => (CATALOGS.has(kind) ? CATALOGS.get(kind).sizes.slice() : []),
    pipeSeries: (kind, size) => (CATALOGS.has(kind) ? CATALOGS.get(kind).series(String(size)) : []),
    pipeGrades: (kind) => (CATALOGS.has(kind) && CATALOGS.get(kind).grades ? Object.keys(CATALOGS.get(kind).grades) : []),
    pipeEps: (kind) => (CATALOGS.has(kind) ? CATALOGS.get(kind).eps : NaN),
    sameSizes: (a, b) => !!(CATALOGS.has(a) && CATALOGS.has(b) && CATALOGS.get(a).system === CATALOGS.get(b).system),
    pipeDims, fitMaterial, pipePN,
  });
})(typeof window !== 'undefined' ? window : globalThis);
