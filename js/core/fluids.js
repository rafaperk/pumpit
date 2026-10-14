// Propriedades de fluidos a partir de correlações públicas (nunca de bancos de terceiros).
// Escoamento sempre incompressível: o fluido fornece ρ, μ e, para avisos de cavitação, Pv.
(function (root) {
  const HR = (root.HR = root.HR || {});
  const U = HR.units;

  // Densidade da água líquida a 1 atm — Kell, G. S. (1975), J. Chem. Eng. Data 20(1). Válida de 0 a 150 °C.
  function waterDensity(Tc) {
    const t = Tc;
    const num = 999.83952 + 16.945176 * t - 7.9870401e-3 * t * t - 46.170461e-6 * t ** 3
      + 105.56302e-9 * t ** 4 - 280.54253e-12 * t ** 5;
    return num / (1 + 16.879850e-3 * t);
  }

  // Viscosidade dinâmica da água — equação de Vogel, μ[mPa·s] = exp(A + B/(C + T[K])).
  function waterViscosity(Tc) {
    const T = Tc + 273.15;
    return Math.exp(-3.7188 + 578.919 / (-137.546 + T)) * 1e-3; // Pa·s
  }

  // Pressão de saturação da água — IAPWS-IF97, região 4 (equação de saturação). T em K, resultado em Pa.
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

  const LIBRARY = {
    water: {
      label: 'Água (correlações públicas)',
      range: [0, 150], // °C
      sources: 'Densidade: Kell (1975). Viscosidade: Vogel. Pressão de vapor: IAPWS-IF97 região 4.',
      rho: waterDensity, mu: waterViscosity, pv: waterVaporPressure,
    },
  };

  // system.fluid: { kind: 'water', T } | { kind: 'user', name, rho, mu, pv? }
  function evaluate(system) {
    const fl = system.fluid;
    const warnings = [];
    if (fl.kind === 'user') {
      const rho = U.toSI(fl.rho.value, fl.rho.unit, 'density');
      const mu = U.toSI(fl.mu.value, fl.mu.unit, 'viscosity');
      const pv = fl.pv && Number.isFinite(fl.pv.value) && fl.pv.value !== null
        ? U.toSI(fl.pv.value, fl.pv.unit, 'pressure') : NaN;
      return { name: fl.name || 'Fluido do usuário', rho, mu, pv, T: NaN, warnings };
    }
    const lib = LIBRARY[fl.kind];
    if (!lib) throw new Error('Fluido desconhecido: ' + fl.kind);
    const Tk = U.toSI(fl.T.value, fl.T.unit, 'temperature');
    const Tc = Tk - 273.15;
    if (Tc < lib.range[0] || Tc > lib.range[1]) {
      warnings.push({ level: 'warning', text: `Temperatura ${Tc.toFixed(1)} °C fora da faixa válida das correlações (${lib.range[0]}–${lib.range[1]} °C).` });
    }
    return { name: lib.label, rho: lib.rho(Tc), mu: lib.mu(Tc), pv: lib.pv(Tc), T: Tk, warnings };
  }

  HR.fluids = { LIBRARY, evaluate, waterDensity, waterViscosity, waterVaporPressure };
})(typeof window !== 'undefined' ? window : globalThis);
