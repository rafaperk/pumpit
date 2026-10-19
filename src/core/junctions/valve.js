// Valve: in-line loss given by K, Cv or Kv; may be closed.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const JS = PumpIt.junctionTypes.shared;

  PumpIt.junctionTypes.register({
    type: 'valve', order: 70, group: 'valves',
    pipes: [2, 2],

    defaults: () => ({ lossModel: 'K', K: 0.2, Cv: 100, Kv: 86, closed: false }),

    validate: (j, miss) => JS.checkValveLoss(j, miss),

    buildElement(j, lk, net) {
      lk.phi = JS.valveLoss(j, net.kElem(j.K, j.K), net.rho);
      if (j.closed) { lk.mode = 'closed'; lk.fixedClosed = true; }
    },

    elementResults(j, jr, rc) {
      const vr = JS.inlineValveResult(j, jr, rc);
      if (j.closed) vr.state = t('junctions.states.closed');
      rc.valves[j.id] = vr;
    },

    // compressible mode: a K element referred to the pipe the flow comes from (Cv and Kv turned into that K)
    gas: {
      element(j, lk, net) {
        net.kElement(JS.gasValveK(j, j.K, net.Ain), JS.gasValveK(j, j.K, net.Aout));
        if (j.closed) { lk.mode = 'closed'; lk.fixedClosed = true; }
      },
      results(j, jr, rc) {
        const vr = { type: j.type, m: rc.m, Q: jr.Q, QN: jr.QN, dP: rc.dP, Pin: jr.Pin, P0in: rc.P0in, K: jr.K, choked: jr.choked, state: t('junctions.states.' + (j.closed ? 'closed' : 'open')) };
        vr.Cv = JS.gasEquivalentCv(jr.K, rc.el.d ? rc.el.d.A[0] : NaN);
        rc.valves[j.id] = vr;
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
