// Nozzle / sprinkler view.
(function (root) {
  const PumpIt = root.PumpIt;
  const F = PumpIt.ui.format;
  const JT = PumpIt.ui.junctionTypes;
  const S = PumpIt.view3d.solid;
  const { stroke, fill } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.spray.' + key, params);

  JT.register('spray', {
    symbol: `<path d="M-8 -10h16l-5 10h-6z" ${stroke}/><circle cx="-6" cy="6" r="1.6" ${fill}/><circle cx="0" cy="9" r="1.6" ${fill}/><circle cx="6" cy="6" r="1.6" ${fill}/><circle cx="-3" cy="12" r="1.3" ${fill}/><circle cx="3" cy="12" r="1.3" ${fill}/>`,
    // 3D views: a nozzle at the end of its pipe, spraying drops (D-29)
    solid: {
      orient: 'pipe',
      parts: [
        S.cyl([-11, 0, 0], [-5, 0, 0], 4.6, 'steel', { cap1: false }),
        S.rev([-5, 0, 0], [3, 0, 0], 6.5, 2.6, 'brass'),
        S.ball([7, 0, 0], 1.7, 'liquid'), S.ball([9.5, 3.5, 1.8], 1.5, 'liquid'), S.ball([9.5, -3.2, -2], 1.5, 'liquid'),
        S.ball([12, 0.8, 4.2], 1.3, 'liquid'), S.ball([12, -1.5, -4.4], 1.3, 'liquid'), S.ball([13, 4.5, -1], 1.2, 'liquid'),
      ],
      reach: [S.cyl([-11, 0, 0], [3, 0, 0], 6.5)],
    },

    form(s, { key, j, f }) {
      s.appendChild(f.sel(key, 'sprayModel', tx('form.model'), [['CdA', tx('form.CdA')], ['K', tx('form.K')]]));
      if (j.sprayModel === 'K') {
        s.appendChild(f.qty(key, 'Kf', tx('form.Kf'), 'kfactor'));
        s.appendChild(f.hint(tx('form.KfHint')));
      } else {
        s.appendChild(f.num(key, 'Cd', 'Cd'));
        s.appendChild(f.qty(key, 'dHole', tx('form.dHole'), 'length'));
        s.appendChild(f.num(key, 'nHoles', tx('form.nHoles'), { int: true }));
      }
      s.appendChild(f.qty(key, 'Pext', tx('form.Pext'), 'pressure'));
    },

    summary: (j, q) => (j.sprayModel === 'K' ? `K ${q(j.Kf)}` : `Cd ${F.fmt(j.Cd, 3)} · ${j.nHoles} × ⌀ ${q(j.dHole)}`),

    quickResults(row, r, c) {
      row(t('network.info.discharged'), c.out(r.Q, 'volFlow'));
    },

    infoResults: JT.shared.dischargeInfo('junctions.spray.results.loss'),

    // what the nozzle discharges leaves the network
    boundaryFlow: (r) => -r.m,
  });
})(typeof window !== 'undefined' ? window : globalThis);
