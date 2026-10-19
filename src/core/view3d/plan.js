// 3D views: where a junction is in the scene. The schematic is the plan of the scene, at PLAN_PX px per du (one step of
// the schematic grid; y grows down the screen, Y grows away from the viewer), and the height is the elevation of the
// junction at zScale du per metre. So the schematic and the 3D views always show one geometry (decision D-20 of
// docs/3D-VIEWS.md, in place of the scene generated once from the schematic of §8.14).
(function (root) {
  const PumpIt = root.PumpIt;
  const PLAN_PX = 20;

  const toScene = (x, y, elevM, zScale) => [x / PLAN_PX, -y / PLAN_PX, elevM * zScale];
  const fromScene = (p, zScale) => ({ x: p[0] * PLAN_PX, y: -p[1] * PLAN_PX, elev: p[2] / zScale });

  // vertical scale for a model: heights about half the size of the plan, rounded down to 1, 2 or 5 × 10ⁿ du per metre
  // pts: [{ x, y, elev }] (schematic px and metres)
  function autoZScale(pts) {
    if (pts.length < 2) return 1;
    const span = Math.max(...['x', 'y'].map((k) => (Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]))) / PLAN_PX));
    const dz = Math.max(...pts.map((p) => p.elev)) - Math.min(...pts.map((p) => p.elev));
    if (!(span > 0) || !(dz > 0)) return 1;
    const raw = (0.5 * span) / dz;
    const p10 = 10 ** Math.floor(Math.log10(raw));
    const m = raw / p10;
    return Math.min(1000, Math.max(0.001, (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p10));
  }

  Object.assign(PumpIt.view3d, { PLAN_PX, toScene, fromScene, autoZScale });
})(typeof window !== 'undefined' ? window : globalThis);
