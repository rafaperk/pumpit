// Energy cost of the pumps in the time simulation (docs/time-simulation.md, §9.5 of its specification): a tariff by the
// hour of the day, in steps, that repeats every day. The cost of a step is the energy of the step times the price at its
// time, with the rule of integration of the other totals (§6.3). The currency is only a label.
//
//   solution.time.tariff = { use, currency, t: [times of the day], v: [price per kWh], tUnit }
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units;
  const DAY = 86400, KWH = 3.6e6;

  // what is wrong with a tariff, as keys under core.checklist.time: its first time is 0, the times rise and stay within
  // the day, the prices are not negative
  function check(tf) {
    const ok = tf && Array.isArray(tf.t) && Array.isArray(tf.v) && tf.t.length >= 1 && tf.t.length === tf.v.length
      && U.has('time', tf.tUnit) && tf.t.every(Number.isFinite) && tf.v.every(Number.isFinite);
    if (!ok) return ['tariff'];
    const s = tf.t.map((x) => U.toSI(x, tf.tUnit, 'time'));
    const rising = s.every((x, i) => i === 0 || x > s[i - 1]);
    if (s[0] !== 0 || !rising || s[s.length - 1] >= DAY || tf.v.some((x) => x < 0)) return ['tariff'];
    return typeof tf.currency === 'string' ? [] : ['tariff'];
  }

  // a tariff in use, in seconds of the day; null when off or incomplete
  function prepare(tf) {
    if (!tf || !tf.use || check(tf).length) return null;
    return { hs: tf.t.map((x) => U.toSI(x, tf.tUnit, 'time')), ps: tf.v.slice(), currency: tf.currency.trim() };
  }

  // the price per kWh at the time t: that of the last step of the day that began at or before it
  function priceAt(T, t) {
    const s = ((t % DAY) + DAY) % DAY;
    let i = 0;
    while (i < T.hs.length - 1 && T.hs[i + 1] <= s) i++;
    return T.ps[i];
  }

  // the cost of the energy of an interval w (s) at the power p (W) and the time t
  const of = (T, w, p, t) => (w * p * priceAt(T, t)) / KWH;

  // the totals of the cost: of every pump, of the network and, when the run lasts a whole number of days, a year of it
  function finish(totals, P) {
    if (!P.tariff) return;
    let total = 0;
    for (const id in totals.pumps) total += totals.pumps[id].cost || 0;
    const days = (P.tf - P.t0) / DAY;
    const whole = days >= 1 && Math.abs(days - Math.round(days)) < 1e-9;
    totals.cost = { currency: P.tariff.currency, total, days, annual: whole ? (total * 365) / Math.round(days) : NaN };
  }

  PumpIt.time = Object.assign(PumpIt.time || {}, { cost: { DAY, KWH, check, prepare, priceAt, of, finish } });
})(typeof window !== 'undefined' ? window : globalThis);
