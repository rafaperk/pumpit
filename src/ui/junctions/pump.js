// Pump view.
(function (root) {
  const PumpIt = root.PumpIt;
  const F = PumpIt.ui.format;
  const JT = PumpIt.ui.junctionTypes;
  const { stroke, fill } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.pump.' + key, params);

  JT.register('pump', {
    symbol: `<circle r="11" ${stroke}/><path d="M-5 -7.5L9 0L-5 7.5z" ${fill}/>`,
    orient: 'ports',
    pressureRise: true,

    form(s, { key, j, f }) {
      s.appendChild(f.sel(key, 'state', tx('form.state'), [['on', tx('form.on')], ['offClosed', tx('form.offClosed')], ['offOpen', tx('form.offOpen')]]));
      s.appendChild(f.sel(key, 'mode', tx('form.mode'), ['curve', 'fixedFlow', 'controlFlow', 'controlDischarge', 'controlSuction'].map((m) => [m, tx('form.modes.' + m)])));
      if (j.mode === 'fixedFlow') {
        s.appendChild(f.qty(key, 'fixedFlow', tx('form.fixedFlow'), 'flow'));
        s.appendChild(f.hint(tx('form.fixedHint')));
        return;
      }
      if (j.mode === 'curve') s.appendChild(f.num(key, 'speed', tx('form.speed'), { suffix: tx('form.speedSuffix') }));
      if (j.mode === 'controlFlow') s.appendChild(f.qty(key, 'setQ', tx('form.setQ'), 'flow'));
      if (j.mode === 'controlDischarge' || j.mode === 'controlSuction') s.appendChild(f.qty(key, 'setP', tx('form.setP'), 'pressure'));
      s.appendChild(f.num(key, 'nPumps', tx('form.nPumps'), { int: true }));
      if (j.mode !== 'curve' && j.mode !== 'fixedFlow') s.appendChild(f.hint(tx('form.affinityHint')));
    },

    // curves are not used in fixed-flow (sizing) mode
    sections({ key, j, curveEditor }) {
      if (j.mode === 'fixedFlow') return [];
      return [
        curveEditor(key, 'curve', tx('curves.head'), { xCat: 'volFlow', yCat: 'head', yName: tx('curves.headY'), min: 1 }),
        curveEditor(key, 'eff', tx('curves.eff'), { xCat: 'volFlow', yCat: 'pct', yName: tx('curves.effY'), min: 0 }),
        curveEditor(key, 'npshr', tx('curves.npshr'), { xCat: 'volFlow', yCat: 'head', yName: tx('curves.npshrY'), min: 0 }),
      ];
    },

    summary: (j, q) => {
      const values = { speed: F.fmt(j.speed, 4), flow: q(j.mode === 'controlFlow' ? j.setQ : j.fixedFlow), pressure: q(j.setP) };
      return tx('summary.' + j.mode, values) + (j.state !== 'on' ? tx('summary.off') : '');
    },

    quickResults(row, r, c) {
      const pr = c.res.pumps[c.id];
      if (!pr) return;
      row(tx('quick.head'), c.out(pr.dH, 'head'));
      if (Number.isFinite(pr.speed)) row(tx('quick.speed'), F.fmt(pr.speed, 4) + ' %');
      if (Number.isFinite(pr.Pshaft)) row(tx('quick.shaftPower'), c.out(pr.Pshaft, 'power')); else row(tx('quick.hydraulicPower'), c.out(pr.Pideal, 'power'));
      if (Number.isFinite(pr.NPSHA)) row(tx('quick.npsh'), `${F.fmt(pr.NPSHA, 3)} / ${F.fmt(pr.NPSHR, 3)} m`);
    },

    infoResults(add, r, c) {
      const pr = c.res.pumps[c.id];
      if (!pr) return false;
      add(tx('info.flow'), c.out(Math.abs(pr.Q), 'volFlow'), true);
      add(tx('info.head'), c.out(pr.dH, 'head'), true);
      add(tx('info.rise'), c.out(pr.dP, 'dp'));
      add(tx('info.suction'), c.out(r.P0in, 'pressure'));
      add(tx('info.discharge'), c.out(r.P0out, 'pressure'));
      if (Number.isFinite(pr.speed)) add(tx('info.speed'), F.fmt(pr.speed, 4) + ' %');
      add(tx('info.hydraulicPower'), c.out(pr.Pideal, 'power'));
      if (Number.isFinite(pr.Pshaft) && !pr.etaAssumed) { add(tx('info.efficiency'), F.fmt(pr.eta * 100, 3) + ' %'); add(tx('info.shaftPower'), c.out(pr.Pshaft, 'power')); }
      if (Number.isFinite(pr.NPSHA)) add(tx('info.npshA'), c.out(pr.NPSHA, 'head'));
      if (Number.isFinite(pr.NPSHR)) add(tx('info.npshR'), c.out(pr.NPSHR, 'head'));
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
