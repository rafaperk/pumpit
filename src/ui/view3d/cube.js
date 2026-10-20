// 3D view: the view cube at the top right of the drawing (decision D-35 of docs/3D-VIEWS.md). It turns with the
// camera and names the sides of the scene. A click on a face, an edge or a corner glides to the view from that side
// and frames the network; a drag turns the camera like a drag of the background; on a face seen straight on, four
// arrows turn the view to the faces next to it; with the cube focused, the arrow keys step to the next region. It is
// faint until the pointer comes over it, and the Options menu hides it. Geometry: src/core/view3d/cube.js; the box
// is in index.html and the looks in view3d.css.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, V = PumpIt.view3d;
  const app = PumpIt.app;
  const { $ } = UI.dom;
  const i18n = PumpIt.i18n;
  const { t } = i18n;
  const S3 = UI.scene3d, N3 = UI.nav3d;

  const BOX = 112, C = BOX / 2, R = 30; // the box (px), its centre and the half size of the cube (px)
  const ARROW_AT = R + 15;              // the arrows of a face seen straight on, from the centre (px)
  const LABEL = 50;                     // the label of a face is written on a face 2 · LABEL units wide
  const DRAG_PX = 4;                    // a press that moves farther turns the camera; less is a click
  const NS = 'http://www.w3.org/2000/svg';
  const f2 = (v) => Math.round(v * 100) / 100;
  const f4 = (v) => Math.round(v * 1e4) / 1e4;

  let host = null;
  let faces = [];  // per face: { id, g, regions (9 polygons), outline, label }, in the order of V.CUBE_FACES
  let arrows = []; // the four arrows of a face seen straight on
  let drawn = '';  // the camera angles drawn
  let lang = '';   // the language of the texts
  let hot = null;  // the region under the pointer
  let press = null;

  function node(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    parent.appendChild(n);
    return n;
  }

  // the name of a region: "View: top, front and right"
  function nameOf(key) {
    const p = V.cubeParts(key).map((id) => t('network.view3.cube.name.' + id));
    const name = p.length === 1 ? p[0] : p.length === 2 ? t('network.view3.cube.two', { a: p[0], b: p[1] }) : t('network.view3.cube.three', { a: p[0], b: p[1], c: p[2] });
    return t('network.view3.cube.view', { name });
  }

  function build() {
    host = $('#view-cube');
    const svg = node('svg', { viewBox: `0 0 ${BOX} ${BOX}`, width: BOX, height: BOX, 'aria-hidden': 'true' }, host);
    // the regions of a face stand for the same keys whatever the camera
    faces = V.cubeFaces({ azimuth: 0, elevation: 0 }).map((f) => {
      const g = node('g', { class: 'vc-face' }, svg);
      const regions = f.regions.map((r) => { const p = node('polygon', { class: 'vc-r', 'data-r': r.key }, g); node('title', {}, p); return p; });
      return { id: f.id, g, regions, outline: node('polygon', { class: 'vc-edge' }, g), label: node('text', { class: 'vc-label' }, g) };
    });
    arrows = [0, 1, 2, 3].map(() => { const p = node('path', { class: 'vc-arrow', d: 'M0 -6.5L6.5 4H-6.5Z' }, svg); node('title', {}, p); return p; });
    events(svg);
  }

  // The texts in the language of the interface: the labels of the faces, in capitals and all in one size, the one that
  // fits the longest, and the names of the regions, which the pointer shows.
  function relabel() {
    lang = i18n.language();
    const words = faces.map((f) => t('network.view3.cube.name.' + f.id).toLocaleUpperCase(lang));
    const size = f2(Math.min(22, (1.6 * LABEL) / (0.62 * Math.max(...words.map((w) => w.length)))));
    faces.forEach((f, i) => {
      f.label.textContent = words[i];
      f.label.setAttribute('font-size', size);
      for (const p of f.regions) p.firstChild.textContent = nameOf(p.dataset.r);
    });
    for (const a of arrows) if (a.dataset.r) a.firstChild.textContent = nameOf(a.dataset.r);
  }

  // the cube for the camera: the faces that show, shaded, with their labels on them, and the arrows of a face seen
  // straight on
  const pt = ([x, y]) => `${f2(C + R * x)},${f2(C + R * y)}`;
  function draw(cam) {
    V.cubeFaces(cam).forEach((f, i) => {
      const el = faces[i];
      el.g.style.display = f.shows ? '' : 'none';
      if (!f.shows) return;
      el.g.style.setProperty('--k', f2(f.shade));
      f.regions.forEach((r, k) => el.regions[k].setAttribute('points', r.pts.map(pt).join(' ')));
      el.outline.setAttribute('points', f.outline.map(pt).join(' '));
      const [a, b, c, d, e, g] = f.label, k = R / LABEL;
      el.label.setAttribute('transform', `matrix(${f4(a * k)} ${f4(b * k)} ${f4(c * k)} ${f4(d * k)} ${f2(C + R * e)} ${f2(C + R * g)})`);
    });
    const on = V.cubeFaceOn(cam);
    arrows.forEach((p, i) => {
      const n = on && on.next[i];
      p.style.display = n ? '' : 'none';
      if (!n) return;
      if (p.dataset.r !== n.key) { p.dataset.r = n.key; p.firstChild.textContent = nameOf(n.key); }
      const ang = (Math.atan2(n.dir[1], n.dir[0]) * 180) / Math.PI + 90; // the path points up
      p.setAttribute('transform', `translate(${f2(C + ARROW_AT * n.dir[0])} ${f2(C + ARROW_AT * n.dir[1])}) rotate(${f2(ang)})`);
    });
  }

  // follows the camera; called on every redraw, quick frames included, so it does as little as it can
  function sync() {
    if (!host) return;
    const show = S3.mode() === '3d' && app.prefs.viewCube !== false && !!app.model.view3;
    if (host.hidden === show) {
      host.hidden = !show;
      host.parentElement.classList.toggle('cube-on', show); // the menu of the view keeps clear of it (view3d.css)
    }
    if (!show) return;
    if (lang !== i18n.language()) { relabel(); drawn = ''; }
    const cam = S3.camera(), key = cam.azimuth + '|' + cam.elevation;
    if (key === drawn) return;
    drawn = key;
    draw(cam);
  }

  // ------------------------------------------------------------ the pointer and the keys
  const regionOf = (el) => { const r = el && el.closest ? el.closest('[data-r]') : null; return r ? r.dataset.r : null; };
  // the region under the pointer, with all its parts lit (an edge spans two faces and a corner three)
  function setHot(key) {
    if (key === hot) return;
    hot = key;
    for (const f of faces) for (const p of f.regions) p.classList.toggle('hot', p.dataset.r === key);
  }

  function events(svg) {
    svg.addEventListener('pointerover', (e) => { if (!press) setHot(regionOf(e.target)); });
    svg.addEventListener('pointerleave', () => { if (!press) setHot(null); });
    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault(); // the cube takes the press but not the focus: the arrow keys keep turning the drawing
      app.hideMenus();
      press = { id: e.pointerId, x0: e.clientX, y0: e.clientY, key: regionOf(e.target), moved: false };
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* the pointer is already gone */ }
    });
    svg.addEventListener('pointermove', (e) => {
      if (!press || e.pointerId !== press.id) return;
      const dx = e.clientX - press.x0, dy = e.clientY - press.y0;
      if (!press.moved) {
        if (Math.hypot(dx, dy) < DRAG_PX) return;
        press.moved = true;
        host.classList.add('turning');
        setHot(null);
        N3.spinStart();
      }
      N3.spinMove(dx, dy);
    });
    const end = (e) => {
      if (!press || e.pointerId !== press.id) return;
      const p = press;
      press = null;
      host.classList.remove('turning');
      if (p.moved) N3.spinEnd();
      else if (e.type === 'pointerup' && p.key) N3.lookFrom(p.key);
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    // the arrow keys on the focused cube: the region at the right, at the left, above or below
    const STEPS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    host.addEventListener('keydown', (e) => {
      const s = STEPS[e.key];
      if (!s || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation(); // not the camera keys of the drawing (keyboard.js)
      N3.cubeStep(s[0], s[1]);
    });
  }

  PumpIt.ui.cube3d = { bind: build, sync };
})(window);
