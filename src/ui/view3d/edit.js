// 3D views: editing. The isometric view (edit-iso.js) and the free 3D view (edit-free.js) have their own tools; this
// file holds what they share (the cursor, the working plane, the junction near the cursor, the marks drawn over the
// scene, the working level keys) and hands every event to the editor of the active view.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, V = PumpIt.view3d;
  const app = PumpIt.app;
  const F = UI.format;
  const S3 = UI.scene3d, C3 = UI.commands3d;

  const NEAR_PX = 14; // the cursor this close to a junction connects to it (§8.8)
  const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
  const f1 = (v) => Math.round(v * 10) / 10;

  const v3 = () => app.model.view3;
  const tool = () => UI.canvas.tool;
  const levelZ = () => v3().level * v3().zScale;
  const redraw = (light) => UI.nav3d.redraw(light);
  function pointer(e) {
    const r = document.getElementById('canvas').getBoundingClientRect();
    return { sx: e.clientX - r.left, sy: e.clientY - r.top, vp: { w: r.width, h: r.height } };
  }
  // the cursor ray of a pointer position
  const rayOf = (p) => V.unproject(S3.camera(), p.vp, p.sx, p.sy);

  // p, or the first free point from it along +X: two junctions never share a point (§7.3)
  function freePoint(p, sc) {
    let q = p;
    while (S3.junctionAt(q, null, sc) !== null) q = [q[0] + v3().step, q[1], q[2]];
    return q;
  }
  // the junction drawn within NEAR_PX of the cursor, or within its symbol when that is larger (other than exceptId)
  function nearJunction(p, sc, exceptId) {
    const cam = S3.camera();
    let best = null, bestD = Infinity;
    for (const [id, q] of sc.pos) {
      const s = id !== exceptId && V.project(cam, p.vp, q);
      const d = s ? Math.hypot(s.x - p.sx, s.y - p.sy) : Infinity;
      if (d < bestD && d < Math.max(NEAR_PX, UI.render3d.symbolRadius(s.k))) { best = id; bestD = d; }
    }
    return best;
  }
  // the single selected pipe, or null
  const selPipe = () => (app.sel && app.sel.kind === 'pipe' && app.selSet.size === 1 ? app.sel.id : null);

  // ------------------------------------------------------------ marks over the scene
  // a dot at the point p, with a dashed line down to the floor that shows its height
  function marker(cam, vp, p, floorZ) {
    const s = V.project(cam, vp, p);
    if (!s) return '';
    const cl = Math.abs(p[2] - floorZ) > 1e-9 && V.clipNear(cam, p, [p[0], p[1], floorZ]);
    const a = cl && V.project(cam, vp, cl[0]), b = cl && V.project(cam, vp, cl[1]);
    return (a && b ? `<line class="drop3" x1="${f1(a.x)}" y1="${f1(a.y)}" x2="${f1(b.x)}" y2="${f1(b.y)}"/>` : '')
      + `<circle class="mark3" cx="${f1(s.x)}" cy="${f1(s.y)}" r="5"/>`;
  }
  // a polyline through the scene points pts, cut at the near plane in perspective
  function polyline(cam, vp, pts, cls) {
    let d = '', open = false;
    for (let i = 1; i < pts.length; i++) {
      const cl = V.clipNear(cam, pts[i - 1], pts[i]);
      const a = cl && V.project(cam, vp, cl[0]), b = cl && V.project(cam, vp, cl[1]);
      if (!a || !b) { open = false; continue; }
      d += (open && cl[0] === pts[i - 1] ? '' : `M${f1(a.x)} ${f1(a.y)}`) + `L${f1(b.x)} ${f1(b.y)}`;
      open = cl[1] === pts[i];
    }
    return d ? `<path class="${cls}" d="${d}"/>` : '';
  }
  // a small label next to the cursor
  function tipBox(text, at) {
    const w = text.length * 6.6 + 10;
    return `<g class="cand-tip" transform="translate(${f1(at.sx + 14)} ${f1(at.sy + 24)})"><rect x="-5" y="-13" width="${f1(w)}" height="18" rx="4"/><text>${F.esc(text)}</text></g>`;
  }
  // a signed offset along an axis: "+2 X", "−0,5 Z"
  const offset = (d, ax) => `${d > 0 ? '+' : '−'}${F.inputStr(round(Math.abs(d), 3))} ${ax.toUpperCase()}`;

  // ------------------------------------------------------------ the editor of the active view
  const editor = () => (S3.mode() === 'iso' ? UI.isoEdit3d : S3.mode() === '3d' ? UI.freeEdit3d : null);

  // Whether the object under a double click was already the only selection when the first of its two clicks came: a
  // double click on the selected pipe inserts a bend (R-47), on anything else it centres the camera (R-41).
  let press = { key: null, t: 0, was: false };
  function notePress(hit) {
    const key = hit ? app.keyOf(hit) : null, now = performance.now();
    if (key !== press.key || now - press.t > 600) press = { key, t: now, was: !!key && app.selSet.size === 1 && app.selSet.has(key) };
    else press.t = now;
  }
  const wasSelected = (hit) => !!hit && press.key === app.keyOf(hit) && press.was;

  function down(e, hit) {
    notePress(hit);
    const ed = editor();
    return !!ed && ed.down(e, hit);
  }
  const move = (e) => { const ed = editor(); return !!ed && ed.move(e); };
  const up = (e) => { const ed = editor(); return !!ed && ed.up(e); };
  // keys of the editors (§6.4); PageUp and PageDown move the working level by one grid step in both views
  function key(e) {
    const ed = editor();
    if (!ed) return false;
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      C3.setView({ level: round(v3().level + ((e.key === 'PageUp' ? 1 : -1) * v3().step) / v3().zScale, 6) });
      return true;
    }
    return ed.key(e);
  }
  const cancel = () => { const ed = editor(); return !!ed && ed.cancel(); };
  function reset() { UI.isoEdit3d.reset(); UI.freeEdit3d.reset(); }
  // a junction dropped from the palette onto a 3D view
  const dropAt = (type, e) => { const ed = editor(); if (ed) ed.dropAt(type, e); };
  // a double click: true when the editor used it (otherwise the camera centres on the object)
  const dblclick = (hit, e) => { const ed = editor(); return !!ed && !!ed.dblclick && ed.dblclick(hit, e); };
  // the camera moved (zoom, keys): the pipe being drawn follows the cursor again
  const cameraMoved = () => { const ed = editor(); if (ed && ed.cameraMoved) ed.cameraMoved(); };
  // handles, the pipe being drawn and the markers: the content of the g3-edit layer, over the scene
  const overlay = (ctx) => { const ed = editor(); return ed ? ed.overlay(ctx) : ''; };
  const hintKey = () => { const ed = editor(); return ed ? ed.hintKey() : ''; };
  const preview = () => { const ed = editor(); return ed ? ed.preview() : null; };

  PumpIt.ui.edit3d = {
    NEAR_PX, round, f1, v3, tool, levelZ, redraw, pointer, rayOf, freePoint, nearJunction, selPipe, marker, polyline, tipBox, offset, wasSelected,
    down, move, up, key, cancel, reset, dropAt, dblclick, cameraMoved, overlay, hintKey, preview,
  };
})(window);
