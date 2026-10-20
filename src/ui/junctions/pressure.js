// Imposed pressure view.
(function (root) {
  const PumpIt = root.PumpIt;
  const JT = PumpIt.ui.junctionTypes;
  const S = PumpIt.view3d.solid;
  const { stroke, fill } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.pressure.' + key, params);
  const kind = (j) => tx(j.ptype === 'static' ? 'kind.static' : 'kind.stagnation');

  JT.register('pressure', {
    symbol: `<circle r="11" ${stroke}/><text y="4.5" text-anchor="middle" style="font-family:var(--f-mono)" font-weight="600" font-size="13" ${fill}>P</text>`,
    // 3D views: a sphere with its letter (D-29)
    solid: { parts: [S.ball([0, 0, 0], 10, 'press'), S.text([0, 0, 0], 'P')], reach: [S.ball([0, 0, 0], 10)] },

    form(s, ctx) {
      const { key, f } = ctx;
      s.appendChild(f.sel(key, 'ptype', tx('form.ptype'), [['stagnation', tx('form.stagnation')], ['static', tx('form.static')]]));
      s.appendChild(f.qty(key, 'P', tx('form.P'), 'pressure'));
      JT.shared.sourceTemperature(s, ctx);
    },

    summary: (j, q) => tx('summary', { pressure: q(j.P), kind: kind(j) }),

    infoInputs(j, add, inp) {
      add(tx('info.P'), tx('summary', { pressure: inp(j.P), kind: kind(j) }));
    },

    boundaryFlow: (r) => r.net,
  });
})(typeof window !== 'undefined' ? window : globalThis);
