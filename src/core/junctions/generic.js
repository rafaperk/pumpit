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

    // compressible mode: a K element, or the curve read against the volume flow at the inlet conditions (the gas
    // density of the node the flow comes from)
    gas: {
      element(j, lk, net) {
        if (j.genModel !== 'curve') { net.kElement(j.K, j.K); return; }
        const c = j.curve;
        const cv = H.makeCurve(c.x.map((v) => U.toSI(v, c.xUnit, 'volFlow')), c.y.map((v) => U.toSI(v, c.yUnit, 'dp')), c.fit);
        const cx = net.cx;
        lk.rel = 'curve';
        lk.curve = cv;
        lk.curveFlow = (na, nb) => {
          const fwd = na.P >= nb.P, up = fwd ? na : nb;
          const Q = invertCurve(cv, Math.abs(na.P - nb.P));
          return { m: (fwd ? 1 : -1) * Q * PumpIt.gas.flow.rhoOf(cx, up.P, PumpIt.gas.flow.tempOf(cx, up)), choked: false };
        };
      },
    },
  });

  // flow at which an increasing curve gives the pressure drop dP (0 below the start of the curve)
  function invertCurve(cv, dP) {
    if (!(dP > 0)) return 0;
    const f = (q) => H.evalCurve(cv, q) - dP;
    if (f(0) >= 0) return 0;
    let lo = 0, hi = Math.max(cv.xmax, 1e-9);
    for (let i = 0; i < 60 && f(hi) < 0; i++) { lo = hi; hi *= 2; }
    if (f(hi) < 0) return hi;
    for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (f(mid) < 0) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
})(typeof window !== 'undefined' ? window : globalThis);
