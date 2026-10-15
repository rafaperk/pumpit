// Example: the classic three-reservoir problem.
(function (root) {
  const PumpIt = root.PumpIt;
  const q = PumpIt.model.q;
  const { model, plain, text } = PumpIt.examples.builder;
  const x = (key) => text('threeRes', key);

  PumpIt.examples.register({
    id: 'threeRes', order: 40,
    build: () => model(x('title'), [
      [1, 'reservoir', 100, 120, { name: 'R-A', elevation: q(95, 'm'), liquidElev: q(100, 'm') }],
      [2, 'reservoir', 700, 120, { name: 'R-B', elevation: q(75, 'm'), liquidElev: q(80, 'm') }],
      [3, 'reservoir', 700, 420, { name: 'R-C', elevation: q(35, 'm'), liquidElev: q(40, 'm') }],
      [4, 'branch', 400, 270, { name: x('junction'), elevation: q(60, 'm') }],
    ], [
      [1, 1, 4, plain(300, 1000, (f) => { f.model = 'roughness'; f.eps = q(0.26, 'mm'); })],
      [2, 4, 2, plain(250, 800, (f) => { f.model = 'roughness'; f.eps = q(0.26, 'mm'); })],
      [3, 4, 3, plain(200, 1200, (f) => { f.model = 'roughness'; f.eps = q(0.26, 'mm'); })],
    ]),
  });
})(typeof window !== 'undefined' ? window : globalThis);
