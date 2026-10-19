// 3D views: grids (3D views specification §8.5 and §8.6), returned as screen segments ready to draw.
(function (root) {
  const PumpIt = root.PumpIt;
  const { AX, project, screenVec, clipNear } = PumpIt.view3d;

  // the line p + t·d clipped to the rectangle [0, w] × [0, h]: [x1, y1, x2, y2], or null
  function clipLineToRect(p, d, w, h) {
    let t0 = -Infinity;
    let t1 = Infinity;
    for (const [pi, di, max] of [[p[0], d[0], w], [p[1], d[1], h]]) {
      if (Math.abs(di) < 1e-12) { if (pi < 0 || pi > max) return null; continue; }
      const ta = -pi / di;
      const tb = (max - pi) / di;
      t0 = Math.max(t0, Math.min(ta, tb));
      t1 = Math.min(t1, Math.max(ta, tb));
    }
    if (!(t0 <= t1)) return null;
    return [p[0] + t0 * d[0], p[1] + t0 * d[1], p[0] + t1 * d[0], p[1] + t1 * d[1]];
  }

  // Isometric screen grid: the projection of the integer points of the world, which in the isometric view is a 2D
  // lattice. Three families of lines anchored at the world origin, along the screen directions of X, Y and Z (the
  // vertical), so every projected integer point lies on one line of each family. A family whose lines would be
  // closer than minGapPx keeps only the major lines, or is left out when even those do not fit.
  // Returns [{ x1, y1, x2, y2, major, family }], family 'x', 'y' or 'z' (direction of the lines).
  function isoGridLines(cam, vp, step, major = 5, minGapPx = 5) {
    const o = project(cam, vp, [0, 0, 0]);
    const o2 = [o.x, o.y];
    const ex = screenVec(cam, vp, cam.target, AX.x).map((v) => v * step);
    const ey = screenVec(cam, vp, cam.target, AX.y).map((v) => v * step);
    const ez = screenVec(cam, vp, cam.target, AX.z).map((v) => v * step); // vertical; in the isometric it is ±ex ± ey
    const out = [];
    for (const [family, dir, off] of [['x', ex, ey], ['y', ey, ex], ['z', ez, ex]]) {
      const n = [-dir[1], dir[0]];
      const sp = n[0] * off[0] + n[1] * off[1];
      const gap = Math.abs(sp) / Math.hypot(n[0], n[1]);
      if (gap * major < minGapPx) continue;
      const onlyMajor = gap < minGapPx;
      const ks = [[0, 0], [vp.w, 0], [0, vp.h], [vp.w, vp.h]].map((c) => (n[0] * (c[0] - o2[0]) + n[1] * (c[1] - o2[1])) / sp);
      for (let k = Math.ceil(Math.min(...ks)); k <= Math.floor(Math.max(...ks)); k++) {
        const isMajor = k % major === 0;
        if (onlyMajor && !isMajor) continue;
        const seg = clipLineToRect([o2[0] + k * off[0], o2[1] + k * off[1]], dir, vp.w, vp.h);
        if (seg) out.push({ x1: seg[0], y1: seg[1], x2: seg[2], y2: seg[3], major: isMajor, family });
      }
    }
    return out;
  }

  // grid of the working plane Z = level (free 3D view): 2·halfCount + 1 lines each way, centred on the target
  // rounded to the step; the segments come clipped at the near plane and already projected
  function planeGridLines(cam, vp, level, step, major = 5, halfCount = 40) {
    const c = [Math.round(cam.target[0] / step) * step, Math.round(cam.target[1] / step) * step];
    const E = halfCount * step;
    const out = [];
    for (let i = -halfCount; i <= halfCount; i++) {
      const v = i * step;
      const isMajor = Math.round((c[0] + v) / step) % major === 0;
      const isMajorY = Math.round((c[1] + v) / step) % major === 0;
      for (const [a, b, m] of [
        [[c[0] + v, c[1] - E, level], [c[0] + v, c[1] + E, level], isMajor],
        [[c[0] - E, c[1] + v, level], [c[0] + E, c[1] + v, level], isMajorY],
      ]) {
        const cl = clipNear(cam, a, b);
        if (!cl) continue;
        const pa = project(cam, vp, cl[0]);
        const pb = project(cam, vp, cl[1]);
        if (pa && pb) out.push({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, major: m });
      }
    }
    return out;
  }

  Object.assign(PumpIt.view3d, { clipLineToRect, isoGridLines, planeGridLines });
})(typeof window !== 'undefined' ? window : globalThis);
