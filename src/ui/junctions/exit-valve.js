// Exit valve view.
(function (root) {
  const PumpIt = root.PumpIt;
  const JT = PumpIt.ui.junctionTypes;
  const S = PumpIt.view3d.solid;
  const { stroke } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.exitvalve.' + key, params);

  JT.register('exitvalve', {
    symbol: `<path d="M-14 -6L2 6V-6L-14 6z" ${stroke}/><path d="M5 0H14M10.5 -3.5L14 0L10.5 3.5" ${stroke}/>`,
    orient: 'pipe',
    // 3D views: a valve at the end of its pipe and an arrow for the discharge (D-29)
    solid: {
      parts: [
        S.rev([-14, 0, 0], [-6, 0, 0], 6, 2, 'valve', { cap1: false }), S.rev([-6, 0, 0], [2, 0, 0], 2, 6, 'valve', { cap0: false }),
        S.cyl([-6, 0, 1.3], [-6, 0, 4.4], 2.6, 'valve', { cap0: false }),
        S.cyl([-6, 0, 4.4], [-6, 0, 10], 1, 'steel', { cap0: false, cap1: false }),
        S.cyl([-6, 0, 10], [-6, 0, 11.4], 5, 'wheel'),
        S.cyl([4.5, 0, 0], [9, 0, 0], 1.4, 'wheel', { cap1: false }),
        S.rev([9, 0, 0], [15, 0, 0], 3.8, 0, 'wheel'),
      ],
      reach: [S.cyl([-14, 0, 0], [2, 0, 0], 6)],
    },
    get elevationLabel() { return tx('elevation'); },

    form(s, { key, j, f }) {
      s.appendChild(f.qty(key, 'Pout', tx('form.Pout'), 'pressure'));
      JT.shared.lossModelFields(s, key, j, f);
      s.appendChild(f.hint(tx('form.hint')));
    },

    summary: (j, q) => tx('summary', { pressure: q(j.Pout), loss: JT.shared.lossSummary(j) }),

    infoInputs(j, add, inp) {
      add(tx('info.Pout'), inp(j.Pout));
    },

    quickResults(row, r, c) {
      row(t('network.info.discharged'), c.out(r.Q, 'volFlow'));
      row(tx('results.loss'), c.out(r.dP, 'dp'));
    },

    infoResults: JT.shared.dischargeInfo('junctions.exitvalve.results.loss'),
  });
})(typeof window !== 'undefined' ? window : globalThis);
