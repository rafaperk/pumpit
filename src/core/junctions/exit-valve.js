// Exit valve: the end of a single pipe discharging to a given residual pressure, through a valve loss
// (K, Cv or Kv).
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const q = PumpIt.model.q;
  const JS = PumpIt.junctionTypes.shared;

  PumpIt.junctionTypes.register({
    type: 'exitvalve', order: 90, group: 'valves',
    pipes: [1, 1], multi: true, ref: true,

    defaults: () => ({ Pout: q(0, 'kgf/cm²(g)'), lossModel: 'K', K: 0, Cv: 100, Kv: 86 }),

    validate(j, miss, { fin }) {
      if (!fin(j.Pout)) miss.push(t('junctions.exitvalve.check.Pout'));
      JS.checkValveLoss(j, miss);
    },

    buildNode(j, net, z) {
      const rho = net.rho;
      const nd = net.addNode({ z, jid: j.id });
      const ext = net.addNode({ kind: 'fixed', value: net.si(j.Pout, 'pressure'), z, jid: j.id, role: 'ext' });
      const pc = PumpIt.model.pipesAt(net.eff, j.id)[0];
      const P = pc && net.pp.get(pc.id);
      if (!P) { net.errors.push(t('junctions.exitvalve.error.noPipe', { id: j.id })); return nd; }
      net.addLink({
        kind: 'ext', jid: j.id, a: nd.ix, b: ext.ix, G: 0, mode: 'loss', P,
        phi: JS.valveLoss(j, (m) => net.kTerm(j.K, P, m / (rho * P.A * P.N)), rho),
        mref: rho * P.A * P.N * 0.01,
        m0: rho * P.A * P.N * 1,
      });
      return nd;
    },

    nodeResults(j, jr, rc) {
      JS.dischargeResults(j, jr, rc);
      if (rc.nd.isolated) return;
      const { rho } = rc.env;
      const pc = rc.con[0], pr = pc && rc.pipeOf(pc.id);
      const vr = { type: j.type, m: jr.m, Q: jr.Q, dP: jr.dP, Pin: jr.Pin, P0in: rc.P0, Pout: jr.Pext, state: t('junctions.states.discharging') };
      vr.K = pr && pr.V ? jr.dP / (rho * pr.V * pr.V / 2) : NaN;
      vr.Cv = JS.equivalentCv(jr.m, jr.dP, rho);
      if (jr.m < 0) rc.warn('warning', t('junctions.exitvalve.warn.inflow', { id: j.id }), 'j:' + j.id);
      rc.valves[j.id] = vr;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
