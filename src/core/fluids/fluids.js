// Fluid library. Flow is always incompressible: a fluid supplies ρ, μ and, for cavitation warnings, Pv.
// Library fluids register themselves (one file per fluid, built from public correlations only, never from
// third-party databases); a user-defined fluid gives ρ, μ and Pv directly.
(function (root) {
  const PumpIt = (root.PumpIt = root.PumpIt || {});
  const U = PumpIt.units;
  const { t } = PumpIt.i18n;

  // kind → { label, range [°C], sources, rho(Tc), mu(Tc), pv(Tc) }; label and sources are usually getters reading
  // the language catalogs
  const LIBRARY = {};
  function register(kind, def) { LIBRARY[kind] = def; }

  // system.fluid: { kind: 'water', T } | { kind: 'user', name, rho, mu, pv? }
  function evaluate(system) {
    const fl = system.fluid;
    const warnings = [];
    if (fl.kind === 'user') {
      const rho = U.toSI(fl.rho.value, fl.rho.unit, 'density');
      const mu = U.toSI(fl.mu.value, fl.mu.unit, 'viscosity');
      const pv = fl.pv && Number.isFinite(fl.pv.value) && fl.pv.value !== null
        ? U.toSI(fl.pv.value, fl.pv.unit, 'pressure') : NaN;
      return { name: fl.name || t('core.fluids.userFluid'), rho, mu, pv, T: NaN, warnings };
    }
    const lib = LIBRARY[fl.kind];
    if (!lib) throw new Error(t('core.fluids.unknown', { kind: fl.kind }));
    const Tk = U.toSI(fl.T.value, fl.T.unit, 'temperature');
    const Tc = Tk - 273.15;
    if (Tc < lib.range[0] || Tc > lib.range[1]) {
      warnings.push({ level: 'warning', text: t('core.fluids.outOfRange', { T: Tc.toFixed(1), min: lib.range[0], max: lib.range[1] }) });
    }
    return { name: lib.label, rho: lib.rho(Tc), mu: lib.mu(Tc), pv: lib.pv(Tc), T: Tk, warnings };
  }

  PumpIt.fluids = Object.assign(PumpIt.fluids || {}, { LIBRARY, register, evaluate });
})(typeof window !== 'undefined' ? window : globalThis);
