// Dense Gaussian elimination with row equilibration and partial pivoting. A is n×n, row-major.
// Returns null when the matrix is singular.
(function (root) {
  const PumpIt = root.PumpIt;

  function solveDense(A, b, n) {
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = 0; k < n; k++) s = Math.max(s, Math.abs(A[i * n + k]));
      if (s === 0) return null;
      for (let k = 0; k < n; k++) A[i * n + k] /= s;
      b[i] /= s;
    }
    for (let c = 0; c < n; c++) {
      let piv = c, best = Math.abs(A[c * n + c]);
      for (let r = c + 1; r < n; r++) { const v = Math.abs(A[r * n + c]); if (v > best) { best = v; piv = r; } }
      if (best < 1e-13) return null;
      if (piv !== c) {
        for (let k = c; k < n; k++) { const t = A[c * n + k]; A[c * n + k] = A[piv * n + k]; A[piv * n + k] = t; }
        const t = b[c]; b[c] = b[piv]; b[piv] = t;
      }
      const d = A[c * n + c];
      for (let r = c + 1; r < n; r++) {
        const f = A[r * n + c] / d;
        if (f === 0) continue;
        for (let k = c; k < n; k++) A[r * n + k] -= f * A[c * n + k];
        b[r] -= f * b[c];
      }
    }
    const x = new Float64Array(n);
    for (let r = n - 1; r >= 0; r--) {
      let s = b[r];
      for (let k = r + 1; k < n; k++) s -= A[r * n + k] * x[k];
      x[r] = s / A[r * n + r];
    }
    return x;
  }

  PumpIt.solver = Object.assign(PumpIt.solver || {}, { solveDense });
})(typeof window !== 'undefined' ? window : globalThis);
