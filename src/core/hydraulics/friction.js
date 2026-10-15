// Friction correlations (specification section 5).
(function (root) {
  const PumpIt = root.PumpIt;

  // Colebrook in its original form (constants 1.14 and 9.35); returns the Darcy f
  function colebrook(Re, eD) {
    let x = 1.14 - 2 * Math.log10(eD + 9.35 / (Re * Math.sqrt(0.02))); // x = 1/√f, starting from f = 0.02
    for (let i = 0; i < 60; i++) {
      const xn = 1.14 - 2 * Math.log10(eD + (9.35 * x) / Re);
      if (Math.abs(xn - x) < 1e-13 * xn) return 1 / (xn * xn);
      x = xn;
    }
    return 1 / (x * x);
  }

  // Darcy f: 64/Re below Re_lam, Colebrook above Re_turb, linear interpolation between f_lam(Re_lam) and f_turb(Re_turb)
  function frictionFactor(Re, eD, reLam = 2300, reTurb = 4000) {
    if (Re < reLam) return 64 / Re;
    if (Re > reTurb) return colebrook(Re, eD);
    const w = (Re - reLam) / (reTurb - reLam);
    return (1 - w) * (64 / reLam) + w * colebrook(reTurb, eD);
  }

  // fully turbulent limit (Re → ∞) of the original Colebrook
  function fullyTurbulent(eD) {
    if (eD <= 0) return NaN;
    const x = 1.14 - 2 * Math.log10(eD);
    return 1 / (x * x);
  }

  // Crane f_T for any inside diameter: clean commercial steel (ε = 0.0018 in), fully turbulent
  const EPS_CRANE = 0.0018 * 0.0254;
  const craneFT = (Dm) => fullyTurbulent(EPS_CRANE / Dm);

  // Hazen-Williams: V = k·C·Rh^0.63·S^0.54 (SI) → S (m/m). Classic exponents; k = 0.848684 was calibrated
  // against recorded reference results (inferred; the classic 0.8492 gives a loss about 0.1% lower)
  const HW_K = 0.848684;
  function hazenWilliamsS(V, C, Dh) {
    const Rh = Dh / 4;
    return Math.pow(Math.abs(V) / (HW_K * C * Math.pow(Rh, 0.63)), 1 / 0.54);
  }

  PumpIt.hyd = Object.assign(PumpIt.hyd || {}, { colebrook, frictionFactor, fullyTurbulent, craneFT, EPS_CRANE, hazenWilliamsS, HW_K });
})(typeof window !== 'undefined' ? window : globalThis);
