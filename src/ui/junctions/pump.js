// Pump view.
(function (root) {
  const PumpIt = root.PumpIt;
  const F = PumpIt.ui.format;
  const JT = PumpIt.ui.junctionTypes;
  const S = PumpIt.view3d.solid;
  const { stroke, fill } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.pump.' + key, params);

  JT.register('pump', {
    symbol: `<circle r="11" ${stroke}/><path d="M-5 -7.5L9 0L-5 7.5z" ${fill}/>`,
    orient: 'ports',
    // 3D views: the casing between its nozzles, the motor on top, and on both faces of the casing an arrow along the
    // flow (D-29); red when off and closed
    solid: {
      parts: [
        S.cyl([-14.2, 0, 0], [-10, 0, 0], 4, 'steel', { cap0: false, cap1: false }), S.cyl([10, 0, 0], [14.2, 0, 0], 4, 'steel', { cap0: false, cap1: false }),
        S.cyl([-16, 0, 0], [-14.2, 0, 0], 5.6, 'steel'), S.cyl([14.2, 0, 0], [16, 0, 0], 5.6, 'steel'),
        S.cyl([0, -4.5, 0], [0, 4.5, 0], 10.5, 'pump'),
        S.plate([[-4.5, -4.56, 6.5], [8, -4.56, 0], [-4.5, -4.56, -6.5]], [0, -1, 0], 'mark'),
        S.plate([[-4.5, 4.56, 6.5], [8, 4.56, 0], [-4.5, 4.56, -6.5]], [0, 1, 0], 'mark'),
        S.cyl([0, 0, 9.3], [0, 0, 18], 5, 'motor', { cap0: false, cap1: false }),
        S.rev([0, 0, 18], [0, 0, 19.6], 5, 3.2, 'motor', { cap0: false }),
      ],
      reach: [S.cyl([-16, 0, 0], [16, 0, 0], 5.6), S.ball([0, 0, 0], 10.5)],
    },
    closed: (j) => j.state === 'offClosed',
    pressureRise: true,

    form(s, { key, j, f, gas }) {
      s.appendChild(f.sel(key, 'state', tx('form.state'), [['on', tx('form.on')], ['offClosed', tx('form.offClosed')], ['offOpen', tx('form.offOpen')]]));
      // a fixed pressure ratio belongs to the compressor of the compressible mode (§10.5)
      const modes = ['curve', 'fixedFlow', 'controlFlow', 'controlDischarge', 'controlSuction'];
      if (gas || j.mode === 'ratio') modes.unshift('ratio');
      s.appendChild(f.sel(key, 'mode', tx('form.mode'), modes.map((m) => [m, tx('form.modes.' + m)])));
      if (gas && j.state === 'on') {
        if (j.mode === 'ratio') s.appendChild(f.num(key, 'ratio', tx('form.ratio')));
        s.appendChild(f.num(key, 'etaGas', tx('form.etaGas'), { suffix: '%', info: tx('form.gasHint') }));
      }
      if (j.mode === 'ratio') return;
      if (j.mode === 'fixedFlow') {
        s.appendChild(f.qty(key, 'fixedFlow', tx('form.fixedFlow'), 'flow', { info: gas ? null : tx('form.fixedHint') }));
        return;
      }
      if (j.mode === 'curve') s.appendChild(f.num(key, 'speed', tx('form.speed'), { suffix: tx('form.speedSuffix') }));
      // a controlling pump: its speed comes from the set point (affinity laws)
      if (j.mode === 'controlFlow') s.appendChild(f.qty(key, 'setQ', tx('form.setQ'), 'flow', { info: tx('form.affinityHint') }));
      if (j.mode === 'controlDischarge' || j.mode === 'controlSuction') s.appendChild(f.qty(key, 'setP', tx('form.setP'), 'pressure', { info: tx('form.affinityHint') }));
      s.appendChild(f.num(key, 'nPumps', tx('form.nPumps'), { int: true }));
    },

    // curves are not used in fixed-flow (sizing) mode; a compressor has no NPSH, and its efficiency curve also serves the
    // fixed ratio and the fixed flow (the heating of the gas)
    sections({ key, j, curveEditor, gas }) {
      const eff = curveEditor(key, 'eff', tx(gas ? 'curves.effGas' : 'curves.eff'), { xCat: 'volFlow', yCat: 'pct', yName: tx('curves.effY'), min: 0 });
      if (j.mode === 'fixedFlow' || j.mode === 'ratio') return gas ? [eff] : [];
      return [
        curveEditor(key, 'curve', tx(gas ? 'curves.headGas' : 'curves.head'), { xCat: 'volFlow', yCat: 'head', yName: tx('curves.headY'), min: 1 }),
        eff,
      ].concat(gas ? [] : [curveEditor(key, 'npshr', tx('curves.npshr'), { xCat: 'volFlow', yCat: 'head', yName: tx('curves.npshrY'), min: 0 })]);
    },

    summary: (j, q) => {
      const values = { speed: F.fmt(j.speed, 4), flow: q(j.mode === 'controlFlow' ? j.setQ : j.fixedFlow), pressure: q(j.setP), ratio: F.fmt(j.ratio, 4) };
      return tx('summary.' + j.mode, values) + (j.state !== 'on' ? tx('summary.off') : '');
    },

    quickResults(row, r, c) {
      const pr = c.res.pumps[c.id];
      if (!pr) return;
      if (c.gas) {
        // a compressor: the pressure ratio, the discharge temperature and the power given to the gas
        row(tx('quick.ratio'), F.fmt(pr.ratio, 4));
        if (Number.isFinite(pr.speed)) row(tx('quick.speed'), F.fmt(pr.speed, 4) + ' %');
        if (Number.isFinite(pr.T0out)) row(tx('quick.dischargeT'), c.out(pr.T0out, 'temperature'));
        if (Number.isFinite(pr.Pgas)) row(tx('quick.gasPower'), c.out(pr.Pgas, 'power'));
        return;
      }
      row(tx('quick.head'), c.out(pr.dH, 'head'));
      if (Number.isFinite(pr.speed)) row(tx('quick.speed'), F.fmt(pr.speed, 4) + ' %');
      if (Number.isFinite(pr.Pshaft)) row(tx('quick.shaftPower'), c.out(pr.Pshaft, 'power')); else row(tx('quick.hydraulicPower'), c.out(pr.Pideal, 'power'));
      if (Number.isFinite(pr.NPSHA)) row(tx('quick.npsh'), `${F.fmt(pr.NPSHA, 3)} / ${F.fmt(pr.NPSHR, 3)} m`);
    },

    infoResults(add, r, c) {
      const pr = c.res.pumps[c.id];
      if (!pr) return false;
      if (c.gas) {
        add(tx('info.massFlow'), c.out(Math.abs(pr.m), 'massFlow'), true);
        add(tx('info.flow'), c.out(Math.abs(pr.Q), 'volFlow'));
        add(tx('info.ratio'), F.fmt(pr.ratio, 4), true);
        add(tx('info.rise'), c.out(pr.dP, 'dp'));
        add(tx('info.suction'), c.out(r.P0in, 'pressure'));
        add(tx('info.discharge'), c.out(r.P0out, 'pressure'));
        if (Number.isFinite(pr.dHs)) add(tx('info.isentropicHead'), c.out(pr.dHs, 'head'));
        if (Number.isFinite(pr.speed)) add(tx('info.speed'), F.fmt(pr.speed, 4) + ' %');
        if (Number.isFinite(pr.eta)) add(tx('info.efficiency'), F.fmt(pr.eta * 100, 3) + ' %');
        if (Number.isFinite(pr.T0out)) add(tx('info.dischargeT'), c.out(pr.T0out, 'temperature'));
        if (Number.isFinite(pr.Pgas)) add(tx('info.gasPower'), c.out(pr.Pgas, 'power'));
        return;
      }
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
