// Branch view.
(function (root) {
  const PumpIt = root.PumpIt;
  const JT = PumpIt.ui.junctionTypes;
  const { fill } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.branch.' + key, params);

  JT.register('branch', {
    symbol: `<circle r="5.5" ${fill}/>`,

    form(s, { key, f }) {
      s.appendChild(f.qty(key, 'source', tx('form.source'), 'flow', { title: tx('form.sourceHint') }));
      s.appendChild(f.hint(tx('form.sourceHint')));
    },

    summary: (j, q) => (j.source && j.source.value ? tx('summary', { flow: q(j.source) }) : ''),

    // listed as a boundary only when it has a source or a demand
    boundaryFlow: (r) => (Math.abs(r.net) > 1e-12 ? r.net : null),
  });
})(typeof window !== 'undefined' ? window : globalThis);
