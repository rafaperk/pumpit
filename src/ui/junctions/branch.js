// Branch view.
(function (root) {
  const PumpIt = root.PumpIt;
  const JT = PumpIt.ui.junctionTypes;
  const S = PumpIt.view3d.solid;
  const { fill } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.branch.' + key, params);

  JT.register('branch', {
    symbol: `<circle r="5.5" ${fill}/>`,
    // 3D views: a ball where the pipes meet (D-29)
    solid: { parts: [S.ball([0, 0, 0], 6.5, 'node')], reach: [S.ball([0, 0, 0], 6.5)] },

    form(s, ctx) {
      const { key, f } = ctx;
      s.appendChild(f.qty(key, 'source', tx('form.source'), 'flow', { info: tx('form.sourceHint') }));
      JT.shared.sourceTemperature(s, ctx);
    },

    summary: (j, q) => (j.source && j.source.value ? tx('summary', { flow: q(j.source) }) : ''),

    // listed as a boundary only when it has a source or a demand
    boundaryFlow: (r) => (Math.abs(r.net) > 1e-12 ? r.net : null),
  });
})(typeof window !== 'undefined' ? window : globalThis);
