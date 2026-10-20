// 3D views: quick frames while the camera or a dragged object moves (3D views specification R-62). The first one draws
// a lean copy of the scene: each pipe segment as its cut and its tube (and its halo when selected), each junction as
// its solid, without labels, shading of the tubes, fading, shadows, flow arrows and drop lines. The next ones only
// move those elements and put them back in depth order, moving as few as possible: far cheaper than drawing the scene
// again. A tube wider at one end in perspective has the outline of the full drawing (D-32), and its elements change
// from lines to shapes and back as it turns tapered or even. A solid is drawn again only when its shape on the screen
// changes (as it turns with the camera, or as it moves near the camera in perspective, D-31), not when it only moves,
// grows or shrinks. The grid and the marks of the editors are drawn again every time. Any full drawing replaces it
// (render.js).
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const R3 = UI.render3d;
  const NS = 'http://www.w3.org/2000/svg';
  const f1 = (v) => Math.round(v * 10) / 10;

  // the lean scene on the screen: { svg, floor, scene, edit, items: Map(key → item) }; an item is
  // { nodes, kind, look, taper (its tube is drawn with shapes), at (its place in the scene), hidden }
  let q = null;
  const drop = () => { q = null; };

  const keyOf = (it) => (it.kind === 'jct' ? 'j' + it.j.id : `s${it.s.p.id}:${it.s.i}`);

  // markup of an item without its geometry, and the number of elements it makes: lines for a tube of one width,
  // shapes for a tapered one
  function markup(f, it) {
    if (it.kind === 'jct') return { html: `<g class="${R3.junctionLook(f, it.j).join(' ')}" data-j="${it.j.id}"></g>`, count: 1 };
    const s = it.s, look = R3.pipeLook(f, s.p, s.eff);
    const [tag, tp, paint] = s.taper ? ['path', ' tp', 'fill'] : ['line', '', 'stroke'];
    const tube = `<${tag} class="tube${tp} ${look.cls.join(' ')}" data-p="${s.p.id}" data-i="${s.i}"${look.color ? ` style="${paint}:${look.color}"` : ''}/>`;
    return { html: `<${tag} class="cut${tp}"/>${look.isSel ? `<${tag} class="halo${tp}"/>` : ''}${tube}`, count: look.isSel ? 3 : 2, look, taper: s.taper };
  }

  // widths in steps of half a pixel, so that most frames leave them alone
  function line(el, a, b, w) {
    el.setAttribute('x1', f1(a.x)); el.setAttribute('y1', f1(a.y));
    el.setAttribute('x2', f1(b.x)); el.setAttribute('y2', f1(b.y));
    const sw = Math.round(w * 2) / 2;
    if (el.qw !== sw) { el.qw = sw; el.style.strokeWidth = sw; }
  }
  // puts an item where the frame says
  function place(item, f, it) {
    if (item.kind === 'jct') {
      const g = item.nodes[0], icon = R3.junctionIcon(f, it);
      g.setAttribute('transform', icon.transform);
      if (item.qh !== icon.html) { item.qh = icon.html; g.innerHTML = icon.html; }
      if ((item.qn || 1) !== icon.fade) { item.qn = icon.fade; if (icon.fade < 1) g.style.setProperty('--near', icon.fade); else g.style.removeProperty('--near'); }
      return;
    }
    const s = it.s;
    if (item.taper !== s.taper) reform(item, f, it);
    const n = item.nodes;
    if (s.taper) {
      const sh = R3.taperedShapes(s, item.look);
      n[0].setAttribute('d', sh.cut);
      if (n.length === 3) n[1].setAttribute('d', sh.halo());
      n[n.length - 1].setAttribute('d', sh.tube);
      return;
    }
    const [ca, cb] = R3.cutEnds(s);
    line(n[0], ca, cb, R3.cutWidth(s.w));
    if (n.length === 3) line(n[1], ca, cb, s.w + 7);
    const tube = n[n.length - 1];
    line(tube, s.a, s.b, s.w);
    if (!item.look.solid) {
      const dash = R3.dashOf(item.look, tube.qw);
      if (tube.qd !== dash) { tube.qd = dash; tube.style.strokeDasharray = dash; }
    }
  }
  function show(item, on) {
    if (item.hidden === !on) return;
    item.hidden = !on;
    for (const n of item.nodes) n.style.display = on ? '' : 'none';
  }

  // the elements of a new item, at the end of the scene (reorder puts it in its place)
  const tpl = () => document.createElementNS(NS, 'g');
  function create(f, it, key) {
    const mk = markup(f, it), g = tpl();
    g.innerHTML = mk.html;
    const nodes = [...g.children];
    for (const n of nodes) q.scene.appendChild(n);
    const item = { kind: it.kind, nodes, look: mk.look, taper: mk.taper, at: Infinity, hidden: false };
    nodes[0].qRef = item;
    q.items.set(key, item);
    return item;
  }
  // a segment whose tube turned tapered or even: new elements of the other kind in the place of the old ones
  function reform(item, f, it) {
    const mk = markup(f, it), g = tpl();
    g.innerHTML = mk.html;
    const nodes = [...g.children];
    for (const n of nodes) {
      if (item.hidden) n.style.display = 'none';
      q.scene.insertBefore(n, item.nodes[0]);
    }
    for (const n of item.nodes) n.remove();
    nodes[0].qRef = item;
    Object.assign(item, { nodes, look: mk.look, taper: mk.taper });
  }

  function build(f, list) {
    const parts = list.map((it) => markup(f, it));
    f.svg.innerHTML = `<g class="g3-floor"></g><g class="g3-scene g3-quick">${parts.map((p) => p.html).join('')}</g><g class="g3-edit"></g>${UI.solids3d.defs()}`;
    const [floor, scene, edit] = f.svg.children;
    q = { svg: f.svg, floor, scene, edit, items: new Map() };
    const els = scene.children;
    let e = 0;
    list.forEach((it, k) => {
      const nodes = [];
      for (let c = 0; c < parts[k].count; c++) nodes.push(els[e++]);
      const item = { kind: it.kind, nodes, look: parts[k].look, taper: parts[k].taper, at: k, hidden: false };
      nodes[0].qRef = item;
      q.items.set(keyOf(it), item);
      place(item, f, it);
    });
  }

  // the longest run of items already in the right order (a longest increasing subsequence of their places): those stay
  function keepers(at) {
    const n = at.length, prev = new Int32Array(n), tails = [];
    for (let i = 0; i < n; i++) {
      let lo = 0, hi = tails.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (at[tails[mid]] < at[i]) lo = mid + 1; else hi = mid; }
      prev[i] = lo > 0 ? tails[lo - 1] : -1;
      tails[lo] = i;
    }
    const keep = new Uint8Array(n);
    for (let i = tails.length ? tails[tails.length - 1] : -1; i >= 0; i = prev[i]) keep[i] = 1;
    return keep;
  }
  // the items in depth order, moving only those out of order; hidden items may stay anywhere
  function reorder(want) {
    const keep = keepers(want.map((item) => item.at));
    let ref = null;
    for (let k = want.length - 1; k >= 0; k--) {
      const item = want[k];
      if (!keep[k]) for (const n of item.nodes) q.scene.insertBefore(n, ref);
      ref = item.nodes[0];
    }
    let i = 0;
    for (const n of q.scene.children) if (n.qRef) n.qRef.at = i++;
  }

  function update(f, list) {
    const want = [];
    const seen = new Set();
    for (const it of list) {
      const key = keyOf(it);
      const item = q.items.get(key) || create(f, it, key);
      place(item, f, it);
      show(item, true);
      seen.add(item);
      want.push(item);
    }
    for (const item of q.items.values()) if (!seen.has(item)) show(item, false);
    reorder(want);
  }

  function frame(f) {
    const list = f.items.filter((it) => it.kind !== 'arrow');
    if (!q || q.svg !== f.svg || !q.scene.isConnected) build(f, list); else update(f, list);
    q.floor.innerHTML = f.set.grid ? R3.grid(f) : '';
    q.edit.innerHTML = UI.edit3d.overlay(R3.editCtx(f));
  }

  PumpIt.ui.quick3d = { frame, drop };
})(window);
