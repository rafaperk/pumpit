// Reservoir: free liquid surface at a given level and surface pressure (a fixed-pressure node).
// Each pipe connects at the bottom (the junction elevation) or where its row of the per-pipe table says: at an elevation
// (pipeK[pid].elev) or, with connBy 'depth', at a depth below the liquid surface (pipeK[pid].depth), which then follows
// the surface when the level changes. A pipe above the liquid level discharges in free fall.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const q = PumpIt.model.q;

  PumpIt.junctionTypes.register({
    type: 'reservoir', order: 10, group: 'boundary',
    pipes: [1, 25], multi: true, ref: true,

    defaults: () => ({ liquidElev: q(5, 'm'), surfP: q(0, 'kgf/cm²(g)'), connBy: 'elevation', pipeK: {} }),

    validate(j, miss, { fin, gasP }) {
      if (!fin(j.liquidElev)) miss.push(t('junctions.reservoir.check.liquidElev'));
      if (!fin(j.surfP)) miss.push(t('junctions.reservoir.check.surfP'));
      gasP(j.surfP, 'junctions.reservoir.check.gasP');
    },

    // only the field of the reference in use counts (a model without connBy gives elevations)
    pipeEndElevation(j, pk, si) {
      const fin = (x) => x && Number.isFinite(x.value);
      if (j.connBy === 'depth') return fin(pk && pk.depth) && fin(j.liquidElev) ? si(j.liquidElev, 'length') - si(pk.depth, 'length') : undefined;
      return fin(pk && pk.elev) ? si(pk.elev, 'length') : undefined;
    },

    buildNode: (j, net) => net.addNode({ kind: 'fixed', value: net.si(j.surfP, 'pressure'), z: net.si(j.liquidElev, 'length'), jid: j.id, isRes: true }),

    // compressible mode: a vessel of gas at rest, its pressure a stagnation pressure at the level of the reference
    // (§10.4), its temperature that of the gas it supplies
    gas: {
      node: (j, net) => net.addNode({ kind: 'fixed', value: net.si(j.surfP, 'pressure'), pk: 'stagnation', z: net.si(j.liquidElev, 'length'), jid: j.id, isRes: true, T0: net.sourceT(j) }),
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
