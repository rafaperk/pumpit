// Reservoir view.
(function (root) {
  const PumpIt = root.PumpIt;
  const JT = PumpIt.ui.junctionTypes;
  const { stroke } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.reservoir.' + key, params);

  JT.register('reservoir', {
    symbol: `<path d="M-13 -9V11H13V-9" ${stroke}/><path d="M-13 1h26V11H-13z" style="fill:var(--accent)" opacity=".28"/><path d="M-10 1c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 5.5-.5" ${stroke} style="stroke:var(--accent)"/>`,
    get elevationLabel() { return tx('elevation'); },
    connectionElevation: true,

    form(s, { key, f }) {
      s.appendChild(f.qty(key, 'liquidElev', tx('form.liquidElev'), 'length'));
      s.appendChild(f.qty(key, 'surfP', tx('form.surfP'), 'pressure'));
      s.appendChild(f.hint(tx('form.hint')));
    },

    summary: (j, q) => tx('summary', { level: q(j.liquidElev), pressure: q(j.surfP) }),

    infoInputs(j, add, inp) {
      add(tx('info.liquidElev'), inp(j.liquidElev));
      add(tx('info.surfP'), inp(j.surfP));
    },

    quickResults(row, r, c) {
      row(tx('results.netFlow'), c.out(r.net / c.res.fluid.rho, 'volFlow'));
    },

    // at the liquid surface the fluid is at rest: no static pressure row, and the net flow into the network
    infoResults(add, r, c) {
      add(t('network.info.stagnation'), c.out(r.P0in, 'pressure'), true);
      add(t('network.info.flowThrough'), c.out(r.m / c.res.fluid.rho, 'volFlow'), true);
      add(tx('results.netFlow'), c.out(r.net / c.res.fluid.rho, 'volFlow'));
      add(t('network.info.hgl'), c.out(r.HGL, 'head'));
    },

    boundaryFlow: (r) => r.net,
  });
})(typeof window !== 'undefined' ? window : globalThis);
