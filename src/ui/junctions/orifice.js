// Orifice view.
(function (root) {
  const PumpIt = root.PumpIt;
  const F = PumpIt.ui.format;
  const JT = PumpIt.ui.junctionTypes;
  const S = PumpIt.view3d.solid;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.orifice.' + key, params);

  JT.register('orifice', {
    symbol: '<path d="M-13 0H13" stroke="currentColor" stroke-width="1.2" opacity=".55"/><path d="M0 -12V-4M0 4V12" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>',
    orient: 'ports',
    // 3D views: a plate between two flanges, with its handle (D-29)
    solid: {
      parts: [
        S.cyl([-5, 0, 0], [-1.2, 0, 0], 8, 'steel', { cap1: false }), S.cyl([1.2, 0, 0], [5, 0, 0], 8, 'steel', { cap0: false }),
        S.cyl([-1.2, 0, 0], [1.2, 0, 0], 10.5, 'brass'),
        S.box([0, 0, 12.6], [0.9, 2.2, 2.6], 'brass'),
      ],
      reach: [S.cyl([-5, 0, 0], [5, 0, 0], 8)],
    },

    form(s, { key, j, f }) {
      s.appendChild(f.sel(key, 'orModel', tx('form.model'), [['sharp', tx('form.sharp')], ['rounded', tx('form.rounded')], ['Cd', tx('form.Cd')], ['K', tx('form.K')]]));
      if (j.orModel !== 'K') s.appendChild(f.qty(key, 'dO', tx('form.dO'), 'length'));
      if (j.orModel === 'rounded') s.appendChild(f.qty(key, 'rEdge', tx('form.rEdge'), 'length'));
      if (j.orModel === 'Cd') { s.appendChild(f.num(key, 'Cd', 'Cd')); s.appendChild(f.hint(tx('form.CdHint'))); }
      if (j.orModel === 'K') s.appendChild(f.num(key, 'K', tx('form.KField')));
    },

    summary: (j, q) => (j.orModel === 'K' ? `K ${F.fmt(j.K, 4)}` : `⌀ ${q(j.dO)} · ${j.orModel === 'Cd' ? 'Cd ' + F.fmt(j.Cd, 3) : tx(j.orModel === 'sharp' ? 'summary.sharp' : 'summary.rounded')}`),
  });
})(typeof window !== 'undefined' ? window : globalThis);
