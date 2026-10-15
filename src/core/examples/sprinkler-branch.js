// Example: a sprinkler branch line fed at a fixed pressure.
(function (root) {
  const PumpIt = root.PumpIt;
  const q = PumpIt.model.q;
  const { model, steel, fit, text } = PumpIt.examples.builder;
  const x = (key) => text('sprinkler', key);

  PumpIt.examples.register({
    id: 'sprinkler', order: 70,
    build: () => model(x('title'), [
      [1, 'pressure', 80, 260, { name: x('supply'), elevation: q(0, 'm'), P: q(5, 'kgf/cm²(g)') }],
      [2, 'branch', 300, 260, { name: x('branch1'), elevation: q(3, 'm') }],
      [3, 'spray', 300, 90, { name: x('sprinkler1'), elevation: q(3, 'm'), sprayModel: 'K', Kf: q(80, 'L/min/bar½') }],
      [4, 'branch', 520, 260, { name: x('branch2'), elevation: q(3, 'm') }],
      [5, 'spray', 520, 90, { name: x('sprinkler2'), elevation: q(3, 'm'), sprayModel: 'K', Kf: q(80, 'L/min/bar½') }],
      [6, 'spray', 740, 260, { name: x('sprinkler3'), elevation: q(3, 'm'), sprayModel: 'K', Kf: q(80, 'L/min/bar½') }],
    ], [
      [1, 1, 2, steel('2', 30, '40', [fit('elbow90', 3)])],
      [2, 2, 3, steel('1', 2, '40', [fit('teeBranch', 1)])],
      [3, 2, 4, steel('1 1/2', 4, '40', [fit('teeRun', 1)])],
      [4, 4, 5, steel('1', 2, '40', [fit('teeBranch', 1)])],
      [5, 4, 6, steel('1', 4)],
    ]),
  });
})(typeof window !== 'undefined' ? window : globalThis);
