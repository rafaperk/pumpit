// Example: a compressed air line in the compressible mode (appendix D of the compressible mode specification): a vessel
// at 5 bar(a) after the compressor feeds two consumers at 2.5 and 2.0 bar(a); the pressure falls by about half on the
// way, so the gas is clearly compressible (§5). Air at 300 K, isothermal model; a scenario with the adiabatic model.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, q = M.q;
  const { model, plain, text } = PumpIt.examples.builder;
  const x = (key) => text('air', key);

  PumpIt.examples.register({
    id: 'air', order: 80,
    build: () => model(x('title'), [
      [1, 'reservoir', 80, 200, { name: x('compressor'), elevation: q(0, 'm'), liquidElev: q(0, 'm'), surfP: q(5, 'bar(a)') }],
      [2, 'branch', 360, 200, { name: x('branch'), elevation: q(0, 'm') }],
      [3, 'pressure', 620, 120, { name: x('consumerA'), elevation: q(0, 'm'), P: q(2.5, 'bar(a)'), ptype: 'static' }],
      [4, 'pressure', 620, 300, { name: x('consumerB'), elevation: q(0, 'm'), P: q(2, 'bar(a)'), ptype: 'static' }],
    ], [
      [1, 1, 2, plain(100, 200)],
      [2, 2, 3, plain(80, 150)],
      [3, 2, 4, plain(80, 180)],
    ], (m) => {
      Object.assign(m.system, { regime: 'compressible', gasMode: 'isothermal' });
      m.system.fluidGas = Object.assign(M.newGasFluid(), { gas: 'air', T: q(300, 'K') });
      // the same line with the adiabatic model, for comparison
      const s = M.addScenario(m, 'base', x('adiabaticScenario'));
      s.overrides['sys|gasMode'] = 'adiabatic';
      s.notes = x('adiabaticNotes');
    }),
  });
})(typeof window !== 'undefined' ? window : globalThis);
