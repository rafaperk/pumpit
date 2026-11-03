// Tables of the time simulation (docs/time-simulation.md, §4.3 of its specification): the value of a table of points
// (τ, v) at a time τ, linear or stepwise between the points, and past the last one repeated, held or extrapolated.
// A table is typed like the curves of Pump It (a list of numbers per column and a unit per column) and converted to SI
// once, when the simulation is prepared.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units;

  // a table as typed → { t: [s], c: [values in the interpolation space], n }. q: the quantity the table drives (its unit
  // category, its interpolation space); basis 'relative': the values are % of the steady value (SI) of that quantity
  function prepare(tt, q, { basis, steady, ctx }) {
    const t = tt.t.map((x) => U.toSI(x, tt.tUnit, 'time'));
    const v = basis === 'relative' ? tt.v.map((x) => (x / 100) * steady) : tt.v.map((x) => U.toSI(x, tt.vUnit, q.cat, ctx));
    const c = q.space ? v.map(q.space.to) : v;
    return { t, c, n: t.length, space: q.space || null, min: q.min };
  }

  // value of the interpolation between two points a and b at the fraction f; an infinite value (the capacity of a valve
  // with K = 0) wins over any finite one between the points
  function lerp(a, b, f) {
    if (f <= 0) return a;
    if (f >= 1) return b;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
    return a + (b - a) * f;
  }

  // the last point whose time is not after τ (τ ≥ t[0]); with two points at the same time it is the second one
  function lastAtOrBefore(t, tau) {
    let lo = 0, hi = t.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (t[mid] <= tau) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  // value of a prepared table at τ (SI): { v, past } where past is '' inside the table, 'held' past the last point
  // without repetition (the last value) or 'extrapolated' (the line of the last two points, limited to the domain of the
  // quantity). o = { repeat, interp ('linear' | 'step'), dataEnd ('hold' | 'extrapolate') }
  function valueAt(T, tau, o) {
    const { t, c, n } = T;
    let past = '';
    let x;
    if (n === 1) x = c[0];
    else if (tau < t[0]) x = c[0];
    else if (tau > t[n - 1] && o.repeat && t[n - 1] > t[0]) {
      const P = t[n - 1] - t[0];
      x = inside(T, t[0] + (((tau - t[0]) % P) + P) % P, o);
    } else if (tau > t[n - 1]) {
      const dt = t[n - 1] - t[n - 2];
      const slope = dt > 0 ? (c[n - 1] - c[n - 2]) / dt : NaN;
      if (o.dataEnd === 'extrapolate' && Number.isFinite(slope)) {
        x = c[n - 1] + slope * (tau - t[n - 1]);
        past = 'extrapolated';
      } else { x = c[n - 1]; past = 'held'; }
    } else x = inside(T, tau, o);
    let v = T.space ? T.space.from(x) : x;
    if (past === 'extrapolated') v = limit(T, v);
    return { v, past };
  }

  function inside(T, tau, o) {
    const { t, c, n } = T;
    const i = lastAtOrBefore(t, tau);
    if (i >= n - 1 || o.interp === 'step') return c[i];
    return lerp(c[i], c[i + 1], (tau - t[i]) / (t[i + 1] - t[i]));
  }

  // an extrapolated value stays in the domain of its quantity (a flow, a speed, a Cv, an area are not negative)
  const limit = (T, v) => (Number.isFinite(T.min) && v < T.min ? T.min : v);

  PumpIt.time = Object.assign(PumpIt.time || {}, { tables: { prepare, valueAt } });
})(typeof window !== 'undefined' ? window : globalThis);
