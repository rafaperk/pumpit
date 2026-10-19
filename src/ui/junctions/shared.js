// View pieces shared by several junction types: valve loss model fields and summary, discharge results.
(function (root) {
  const PumpIt = root.PumpIt;
  const F = PumpIt.ui.format;
  const { t } = PumpIt.i18n;

  // loss model of a valve: K, Cv or Kv
  function lossModelFields(s, key, j, f) {
    s.appendChild(f.sel(key, 'lossModel', t('junctions.lossModel.label'), [['K', t('junctions.lossModel.K')], ['Cv', t('junctions.lossModel.Cv')], ['Kv', t('junctions.lossModel.Kv')]]));
    if (j.lossModel === 'K') s.appendChild(f.num(key, 'K', 'K'));
    if (j.lossModel === 'Cv') s.appendChild(f.num(key, 'Cv', 'Cv', { info: t('junctions.lossModel.CvHint') }));
    if (j.lossModel === 'Kv') s.appendChild(f.num(key, 'Kv', 'Kv', { info: t('junctions.lossModel.KvHint') }));
  }

  const lossSummary = (j) => (j.lossModel === 'K' ? `K ${F.fmt(j.K, 4)}` : j.lossModel === 'Cv' ? `Cv ${F.fmt(j.Cv, 4)}` : `Kv ${F.fmt(j.Kv, 4)}`);

  // right-click card of a junction that discharges out of the network (nozzle, exit valve)
  const dischargeInfo = (lossKey) => (add, r, c) => {
    add(t('network.info.discharged'), c.out(Math.abs(r.Q), 'volFlow'), true);
    add(t('network.info.inletStagnation'), c.out(r.P0in, 'pressure'), true);
    add(t(lossKey), c.out(r.dP, 'dp'));
    if (c.vr && Number.isFinite(c.vr.Cv)) add(t('network.info.cvEquivalent'), F.fmt(c.vr.Cv, 4));
  };

  // temperature of the gas a junction supplies, in the adiabatic model of the compressible mode (R-12); empty means the
  // temperature of the sources given with the gas
  function sourceTemperature(s, ctx) {
    if (!ctx.adiabatic) return;
    s.appendChild(ctx.f.qty(ctx.key, 'gasT', t('junctions.gasT.label'), 'temperature', { info: t('junctions.gasT.hint') }));
  }

  PumpIt.ui.junctionTypes.shared = { lossModelFields, lossSummary, dischargeInfo, sourceTemperature };
})(typeof window !== 'undefined' ? window : globalThis);
