// Reservoir view.
(function (root) {
  const PumpIt = root.PumpIt;
  const JT = PumpIt.ui.junctionTypes;
  const S = PumpIt.view3d.solid;
  const { stroke } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.reservoir.' + key, params);

  JT.register('reservoir', {
    symbol: `<path d="M-13 -9V11H13V-9" ${stroke}/><path d="M-13 1h26V11H-13z" style="fill:var(--accent)" opacity=".28"/><path d="M-10 1c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 5.5-.5" ${stroke} style="stroke:var(--accent)"/>`,
    // 3D views: an open tank with its liquid (D-29)
    solid: { parts: [S.tank(15, -13, 13, 6, { shell: 'steel', inside: 'inside', liquid: 'liquid' })], reach: [S.cyl([0, 0, -13], [0, 0, 13], 15)] },
    get elevationLabel() { return tx('elevation'); },
    connectionElevation: true,

    // for a gas (compressible mode) the reservoir is a vessel: its pressure applies at the reference elevation
    form(s, ctx) {
      const { key, f, gas } = ctx;
      s.appendChild(f.qty(key, 'liquidElev', tx(gas ? 'form.gasElev' : 'form.liquidElev'), 'length'));
      s.appendChild(f.qty(key, 'surfP', tx(gas ? 'form.gasP' : 'form.surfP'), 'pressure'));
      f.note(s, tx(gas ? 'form.gasHint' : 'form.hint'));
      JT.shared.sourceTemperature(s, ctx);
    },

    summary: (j, q) => tx('summary', { level: q(j.liquidElev), pressure: q(j.surfP) }),

    infoInputs(j, add, inp, gas) {
      add(tx(gas ? 'form.gasElev' : 'info.liquidElev'), inp(j.liquidElev));
      add(tx(gas ? 'form.gasP' : 'info.surfP'), inp(j.surfP));
    },

    quickResults(row, r, c) {
      row(tx('results.netFlow'), c.flow(r.net));
    },

    // at the liquid surface the fluid is at rest: no static pressure row, and the net flow into the network (a mass
    // flow for a gas, which has no head either)
    infoResults(add, r, c) {
      add(t('network.info.stagnation'), c.out(r.P0in, 'pressure'), true);
      add(t('network.info.flowThrough'), c.flow(r.m), true);
      add(tx('results.netFlow'), c.flow(r.net));
      if (!c.gas) add(t('network.info.hgl'), c.out(r.HGL, 'head'));
    },

    boundaryFlow: (r) => r.net,
  });
})(typeof window !== 'undefined' ? window : globalThis);
