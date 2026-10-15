// Exit valve view.
(function (root) {
  const PumpIt = root.PumpIt;
  const JT = PumpIt.ui.junctionTypes;
  const { stroke } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.exitvalve.' + key, params);

  JT.register('exitvalve', {
    symbol: `<path d="M-14 -6L2 6V-6L-14 6z" ${stroke}/><path d="M5 0H14M10.5 -3.5L14 0L10.5 3.5" ${stroke}/>`,
    orient: 'pipe',
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
