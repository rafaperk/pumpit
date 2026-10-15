// Typical absolute roughness (mm) — textbook table values (Moody 1944; White, Fluid Mechanics, table 6.1).
// The names come from the language catalogs (core.data.roughness.<id>).
(function (root) {
  const PumpIt = root.PumpIt;

  const rough = (id, mm) => ({ get name() { return PumpIt.i18n.t('core.data.roughness.' + id); }, mm, id });

  const ROUGHNESS = [
    rough('commercialSteel', 0.046),
    rough('galvanizedIron', 0.15),
    rough('castIron', 0.26),
    rough('asphaltedCastIron', 0.12),
    rough('concrete', 1.2),
    rough('rivetedSteel', 3.0),
    rough('drawnTubing', 0.0015),
    rough('plastic', 0.0015),
  ];

  PumpIt.data = Object.assign(PumpIt.data || {}, { ROUGHNESS });
})(typeof window !== 'undefined' ? window : globalThis);
