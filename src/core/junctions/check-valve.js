// Check valve: an in-line valve that lets the flow through in its reference direction only (§7.4 of the specification of
// the time simulation). Open, its loss is a K, a Cv or a Kv; it closes when the velocity in the forward direction falls
// below its closing velocity (0 by default) and opens again when the pressure difference across it reaches its
// reopening difference (0 by default). It is a stateful device, so its state carries from one time step to the next.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const q = PumpIt.model.q;
  const JS = PumpIt.junctionTypes.shared;

  // open or closed; the small margins keep it from chattering on a velocity or a difference that is zero but for rounding
  const device = {
    anyway: true,
    initial: () => 'open',
    configure(lk, s) {
      if (s === 'closed') lk.mode = 'closed';
      else { lk.mode = 'loss'; lk.phi = lk.phiOpen; }
    },
    review(lk, sol, st, next, env) {
      if (st[lk.jid] === 'open') {
        const V = sol.m[lk.idx] / (env.rho * lk.Ain);
        if (V < lk.vClose - 1e-9) next[lk.jid] = 'closed';
      } else if (sol.P[lk.a] - sol.P[lk.b] > lk.dPopen + 1e-3) next[lk.jid] = 'open';
    },
  };

  PumpIt.junctionTypes.register({
    type: 'check', order: 75, group: 'valves',
    pipes: [2, 2], directional: true,

    defaults: () => ({ lossModel: 'K', K: 2, Cv: 100, Kv: 86, vClose: q(0, 'm/s'), dPopen: q(0, 'kgf/cm²'), closed: false }),

    validate(j, miss, { fin }) {
      JS.checkValveLoss(j, miss);
      if (!fin(j.vClose)) miss.push(t('junctions.check.check.vClose'));
      if (!(fin(j.dPopen) && j.dPopen.value >= 0)) miss.push(t('junctions.check.check.dPopen'));
    },

    buildElement(j, lk, net) {
      lk.phiOpen = JS.valveLoss(j, net.kElem(j.K, j.K), net.rho);
      lk.phi = lk.phiOpen;
      if (j.closed) { lk.mode = 'closed'; lk.fixedClosed = true; return; }
      lk.Ain = net.Pin.A * net.Pin.N;
      lk.vClose = net.si(j.vClose, 'velocity');
      lk.dPopen = net.si(j.dPopen, 'dp');
      lk.device = device;
    },

    elementResults(j, jr, rc) {
      const vr = JS.inlineValveResult(j, jr, rc);
      const s = j.closed ? 'closed' : rc.st[j.id];
      vr.state = t('junctions.states.' + (s === 'closed' ? 'closed' : 'open'));
      rc.valves[j.id] = vr;
    },

    // time simulation: no table of its own; its state (open or closed) goes to the event log and to the conditions
    time: {
      results: 'valves', states: ['open', 'closed'], log: 'check',
      stateOf: (jc, sol) => (jc.closed ? 'closed' : sol && sol.states && sol.states[jc.id] ? sol.states[jc.id] : 'open'),
      isClosed: (jc) => !!jc.closed,
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
