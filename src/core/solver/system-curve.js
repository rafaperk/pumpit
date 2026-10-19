// System curve of a pump: sweeps fixed flows through the pump and records the head the system requires,
// alongside the pump curve at the current speed.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, H = PumpIt.hyd, M = PumpIt.model;

  function systemCurve(eff, pumpId, npts = 16) {
    if (M.isCompressible(eff)) return null; // a head curve against a liquid system: not drawn for a gas
    const j0 = eff.junctions.find((j) => j.id === pumpId);
    if (!j0 || j0.type !== 'pump') return null;
    const fl = PumpIt.fluids.evaluate(eff.system);
    const c = j0.curve;
    let cv = null;
    if (j0.mode !== 'fixedFlow' && c && c.x.length) {
      try { cv = H.makeCurve(c.x.map((v) => U.toSI(v, c.xUnit, 'volFlow')), c.y.map((v) => U.toSI(v, c.yUnit, 'head')), c.fit); } catch (e) { cv = null; }
    }
    const s = j0.speed / 100, N = j0.nPumps || 1;
    let qmax = cv ? cv.xmax * N * s * 1.25 : 0;
    if (!cv) {
      const qf = j0.mode === 'fixedFlow' ? U.toSI(j0.fixedFlow.value, j0.fixedFlow.unit, 'flow', { rho: fl.rho }) / fl.rho : 0;
      qmax = qf > 0 ? qf * 2 : 0.05;
    }
    const sys = [], pump = [];
    for (let i = 0; i <= npts; i++) {
      const Q = (qmax * i) / npts;
      const e2 = M.clone(eff);
      const jj = e2.junctions.find((j) => j.id === pumpId);
      Object.assign(jj, { mode: 'fixedFlow', state: 'on', fixedFlow: { value: Q, unit: 'm³/s' } });
      const r = PumpIt.solver.run(e2);
      if (r.ok && r.converged && r.pumps[pumpId]) sys.push([Q, r.pumps[pumpId].dH]);
      if (cv) pump.push([Q, s * s * H.evalCurve(cv, Q / (N * s))]);
    }
    return { sys, pump, rho: fl.rho };
  }

  PumpIt.solver = Object.assign(PumpIt.solver || {}, { systemCurve });
})(typeof window !== 'undefined' ? window : globalThis);
