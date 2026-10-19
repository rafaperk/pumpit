// Orifice: sharp-edged or rounded (Idelchik), by discharge coefficient Cd, or by a given K.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const H = PumpIt.hyd;
  const q = PumpIt.model.q;

  PumpIt.junctionTypes.register({
    type: 'orifice', order: 100, group: 'losses',
    pipes: [2, 2],

    defaults: () => ({ orModel: 'sharp', dO: q(25, 'mm'), rEdge: q(2, 'mm'), Cd: 0.61, K: 10 }),

    validate(j, miss, { pos }) {
      if (j.orModel !== 'K' && !pos(j.dO)) miss.push(t('junctions.orifice.check.dO'));
      if (j.orModel === 'Cd' && !(j.Cd > 0 && j.Cd <= 1)) miss.push('Cd');
      if (j.orModel === 'K' && !(j.K >= 0)) miss.push('K');
    },

    buildElement(j, lk, net) {
      const { Kf, Kr } = orificeKs(j, net);
      lk.phi = net.kElem(Kf, Kr); lk.info = { Kfwd: Kf, Krev: Kr };
    },

    // compressible mode: the same K element, and the flow through the vena contracta of the hole limited to the
    // critical (sonic) flow of an isentropic nozzle of area Cc·Ao (decision G-13): a restriction orifice chokes at its
    // hole long before the pipe would
    gas: {
      element(j, lk, net) {
        const { Kf, Kr, Ao } = orificeKs(j, net);
        net.kElement(Kf, Kr);
        lk.info = { Kfwd: Kf, Krev: Kr };
        if (!(Ao > 0) || lk.mode !== 'loss') return;
        const Cc = j.orModel === 'Cd' ? j.Cd : j.orModel === 'sharp' ? 0.61 : 0.61 + 0.39 * (1 - 10 ** (-7.7 * net.si(j.rEdge, 'length') / net.si(j.dO, 'length')));
        const k = net.cx.k, crit = Math.pow(2 / (k + 1), (k + 1) / (2 * (k - 1)));
        // largest mass flux referred to the pipe the flow comes from, for the stagnation state ahead of the hole
        const cap = (Ain) => (cx, s) => {
          const f = PumpIt.gas.flow.fac(cx, s.M1), P0 = s.P1 * Math.pow(f, cx.e), T0 = s.T1 * f;
          return Cc * (Ao / Ain) * P0 * Math.sqrt(cx.k / (cx.ZR * T0)) * crit;
        };
        lk.d.cap = [cap(net.Ain), cap(net.Aout)];
      },
    },
  });

  // K of the orifice in each direction (referred to the pipe the flow comes from) and the area of its hole
  function orificeKs(j, net) {
    const { si, Ain, Aout } = net;
    let Kf, Kr, Ao = NaN;
    if (j.orModel === 'K') { Kf = Kr = j.K; }
    else {
      const dO = si(j.dO, 'length');
      Ao = Math.PI * dO * dO / 4;
      if (Ao >= Math.min(Ain, Aout)) net.errors.push(t('junctions.orifice.error.tooLarge', { id: j.id }));
      if (j.orModel === 'Cd') {
        Kf = (1 - (Ao / Ain) ** 2) / (j.Cd * j.Cd) * (Ain / Ao) ** 2;
        Kr = (1 - (Ao / Aout) ** 2) / (j.Cd * j.Cd) * (Aout / Ao) ** 2;
      } else {
        const r = si(j.rEdge, 'length');
        Kf = H.orificeK(Ain, Aout, Ao, j.orModel, r, dO);
        Kr = H.orificeK(Aout, Ain, Ao, j.orModel, r, dO);
      }
    }
    return { Kf, Kr, Ao };
  }
})(typeof window !== 'undefined' ? window : globalThis);
