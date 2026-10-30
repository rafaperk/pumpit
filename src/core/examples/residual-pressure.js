// Example: pumping to a delivery point with a residual pressure (exit valve).
(function (root) {
  const PumpIt = root.PumpIt;
  const q = PumpIt.model.q;
  const { model, steel, fit, text } = PumpIt.examples.builder;
  const x = (key) => text('exit', key);

  PumpIt.examples.register({
    id: 'exit', order: 20,
    build: () => model(x('title'), [
      [1, 'reservoir', 100, 320, { name: x('suctionWell'), elevation: q(0, 'm'), liquidElev: q(2, 'm'), pipeK: { 1: { kOut: 0.5, kIn: 1 } } }],
      [2, 'pump', 320, 320, {
        name: x('pump'), elevation: q(0, 'm'), mode: 'curve',
        curve: { x: [0, 30, 60, 90], y: [45, 43.5, 39, 31.5], xUnit: 'm³/h', yUnit: 'm', fit: '2' },
        eff: { x: [0, 30, 60, 90], y: [0, 55, 72, 66], xUnit: 'm³/h', fit: '2' },
      }],
      [3, 'exitvalve', 700, 140, { name: x('deliveryPoint'), elevation: q(18, 'm'), Pout: q(1.5, 'kgf/cm²(g)'), lossModel: 'K', K: 0 }],
    ], [
      [1, 1, 2, steel('4', 10, '40', [fit('footValve', 1)])],
      [2, 2, 3, steel('3', 200, '40', [fit('elbow90', 4), fit('swingCheck', 1), fit('gateValve', 1)])],
    ]),
  });
})(typeof window !== 'undefined' ? window : globalThis);
