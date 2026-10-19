// Control valve view.
(function (root) {
  const PumpIt = root.PumpIt;
  const JT = PumpIt.ui.junctionTypes;
  const S = PumpIt.view3d.solid;
  const { stroke } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.control.' + key, params);

  JT.register('control', {
    symbol: `<path d="M-12 -2L12 10V-2L-12 10z" ${stroke}/><path d="M0 4V-7" ${stroke}/><path d="M-7 -7a7 6 0 0 1 14 0z" ${stroke}/>`,
    orient: 'ports',
    // 3D views: the body of a valve under a diaphragm actuator (D-29); red when closed
    solid: {
      parts: [
        S.rev([-12, 0, 0], [0, 0, 0], 6.5, 2.2, 'valve', { cap1: false }), S.rev([0, 0, 0], [12, 0, 0], 2.2, 6.5, 'valve', { cap0: false }),
        S.cyl([0, 0, 1.4], [0, 0, 4.6], 3, 'valve', { cap0: false }),
        S.cyl([0, 0, 4.6], [0, 0, 9], 1.1, 'steel', { cap0: false, cap1: false }),
        S.rev([0, 0, 9], [0, 0, 11], 2.4, 7, 'act', { cap1: false }),
        S.cyl([0, 0, 11], [0, 0, 12.4], 7, 'act', { cap0: false, cap1: false }),
        S.rev([0, 0, 12.4], [0, 0, 14.4], 7, 3, 'act', { cap0: false }),
      ],
      reach: [S.cyl([-12, 0, 0], [12, 0, 0], 6.5)],
    },
    closed: (j) => j.special === 'closed',

    form(s, { key, j, f }) {
      s.appendChild(f.sel(key, 'ctype', tx('form.ctype'), ['PRV', 'PSV', 'FCV', 'PDCV'].map((c) => [c, tx('form.types.' + c)])));
      if (j.ctype === 'PRV' || j.ctype === 'PSV') {
        s.appendChild(f.qty(key, 'setP', j.ctype === 'PRV' ? tx('form.setPDown') : tx('form.setPUp'), 'pressure'));
        s.appendChild(f.sel(key, 'basis', tx('form.basis'), [['static', tx('form.static')], ['stagnation', tx('form.stagnation')]]));
      }
      if (j.ctype === 'FCV') {
        s.appendChild(f.qty(key, 'setQ', tx('form.setQ'), 'flow'));
        s.appendChild(f.sel(key, 'failAction', tx('form.failAction'), [['open', tx('form.failOpen')], ['closed', tx('form.failClosed')]]));
      }
      if (j.ctype === 'PDCV') s.appendChild(f.qty(key, 'setDP', tx('form.setDP'), 'dp'));
      s.appendChild(f.chk(key, 'alwaysControl', tx('form.alwaysControl')));
      s.appendChild(f.num(key, 'kOpen', tx('form.kOpen')));
      s.appendChild(f.sel(key, 'special', tx('form.special'), [['none', tx('form.specialNone')], ['closed', tx('form.specialClosed')], ['open', tx('form.specialOpen')]]));
    },

    summary: (j, q) => `${j.ctype} ${j.ctype === 'FCV' ? q(j.setQ) : j.ctype === 'PDCV' ? q(j.setDP) : q(j.setP)}`,

    infoInputs(j, add, inp) {
      add(tx('info.setting'), j.ctype === 'FCV' ? inp(j.setQ) : j.ctype === 'PDCV' ? inp(j.setDP) : inp(j.setP));
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
