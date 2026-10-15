// Example: pressure-reducing valve feeding a demand, with a peak-demand scenario.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, q = M.q;
  const { model, steel, text } = PumpIt.examples.builder;
  const x = (key) => text('prv', key);

  PumpIt.examples.register({
    id: 'prv', order: 60,
    build: () => model(x('title'), [
      [1, 'reservoir', 100, 140, { name: x('highReservoir'), elevation: q(115, 'm'), liquidElev: q(120, 'm') }],
      [2, 'control', 420, 260, { name: x('prv'), elevation: q(0, 'm'), ctype: 'PRV', setP: q(3, 'kgf/cm²(g)'), basis: 'static', alwaysControl: false, kOpen: 0.5 }],
      [3, 'flow', 720, 260, { name: x('demand'), elevation: q(0, 'm'), Q: q(80, 'm³/h'), dir: 'out' }],
    ], [
      [1, 1, 2, steel('6', 1000)],
      [2, 2, 3, steel('6', 200)],
    ], (m) => {
      const s = M.addScenario(m, 'base', x('peakScenario'));
      s.overrides['j:3|Q'] = q(300, 'm³/h');
      s.notes = x('peakNotes');
    }),
  });
})(typeof window !== 'undefined' ? window : globalThis);
