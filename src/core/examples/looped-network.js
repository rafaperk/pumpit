// Example: looped distribution network with Hazen-Williams friction.
(function (root) {
  const PumpIt = root.PumpIt;
  const q = PumpIt.model.q;
  const { model, plain, text } = PumpIt.examples.builder;
  const x = (key) => text('loop', key);

  PumpIt.examples.register({
    id: 'loop', order: 50,
    build: () => {
      const hw = (f) => { f.model = 'hw'; f.C = 130; };
      const src = (v) => ({ source: q(-v, 'm³/h') });
      return model(x('title'), [
        [1, 'reservoir', 80, 120, { name: x('reservoir'), elevation: q(55, 'm'), liquidElev: q(60, 'm') }],
        [2, 'branch', 260, 220, Object.assign({ name: 'N2', elevation: q(20, 'm') }, src(0))],
        [3, 'branch', 460, 220, Object.assign({ name: 'N3', elevation: q(18, 'm') }, src(40))],
        [4, 'branch', 660, 220, Object.assign({ name: 'N4', elevation: q(15, 'm') }, src(30))],
        [5, 'branch', 260, 400, Object.assign({ name: 'N5', elevation: q(20, 'm') }, src(25))],
        [6, 'branch', 460, 400, Object.assign({ name: 'N6', elevation: q(17, 'm') }, src(45))],
        [7, 'branch', 660, 400, Object.assign({ name: 'N7', elevation: q(14, 'm') }, src(35))],
      ], [
        [1, 1, 2, plain(250, 300, hw)],
        [2, 2, 3, plain(200, 400, hw)],
        [3, 3, 4, plain(150, 400, hw)],
        [4, 2, 5, plain(200, 300, hw)],
        [5, 5, 6, plain(150, 400, hw)],
        [6, 6, 7, plain(100, 400, hw)],
        [7, 3, 6, plain(100, 300, hw)],
        [8, 4, 7, plain(100, 300, hw)],
      ]);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
