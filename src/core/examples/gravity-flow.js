// Example: gravity flow between two tanks through a valve.
(function (root) {
  const PumpIt = root.PumpIt;
  const q = PumpIt.model.q;
  const { model, steel, fit, text } = PumpIt.examples.builder;
  const x = (key) => text('gravity', key);

  PumpIt.examples.register({
    id: 'gravity', order: 30,
    build: () => model(x('title'), [
      [1, 'reservoir', 120, 140, { name: x('dam'), elevation: q(45, 'm'), liquidElev: q(50, 'm'), pipeK: { 1: { kOut: 0.5, kIn: 1 } } }],
      [2, 'valve', 420, 260, { name: x('valve'), elevation: q(25, 'm'), lossModel: 'K', K: 0.15 }],
      [3, 'reservoir', 720, 360, { name: x('tank'), elevation: q(18, 'm'), liquidElev: q(20, 'm'), pipeK: { 2: { kOut: 0.5, kIn: 1 } } }],
    ], [
      [1, 1, 2, steel('4', 300, '40', [fit('elbow90', 2)])],
      [2, 2, 3, steel('4', 200, '40', [fit('elbow90', 2)])],
    ]),
  });
})(typeof window !== 'undefined' ? window : globalThis);
