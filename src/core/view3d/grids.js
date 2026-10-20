// 3D views: the grid of the working plane (3D views specification §8.6), returned as screen segments ready to draw.
// The three-family grid of the isometric view (§8.5) went with that view (decision D-34 of docs/3D-VIEWS.md).
(function (root) {
  const PumpIt = root.PumpIt;
  const { project, clipNear } = PumpIt.view3d;

  // grid of the working plane Z = level: 2·halfCount + 1 lines each way, centred on the target
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

  Object.assign(PumpIt.view3d, { planeGridLines });
})(typeof window !== 'undefined' ? window : globalThis);
