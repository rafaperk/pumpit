// Valve view.
(function (root) {
  const PumpIt = root.PumpIt;
  const JT = PumpIt.ui.junctionTypes;
  const S = PumpIt.view3d.solid;
  const { stroke } = JT.SVG;
  const { t } = PumpIt.i18n;

  JT.register('valve', {
    symbol: `<path d="M-12 -7L12 7V-7L-12 7z" ${stroke}/>`,
    orient: 'ports',
    // 3D views: two cones meeting in the middle, the bonnet, the stem and the handwheel (D-29); red when closed
    solid: {
      parts: [
        S.rev([-12, 0, 0], [0, 0, 0], 6.5, 2.2, 'valve', { cap1: false }), S.rev([0, 0, 0], [12, 0, 0], 2.2, 6.5, 'valve', { cap0: false }),
        S.cyl([0, 0, 1.4], [0, 0, 4.6], 3, 'valve', { cap0: false }),
        S.cyl([0, 0, 4.6], [0, 0, 10.6], 1.1, 'steel', { cap0: false, cap1: false }),
        S.cyl([0, 0, 10.6], [0, 0, 12.2], 6, 'wheel'),
      ],
      reach: [S.cyl([-12, 0, 0], [12, 0, 0], 6.5)],
    },
    closed: (j) => !!j.closed,

    form(s, { key, j, f }) {
      JT.shared.lossModelFields(s, key, j, f);
      s.appendChild(f.chk(key, 'closed', t('junctions.valve.form.closed')));
    },

    summary: (j) => JT.shared.lossSummary(j) + (j.closed ? t('junctions.valve.summaryClosed') : ''),
  });
})(typeof window !== 'undefined' ? window : globalThis);
