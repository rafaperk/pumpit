// Imposed pressure: stagnation pressure at the junction, or static pressure in its single pipe.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const q = PumpIt.model.q;

  PumpIt.junctionTypes.register({
    type: 'pressure', order: 20, group: 'boundary',
    pipes: [1, 25], multi: true, ref: true,

    defaults: () => ({ P: q(2, 'kgf/cm²(g)'), ptype: 'stagnation', pipeK: {} }),

    validate(j, miss, { fin, pipeCount, gasP }) {
      if (!fin(j.P)) miss.push(t('junctions.pressure.check.P'));
      gasP(j.P, 'junctions.pressure.check.P');
      if (j.ptype === 'static' && pipeCount !== 1) miss.push(t('junctions.pressure.check.staticOnePipe'));
    },

    buildNode(j, net, z) {
      const P = net.si(j.P, 'pressure');
      return net.addNode({ kind: j.ptype === 'static' ? 'fixedStatic' : 'fixed', value: P, z, jid: j.id });
    },

    // compressible mode: a fixed pressure, static or stagnation as chosen (the pipe relations convert at its end)
    gas: {
      node: (j, net, z) => net.addNode({ kind: 'fixed', value: net.si(j.P, 'pressure'), pk: j.ptype === 'static' ? 'static' : 'stagnation', z, jid: j.id, T0: net.sourceT(j) }),
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
