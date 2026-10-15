// Assigned pressure: stagnation pressure at the junction, or static pressure in its single pipe.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const q = PumpIt.model.q;

  PumpIt.junctionTypes.register({
    type: 'pressure', order: 20, group: 'boundary',
    pipes: [1, 25], multi: true, ref: true,

    defaults: () => ({ P: q(2, 'kgf/cm²(g)'), ptype: 'stagnation', pipeK: {} }),

    validate(j, miss, { fin, pipeCount }) {
      if (!fin(j.P)) miss.push(t('junctions.pressure.check.P'));
      if (j.ptype === 'static' && pipeCount !== 1) miss.push(t('junctions.pressure.check.staticOnePipe'));
    },

    buildNode(j, net, z) {
      const P = net.si(j.P, 'pressure');
      return net.addNode({ kind: j.ptype === 'static' ? 'fixedStatic' : 'fixed', value: P, z, jid: j.id });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
