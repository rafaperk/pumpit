// Gases of the compressible mode (R-10, R-11): molar mass, ratio of specific heats and viscosity of a few common
// gases, from public reference values written down from scratch — molar masses from the standard atomic weights, k of
// the ideal gas near room temperature, and the viscosity by Sutherland's law with textbook constants. A custom gas
// gives MW, k and μ itself. The compressibility factor Z is always the user's (1 for an ideal gas).
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units;
  const { t } = PumpIt.i18n;

  const Ru = 8314.462618; // J/(kmol·K)
  const T_REF = 273.15;   // K, reference temperature of the Sutherland constants

  // id, MW [kg/kmol], k, μ at 273.15 K [Pa·s], Sutherland constant S [K]; the name comes from core.fluids.gases.<id>
  const gas = (id, MW, k, mu0, S) => ({ id, MW, k, mu0, S, get label() { return t('core.fluids.gases.' + id); } });
  const GASES = [
    gas('air', 28.9647, 1.4, 1.716e-5, 110.4),
    gas('nitrogen', 28.0134, 1.4, 1.663e-5, 106.7),
    gas('oxygen', 31.9988, 1.395, 1.919e-5, 139),
    gas('methane', 16.043, 1.31, 1.03e-5, 160),
    gas('naturalGas', 17.4, 1.3, 1.03e-5, 160),
    gas('carbonDioxide', 44.0095, 1.29, 1.37e-5, 222),
    gas('hydrogen', 2.01588, 1.41, 8.411e-6, 97),
  ];
  const byId = (id) => GASES.find((g) => g.id === id) || null;
  // range of temperatures where the library values are trusted (°C)
  const RANGE = [-100, 500];

  // viscosity of a library gas at T [K] (Sutherland)
  const sutherland = (g, T) => g.mu0 * Math.pow(T / T_REF, 1.5) * (T_REF + g.S) / (T + g.S);

  // the gas of a model (system.fluidGas): { name, MW, k, Z, mu, T [K], R, lib, warnings }; throws on invalid data
  function evaluateGas(system) {
    const f = system.fluidGas || {};
    const warnings = [];
    const T = f.T && Number.isFinite(f.T.value) ? U.toSI(f.T.value, f.T.unit, 'temperature') : NaN;
    const lib = byId(f.gas);
    let MW, k, mu, name;
    if (lib) {
      ({ MW, k } = lib);
      mu = sutherland(lib, T);
      name = lib.label;
      const Tc = T - 273.15;
      if (Tc < RANGE[0] || Tc > RANGE[1]) warnings.push({ level: 'warning', text: t('core.fluids.outOfRange', { T: Tc.toFixed(1), min: RANGE[0], max: RANGE[1] }) });
    } else {
      MW = f.MW; k = f.k;
      mu = f.mu && Number.isFinite(f.mu.value) ? U.toSI(f.mu.value, f.mu.unit, 'viscosity') : NaN;
      name = f.name || t('core.fluids.customGas');
    }
    const Z = f.Z;
    if (!(MW > 0) || !(k > 1) || !(Z > 0) || !(mu > 0) || !(T > 0)) throw new Error(t('core.gas.badGas'));
    return { name, MW, k, Z, mu, T, R: Ru / MW, lib: !!lib, warnings };
  }

  // density of a gas at "normal" conditions (0 °C and 101.325 kPa, as an ideal gas: decision G-15)
  const NORMAL = { T: 273.15, P: 101325 };
  const normalDensity = (MW) => NORMAL.P * MW / (Ru * NORMAL.T);

  PumpIt.fluids = Object.assign(PumpIt.fluids || {}, { GASES, gasById: byId, sutherland, evaluateGas, GAS_RANGE: RANGE, NORMAL, normalDensity });
})(typeof window !== 'undefined' ? window : globalThis);
