// Liquid water from public correlations.
(function (root) {
  const PumpIt = root.PumpIt;

  // Density of liquid water at 1 atm — Kell, G. S. (1975), J. Chem. Eng. Data 20(1). Valid from 0 to 150 °C.
  function waterDensity(Tc) {
    const t = Tc;
    const num = 999.83952 + 16.945176 * t - 7.9870401e-3 * t * t - 46.170461e-6 * t ** 3
      + 105.56302e-9 * t ** 4 - 280.54253e-12 * t ** 5;
    return num / (1 + 16.879850e-3 * t);
  }

  // Dynamic viscosity of water — Vogel equation, μ[mPa·s] = exp(A + B/(C + T[K])).
  function waterViscosity(Tc) {
    const T = Tc + 273.15;
    return Math.exp(-3.7188 + 578.919 / (-137.546 + T)) * 1e-3; // Pa·s
  }

  // Saturation pressure of water — IAPWS-IF97, region 4 (saturation equation). T in K, result in Pa.
  const N4 = [0.11670521452767e4, -0.72421316703206e6, -0.17073846940092e2, 0.12020824702470e5,
    -0.32325550322333e7, 0.14915108613530e2, -0.48232657361591e4, 0.40511340542057e6,
    -0.23855557567849, 0.65017534844798e3];
  function waterVaporPressure(Tc) {
    const T = Tc + 273.15;
    if (T < 273.15 || T > 647.096) return NaN;
    const th = T + N4[8] / (T - N4[9]);
    const A = th * th + N4[0] * th + N4[1];
    const B = N4[2] * th * th + N4[3] * th + N4[4];
    const C = N4[5] * th * th + N4[6] * th + N4[7];
    return (2 * C / (-B + Math.sqrt(B * B - 4 * A * C))) ** 4 * 1e6;
  }

  PumpIt.fluids.register('water', {
    get label() { return PumpIt.i18n.t('core.fluids.water.label'); },
    range: [0, 150], // °C
    get sources() { return PumpIt.i18n.t('core.fluids.water.sources'); },
    rho: waterDensity, mu: waterViscosity, pv: waterVaporPressure,
  });
  Object.assign(PumpIt.fluids, { waterDensity, waterViscosity, waterVaporPressure });
})(typeof window !== 'undefined' ? window : globalThis);
