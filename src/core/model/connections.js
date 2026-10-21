// Ends of a pipe (decisions E-01 to E-07 of docs/pipe-ends.md). Each end of a pipe is connected to a junction or
// loose: pipe.up or pipe.down is then null. A loose end keeps the pipe with all its data while it waits for a
// junction, and the checklist holds the calculation until both ends are connected. Where a loose end lies is drawing
// data (pipe.loose, one of the LAYOUT_KEYS of layout.js): its place on the schematic (x, y) and its elevation in metres
// (z), the height at which the 3D view draws it.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model;
  const U = PumpIt.units;

  const PIPE_ENDS = Object.freeze(['up', 'down']);
  const otherEnd = (end) => (end === 'up' ? 'down' : 'up');
  // a loose end leaves its junction this far towards the other end of the pipe (schematic units: two grid cells), and
  // never more than half the way
  const LOOSE_GAP = 40;

  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
  const isSpot = (s) => s !== null && typeof s === 'object' && isNum(s.x) && isNum(s.y) && isNum(s.z);
  const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
  const spot = (x, y, z) => ({ x: round(x, 2), y: round(y, 2), z: round(z, 6) });

  const isLoose = (p, end) => p[end] === null || p[end] === undefined;
  // the junction of an end, or null (a loose end)
  const junctionOf = (m, p, end) => (isLoose(p, end) ? null : m.junctions.find((j) => j.id === p[end]) || null);

  // elevation in metres of a junction (0 while it is undefined)
  function elevationOf(j) {
    try {
      const z = U.toSI(Number(j.elevation.value), j.elevation.unit, 'length');
      return Number.isFinite(z) ? z : 0;
    } catch (e) { return 0; }
  }

  // where an end is on the schematic, { x, y }: its junction, or its loose spot (null when neither is known)
  function endPoint(m, p, end) {
    const j = junctionOf(m, p, end);
    if (j) return { x: j.x, y: j.y };
    const s = p.loose && p.loose[end];
    return isSpot(s) ? { x: s.x, y: s.y } : null;
  }

  // The spot where the end of p goes when it leaves its junction: towards the other end of the pipe, LOOSE_GAP away
  // (at most half the way), or to the right of the junction when the other end is on top of it; at the elevation of the
  // junction. elevOf(j) gives that elevation in metres (the current scenario's); by default the model's own.
  function spotNear(m, p, end, elevOf = elevationOf) {
    const j = junctionOf(m, p, end);
    if (!j) return null;
    const o = endPoint(m, p, otherEnd(end));
    const dx = o ? o.x - j.x : 0, dy = o ? o.y - j.y : 0, L = Math.hypot(dx, dy);
    if (L < 1e-6) return spot(j.x + LOOSE_GAP, j.y, elevOf(j));
    const k = Math.min(LOOSE_GAP, L / 2) / L;
    return spot(j.x + dx * k, j.y + dy * k, elevOf(j));
  }

  // The end of p left loose at the spot s ({ x, y, z }). The pipe keeps everything else.
  function loosenEnd(p, end, s) {
    p[end] = null;
    p.loose = Object.assign({}, p.loose, { [end]: spot(s.x, s.y, s.z) });
  }

  // The end of p connected to the junction jid; false when that cannot be (a junction that is not in the model, or the
  // junction of the other end: a pipe joins two different junctions).
  function connectEnd(m, p, end, jid) {
    if (!m.junctions.some((j) => j.id === jid) || p[otherEnd(end)] === jid) return false;
    p[end] = jid;
    if (p.loose) {
      delete p.loose[end];
      if (!Object.keys(p.loose).length) delete p.loose;
    }
    return true;
  }

  // the two ends exchanged, with their loose spots (a reversed pipe)
  function swapEnds(p) {
    [p.up, p.down] = [p.down, p.up];
    if (!p.loose) return;
    const { up, down } = p.loose;
    p.loose = {};
    if (up) p.loose.down = up;
    if (down) p.loose.up = down;
  }

  // Ends of a loaded model: an end tied to a junction that is not in the model becomes loose, and every loose end gets
  // a spot (the one it had, or one next to the other end); the spots of connected ends are dropped.
  function normalizeEnds(m) {
    const ids = new Set(m.junctions.map((j) => j.id));
    for (const p of m.pipes) {
      const had = p.loose && typeof p.loose === 'object' ? p.loose : {};
      delete p.loose;
      for (const end of PIPE_ENDS) if (isLoose(p, end) || !ids.has(p[end])) p[end] = null;
      for (const end of PIPE_ENDS) {
        if (p[end] !== null) continue;
        if (isSpot(had[end])) { loosenEnd(p, end, had[end]); continue; }
        const o = p[otherEnd(end)] !== null ? junctionOf(m, p, otherEnd(end)) : null;
        const os = o ? { x: o.x, y: o.y, z: elevationOf(o) } : (p.loose && p.loose[otherEnd(end)]) || (isSpot(had[otherEnd(end)]) ? had[otherEnd(end)] : null);
        loosenEnd(p, end, os ? { x: os.x + 3 * LOOSE_GAP / 2, y: os.y, z: os.z } : { x: end === 'up' ? 0 : 3 * LOOSE_GAP / 2, y: 0, z: 0 });
      }
    }
    return m;
  }

  Object.assign(M, { PIPE_ENDS, otherEnd, LOOSE_GAP, isLoose, junctionOf, endPoint, spotNear, loosenEnd, connectEnd, swapEnds, normalizeEnds });
})(typeof window !== 'undefined' ? window : globalThis);
