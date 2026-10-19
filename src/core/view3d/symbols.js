// 3D views: orientation of the junction symbols (3D views specification §8.11).
(function (root) {
  const PumpIt = root.PumpIt;
  const { DEG, AX, add, sub, mul, dot, cross, norm, basis, project, screenVec } = PumpIt.view3d;

  // Axes of the symbol of a two-port junction: a = reference flow direction, up = the "up" of the symbol drawing.
  // dirIn: direction of the segment that arrives at (or leaves) the junction. up is vertical for a horizontal pipe;
  // for a vertical pipe it is the horizontal axis (X or Y) that faces the camera most. roll turns up about a
  // (multiples of 90°).
  function iconAxes(dirIn, cam, roll = 0) {
    const a = norm(dirIn);
    let up;
    if (Math.abs(a[2]) < 0.9) up = norm(sub(AX.z, mul(a, a[2])));
    else {
      const { r } = basis(cam);
      const h = Math.abs(r[0]) >= Math.abs(r[1]) ? AX.x : AX.y;
      up = norm(sub(h, mul(a, dot(h, a))));
    }
    const ang = (((roll % 360) + 360) % 360) * DEG;
    up = add(mul(up, Math.cos(ang)), mul(cross(a, up), Math.sin(ang)));
    return { a, up };
  }

  // SVG matrix [A, B, C, D, E, F] that draws the symbol (local coordinates in px, x = flow, −y = up) on the plane
  // of a and up. It never mirrors the symbol; when that plane is seen edge-on (|det| < 0.3) the symbol becomes a
  // billboard turned along the pipe (billboard = true). sizeK scales it (perspective).
  function iconMatrix(cam, vp, center, a, up, sizeK = 1) {
    let A = screenVec(cam, vp, center, a);
    let B = screenVec(cam, vp, center, up);
    const L = Math.max(Math.hypot(A[0], A[1]), Math.hypot(B[0], B[1]), 1e-12);
    A = [A[0] / L, A[1] / L];
    B = [B[0] / L, B[1] / L];
    let det = -A[0] * B[1] + A[1] * B[0];
    if (det < 0) { B = [-B[0], -B[1]]; det = -det; }
    const c = project(cam, vp, center);
    if (!c) return null;
    if (det < 0.3) {
      const ang = Math.hypot(A[0], A[1]) > 0.2 ? Math.atan2(A[1], A[0]) : 0;
      return { m: [Math.cos(ang) * sizeK, Math.sin(ang) * sizeK, -Math.sin(ang) * sizeK, Math.cos(ang) * sizeK, c.x, c.y], billboard: true, det };
    }
    return { m: [A[0] * sizeK, A[1] * sizeK, -B[0] * sizeK, -B[1] * sizeK, c.x, c.y], billboard: false, det };
  }

  Object.assign(PumpIt.view3d, { iconAxes, iconMatrix });
})(typeof window !== 'undefined' ? window : globalThis);
