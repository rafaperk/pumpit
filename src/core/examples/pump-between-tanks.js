// Example: pumping between two tanks, with a 90 % speed scenario.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, q = M.q;
  const { model, steel, fit, text } = PumpIt.examples.builder;
  const x = (key) => text('pump', key);

  PumpIt.examples.register({
    id: 'pump', order: 10,
    build: () => model(x('title'), [
      [1, 'reservoir', 100, 300, { name: x('suctionTank'), elevation: q(0, 'm'), liquidElev: q(3, 'm'), pipeK: { 1: { kOut: 0.5, kIn: 1 } } }],
      [2, 'pump', 300, 300, {
        name: x('pump'), elevation: q(0, 'm'), mode: 'curve',
        curve: { x: [0, 40, 80, 120], y: [48, 46.5, 42, 34.5], xUnit: 'm³/h', yUnit: 'm', fit: '2' },
        eff: { x: [0, 40, 80, 120], y: [0, 58, 76, 70], xUnit: 'm³/h', fit: '2' },
        npshr: { x: [0, 40, 80, 120], y: [1.5, 2.0, 3.2, 5.0], xUnit: 'm³/h', yUnit: 'm', fit: '2' },
      }],
      [3, 'valve', 520, 180, { name: x('dischargeValve'), elevation: q(1, 'm'), lossModel: 'K', K: 0.14 }],
      [4, 'reservoir', 800, 100, { name: x('elevatedTank'), elevation: q(22, 'm'), liquidElev: q(25, 'm'), pipeK: { 3: { kOut: 0.5, kIn: 1 } } }],
    ], [
      [1, 1, 2, steel('6', 15, '40', [fit('elbow90', 2), fit('gateValve', 1)])],
      [2, 2, 3, steel('5', 8, '40', [fit('swingCheck', 1)])],
      [3, 3, 4, steel('5', 300, '40', [fit('elbow90', 6), fit('flangedBend', 2)])],
    ], (m) => {
      const s = M.addScenario(m, 'base', x('speedScenario'));
      s.overrides['j:2|speed'] = 90;
      s.notes = x('speedNotes');
    }),
  });
})(typeof window !== 'undefined' ? window : globalThis);
