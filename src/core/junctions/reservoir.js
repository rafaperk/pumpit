// Reservoir: free liquid surface at a given level and surface pressure (a fixed-pressure node).
// A pipe may connect at its own depth (pipeK[pid].elev); a pipe above the liquid level discharges in free fall.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const q = PumpIt.model.q;

  PumpIt.junctionTypes.register({
    type: 'reservoir', order: 10, group: 'boundary',
    pipes: [1, 25], multi: true, ref: true,

    defaults: () => ({ liquidElev: q(5, 'm'), surfP: q(0, 'kgf/cm²(g)'), pipeK: {} }),

    validate(j, miss, { fin }) {
      if (!fin(j.liquidElev)) miss.push(t('junctions.reservoir.check.liquidElev'));
      if (!fin(j.surfP)) miss.push(t('junctions.reservoir.check.surfP'));
    },

    pipeEndElevation(j, pk, si) {
      if (pk && pk.elev && Number.isFinite(pk.elev.value)) return si(pk.elev, 'length');
      return undefined;
    },

    buildNode: (j, net) => net.addNode({ kind: 'fixed', value: net.si(j.surfP, 'pressure'), z: net.si(j.liquidElev, 'length'), jid: j.id, isRes: true }),

    // compressible mode: a vessel of gas at rest, its pressure a stagnation pressure at the level of the reference
    // (§10.4), its temperature that of the gas it supplies
    gas: {
      node: (j, net) => net.addNode({ kind: 'fixed', value: net.si(j.surfP, 'pressure'), pk: 'stagnation', z: net.si(j.liquidElev, 'length'), jid: j.id, isRes: true, T0: net.sourceT(j) }),
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
