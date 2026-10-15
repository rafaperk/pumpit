// Generic component view.
(function (root) {
  const PumpIt = root.PumpIt;
  const F = PumpIt.ui.format;
  const JT = PumpIt.ui.junctionTypes;
  const { stroke, fill } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.generic.' + key, params);

  JT.register('generic', {
    symbol: `<rect x="-10" y="-10" width="20" height="20" rx="2" ${stroke}/><text y="4.5" text-anchor="middle" style="font-family:var(--f-mono)" font-weight="600" font-size="12" ${fill}>K</text>`,

    form(s, { key, j, f }) {
      s.appendChild(f.sel(key, 'genModel', tx('form.model'), [['K', tx('form.K')], ['curve', tx('form.curve')]]));
      if (j.genModel === 'K') s.appendChild(f.num(key, 'K', tx('form.KField')));
    },

    sections({ key, j, curveEditor }) {
      if (j.genModel !== 'curve') return [];
      return [curveEditor(key, 'curve', tx('curves.loss'), { xCat: 'volFlow', yCat: 'dp', yName: 'ΔP', min: 2 })];
    },

    summary: (j) => (j.genModel === 'K' ? `K ${F.fmt(j.K, 4)}` : tx('summary.curve', { n: j.curve.x.length })),
  });
})(typeof window !== 'undefined' ? window : globalThis);
