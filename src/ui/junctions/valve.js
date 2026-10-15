// Valve view.
(function (root) {
  const PumpIt = root.PumpIt;
  const JT = PumpIt.ui.junctionTypes;
  const { stroke } = JT.SVG;
  const { t } = PumpIt.i18n;

  JT.register('valve', {
    symbol: `<path d="M-12 -7L12 7V-7L-12 7z" ${stroke}/>`,
    orient: 'ports',

    form(s, { key, j, f }) {
      JT.shared.lossModelFields(s, key, j, f);
      s.appendChild(f.chk(key, 'closed', t('junctions.valve.form.closed')));
    },

    summary: (j) => JT.shared.lossSummary(j) + (j.closed ? t('junctions.valve.summaryClosed') : ''),
  });
})(typeof window !== 'undefined' ? window : globalThis);
