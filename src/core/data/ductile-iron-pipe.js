// Ductile iron pipe for water, lined with cement mortar — ABNT NBR 7675 and ISO 2531 (dimensions in mm). The outside
// diameter depends only on the DN. The nominal iron wall of the thickness classes is e = K·(0.5 + 0.001·DN), at least
// 5 mm for K7 and 6 mm for K9, and the nominal lining of NBR 7675:2022 is 3 mm up to DN 300, 5 mm up to DN 600 and
// 6 mm up to DN 1200. The bore is the outside diameter less both walls and both linings (decision P-04 of
// docs/pipe-library.md).
(function (root) {
  const PumpIt = root.PumpIt;

  // [DN, outside diameter]
  const DUCTILE = [
    [80, 98], [100, 118], [125, 144], [150, 170], [200, 222], [250, 274], [300, 326], [350, 378], [400, 429],
    [450, 480], [500, 532], [600, 635], [700, 738], [800, 842], [900, 945], [1000, 1048], [1100, 1152], [1200, 1255],
  ];
  const DUCTILE_CLASSES = ['K7', 'K9'];
  const MIN_WALL = { K7: 5, K9: 6 };

  // nominal iron wall (mm), rounded to 0.1 mm: K·(500 + DN) is a whole number of µm, so the rounding is exact
  function ductileWall(dn, cls) {
    const K = Number(String(cls).slice(1));
    if (!(cls in MIN_WALL)) return NaN;
    return Math.max(Math.round((K * (500 + Number(dn))) / 100) / 10, MIN_WALL[cls]);
  }
  // nominal cement mortar lining (mm)
  const ductileLining = (dn) => (dn <= 300 ? 3 : dn <= 600 ? 5 : 6);

  PumpIt.data = Object.assign(PumpIt.data || {}, { DUCTILE, DUCTILE_CLASSES, ductileWall, ductileLining });
  // the design roughness of the lined pipe (decision P-06)
  const rows = new Map(DUCTILE.map((r) => [String(r[0]), r]));
  PumpIt.data.registerPipes('ductile', {
    sizes: DUCTILE.map((r) => String(r[0])),
    all: DUCTILE_CLASSES,
    series: (dn) => (rows.has(dn) ? DUCTILE_CLASSES.slice() : []),
    dims(dn, cls) {
      const r = rows.get(dn);
      if (!r || !DUCTILE_CLASSES.includes(cls)) return null;
      return { od: r[1], wall: ductileWall(r[0], cls), lining: ductileLining(r[0]) };
    },
    digits: { od: 0, wall: 1 },
    eps: 0.1, system: 'dn', seriesKind: 'class', defaults: { nps: '100', sch: 'K9' },
  });
})(typeof window !== 'undefined' ? window : globalThis);
