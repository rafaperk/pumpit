// Designations of the pipes of the catalogues (src/core/data/pipe-library.js) in the language of the interface, built
// from the kind of nominal size, of series and of grade of each catalogue: the material, the nominal size (4", OD 110,
// DN 200), the series (Sch. 40, SDR 11, K9) and the whole designation, with the decimal separator of the language
// (SDR 13,6 and PN 12,5 in Portuguese).
(function (root) {
  const PumpIt = root.PumpIt;
  const D = PumpIt.data;
  const { t } = PumpIt.i18n;
  const F = PumpIt.ui.format;
  const tx = (key, params) => t('core.data.pipes.' + key, params);
  // a decimal number with the separator of the language; any other value (1 1/2, STD, K9) as it is
  const num = (v) => (/^\d+(\.\d+)?$/.test(String(v)) ? String(v).replace('.', F.decimalSep()) : String(v));
  // a dimension (mm) with the decimals its standard gives, without grouping the digits (DE 1048)
  const dim = (v, digits) => num(v.toFixed(digits));

  const catalog = (mat) => (mat ? D.pipeCatalog(mat.kind) : undefined);
  // whether a material is a pipe of a catalogue
  const isCatalog = (mat) => !!catalog(mat);
  const material = (kind) => tx('materials.' + kind);
  // a nominal size in the list of sizes (4", 110 mm, DN 200)
  const size = (kind, n) => tx('size.' + D.pipeCatalog(kind).system, { n: num(n) });
  // a nominal size (4", OD 110, DN 200) and a series (Sch. 40, SDR 11, K9) in a designation
  const nominal = (mat) => tx('nominal.' + catalog(mat).system, { n: num(mat.nps) });
  const series = (mat) => tx('series.' + catalog(mat).seriesKind, { s: num(mat.sch) });
  const grade = (g) => tx('grades.' + g);
  const pn = (v) => tx('pn', { p: num(v) });
  // "4" Sch. 40", "OD 110 SDR 11 · PE 100 · PN 16", "DN 200 K9": a catalogue with grades adds the grade of the pipe (or
  // its default one) and the nominal pressure
  function full(mat) {
    const c = catalog(mat), s = `${nominal(mat)} ${series(mat)}`;
    if (!c.grades) return s;
    const g = c.grades[mat.grade] ? mat.grade : c.defaults.grade;
    const p = D.pipePN(Object.assign({}, mat, { grade: g }));
    return `${s} · ${grade(g)}` + (Number.isFinite(p) ? ` · ${pn(p)}` : '');
  }

  PumpIt.ui.pipeLabels = { isCatalog, material, size, nominal, series, full, grade, pn, num, dim };
})(typeof window !== 'undefined' ? window : globalThis);
