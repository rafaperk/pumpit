// 3D views: the junction symbols as solids on the screen (decision D-29 of docs/3D-VIEWS.md). The geometry comes
// from the core (src/core/view3d/solids.js) and the shape of every type from its view (src/ui/junctions/, property
// solid). This file turns a drawn symbol into SVG: the faces of one material and one shade in a single path, an
// outline around every part, the balls as shaded discs and the letters on top. The colours come from the style sheet
// (view3d.css): a material sets --m and a shade mixes it with black or white, in both themes.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, V = PumpIt.view3d;
  const views = UI.junctionTypes;
  const f1 = (v) => Math.round(v * 10) / 10;

  const FALLBACK = { parts: [V.solid.ball([0, 0, 0], 7, 'node')], reach: [V.solid.ball([0, 0, 0], 7)] };
  const modelOf = (type) => views.get(type).solid || FALLBACK;
  // how the symbol of a type turns with its pipes: 'ports', 'pipe', or null (it stands upright)
  function orientOf(type) {
    const v = views.get(type);
    return (v.solid && v.solid.orient) || v.orient || null;
  }
  // the junction j (effective, of the current scenario) stops the flow
  function closed(type, j) {
    const v = views.get(type);
    return !!(v.closed && j && v.closed(j));
  }

  // radius (symbol px) of the shadow of a symbol on the floor: the reach of its body across
  const feet = new WeakMap();
  function footOf(type) {
    const m = modelOf(type);
    if (!feet.has(m)) feet.set(m, Math.max(...[[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]].map((d) => V.solidReach(m, d))));
    return feet.get(m);
  }

  const poly = (pts) => 'M' + pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
  const ellipse = (b) => `M${f1(b.x - b.rx)} ${f1(b.y)}a${f1(b.rx)} ${f1(b.ry)} 0 1 0 ${f1(2 * b.rx)} 0a${f1(b.rx)} ${f1(b.ry)} 0 1 0 ${f1(-2 * b.rx)} 0Z`;
  const byLook = (a, b) => (a.mat < b.mat ? -1 : a.mat > b.mat ? 1 : a.shade - b.shade);

  // Markup of a drawn symbol (drawSolid) around (0, 0): the halo of the selection (the outlines of all the parts,
  // under them), the parts from the farthest to the nearest and the letters. The faces of a convex part never
  // overlap, so they are grouped freely; a tank keeps its order. The full drawing puts an invisible disc that takes
  // the clicks under it (render.js).
  function markup(drawn) {
    let halo = '', body = '';
    for (const p of drawn.parts) {
      if (p.kind === 'faces') {
        let look = '', d = '';
        for (const fc of p.fixed ? p.faces : p.faces.slice().sort(byLook)) {
          const k = `${fc.mat} k${fc.shade}`;
          if (k !== look) { if (d) body += `<path class="sf m-${look}" d="${d}"/>`; look = k; d = ''; }
          d += poly(fc.pts);
        }
        body += `<path class="sf m-${look}" d="${d}"/>`;
        const h = poly(p.hull);
        body += `<path class="so" d="${h}"/>`;
        halo += h;
      } else if (p.kind === 'ball') {
        body += `<ellipse class="sb" cx="${f1(p.x)}" cy="${f1(p.y)}" rx="${f1(p.rx)}" ry="${f1(p.ry)}" fill="url(#s3-${p.mat})"/>`;
        halo += ellipse(p);
      } else if (p.kind === 'text') {
        body += `<text class="st" x="${f1(p.x)}" y="${f1(p.y)}" style="font-size:${f1(p.size)}px">${p.str}</text>`;
      }
    }
    return `${halo ? `<path class="sh" d="${halo}"/>` : ''}${body}`;
  }

  // the shading of the balls, one gradient per material, lit from the top left like the faces
  const BALLS = ['node', 'press', 'liquid'];
  const stop = (at, mix) => `<stop offset="${at}" style="stop-color:${mix}"/>`;
  const defs = () => `<defs>${BALLS.map((m) => `<radialGradient id="s3-${m}" cx=".36" cy=".32" r=".72">${stop(0, `color-mix(in srgb,var(--m3-${m}) 50%,#fff)`)}${stop(0.5, `var(--m3-${m})`)}${stop(1, `color-mix(in srgb,var(--m3-${m}) 55%,#000)`)}</radialGradient>`).join('')}</defs>`;

  PumpIt.ui.solids3d = { modelOf, orientOf, closed, footOf, markup, defs };
})(window);
