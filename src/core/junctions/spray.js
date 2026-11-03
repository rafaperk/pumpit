// Nozzle / sprinkler: discharges to an external pressure through an effective area (Cd·A or a K factor). A table of the
// time simulation may change that area or close the nozzle (closed).
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const q = PumpIt.model.q;
  const JS = PumpIt.junctionTypes.shared;

  PumpIt.junctionTypes.register({
    type: 'spray', order: 40, group: 'boundary',
    pipes: [1, 4], multi: true, ref: true,

    defaults: () => ({ sprayModel: 'CdA', Cd: 0.62, dHole: q(10, 'mm'), nHoles: 1, Kf: q(80, 'L/min/bar½'), Pext: q(0, 'kgf/cm²(g)') }),

    validate(j, miss, { fin, pos, gasP }) {
      if (j.sprayModel === 'CdA' && !(j.Cd > 0 && pos(j.dHole) && j.nHoles >= 1)) miss.push(t('junctions.spray.check.holes'));
      if (j.sprayModel === 'K' && !pos(j.Kf)) miss.push(t('junctions.spray.check.Kf'));
      if (!fin(j.Pext)) miss.push(t('junctions.spray.check.Pext'));
      gasP(j.Pext, 'junctions.spray.check.Pext');
    },

    buildNode(j, net, z) {
      const rho = net.rho;
      const nd = net.addNode({ z, jid: j.id });
      const ext = net.addNode({ kind: 'fixed', value: net.si(j.Pext, 'pressure'), z, jid: j.id, role: 'ext' });
      const CdA = effectiveArea(j, net.si);
      const lk = net.addLink({
        kind: 'ext', jid: j.id, a: nd.ix, b: ext.ix, G: 0, mode: 'loss', CdA,
        phi: (m) => m * Math.abs(m) / (2 * rho * CdA * CdA),
        mref: rho * CdA * 1,
        m0: rho * CdA * 10,
      });
      if (j.closed) { lk.mode = 'closed'; lk.fixedClosed = true; }
      return nd;
    },

    nodeResults: (j, jr, rc) => JS.dischargeResults(j, jr, rc),

    // time simulation: the effective area Cd·A follows a table (an area, or % of the steady one); 0 closes the nozzle. A
    // step takes the area as holes of Cd = 1, whatever the model of the nozzle
    time: {
      quantities: () => [{
        what: 'area', cat: 'area', min: 0, noNegative: true,
        steady: (j, si) => effectiveArea(j, si),
        apply(jc, v) {
          jc.closed = !(v > 0);
          if (v > 0) Object.assign(jc, { sprayModel: 'CdA', Cd: 1, nHoles: 1, dHole: q(Math.sqrt(4 * v / Math.PI), 'm') });
        },
      }],
    },

    // compressible mode: the same effective area, with isentropic flow that chokes below the critical pressure ratio
    gas: {
      node(j, net, z) {
        const nd = net.addNode({ z, jid: j.id });
        const ext = net.addNode({ kind: 'fixed', value: net.si(j.Pext, 'pressure'), pk: 'static', z, jid: j.id, role: 'ext' });
        const lk = net.addLink({ kind: 'ext', jid: j.id, a: nd.ix, b: ext.ix, mode: 'loss', rel: 'nozzle', CdA: effectiveArea(j, net.si), Text: net.env.fluid.T });
        if (j.closed) { lk.mode = 'closed'; lk.fixedClosed = true; }
        return nd;
      },
      results: (j, jr, rc) => JS.gasDischargeResults(j, jr, rc),
    },
  });

  // effective area Cd·A of the holes, or the area of a K factor read as water (ρ = 1000 kg/m³): Q = K·√ΔP
  function effectiveArea(j, si) {
    if (j.sprayModel === 'K') return Math.sqrt(1000 / 2) * si(j.Kf, 'kfactor');
    const d = si(j.dHole, 'length');
    return j.Cd * j.nHoles * Math.PI * d * d / 4;
  }
})(typeof window !== 'undefined' ? window : globalThis);
