// Generic component: a given K, or a pressure-drop × flow curve.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const U = PumpIt.units, H = PumpIt.hyd;

  PumpIt.junctionTypes.register({
    type: 'generic', order: 110, group: 'losses',
    pipes: [2, 2],

    defaults: () => ({
      genModel: 'K', K: 1,
      curve: { x: [0, 10, 20, 30], y: [0, 0.05, 0.2, 0.45], xUnit: 'm³/h', yUnit: 'kgf/cm²', fit: '2' },
    }),

    validate(j, miss, { curveOk }) {
      if (j.genModel === 'K' && !(j.K >= 0)) miss.push('K');
      if (j.genModel === 'curve' && !curveOk(j.curve, 2)) miss.push(t('junctions.generic.check.curve'));
    },

    buildElement(j, lk, net) {
      if (j.genModel === 'curve') {
        const rho = net.rho;
        const c = j.curve;
        const xs = c.x.map((v) => U.toSI(v, c.xUnit, 'volFlow'));
        const ys = c.y.map((v) => U.toSI(v, c.yUnit, 'dp'));
        const cv = H.makeCurve(xs, ys, c.fit);
        lk.phi = (m) => Math.sign(m) * H.evalCurve(cv, Math.abs(m) / rho);
        lk.curve = cv;
      } else lk.phi = net.kElem(j.K, j.K);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
