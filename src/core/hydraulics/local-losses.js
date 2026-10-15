// Local loss coefficients (K referred to the upstream area) — specification section 6.
(function (root) {
  const PumpIt = root.PumpIt;

  // orifice (Idelchik): sharp-edged or rounded (r = edge radius, Do = orifice diameter)
  function orificeK(Aup, Adown, Ao, kind, r, Do) {
    const ru = Ao / Aup, rd = Ao / Adown, s = (Aup / Ao) ** 2;
    if (kind === 'sharp') return s * (0.707 * (1 - ru) ** 0.375 + 1 - rd) ** 2;
    const Kp = 0.03 + 0.47 * 10 ** (-7.7 * (r / Do));
    if (Math.abs(Aup - Adown) < 1e-9 * Aup) return s * (1 - ru + Math.sqrt(Kp) * (1 - ru) ** 0.75) ** 2;
    return s * (Kp * (1 - ru) ** 0.75 + (1 - rd) ** 2 + 2 * (1 - rd) * Math.sqrt(Kp * (1 - ru) ** 0.375));
  }

  PumpIt.hyd = Object.assign(PumpIt.hyd || {}, { orificeK });
})(typeof window !== 'undefined' ? window : globalThis);
