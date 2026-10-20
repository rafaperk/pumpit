// 3D views: camera navigation with the mouse, the keyboard and touch (3D views specification R-41, §8.13) and
// selection by clicking (§8.16). The isometric camera pans, zooms and turns in steps of 90°; it never orbits freely.
// Turns go about what the middle of the screen shows and a perspective zoom heads for what the cursor shows (D-31).
// Camera moves are saved with the model but stay out of undo (R-61), and redraw at most once per frame, with quick
// frames while they last (R-62). Camera changes that jump glide there in 250 ms, unless the system asks for reduced
// motion (R-63).
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, V = PumpIt.view3d;
  const app = PumpIt.app;
  const S3 = UI.scene3d;

  const GLIDE_MS = 250;
  const pointers = new Map(); // pointers on the drawing: id → { x, y } (two of them pan and pinch)
  let drag = null;            // { kind: 'orbit' | 'pan' | 'pinch' | 'none', ... }
  let movedLast = false;      // the last drag moved: its right-button release does not open the data card
  let raf = 0, pending = null, wheelIdle = 0;
  let anim = null;            // camera glide in progress: { from, to, t0, raf }

  const svgEl = () => document.getElementById('canvas');
  function viewport() { const r = svgEl().getBoundingClientRect(); return { w: r.width, h: r.height, left: r.left, top: r.top }; }
  const isIso = () => app.model.view3.mode === 'iso';

  // Redraws on the next frame. mode: true for a quick frame while something moves (quick.js), 'edit' for the marks of
  // the editors only (the scene has not changed), anything else for a full drawing. A fuller request wins.
  const RANK = { full: 0, light: 1, edit: 2 };
  function redraw(mode) {
    const kind = mode === 'edit' ? 'edit' : mode ? 'light' : 'full';
    if (!pending || RANK[kind] < RANK[pending]) pending = kind;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const k = pending;
      pending = null;
      if (k === 'edit') UI.render3d.renderEdit(svgEl()); else UI.canvas.render({ light: k === 'light' });
    });
  }
  // a full drawing was just made (an edit at the end of a drag): the frame still waiting is dropped, so that a quick
  // frame never covers the labels again
  function drawn() { if (raf) { cancelAnimationFrame(raf); raf = 0; pending = null; } }
  function apply(c, light = false) { S3.setCamera(c); UI.edit3d.cameraMoved(); redraw(light); }

  // ------------------------------------------------------------ glides (R-63)
  const reducedMotion = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // the camera that the next jump starts from: where a glide in progress is going, so that quick key presses add up
  const base = () => (anim ? anim.to : S3.camera());
  function glide(to) {
    const from = S3.camera();
    stopGlide(false);
    if (reducedMotion()) { apply(to); return; }
    anim = { from, to, t0: performance.now(), raf: 0 };
    const step = (now) => {
      const t = Math.min(1, (now - anim.t0) / GLIDE_MS);
      const e = t < 0.5 ? 2 * t * t : 1 - ((2 - 2 * t) ** 2) / 2; // ease in and out
      S3.setCamera(V.lerpCamera(anim.from, anim.to, e));
      UI.edit3d.cameraMoved();
      if (t < 1) { UI.canvas.render({ light: true }); anim.raf = requestAnimationFrame(step); } else { anim = null; UI.canvas.render(); }
    };
    anim.raf = requestAnimationFrame(step);
  }
  // another camera move takes over: the glide stops where it is (and the scene is drawn in full there)
  function stopGlide(draw = true) {
    if (!anim) return;
    cancelAnimationFrame(anim.raf);
    anim = null;
    if (draw) redraw(false);
  }

  // ------------------------------------------------------------ the point the camera turns about (D-31)
  // The camera with its target moved along the line of sight to what the screen point (sx, sy) shows, the view
  // unchanged: a turn then keeps the network there in place instead of swinging it about a point in empty space, and
  // a perspective zoom heads for it instead of running through it.
  function focused(cam, vp, sx, sy) {
    const D = V.focusDepth(cam, vp, sx, sy, UI.render3d.pieces());
    return D === null ? cam : V.refocus(cam, D);
  }
  const zoomFocus = (cam, vp, sx, sy) => (cam.projection === 'persp' ? focused(cam, vp, sx, sy) : cam);
  // before a turn: the middle of the screen (unless a glide is under way, whose end already has its point)
  function focusMiddle() {
    if (anim) return;
    const vp = viewport();
    S3.setCamera(focused(S3.camera(), vp, vp.w / 2, vp.h / 2));
  }
  // whether a zoom changed the view: at the closest and the farthest zoom it does not, and then nothing is drawn,
  // since a quick frame would only flash the lean drawing over the full one (D-32)
  const zoomed = (a, b) => a.scale !== b.scale || a.distance !== b.distance;

  // ------------------------------------------------------------ pointer and wheel
  function down(e, hit) {
    const svg = svgEl();
    movedLast = false;
    stopGlide();
    svg.focus({ preventScroll: true });
    app.hideMenus();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* the pointer is already gone */ }
    if (pointers.size === 2) {
      const [p, q] = [...pointers.values()], vp = viewport();
      const m0 = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      UI.edit3d.reset();
      drag = { kind: 'pinch', d0: Math.hypot(q.x - p.x, q.y - p.y) || 1, m0, cam0: zoomFocus(S3.camera(), vp, m0.x - vp.left, m0.y - vp.top), moved: true };
      return;
    }
    // the editing tools take the pointer first (src/ui/view3d/edit.js)
    if (UI.edit3d.down(e, hit)) { drag = null; return; }
    if (e.button === 0 && hit) {
      // objects are selected at once, as in the schematic; dragging them comes with editing
      if (e.ctrlKey || e.metaKey || e.shiftKey) app.select(hit, { toggle: true });
      else if (!(app.selSet.has(app.keyOf(hit)) && app.selSet.size > 1)) app.select(hit);
      else app.setPrimary(hit);
      drag = { kind: 'none', x0: e.clientX, y0: e.clientY, moved: false };
      return;
    }
    const pan = isIso() || e.button === 1 || e.button === 2 || e.shiftKey;
    drag = { kind: pan ? 'pan' : 'orbit', x0: e.clientX, y0: e.clientY, cam0: S3.camera(), moved: false, clickEmpty: !hit && e.button === 0 };
  }

  function move(e) {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if ((!drag || drag.kind !== 'pinch') && UI.edit3d.move(e)) return;
    if (!drag) return;
    const vp = viewport();
    if (drag.kind === 'pinch') {
      if (pointers.size < 2) return;
      const [p, q] = [...pointers.values()];
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      const c = V.pan(drag.cam0, vp, mid.x - drag.m0.x, mid.y - drag.m0.y);
      apply(V.zoomAt(c, vp, mid.x - vp.left, mid.y - vp.top, Math.hypot(q.x - p.x, q.y - p.y) / drag.d0), true);
      return;
    }
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    // an orbit turns about what the middle of the screen shows (D-31)
    if (!drag.moved && drag.kind === 'orbit') drag.cam0 = focused(drag.cam0, vp, vp.w / 2, vp.h / 2);
    drag.moved = true;
    if (drag.kind === 'orbit') apply(V.orbit(drag.cam0, dx, dy), true);
    else if (drag.kind === 'pan') apply(V.pan(drag.cam0, vp, dx, dy), true);
  }

  function up(e) {
    pointers.delete(e.pointerId);
    if (UI.edit3d.up(e)) return;
    if (!drag) return;
    const d = drag;
    drag = null;
    movedLast = d.moved;
    // a click without dragging on empty space clears the selection (§8.16)
    if (!d.moved && d.clickEmpty) app.select(null);
    if (d.moved) redraw(false);
  }

  function wheel(e) {
    const vp = viewport(), sx = e.clientX - vp.left, sy = e.clientY - vp.top;
    const from = zoomFocus(S3.camera(), vp, sx, sy), to = V.zoomAt(from, vp, sx, sy, Math.exp(-e.deltaY * 0.0015));
    if (!zoomed(from, to)) return;
    stopGlide(false);
    apply(to, true);
    clearTimeout(wheelIdle);
    wheelIdle = setTimeout(() => redraw(false), 160);
  }

  // ------------------------------------------------------------ camera commands (they glide)
  function zoomBy(f) {
    const vp = viewport(), cx = vp.w / 2, cy = vp.h / 2;
    const from = anim ? anim.to : zoomFocus(S3.camera(), vp, cx, cy), to = V.zoomAt(from, vp, cx, cy, f);
    if (!zoomed(from, to)) return;
    if (!anim) S3.setCamera(from);
    glide(to);
  }

  // frames the whole scene
  function fit() { glide(V.fit(base(), viewport(), S3.points(), S3.FIT_PAD)); }

  // double click on an object: the camera turns around it (unless the editor takes it: a bend inserted in the selected
  // pipe of the free 3D view)
  function dblclick(hit, e) {
    if (UI.edit3d.dblclick(hit, e)) return;
    const p = hit && S3.anchorOf(hit);
    if (p) glide({ ...base(), target: p });
  }

  // ready-made views (R-42): the angles of the preset, then framed; Iso only places the camera
  function preset(name) { glide(V.fit({ ...base(), ...V.PRESETS[name] }, viewport(), S3.points(), S3.FIT_PAD)); }

  // perspective or orthographic, keeping the size of the scene at the target (at once: there is nothing in between)
  function setProjection(proj) {
    stopGlide(false);
    const cam = S3.camera();
    if (cam.projection === proj) return;
    const vp = viewport(), f = V.focalPx(cam, vp);
    apply(proj === 'ortho' ? { ...cam, projection: 'ortho', scale: V.clamp(f / cam.distance, 2, V.MAX_SCALE) } : { ...cam, projection: 'persp', distance: V.clamp(f / cam.scale, V.closestOf(cam, vp), 5000) });
  }

  // the isometric view turns by 90° about what the middle of the screen shows: the azimuth stays in
  // {-45, 45, 135, -135}
  function rotateIso(dir) {
    focusMiddle();
    const cam = base();
    glide({ ...cam, azimuth: ((cam.azimuth + dir * 90 + 540) % 360) - 180 });
  }
  // the turn buttons of the free 3D view (D-33): 15° about what the middle of the screen shows, the same way round as
  // those of the isometric view (the arrow keys turn the other way, like a drag of the background)
  function turnFree(dir) {
    focusMiddle();
    const cam = base();
    glide({ ...cam, azimuth: cam.azimuth + dir * 15 });
  }

  // keys of the 3D views (§6.4); true when the key was used. The editing keys come first.
  function key(e) {
    if (UI.edit3d.key(e)) return true;
    const k = e.key;
    if (k === 'Home') { fit(); return true; }
    if (k === '+' || k === '=') { zoomBy(1.25); return true; }
    if (k === '-' || k === '_') { zoomBy(0.8); return true; }
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!dirs[k]) return false;
    const [ax, ay] = dirs[k];
    if (e.shiftKey) { glide(V.pan(base(), viewport(), -ax * 40, -ay * 40)); return true; }
    if (isIso()) return false; // the arrows choose pipe routes while drawing in the isometric view
    focusMiddle();
    glide(V.orbit(base(), ax * 37.5, -ay * 37.5)); // 15° per press (0.4° per px); up raises the camera
    return true;
  }

  PumpIt.ui.nav3d = { down, move, up, wheel, zoomBy, fit, dblclick, preset, setProjection, rotateIso, turnFree, key, redraw, drawn, consumedContext: () => movedLast };
})(window);
