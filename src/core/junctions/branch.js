// Branch: a plain connection node, optionally with a flow source (negative = demand).
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const q = PumpIt.model.q;

  PumpIt.junctionTypes.register({
    type: 'branch', order: 50, group: 'connection',
    pipes: [2, 25], multi: true,

    defaults: () => ({ source: q(0, 'm³/h'), pipeK: {} }),

    validate(j, miss, { fin }) {
      if (!fin(j.source)) miss.push(t('junctions.branch.check.source'));
    },

    buildNode: (j, net, z) => net.addNode({ z, jid: j.id, demand: -net.si(j.source, 'flow') }),

    // compressible mode: the mass balance of the node, with the source as an external flow (§10.4)
    gas: {
      node: (j, net, z) => net.addNode({ z, jid: j.id, ext: net.flowExt(j.source, 1, j) }),
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
