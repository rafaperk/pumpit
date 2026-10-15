// Nozzle / sprinkler: discharges to an external pressure through an effective area (Cd·A or a K factor).
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const q = PumpIt.model.q;
  const JS = PumpIt.junctionTypes.shared;

  PumpIt.junctionTypes.register({
    type: 'spray', order: 40, group: 'boundary',
    pipes: [1, 4], multi: true, ref: true,

    defaults: () => ({ sprayModel: 'CdA', Cd: 0.62, dHole: q(10, 'mm'), nHoles: 1, Kf: q(80, 'L/min/bar½'), Pext: q(0, 'kgf/cm²(g)') }),

    validate(j, miss, { fin, pos }) {
      if (j.sprayModel === 'CdA' && !(j.Cd > 0 && pos(j.dHole) && j.nHoles >= 1)) miss.push(t('junctions.spray.check.holes'));
      if (j.sprayModel === 'K' && !pos(j.Kf)) miss.push(t('junctions.spray.check.Kf'));
      if (!fin(j.Pext)) miss.push(t('junctions.spray.check.Pext'));
    },

    buildNode(j, net, z) {
      const rho = net.rho;
      const nd = net.addNode({ z, jid: j.id });
      const ext = net.addNode({ kind: 'fixed', value: net.si(j.Pext, 'pressure'), z, jid: j.id, role: 'ext' });
      let CdA;
      if (j.sprayModel === 'K') CdA = Math.sqrt(1000 / 2) * net.si(j.Kf, 'kfactor');
      else { const d = net.si(j.dHole, 'length'); CdA = j.Cd * j.nHoles * Math.PI * d * d / 4; }
      net.addLink({
        kind: 'ext', jid: j.id, a: nd.ix, b: ext.ix, G: 0, mode: 'loss', CdA,
        phi: (m) => m * Math.abs(m) / (2 * rho * CdA * CdA),
        mref: rho * CdA * 1,
        m0: rho * CdA * 10,
      });
      return nd;
    },

    nodeResults: (j, jr, rc) => JS.dischargeResults(j, jr, rc),
  });
})(typeof window !== 'undefined' ? window : globalThis);
