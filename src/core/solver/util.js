// Small helpers shared by the solver stages and by the junction types.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units;

  const GAL_MIN = U.CATS.volFlow.gpm; // m³/s per gpm
  const KGF = 98066.5;                 // Pa per kgf/cm²

  // compact number for warning texts
  const fmtSI = (v) => (Math.abs(v) >= 100 ? v.toFixed(1) : Math.abs(v) >= 1 ? v.toFixed(3) : v.toPrecision(3));

  // dynamic pressure ½ρV² of a pipe (all parallel tubes) for a total mass flow m, and its derivative
  const dynOf = (P, rho, m) => { if (!P) return 0; const A = P.A * P.N; return m * m / (2 * rho * A * A); };
  const dynDer = (P, rho, m) => { if (!P) return 0; const A = P.A * P.N; return m / (rho * A * A); };

  // object label for the iteration history
  function describe(o) {
    if (o.kind === 'pipe') return 'P' + o.pid;
    if (o.jid !== undefined) return 'J' + o.jid;
    return '';
  }

  PumpIt.solver = Object.assign(PumpIt.solver || {}, { util: { GAL_MIN, KGF, fmtSI, dynOf, dynDer, describe } });
})(typeof window !== 'undefined' ? window : globalThis);
