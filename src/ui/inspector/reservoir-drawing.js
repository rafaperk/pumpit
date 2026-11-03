// Drawing of a reservoir at the top of its data: the tank cut through, with what its fields give on one vertical scale.
// On the left, its own elevations (the liquid level and the bottom); above, the surface pressure; on the right wall,
// each pipe where the calculation connects it (pipeEndElevation of src/core/junctions/reservoir.js), labelled in the
// reference of the per-pipe table: its elevation, its depth below the surface (with a dimension from the surface) or
// the bottom. A pipe above the surface discharges in free fall. The panel draws it again on every change, and the field
// with the focus or under the pointer lights its part of it. For a gas (compressible mode) the tank is a closed vessel
// and the level is the reference elevation of its pressure. A finite tank of the time simulation has its walls up to its
// top and its floor at its own bottom (with the elevation of the reservoir apart when it differs).
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, U = PumpIt.units, UI = PumpIt.ui;
  const F = UI.format;
  const { el } = UI.dom;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.reservoir.drawing.' + key, params);

  const fin = (x) => x && Number.isFinite(x.value);
  const si = (x, cat) => U.toSI(x.value, x.unit, cat);
  // a length (m) in the unit u, to six significant digits: a value as typed, a converted one without its tail
  const inUnit = (m, u) => +U.fromSI(m, u, 'length').toPrecision(6);
  const num = (v) => F.inputStr(v).replace('-', '−');

  // the frame (px): labels of the reservoir on the left, the walls, the pipes leaving the right wall and their labels;
  // the scale of elevations runs from TOP (the highest thing drawn) down to FLOOR (the lowest)
  const W = 308, X0 = 104, X1 = 178, CX = (X0 + X1) / 2, STUB = 14, LAB = X1 + STUB + 12, RIM = 34, TOP = 50, FLOOR = 148;
  const ROW = 12; // a line of text on the right
  const FITS = 17; // characters of a label that fit on one line on the right

  // spreads labels, sorted by the centre they want (y), at least their heights apart and within [lo, hi] when they fit;
  // returns the bottom of the last one
  function spread(items, lo, hi) {
    items.sort((a, b) => a.y - b.y);
    let prev = null;
    for (const it of items) { it.c = Math.max(it.y, prev ? prev.c + (prev.h + it.h) / 2 : lo + it.h / 2); prev = it; }
    let next = null;
    for (const it of items.slice().reverse()) { it.c = Math.min(it.c, next ? next.c - (next.h + it.h) / 2 : hi - it.h / 2); next = it; }
    prev = null;
    for (const it of items) { it.c = Math.max(it.c, prev ? prev.c + (prev.h + it.h) / 2 : lo + it.h / 2); prev = it; }
    return prev ? prev.c + prev.h / 2 : lo;
  }

  // a vertical dimension from y1 to y2, with its arrowheads
  function dim(x, y1, y2) {
    const head = (y, d) => `M${x} ${y}l-2.5 ${-5 * d}h5z`;
    const d = y2 > y1 ? 1 : -1;
    return `<path class="dim" d="M${x} ${y1}V${y2}"/><path class="arrow" d="${head(y1, -d)}${head(y2, d)}"/>`;
  }

  function build(ctx) {
    const { j, gas } = ctx;
    const def = M.JT[j.type];
    const u = (j.liquidElev && j.liquidElev.unit) || 'm';
    const len = (m) => (Number.isFinite(m) ? `${num(inUnit(m, u))} ${F.unit(u)}` : '—');
    const zL = fin(j.liquidElev) ? si(j.liquidElev, 'length') : NaN;
    const zB = fin(j.elevation) ? si(j.elevation, 'length') : NaN;
    const depth = j.connBy === 'depth';
    const field = depth ? 'depth' : 'elev';
    // a finite tank: its bottom and its top
    const TK = PumpIt.time && PumpIt.time.tanks;
    const tank = !gas && !!TK && TK.isFinite(j) && fin(j.tank.bottom) && fin(j.tank.height) && j.tank.height.value > 0;
    const zTb = tank ? si(j.tank.bottom, 'length') : NaN;
    const zTt = tank ? zTb + si(j.tank.height, 'length') : NaN;
    const apart = tank && Number.isFinite(zB) && Math.abs(zB - zTb) > 1e-9;
    const roof = tank && j.tank.model === 'closed';

    // each pipe where the calculation connects it: its own elevation or depth, or the bottom; pipes at one place and
    // with one label share a stub
    const groups = new Map();
    for (const p of M.pipesAt(app.model, j.id)) {
      const pk = (j.pipeK && j.pipeK[p.id]) || {};
      const own = fin(pk[field]);
      const zOwn = def.pipeEndElevation(j, pk, si);
      const z = zOwn !== undefined ? zOwn : zB;
      const label = !own ? tx('atBottom') : depth ? tx('atDepth', { d: len(si(pk.depth, 'length')) }) : tx('atElev', { z: len(z) });
      const k = (Number.isFinite(z) ? z.toFixed(6) : '') + '|' + label;
      if (!groups.has(k)) {
        groups.set(k, {
          ids: [], z, label, dimmed: own && depth,
          above: !gas && Number.isFinite(zL) && z > zL + 1e-9,
          below: Number.isFinite(zB) && z < zB - 1e-9,
        });
      }
      groups.get(k).ids.push(p.id);
    }
    const list = [...groups.values()];

    const zs = [zB, zL, zTb, zTt, ...list.map((g) => g.z)].filter(Number.isFinite);
    const lo = zs.length ? Math.min(...zs) : 0;
    const hi = zs.length && Math.max(...zs) - lo > 1e-9 ? Math.max(...zs) : lo + 1;
    const Y = (z) => FLOOR - ((z - lo) / (hi - lo)) * (FLOOR - TOP);
    const yB = Number.isFinite(zB) ? Y(zB) : FLOOR;
    const yS = Number.isFinite(zL) ? Y(zL) : NaN;
    // the floor and the rim of the walls: those of a finite tank, or the bottom of the reservoir and the top of the frame
    const yF = tank ? Y(zTb) : yB, yT = tank ? Y(zTt) : RIM;
    const parts = [];

    // the tank (or the vessel of a gas), its liquid and its floor
    if (gas) parts.push(`<rect class="wall gasfill" x="${X0}" y="${RIM}" width="${X1 - X0}" height="${Math.max(yB - RIM, 8)}" rx="9"/>`);
    else {
      if (yS < yF) parts.push(`<rect class="liq" x="${X0}" y="${yS}" width="${X1 - X0}" height="${yF - yS}"/>`);
      // a closed tank: a roof, and its gas above the liquid
      if (roof && yS > yT) parts.push(`<rect class="gasfill" x="${X0}" y="${yT}" width="${X1 - X0}" height="${yS - yT}"/>`);
      parts.push(`<path class="wall" d="M${X0} ${yT}V${yF}H${X1}V${yT}${roof ? 'Z' : ''}"/>`);
    }

    // the reservoir's own elevations, on the left
    const levelName = t(gas ? 'junctions.reservoir.form.gasElev' : 'junctions.reservoir.form.liquidElev');
    const out = tank ? zL < zTb - 1e-9 || zL > zTt + 1e-9 : zL < zB - 1e-9;
    const left = [
      { part: 'level', name: levelName, value: len(zL), y: Number.isFinite(yS) ? yS : TOP, at: yS, h: 28, bad: out },
      { part: apart || !tank ? 'bottom' : 'bottom tankBottom', name: t('junctions.reservoir.elevation'), value: len(zB), y: yB, at: Number.isFinite(zB) ? yB : NaN, h: 28 },
    ];
    if (tank) {
      left.push({ part: 'top', name: t('time.tank.top'), value: len(zTt), y: yT, at: yT, h: 28 });
      if (apart) left.push({ part: 'tankBottom', name: t('time.tank.bottom'), value: len(zTb), y: yF, at: yF, h: 28 });
    }
    let bottom = Math.max(spread(left, 32, FLOOR + 22), FLOOR + 22);
    for (const it of left) {
      const lead = Number.isFinite(it.at) ? `<path class="lead" d="M2 ${it.c}H${X0 - 18}L${X0 - 2} ${it.at}"/>` : '';
      let mark = '';
      if (it.part === 'level' && Number.isFinite(yS)) {
        // the surface: a line across the tank with the mark of a liquid level, or the reference line of a gas
        mark = gas ? `<path class="ref" d="M${X0} ${yS}H${X1}"/>`
          : `<path class="surf" d="M${X0} ${yS}H${X1}"/><path class="surf" d="M${X0 + 9} ${yS - 8}h10l-5 7z"/><path class="surf" d="M${X0 + 10} ${yS + 3}h8M${X0 + 12} ${yS + 6}h4"/>`;
      }
      // the floor; the elevation of a reservoir whose tank has its bottom elsewhere is a line of reference
      if (it.part.startsWith('bottom')) mark = apart ? `<path class="ref" d="M${X0} ${yB}H${X1}"/>` : `<path class="floor" d="M${X0 + (gas ? 9 : 0)} ${yB}H${X1 - (gas ? 9 : 0)}"/>`;
      if (it.part === 'tankBottom') mark = `<path class="floor" d="M${X0} ${yF}H${X1}"/>`;
      if (it.part === 'top') mark = roof ? `<path class="floor" d="M${X0} ${yT}H${X1}"/>` : `<path class="floor" d="M${X0 - 6} ${yT}H${X0}M${X1} ${yT}h6"/>`;
      parts.push(`<g data-part="${it.part}">${mark}${lead}<text x="2" y="${it.c - 4}">${F.esc(it.name)}</text><text class="v${it.bad ? ' bad' : ''}" x="2" y="${it.c + 11}">${F.esc(it.value)}</text></g>`);
    }

    // the pressure, above (on the surface of a liquid, with arrows)
    const pName = t(gas ? 'junctions.reservoir.form.gasP' : 'junctions.reservoir.form.surfP');
    const pValue = fin(j.surfP) ? `${num(j.surfP.value)} ${F.unit(j.surfP.unit)}` : '—';
    let arrows = '';
    if (!gas && Number.isFinite(yS)) {
      const y1 = Math.max(29, yS - 15), y2 = yS - 2;
      if (y2 - y1 > 5) for (const x of [X0 + 28, X0 + 42, X0 + 56]) arrows += `<path class="dim" d="M${x} ${y1}V${y2 - 4}"/><path class="arrow" d="M${x} ${y2}l-2.5 -5h5z"/>`;
    }
    parts.push(`<g data-part="pressure"><text x="${CX}" y="11" text-anchor="middle">${F.esc(pName)}</text><text class="v" x="${CX}" y="24" text-anchor="middle">${F.esc(pValue)}</text>${arrows}</g>`);

    // the pipes on the right wall, from the highest; a depth gets its dimension from the surface
    list.sort((a, b) => (Number.isFinite(b.z) ? b.z : -Infinity) - (Number.isFinite(a.z) ? a.z : -Infinity));
    const right = list.map((g) => {
      const ids = (g.ids.length > 3 ? g.ids.slice(0, 3) : g.ids).map((id) => 'P' + id).join(', ') + (g.ids.length > 3 ? ` +${g.ids.length - 3}` : '');
      const one = ids.length + 1 + g.label.length <= FITS;
      const lines = (one ? 1 : 2) + (g.above || g.below ? 1 : 0);
      const y = Number.isFinite(g.z) ? Y(g.z) : yB;
      return { g, ids, one, y: y + (lines - 1) * ROW / 2, at: y, h: lines * ROW + 2 };
    });
    bottom = Math.max(bottom, spread(right, 32, FLOOR + 22));
    let k = 0;
    for (const it of right) {
      const { g, at } = it;
      const top = it.c - it.h / 2 + 1;
      const first = top + ROW / 2; // the middle of the first line
      let s = `<path class="pipe" d="M${X1} ${at}h${STUB}"/><path class="lead" d="M${X1 + STUB} ${at}L${LAB - 3} ${first}"/>`;
      // the jet falls to the surface, or to the floor of a tank whose level is below its bottom
      if (g.above && Number.isFinite(yS)) s += `<path class="fall" d="M${X1} ${at}C${X1 - 6} ${at} ${X1 - 8} ${at + 4} ${X1 - 8} ${Math.max(at + 8, Math.min(yS, yB))}"/>`;
      else if (g.dimmed && Number.isFinite(yS) && Math.abs(at - yS) > 6 && k < 6) {
        const x = X1 - 8 - 6 * k++;
        s += `<path class="lead" d="M${x} ${at}H${X1}"/>${dim(x, yS, at)}`;
      }
      const id = `<tspan class="id">${F.esc(it.ids)}</tspan>`, val = `<tspan class="v">${F.esc(g.label)}</tspan>`;
      let y = top + ROW - 2;
      s += it.one ? `<text x="${LAB}" y="${y}">${id} ${val}</text>` : `<text x="${LAB}" y="${y}">${id}</text><text x="${LAB}" y="${(y += ROW)}">${val}</text>`;
      if (g.above) s += `<text class="note" x="${LAB}" y="${y + ROW}">${F.esc(tx('freeFall'))}</text>`;
      else if (g.below) s += `<text class="note bad" x="${LAB}" y="${y + ROW}">${F.esc(tx('belowBottom'))}</text>`;
      parts.push(`<g data-part="pipes ${g.ids.map((id) => 'p' + id).join(' ')}">${s}</g>`);
    }

    // what the drawing shows, for a screen reader
    const said = [`${t('junctions.reservoir.elevation')} ${len(zB)}`, `${levelName} ${len(zL)}`, `${pName} ${pValue}`]
      .concat(tank ? [`${t('time.tank.bottom')} ${len(zTb)}`, `${t('time.tank.top')} ${len(zTt)}`] : [])
      .concat(right.map(({ g, ids }) => `${ids}: ${g.label}${g.above ? ', ' + tx('freeFall') : g.below ? ', ' + tx('belowBottom') : ''}`));
    const H = Math.ceil(bottom + 6);
    const box = el('div', {});
    box.innerHTML = `<svg class="res-draw" data-j="${j.id}" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${F.esc(tx('title') + ': ' + said.join('; '))}">${parts.join('')}</svg>`;
    queueMicrotask(light); // once the panel is in the page
    return box;
  }

  // the field with the focus or under the pointer lights its part of the drawing: the bottom, the level, the pressure,
  // one pipe (its row of the per-pipe table) or every pipe (the choice of reference)
  const FIELDS = { elevation: 'bottom', liquidElev: 'level', surfP: 'pressure', connBy: 'pipes', tank_bottom: 'tankBottom', tank_height: 'top' };
  function partOf(node) {
    const box = node && node.closest ? node.closest('.field, tr') : null;
    const c = box && box.querySelector('input[id], select[id], [role="radiogroup"][id]');
    if (!c) return null;
    let m = c.id.match(/^f-j_(\d+)-(\w+?)(?:-u)?$/);
    if (m && FIELDS[m[2]]) return { j: m[1], part: FIELDS[m[2]] };
    m = c.id.match(/^pk-(\d+)-(\d+)-/);
    return m ? { j: m[1], part: 'p' + m[2] } : null;
  }
  let hover = null;
  function light() {
    const svgs = typeof document === 'undefined' ? [] : document.querySelectorAll('.res-draw');
    if (!svgs.length) return;
    // (a field drawn again under a still pointer is no longer hovered: it has left the page)
    const on = [partOf(document.activeElement), hover && hover.isConnected ? partOf(hover) : null].filter(Boolean);
    for (const svg of svgs) {
      for (const g of svg.querySelectorAll('[data-part]')) {
        const mine = g.dataset.part.split(' ');
        g.classList.toggle('hl', on.some((o) => o.j === svg.dataset.j && mine.includes(o.part)));
      }
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('focusin', light);
    document.addEventListener('focusout', light);
    document.addEventListener('pointerover', (e) => { hover = e.target; light(); });
  }

  PumpIt.ui.reservoirDrawing = { build };
})(typeof window !== 'undefined' ? window : globalThis);
