// Valve: in-line loss given by K, Cv, Kv or an opening with its characteristic (linear or equal percentage); may be
// closed.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const JS = PumpIt.junctionTypes.shared;

  PumpIt.junctionTypes.register({
    type: 'valve', order: 70, group: 'valves',
    pipes: [2, 2],

    defaults: () => ({ lossModel: 'K', K: 0.2, Cv: 100, Kv: 86, closed: false, CvMax: 100, char: 'linear', R: 50, open: 100 }),

    validate: (j, miss) => JS.checkValveLoss(j, miss),

    buildElement(j, lk, net) {
      lk.phi = JS.valveLoss(j, net.kElem(j.K, j.K), net.rho);
      if (j.closed || JS.shutByOpening(j)) { lk.mode = 'closed'; lk.fixedClosed = true; }
    },

    elementResults(j, jr, rc) {
      const vr = JS.inlineValveResult(j, jr, rc);
      if (j.closed || JS.shutByOpening(j)) vr.state = t('junctions.states.closed');
      if (j.lossModel === 'opening') vr.open = j.closed ? 0 : j.open;
      rc.valves[j.id] = vr;
    },

    // time simulation: the value of its loss model follows a table, which also opens and closes it
    time: JS.valveTime,

    // compressible mode: a K element referred to the pipe the flow comes from (Cv and Kv turned into that K)
    gas: {
      element(j, lk, net) {
        // a valve shut by its opening has no Cv: its element is built with no loss, then closed
        const byOpening = JS.shutByOpening(j);
        net.kElement(byOpening ? 0 : JS.gasValveK(j, j.K, net.Ain), byOpening ? 0 : JS.gasValveK(j, j.K, net.Aout));
        if (j.closed || byOpening) { lk.mode = 'closed'; lk.fixedClosed = true; }
      },
      results(j, jr, rc) {
        const shut = j.closed || JS.shutByOpening(j);
        const vr = { type: j.type, m: rc.m, Q: jr.Q, QN: jr.QN, dP: rc.dP, Pin: jr.Pin, P0in: rc.P0in, K: jr.K, choked: jr.choked, state: t('junctions.states.' + (shut ? 'closed' : 'open')) };
        if (j.lossModel === 'opening') vr.open = shut ? 0 : j.open;
        vr.Cv = JS.gasEquivalentCv(jr.K, rc.el.d ? rc.el.d.A[0] : NaN);
        rc.valves[j.id] = vr;
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
