// Check valve view.
(function (root) {
  const PumpIt = root.PumpIt;
  const JT = PumpIt.ui.junctionTypes;
  const S = PumpIt.view3d.solid;
  const { stroke, fill } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.check.' + key, params);

  JT.register('check', {
    // the valve with the half that faces the flow filled: the flow passes from the open half to the filled one
    symbol: `<path d="M-12 -7L12 7V-7L-12 7z" ${stroke}/><path d="M0 0L12 -7V7z" ${fill}/>`,
    orient: 'ports',
    // 3D views: two cones meeting in the middle under the round cover of a swing check, without a stem; red when closed
    solid: {
      parts: [
        S.rev([-12, 0, 0], [0, 0, 0], 6.5, 2.2, 'valve', { cap1: false }), S.rev([0, 0, 0], [12, 0, 0], 2.2, 6.5, 'valve', { cap0: false }),
        S.cyl([0, 0, 1.4], [0, 0, 5], 4.2, 'valve', { cap0: false }),
        S.cyl([0, 0, 5], [0, 0, 6.4], 5.2, 'steel'),
      ],
      reach: [S.cyl([-12, 0, 0], [12, 0, 0], 6.5)],
    },
    closed: (j) => !!j.closed,

    form(s, { key, j, f }) {
      f.note(s, PumpIt.ui.format.esc(tx('form.hint')));
      JT.shared.lossModelFields(s, key, j, f, { opening: false });
      s.appendChild(f.qty(key, 'vClose', tx('form.vClose'), 'velocity', { info: tx('form.vCloseHint') }));
      s.appendChild(f.qty(key, 'dPopen', tx('form.dPopen'), 'dp', { info: tx('form.dPopenHint') }));
      s.appendChild(f.chk(key, 'closed', tx('form.closed')));
    },

    summary: (j) => JT.shared.lossSummary(j) + (j.closed ? tx('summaryClosed') : ''),
  });
})(typeof window !== 'undefined' ? window : globalThis);
