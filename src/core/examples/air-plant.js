// Example: a compressed air plant in the compressible mode. The compressor draws air from the atmosphere at a fixed
// pressure ratio, a pressure-reducing valve keeps the header at 6 bar(g), and the header feeds two groups of machines
// (flows in Nm³/h) and a blow-off nozzle to the atmosphere, which chokes. Isothermal model: an aftercooler brings the air
// back to the room temperature, and the compressor still reports the temperature at its discharge.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, q = M.q;
  const { model, steel, text } = PumpIt.examples.builder;
  const x = (key) => text('airPlant', key);

  PumpIt.examples.register({
    id: 'airPlant', order: 90,
    build: () => model(x('title'), [
      [1, 'reservoir', 60, 220, { name: x('intake'), elevation: q(0, 'm'), liquidElev: q(0, 'm'), surfP: q(0, 'bar(g)') }],
      [2, 'pump', 240, 220, { name: x('compressor'), elevation: q(0, 'm'), mode: 'ratio', ratio: 8, etaGas: 78 }],
      [3, 'control', 440, 220, { name: x('prv'), elevation: q(0, 'm'), ctype: 'PRV', setP: q(6, 'bar(g)'), basis: 'static', kOpen: 2 }],
      [4, 'branch', 620, 220, { name: x('header'), elevation: q(0, 'm') }],
      [5, 'flow', 800, 100, { name: x('machinesA'), elevation: q(0, 'm'), Q: q(400, 'Nm³/h'), dir: 'out' }],
      [6, 'flow', 800, 340, { name: x('machinesB'), elevation: q(0, 'm'), Q: q(250, 'Nm³/h'), dir: 'out' }],
      [7, 'spray', 620, 420, { name: x('blowoff'), elevation: q(0, 'm'), sprayModel: 'CdA', Cd: 0.8, dHole: q(6, 'mm'), nHoles: 1, Pext: q(0, 'bar(g)') }],
    ], [
      [1, 1, 2, steel('4', 6)],
      [2, 2, 3, steel('3', 15)],
      [3, 3, 4, steel('3', 40)],
      [4, 4, 5, steel('2', 60)],
      [5, 4, 6, steel('1 1/2', 50)],
      [6, 4, 7, steel('1', 10)],
    ], (m) => {
      Object.assign(m.system, { regime: 'compressivel', gasMode: 'isotermico' });
      m.system.fluidGas = Object.assign(M.newGasFluid(), { gas: 'air', T: q(25, '°C') });
    }),
  });
})(typeof window !== 'undefined' ? window : globalThis);
