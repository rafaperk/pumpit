// 3D views: SVG markup of the isometric and the free 3D drawings (3D views specification §10). Depth cues: items are
// painted from the farthest to the nearest (§8.12); a cut of the background colour runs under every pipe segment, so
// a nearer pipe interrupts the one behind it (R-55); pipes are shaded tubes as thick as their bore; the junctions are
// small shaded solids that turn with the camera (D-29, solids.js), and the pipes stop at their bodies; tubes and
// solids are sized in the scene, so they grow and shrink with the zoom and are larger when nearer in perspective
// (D-30), where the solids near the camera follow the true projection and fade out before they reach it (D-31);
// farther items fade into the background; and, optionally, every raised pipe and junction casts a shadow on the floor
// and drop lines mark the heights. While something moves, quick.js draws lean frames from the same projected scene
// (R-62).
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, V = PumpIt.view3d, U = PumpIt.units;
  const app = PumpIt.app;
  const F = UI.format, CS = UI.colorScales, S3 = UI.scene3d, SO = UI.solids3d;

  const CHAR_W = 6.4, LINE_UP = 10, LINE_DOWN = 3; // approximate box of a label character (§10.3)
  const SOLID = 1.3; // size of the solids against the schematic symbols, which fill their discs
  const f1 = (v) => Math.round(v * 10) / 10;
  const f3 = (v) => Math.round(v * 1000) / 1000;

  // Sizes in the scene (D-30) at the local scale k (px per du): a solid takes symbolScale(k) screen px per symbol px
  // and a tube of w0 schematic px takes tubePx(w0, k) px. Far away they never get smaller than a quarter of a schematic
  // symbol and 1 px, so that they stay in sight.
  const SOLID_MIN = 0.25, TUBE_MIN = 1;
  const symbolScale = (k) => Math.max(SOLID_MIN, V.scenePx(SOLID, k));
  const tubePx = (w0, k) => Math.max(TUBE_MIN, V.scenePx(w0, k));
  // where the drawing has shrunk to its smallest (the solids no longer shrink), only the selection keeps its labels
  const smallest = (k) => V.scenePx(SOLID, k) <= SOLID_MIN;
  // The disc of a symbol that takes the clicks: HIT_R symbol px, and never less than HIT_PX on the screen.
  // symbolRadius(k): its radius in px, which the editors also use to connect the cursor to a junction.
  const HIT_R = 11, HIT_PX = 10;
  const symbolRadius = (k) => Math.max(HIT_PX, HIT_R * symbolScale(k));
  // the gap of the background colour on each side of a tube that interrupts the pipes behind it (R-55): 3 px, less
  // for a thin tube far away
  const gapOf = (w) => V.clamp(0.75 * w, 1, 3);
  const cutWidth = (w) => w + 2 * gapOf(w);

  // tube width (schematic px) from the bore of the pipe: 4 px for small bores, up to 12 px for large ones
  function tubeWidth(p) {
    const g = p.geometry || {};
    const mm = (q) => U.toSI(Number(q.value), q.unit, 'length') * 1000;
    let d = NaN;
    try {
      if (g.kind === 'circular') d = mm(g.d);
      else if (g.kind === 'annulus') d = mm(g.dOuter);
      else if (g.kind === 'rectangular') d = Math.max(mm(g.width), mm(g.height));
      else d = Math.sqrt((4 * U.toSI(Number(g.area.value), g.area.unit, 'area')) / Math.PI) * 1000;
    } catch (e) { /* incomplete section: default bore */ }
    return V.clamp(3 + (d > 0 ? d : 100) / 20, 4, 12);
  }

  // the end a of the screen segment a–b moved towards b by r (at most 45 % of the segment)
  function trim(a, b, r) {
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (!L) return a;
    const k = Math.min(r, L * 0.45) / L;
    return { ...a, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }
  const coords = (a, b) => `x1="${f1(a.x)}" y1="${f1(a.y)}" x2="${f1(b.x)}" y2="${f1(b.y)}"`;

  // A scene segment cl (cut at the near plane) of a tube of w0 schematic px on the screen: { a, b, wa, wb, depth },
  // with the tube as wide as the local scale at each end (D-30). The local scale runs linearly along the segment on
  // the screen, and so does the width: in perspective the outline of the tube is two straight lines.
  function onScreen(f, cl, w0) {
    const a = V.project(f.cam, f.vp, cl[0]), b = V.project(f.cam, f.vp, cl[1]);
    return a && b ? { a, b, wa: tubePx(w0, a.k), wb: tubePx(w0, b.k), depth: (a.depth + b.depth) / 2 } : null;
  }
  // the width of a tube from a (width wa) to b (width wb) at the point q of that line
  function widthAt(a, b, wa, wb, q) {
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    return L ? wa + ((wb - wa) * Math.hypot(q.x - a.x, q.y - a.y)) / L : wa;
  }
  // A tube is drawn tapered (in perspective) when its ends differ by more than TAPER_PX: a line as wide as their mean
  // is then more than half a pixel off the true outline on each side of an end (D-32). Full and quick frames agree.
  const TAPER_PX = 2;
  const tapered = (wa, wb) => Math.abs(wa - wb) > TAPER_PX;

  // Path data of a tapered tube from a to b with the radii ra and rb: the two straight lines that touch both round ends
  // and the arcs of the ends (the outline of the two circles).
  function capsule(a, b, ra, rb) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d <= Math.abs(ra - rb) + 1e-9) { // one end holds the other
      const c = ra >= rb ? a : b, r = f1(Math.max(ra, rb));
      return `M${f1(c.x - r)} ${f1(c.y)}a${r} ${r} 0 1 0 ${f1(2 * r)} 0a${r} ${r} 0 1 0 ${f1(-2 * r)} 0Z`;
    }
    // the outer normals of the two lines, tilted towards the narrower end: the wider end shows more than half its circle
    const ux = dx / d, uy = dy / d, sn = (ra - rb) / d, cs = Math.sqrt(1 - sn * sn);
    const m1 = [-uy * cs + ux * sn, ux * cs + uy * sn], m2 = [uy * cs + ux * sn, -ux * cs + uy * sn];
    const at = (c, r, m) => `${f1(c.x + r * m[0])} ${f1(c.y + r * m[1])}`;
    const bigA = ra >= rb ? 1 : 0;
    return `M${at(a, ra, m1)}L${at(b, rb, m1)}A${f1(rb)} ${f1(rb)} 0 ${1 - bigA} 0 ${at(b, rb, m2)}L${at(a, ra, m2)}A${f1(ra)} ${f1(ra)} 0 ${bigA} 0 ${at(a, ra, m1)}Z`;
  }

  // the effective pipes and junctions by id, indexed once per effective model (app.eff() is the same object until the
  // next change)
  const effIndex = new WeakMap();
  function effIndexOf() {
    const e = app.eff();
    let ix = effIndex.get(e);
    if (!ix) { ix = { pipes: new Map(e.pipes.map((p) => [p.id, p])), junctions: new Map(e.junctions.map((j) => [j.id, j])) }; effIndex.set(e, ix); }
    return ix;
  }
  const effPipes = () => effIndexOf().pipes;
  const effJunctions = () => effIndexOf().junctions;

  // The end q of a segment that goes towards o, moved to the body of the junction symbol at q (at: its entry in
  // f.place), at most 45 % of the segment: the pipe meets the solid where it enters it.
  function stopAt(at, q, o) {
    if (!at) return q;
    const v = V.sub(o, q), L = V.len(v);
    if (L < 1e-12) return q;
    const d = V.mul(v, 1 / L), { ex, ey, ez } = at.pl.axes;
    const t = Math.min(V.solidReach(at.model, [V.dot(d, ex), V.dot(d, ey), V.dot(d, ez)]) * at.pl.du, L * 0.45);
    return V.add(q, V.mul(d, t));
  }

  // the floor: the working plane, or the lowest point of the scene when lower
  function floorOf(routes, levelZ) {
    let z = levelZ;
    for (const pts of routes.values()) for (const q of pts) z = Math.min(z, q[2]);
    return z;
  }

  // ------------------------------------------------------------ the frame
  // Everything a drawing needs: the camera, the results and the scene projected and sorted from the farthest to the
  // nearest item. light: a frame while something moves, without flow arrows and fading.
  function frameOf(svg, light) {
    const box = svg.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    const vp = { w: box.width, h: box.height };
    const m = app.model, v = m.view3, isoView = v.mode === 'iso';
    const cam = S3.camera();
    const res = app.okResults();
    const gas = PumpIt.model.isCompressible(app.eff());
    CS.syncPicker(document.getElementById('overlay-select'), gas, app.prefs.overlay);
    const ovKey = CS.offered(app.prefs.overlay, gas) ? app.prefs.overlay : 'none';
    const unitOf = (cat) => app.outUnit('canvas', cat);
    const conv = res ? { rho: res.fluid.rho, patm: res.patm } : {};
    // positions and routes of the scene, with the preview of a drag in progress
    const sc = S3.scene(UI.edit3d.preview());
    const f = {
      svg, vp, m, v, isoView, set: isoView ? v.iso : v.free, cam, res, ovKey, unitOf, gas,
      sel: app.selSet, undef: app.undefSet(), ov: CS.overlayValues(res, ovKey),
      fmtOv: (x, cat) => F.fmt(F.conv(x, cat, unitOf(cat), conv), 3),
      sc, routes: sc.routes, posOf: (j) => sc.pos.get(j.id),
      widths: new Map(), arriving: new Map(), leaving: new Map(), longest: new Map(), place: new Map(), items: [],
    };
    for (const p of m.pipes) {
      if (!f.routes.has(p.id)) continue;
      if (!f.arriving.has(p.down)) f.arriving.set(p.down, p);
      if (!f.leaving.has(p.up)) f.leaving.set(p.up, p);
    }
    f.levelZ = v.level * v.zScale;
    f.floorZ = floorOf(f.routes, f.levelZ);

    // where every junction symbol goes: its axes (along its pipes when it turns with them, §8.11) and its place on
    // the screen, at its size in the scene (D-30)
    for (const j of m.junctions) {
      const p3 = f.posOf(j);
      if (!p3) continue;
      const orient = SO.orientOf(j.type), model = SO.modelOf(j.type);
      const axes = V.solidAxes(orient ? refDir(f, j, orient) : null, j.icon3 ? j.icon3.roll : 0);
      const pl = V.solidPlacement(cam, vp, p3, axes, symbolScale, V.solidRadius(model));
      if (pl) f.place.set(j.id, { j, p3, pl, model });
    }

    // scene items with their depth: pipe segments, flow arrows and junction symbols
    const items = f.items, effP = effPipes();
    for (const p of m.pipes) {
      const pts = f.routes.get(p.id);
      if (!pts) continue;
      const eff = effP.get(p.id) || p;
      const w0 = tubeWidth(eff);
      f.widths.set(p.id, w0);
      const n = pts.length - 1;
      for (let i = 0; i < n; i++) {
        // an end at a junction stops at the body of its symbol
        const q0 = i === 0 ? stopAt(f.place.get(p.up), pts[0], pts[1]) : pts[i];
        const q1 = i === n - 1 ? stopAt(f.place.get(p.down), pts[n], pts[n - 1]) : pts[i + 1];
        const cl = V.clipNear(cam, q0, q1);
        const sc0 = cl && onScreen(f, cl, w0);
        if (!sc0) continue;
        // and the round cap of the tube there too
        const width = (q) => widthAt(sc0.a, sc0.b, sc0.wa, sc0.wb, q);
        const a = i === 0 ? trim(sc0.a, sc0.b, sc0.wa / 2) : sc0.a;
        const b = i === n - 1 ? trim(sc0.b, a, sc0.wb / 2) : sc0.b;
        const wa = width(a), wb = width(b);
        const s = {
          p, eff, i, a, b, wa, wb, w: (wa + wb) / 2, taper: tapered(wa, wb), p3: cl, inA: i > 0, inB: i < n - 1,
          depth: sc0.depth, k: (2 * sc0.a.k * sc0.b.k) / (sc0.a.k + sc0.b.k), len: Math.hypot(b.x - a.x, b.y - a.y),
        };
        items.push({ kind: 'seg', depth: s.depth, s });
        const best = f.longest.get(p.id);
        if (!best || s.len > best.len) f.longest.set(p.id, s);
      }
    }
    if (!light) for (const s of f.longest.values()) if (s.len > 50 && s.w >= 2) items.push({ kind: 'arrow', depth: s.depth - 1e-6, s }); // R-51
    // a solid too near the camera is left out, though its pipes still stop at its body (D-31)
    for (const at of f.place.values()) if (at.pl.fade > 0) items.push({ kind: 'jct', depth: at.pl.c.depth, j: at.j, c: at.pl.c, at });
    items.sort((x, y) => y.depth - x.depth); // painter's algorithm: the farthest first

    // farther items fade into the background; less when the colours carry results
    let dMin = Infinity, dMax = -Infinity;
    for (const it of items) { dMin = Math.min(dMin, it.depth); dMax = Math.max(dMax, it.depth); }
    const fogMax = light ? 0 : f.ov ? 0.15 : 0.4;
    f.fog = (d) => (dMax - dMin > 1e-9 ? f3((fogMax * (d - dMin)) / (dMax - dMin)) : 0);
    return f;
  }

  // what the editors draw over the scene need
  const editCtx = (f) => ({ cam: f.cam, vp: f.vp, sc: f.sc, floorZ: f.floorZ });

  // the scene as pieces for finding what a point of the screen shows (V.focusDepth, D-31): every pipe segment with the
  // radius of its tube and every junction with that of its click disc, in du
  function pieces(sc = S3.scene()) {
    const out = [], effP = effPipes(), rJ = (SOLID * HIT_R) / V.PLAN_PX;
    for (const p of sc.pos.values()) out.push({ a: p, b: p, r: rJ });
    for (const p of app.model.pipes) {
      const pts = sc.routes.get(p.id);
      if (!pts) continue;
      const r = tubeWidth(effP.get(p.id) || p) / 2 / V.PLAN_PX;
      for (let i = 1; i < pts.length; i++) out.push({ a: pts[i - 1], b: pts[i], r });
    }
    return out;
  }

  // ------------------------------------------------------------ looks shared by the full and the quick frames
  // the look of a pipe: its state classes, the colour of its result, and whether it is solid (dashed when closed,
  // isolated or undefined, R-54)
  function pipeLook(f, p, eff) {
    const key = 'p:' + p.id;
    const r = f.res && f.res.pipes[p.id];
    const isSel = f.sel.has(key), isUndef = f.undef.has(key), isolated = !!(r && r.isolated);
    const cls = [];
    if (isSel) cls.push('sel');
    if (isUndef) cls.push('undef');
    if (eff.closed) cls.push('closed');
    if (isolated) cls.push('iso');
    let color = '', over = false;
    if (f.ov && f.ov.vals.has(p.id)) {
      const x = f.ov.vals.get(p.id);
      color = CS.pipeColor(f.ovKey, x, f.ov.max > f.ov.min ? (x - f.ov.min) / (f.ov.max - f.ov.min) : 0.5, f.gas);
      over = CS.beyondScale(f.ovKey, x, f.gas);
    }
    return { cls, isSel, isUndef, solid: !isUndef && !eff.closed && !isolated, color, over };
  }
  // dashes of a pipe that is not solid, in proportion to the tube: [dash, gap] in widths (null when solid), and as a
  // dash array of a tube w px wide ('' when solid)
  const dashRatios = (look) => (look.solid ? null : look.isUndef ? [0.1, 1.6] : [2.5, 2]);
  const dashOf = (look, w) => { const r = dashRatios(look); return r ? `${f1(w * r[0])} ${f1(w * r[1])}` : ''; };
  // where the dashes go along a tube of len px that is width(t) px wide at t: [[from, to]…], each dash and gap as long
  // as in the dash array at the width where the dash starts
  function dashSpans(len, width, [on, off]) {
    const spans = [];
    for (let t = 0; t < len && spans.length < 400;) {
      const w = width(t);
      spans.push([t, Math.min(len, t + w * on)]);
      t += w * (on + off);
    }
    return spans;
  }
  // ends of the cut and of the halo: short of the bends, so that the segments of one pipe never cut each other, and
  // with their round caps no farther than the tube's at a junction symbol, which they would bite into
  function cutEnds(s) {
    const ga = gapOf(s.wa), gb = gapOf(s.wb);
    return [s.inA ? trim(s.a, s.b, s.wa + ga) : trim(s.a, s.b, ga), s.inB ? trim(s.b, s.a, s.wb + gb) : trim(s.b, s.a, gb)];
  }

  // the classes of a junction
  function junctionLook(f, j) {
    const key = 'j:' + j.id;
    const cls = ['junction'];
    if (f.sel.has(key)) cls.push('sel');
    if (f.undef.has(key)) cls.push('undef');
    const jr = f.res && f.res.junctions[j.id];
    if (jr && jr.isolated) cls.push('iso');
    if (SO.closed(j.type, effJunctions().get(j.id) || j)) cls.push('closed');
    return cls;
  }

  // reference direction of an oriented symbol (§8.11): the last segment of the pipe that arrives, pointing at the
  // junction, or else the first segment of the pipe that leaves; a symbol on a single pipe points into the junction
  function refDir(f, j, orient) {
    const ok = (d) => (d && V.len(d) > 1e-9 ? d : null);
    const lastIn = (p) => { const r = f.routes.get(p.id); return r && V.sub(r[r.length - 1], r[r.length - 2]); };
    const firstOut = (p) => { const r = f.routes.get(p.id); return r && V.sub(r[1], r[0]); };
    const pin = f.arriving.get(j.id), pout = f.leaving.get(j.id);
    if (orient === 'pipe' && !pin) return pout ? ok(V.mul(firstOut(pout) || [0, 0, 0], -1)) : null;
    if (pin) return ok(lastIn(pin));
    return pout ? ok(firstOut(pout)) : null;
  }

  // The symbol of a junction as a solid (D-29): { html, transform, box, fade }. html draws it at the size of a
  // schematic symbol around (0, 0) and transform puts it in place at its size (pl.s), so that a symbol that only moves,
  // grows or shrinks keeps its markup (quick.js); box bounds it on the screen around its centre; fade, its opacity
  // near the camera (1 elsewhere, D-31).
  function junctionIcon(f, it) {
    const { pl, model } = it.at, s = pl.s;
    const drawn = V.drawSolid(model, pl, s);
    const b = drawn.box;
    return {
      html: SO.markup(drawn), transform: `translate(${f1(it.c.x)} ${f1(it.c.y)}) scale(${f3(s)})`,
      box: { x0: b.x0 * s, y0: b.y0 * s, x1: b.x1 * s, y1: b.y1 * s }, fade: f3(pl.fade),
    };
  }

  // ------------------------------------------------------------ the full drawing
  // across a segment, the unit vector towards the light (the top left of the screen)
  function lightSide(s) {
    const len = s.len || 1;
    const nx = -(s.b.y - s.a.y) / len, ny = (s.b.x - s.a.x) / len;
    return nx * -0.6 + ny * -0.8 < 0 ? [-nx, -ny] : [nx, ny];
  }

  // The layers of a tube of one width, as lines: the cut, the halo of the selection, the edge beyond the colour scale,
  // the tube (dashed when it is not solid), its shading (darker away from the light, a highlight towards it) and the
  // fog; and the wider invisible line that takes the clicks.
  function evenTube(f, s, look) {
    const { a, b, w } = s;
    const L = coords(a, b);
    const [ca, cb] = cutEnds(s);
    const LC = coords(ca, cb);
    const dash = dashOf(look, w);
    // under a tube that is not solid the cut is dashed in step with it, so that no gap shows the cut, which would bite
    // into the symbol at an end
    const cutDash = dash ? `;stroke-dasharray:${dash};stroke-dashoffset:${f1(Math.hypot(ca.x - a.x, ca.y - a.y))}` : '';
    let o = `<line class="cut" ${LC} style="stroke-width:${f1(cutWidth(w))}${cutDash}"/>`;
    if (look.isSel) o += `<line class="halo" ${LC} style="stroke-width:${f1(w + 7)}"/>`;
    if (look.over) o += `<line class="tube-edge" ${LC} style="stroke-width:${f1(w + 3)}"/>`;
    o += `<line class="tube" ${L} style="stroke-width:${f1(w)}${look.color ? ';stroke:' + look.color : ''}${dash ? ';stroke-dasharray:' + dash : ''}"/>`;
    if (look.solid) {
      const [nx, ny] = lightSide(s);
      const off = (k) => `x1="${f1(a.x + nx * k)}" y1="${f1(a.y + ny * k)}" x2="${f1(b.x + nx * k)}" y2="${f1(b.y + ny * k)}"`;
      o += `<line class="tube-shade" ${off(-w * 0.25)} style="stroke-width:${f1(w * 0.5)}"/><line class="tube-gloss" ${off(w * 0.2)} style="stroke-width:${f1(Math.max(1, w * 0.22))}"/>`;
    }
    const fg = look.isSel ? 0 : f.fog(s.depth);
    if (fg > 0.02) o += `<line class="fog" ${L} style="stroke-width:${f1(w + 1)};opacity:${fg}"/>`;
    return { body: o, hit: `<line class="hit" ${L} style="stroke-width:${f1(Math.max(14, w + 8))}"/>` };
  }

  // The outlines of a tube wider at one end (perspective, D-30) and of the layers under it, as path data, each the
  // outline of the tube made wider or narrower by a margin (capsule): tube, the tube or, when it is not solid, its
  // dashes as short tapered tubes; cut, under them as in evenTube; halo() and edge(), of the selection and of a value
  // beyond the colour scale; around(t0, t1, m), the outline from t0 to t1 px along the tube with the radius of each end
  // its half width plus m(width). The full and the quick frames draw the same shapes (D-32).
  function taperedShapes(s, look) {
    const { a, b, wa, wb } = s;
    const len = s.len || 1, width = (t) => wa + ((wb - wa) * t) / len;
    const at = (t) => ({ x: a.x + ((b.x - a.x) * t) / len, y: a.y + ((b.y - a.y) * t) / len });
    const along = (q) => Math.hypot(q.x - a.x, q.y - a.y);
    const [tca, tcb] = cutEnds(s).map(along);
    const around = (t0, t1, m) => capsule(at(t0), at(t1), width(t0) / 2 + m(width(t0)), width(t1) / 2 + m(width(t1)));
    const ratios = dashRatios(look);
    const spans = ratios ? dashSpans(len, width, ratios) : [[0, len]];
    const cut = spans.map(([t0, t1]) => [Math.max(t0, tca), Math.min(t1, tcb)]).filter(([t0, t1]) => t1 >= t0);
    return {
      tube: spans.map(([t0, t1]) => around(t0, t1, () => 0)).join(''),
      cut: cut.map(([t0, t1]) => around(t0, t1, gapOf)).join(''),
      halo: () => around(tca, tcb, () => 3.5),
      edge: () => around(tca, tcb, () => 1.5),
      around, len,
    };
  }

  // The same layers of a tube wider at one end, as those shapes; the shading is two bands along it.
  function taperedTube(f, s, look) {
    const { a, b, wa, wb } = s;
    const sh = taperedShapes(s, look);
    const shape = (cls, d, style = '') => `<path class="${cls} tp" d="${d}"${style ? ` style="${style}"` : ''}/>`;
    let o = shape('cut', sh.cut);
    if (look.isSel) o += shape('halo', sh.halo());
    if (look.over) o += shape('tube-edge', sh.edge());
    o += shape('tube', sh.tube, look.color ? `fill:${look.color}` : '');
    if (look.solid) {
      const [nx, ny] = lightSide(s);
      // the band from k0 to k1 widths off the axis of the tube, towards the light
      const band = (k0, k1) => [[a, wa, k0], [b, wb, k0], [b, wb, k1], [a, wa, k1]].map(([c, w, k], i) => `${i ? 'L' : 'M'}${f1(c.x + nx * k * w)} ${f1(c.y + ny * k * w)}`).join('') + 'Z';
      o += shape('tube-shade', band(-0.5, 0)) + shape('tube-gloss', band(0.09, 0.31));
    }
    const fg = look.isSel ? 0 : f.fog(s.depth);
    if (fg > 0.02) o += shape('fog', sh.around(0, sh.len, () => 0.5), `opacity:${fg}`);
    return { body: o, hit: shape('hit', sh.around(0, sh.len, (w) => Math.max(4, 7 - w / 2))) };
  }

  function segment(f, s) {
    const { p } = s;
    const look = pipeLook(f, p, s.eff);
    const tube = s.taper ? taperedTube(f, s, look) : evenTube(f, s, look);
    let o = `<g class="${['pipe', ...look.cls].join(' ')}" data-p="${p.id}" data-i="${s.i}">${tube.body}`;
    // in the isometric view, a straight pipe off the axes gets a thin dashed outline (R-30)
    if (f.isoView && p.snap3 === false && !V.axisOf(s.p3[0], s.p3[1])) o += `<line class="offgrid" ${coords(s.a, s.b)}/>`;
    return o + tube.hit + '</g>';
  }

  // flow direction (R-51): in the middle of the longest segment, along the flow when there are results; on a thin tube
  // a little wider than the tube, and never more than ARROW_MAX px, since it marks the pipe like its labels (D-31)
  const ARROW_MAX = 16;
  function arrow(f, s) {
    const r = f.res && f.res.pipes[s.p.id];
    const flip = r && !r.isolated && r.m < 0;
    const ang = (Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x) * 180) / Math.PI + (flip ? 180 : 0);
    const size = Math.min(ARROW_MAX, Math.max(s.w * 0.8, Math.min(5, s.w * 1.25)));
    return `<path class="flow-arrow" d="M5 0L-4 -4.5L-4 4.5z" transform="translate(${f1((s.a.x + s.b.x) / 2)} ${f1((s.a.y + s.b.y) / 2)}) rotate(${f1(ang)}) scale(${f3(size / 9)})"/>`;
  }

  function junction(f, it) {
    const { j } = it;
    const fg = f.sel.has('j:' + j.id) ? 0 : f.fog(it.depth);
    const icon = junctionIcon(f, it), s = it.at.pl.s;
    it.box = icon.box; // the labels go around it
    const hit = `<circle class="shit" r="${f1(Math.max(HIT_R, HIT_PX / s))}"/>`;
    const style = (fg > 0.02 ? `--fog:${fg};` : '') + (icon.fade < 1 ? `--near:${icon.fade}` : '');
    return `<g class="${junctionLook(f, j).join(' ')}" data-j="${j.id}" transform="${icon.transform}"${style ? ` style="${style}"` : ''}>${hit}${icon.html}</g>`;
  }

  // labels (R-52, R-53, §10.3): kept only where they do not collide with one already placed
  function labels(f) {
    const cands = [];
    for (const it of f.items) {
      if (it.kind !== 'jct') continue;
      const { j, c } = it;
      const key = 'j:' + j.id, pri = f.sel.has(key) ? 0 : 1;
      if (pri && smallest(c.k)) continue; // D-30
      const effJ = effJunctions().get(j.id) || j;
      // under and over the symbol, which may be tall
      const s = it.at.pl.s, box = it.box || { y0: -16 * s, y1: 16 * s };
      cands.push({ pri, cls: 'j-label', text: 'J' + j.id, x: c.x, y: c.y + box.y1 + 12 });
      if (effJ.name) cands.push({ pri, cls: 'j-name', text: effJ.name, x: c.x, y: c.y + box.y1 + 24 });
      const jr = f.res && f.res.junctions[j.id];
      if (jr && f.ovKey !== 'none' && !jr.isolated) {
        const text = f.ovKey === 'HGL' ? `${f.fmtOv(jr.HGL, 'head')} ${F.unit(f.unitOf('head'))}` : `${f.fmtOv(jr.Pin, 'pressure')} ${F.unit(f.unitOf('pressure'))}`;
        cands.push({ pri, cls: 'j-val', text, x: c.x, y: c.y + box.y0 - 6 });
      }
    }
    for (const s of f.longest.values()) {
      if (s.len < 40) continue;
      const key = 'p:' + s.p.id, pri = f.sel.has(key) ? 0 : 2;
      if (pri && smallest(s.k)) continue; // D-30
      // along the segment in the isometric view, never upside down; horizontal in 3D
      let ang = 0;
      if (f.isoView) {
        ang = (Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x) * 180) / Math.PI;
        if (ang > 90) ang -= 180; else if (ang <= -90) ang += 180;
      }
      const x = (s.a.x + s.b.x) / 2, y = (s.a.y + s.b.y) / 2;
      cands.push({ pri, size: s.len, cls: 'p-label', text: 'P' + s.p.id, x, y, ang, dy: -(s.w / 2 + 5) });
      if (f.ov && f.ov.vals.has(s.p.id)) {
        cands.push({ pri, size: s.len, cls: 'p-val', text: CS.labelOf(f.fmtOv, f.unitOf, f.ov.vals.get(s.p.id), CS.OVERLAY[f.ovKey].cat), x, y, ang, dy: s.w / 2 + 13 });
      }
    }
    // the selection first, then the junctions, then the pipes from the longest on the screen
    cands.sort((a, b) => a.pri - b.pri || (b.size || 0) - (a.size || 0));
    const placed = [], out = [];
    for (const cd of cands) {
      const W = cd.text.length * CHAR_W, dy = cd.dy || 0, an = ((cd.ang || 0) * Math.PI) / 180;
      const cs = Math.cos(an), sn = Math.sin(an);
      const xs = [], ys = [];
      for (const [u, z] of [[-W / 2, dy - LINE_UP], [W / 2, dy - LINE_UP], [-W / 2, dy + LINE_DOWN], [W / 2, dy + LINE_DOWN]]) {
        xs.push(cd.x + u * cs - z * sn);
        ys.push(cd.y + u * sn + z * cs);
      }
      const rc = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
      if (rc.x1 < 0 || rc.y1 < 0 || rc.x0 > f.vp.w || rc.y0 > f.vp.h) continue;
      if (placed.some((q) => rc.x0 < q.x1 && rc.x1 > q.x0 && rc.y0 < q.y1 && rc.y1 > q.y0)) continue;
      placed.push(rc);
      const at = cd.ang ? `transform="translate(${f1(cd.x)} ${f1(cd.y)}) rotate(${f1(cd.ang)})" x="0" y="${f1(dy)}"` : `x="${f1(cd.x)}" y="${f1(cd.y + dy)}"`;
      out.push(`<text class="${cd.cls}" ${at} text-anchor="middle">${F.esc(cd.text)}</text>`);
    }
    return `<g class="g3-labels">${out.join('')}</g>`;
  }

  // the grid: three families of lines in the isometric view (§8.5), the working plane fading with the distance from
  // the target in the free 3D view (§8.6)
  function grid(f) {
    const { cam, vp, v } = f;
    const line = (l) => `<line${l.major ? ' class="major"' : ''} x1="${f1(l.x1)}" y1="${f1(l.y1)}" x2="${f1(l.x2)}" y2="${f1(l.y2)}"/>`;
    if (f.isoView) return `<g class="g3-grid">${V.isoGridLines(cam, vp, v.step, v.major).map(line).join('')}</g>`;
    const lines = V.planeGridLines(cam, vp, f.levelZ, v.step, v.major, 40);
    const c = V.project(cam, vp, cam.target) || { x: vp.w / 2, y: vp.h / 2 };
    const e = V.project(cam, vp, V.add(cam.target, V.mul(V.basis(cam).r, 30 * v.step)));
    const rad = e ? Math.max(80, Math.hypot(e.x - c.x, e.y - c.y)) : Math.max(vp.w, vp.h) / 2;
    return `<defs><radialGradient id="g3-fade-g" gradientUnits="userSpaceOnUse" cx="${f1(c.x)}" cy="${f1(c.y)}" r="${f1(rad)}">`
      + '<stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
      + `<mask id="g3-fade"><rect width="100%" height="100%" fill="url(#g3-fade-g)"/></mask></defs><g class="g3-grid" mask="url(#g3-fade)">${lines.map(line).join('')}</g>`;
  }

  // shadow of every raised pipe and junction on the floor
  function shadows(f) {
    const { cam, vp, floorZ } = f;
    const down = (q) => [q[0], q[1], floorZ];
    const raised = (q) => q[2] - floorZ > 1e-6;
    const out = [];
    for (const [pid, pts] of f.routes) {
      for (let i = 0; i < pts.length - 1; i++) {
        if (!raised(pts[i]) && !raised(pts[i + 1])) continue;
        const cl = V.clipNear(cam, down(pts[i]), down(pts[i + 1]));
        const sh = cl && onScreen(f, cl, f.widths.get(pid));
        if (!sh) continue;
        out.push(tapered(sh.wa, sh.wb) ? `<path d="${capsule(sh.a, sh.b, sh.wa / 2, sh.wb / 2)}"/>` : `<line ${coords(sh.a, sh.b)} style="stroke-width:${f1((sh.wa + sh.wb) / 2)}"/>`);
      }
    }
    for (const at of f.place.values()) {
      const p = at.p3;
      if (!raised(p)) continue;
      const foot = down(p), c = V.project(cam, vp, foot);
      if (!c) continue;
      const rDu = SO.footOf(at.j.type) * 0.8 * at.pl.du;
      const ex = V.screenVec(cam, vp, foot, V.AX.x), ey = V.screenVec(cam, vp, foot, V.AX.y);
      out.push(`<circle r="1" transform="matrix(${f3(ex[0] * rDu)} ${f3(ex[1] * rDu)} ${f3(ey[0] * rDu)} ${f3(ey[1] * rDu)} ${f1(c.x)} ${f1(c.y)})"/>`);
    }
    return `<g class="g3-shadows">${out.join('')}</g>`;
  }

  // drop lines (R-48): from every junction down to the floor, with a mark at the foot
  function stems(f) {
    const { cam, vp, floorZ } = f;
    const out = [];
    for (const j of f.m.junctions) {
      const p = f.posOf(j);
      if (Math.abs(p[2] - floorZ) < 1e-9) continue;
      const cl = V.clipNear(cam, p, [p[0], p[1], floorZ]);
      const a = cl && V.project(cam, vp, cl[0]), b = cl && V.project(cam, vp, cl[1]);
      if (a && b) out.push(`<line ${coords(a, b)}/><circle cx="${f1(b.x)}" cy="${f1(b.y)}" r="2.5"/>`);
    }
    return `<g class="g3-stems">${out.join('')}</g>`;
  }

  // light: a quick frame while the camera or a dragged object moves (R-62, quick.js)
  function render(svg, { light = false } = {}) {
    const f = frameOf(svg, light);
    if (!f) return;
    if (light) { UI.quick3d.frame(f); return; }
    UI.quick3d.drop();
    let out = SO.defs();
    if (f.set.grid) out += grid(f);
    if (f.set.shadows) out += shadows(f);
    if (!f.isoView && f.v.free.stems) out += stems(f);
    out += `<g class="g3-scene">${f.items.map((it) => (it.kind === 'seg' ? segment(f, it.s) : it.kind === 'arrow' ? arrow(f, it.s) : junction(f, it))).join('')}</g>`;
    out += labels(f);
    out += `<g class="g3-edit">${UI.edit3d.overlay(editCtx(f))}</g>`;
    svg.innerHTML = out;
    CS.renderLegend(document.getElementById('legend'), f.ov, f.ovKey, f.unitOf, f.fmtOv, f.gas);
  }

  // only the marks of the editors (the pipe being drawn, the markers), over a scene that is still right
  function renderEdit(svg) {
    const g = svg.querySelector('.g3-edit');
    const box = svg.getBoundingClientRect();
    if (!g || !box.width) { UI.canvas.render(); return; }
    const sc = S3.scene(UI.edit3d.preview());
    const v = app.model.view3;
    g.innerHTML = UI.edit3d.overlay({ cam: S3.camera(), vp: { w: box.width, h: box.height }, sc, floorZ: floorOf(sc.routes, v.level * v.zScale) });
  }

  PumpIt.ui.render3d = {
    render, renderEdit, tubeWidth, symbolRadius, cutWidth, capsule, tapered, frameOf, editCtx, pieces, grid, pipeLook, dashOf, cutEnds, taperedShapes, junctionLook, junctionIcon,
  };
})(window);
