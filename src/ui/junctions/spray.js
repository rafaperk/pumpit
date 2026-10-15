// Nozzle / sprinkler view.
(function (root) {
  const PumpIt = root.PumpIt;
  const F = PumpIt.ui.format;
  const JT = PumpIt.ui.junctionTypes;
  const { stroke, fill } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.spray.' + key, params);

  JT.register('spray', {
    symbol: `<path d="M-8 -10h16l-5 10h-6z" ${stroke}/><circle cx="-6" cy="6" r="1.6" ${fill}/><circle cx="0" cy="9" r="1.6" ${fill}/><circle cx="6" cy="6" r="1.6" ${fill}/><circle cx="-3" cy="12" r="1.3" ${fill}/><circle cx="3" cy="12" r="1.3" ${fill}/>`,

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
