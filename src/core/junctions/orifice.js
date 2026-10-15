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
      const { si, Ain, Aout } = net;
      let Kf, Kr;
      if (j.orModel === 'K') { Kf = Kr = j.K; }
      else {
        const dO = si(j.dO, 'length'), Ao = Math.PI * dO * dO / 4;
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
      lk.phi = net.kElem(Kf, Kr); lk.info = { Kfwd: Kf, Krev: Kr };
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
