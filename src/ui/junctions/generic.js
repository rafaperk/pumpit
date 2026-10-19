// Generic component view.
(function (root) {
  const PumpIt = root.PumpIt;
  const F = PumpIt.ui.format;
  const JT = PumpIt.ui.junctionTypes;
  const S = PumpIt.view3d.solid;
  const { stroke, fill } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.generic.' + key, params);

  JT.register('generic', {
    symbol: `<rect x="-10" y="-10" width="20" height="20" rx="2" ${stroke}/><text y="4.5" text-anchor="middle" style="font-family:var(--f-mono)" font-weight="600" font-size="12" ${fill}>K</text>`,
    // 3D views: a block with its letter (D-29)
    solid: { parts: [S.box([0, 0, 0], [8.5, 8.5, 8.5], 'block'), S.text([0, 0, 0], 'K')], reach: [S.box([0, 0, 0], [8.5, 8.5, 8.5])] },

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
