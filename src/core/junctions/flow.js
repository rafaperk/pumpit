// Imposed flow: a flow leaving (or entering) the system at the end of a single pipe.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const q = PumpIt.model.q;

  PumpIt.junctionTypes.register({
    type: 'flow', order: 30, group: 'boundary',
    pipes: [1, 1], multi: true,

    defaults: () => ({ Q: q(10, 'm³/h'), dir: 'out' }),

    validate(j, miss, { fin }) {
      if (!(fin(j.Q) && j.Q.value >= 0)) miss.push(t('junctions.flow.check.Q'));
    },

    buildNode(j, net, z) {
      const m = net.si(j.Q, 'flow');
      return net.addNode({ z, jid: j.id, demand: j.dir === 'in' ? -m : m });
    },

    // compressible mode: a mass flow, a volume at the conditions of the node or a normal volume (§8.4)
    gas: {
      node: (j, net, z) => net.addNode({ z, jid: j.id, ext: net.flowExt(j.Q, j.dir === 'in' ? 1 : -1, j) }),
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
