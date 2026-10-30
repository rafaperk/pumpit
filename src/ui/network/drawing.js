// SVG markup of the network: grid, pipes (with flow arrows, number, name and result labels, and a ring at a loose
// end), junction symbols, the handles at the ends of the selected pipe, the pipe being drawn and the selection box.
// Junction symbols and their orientation come from the junction views.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, app = PumpIt.app;
  const F = UI.format, CS = UI.colorScales;
  const views = UI.junctionTypes;
  const { t } = PumpIt.i18n;

  const R = 16;        // touch radius of the junctions
  const LOOSE_R = 5;   // the ring of a loose end (docs/pipe-ends.md)
  const HANDLE_R = 5;  // the handles at the ends of the selected pipe

  // Where an end of the pipe p is drawn: { x, y, r (the gap the line leaves there), loose }, its junction or its
  // loose spot; null when neither is known. While that end is dragged (drag.kind 'end'), the junction it would
  // connect to, or the point where it would stay loose.
  function endOf(p, end, jById, drag) {
    if (drag && drag.kind === 'end' && drag.moved && drag.pid === p.id && drag.end === end) {
      const tj = drag.target !== null && jById.get(drag.target);
      return tj ? { x: tj.x, y: tj.y, r: R, loose: false } : { x: drag.at.x, y: drag.at.y, r: LOOSE_R, loose: true };
    }
    if (p[end] !== null && p[end] !== undefined) {
      const j = jById.get(p[end]);
      return j ? { x: j.x, y: j.y, r: R, loose: false } : null;
    }
    const s = p.loose && p.loose[end];
    return s ? { x: s.x, y: s.y, r: LOOSE_R, loose: true } : null;
  }
  // the far end of a pipe seen from the junction jid
  const farEnd = (p, jid) => (p.up === jid ? 'down' : 'up');

  // symbol angle: from the inlet neighbour to the outlet neighbour (or along the single pipe)
  function symbolAngle(m, j, jById) {
    const orient = views.get(j.type).orient;
    if (orient === 'pipe') {
      const p = m.pipes.find((x) => x.up === j.id || x.down === j.id);
      const o = p && endOf(p, farEnd(p, j.id), jById);
      return o ? (Math.atan2(j.y - o.y, j.x - o.x) * 180) / Math.PI : 0;
    }
    if (orient !== 'ports') return 0;
    const pr = PumpIt.model.ports(m, j);
    if (!pr) return 0;
    const ai = endOf(pr.in, farEnd(pr.in, j.id), jById);
    const bo = endOf(pr.out, farEnd(pr.out, j.id), jById);
    return ai && bo ? (Math.atan2(bo.y - ai.y, bo.x - ai.x) * 180) / Math.PI : 0;
  }

  function render(svg, view, state) {
    const { tool, pending, drag, mouseW } = state;
    const GRID = UI.canvas.GRID;
    const m = app.model;
    const res0 = app.currentResults();
    const res = res0 && res0.ok ? res0 : null;
    const sel = app.selSet;
    const undef = app.undefSet();
    const gas = PumpIt.model.isCompressible(app.eff());
    CS.syncPicker(document.getElementById('overlay-select'), gas, app.prefs.overlay);
    const ovKey = CS.offered(app.prefs.overlay, gas) ? app.prefs.overlay : 'none';
    const ov = CS.overlayValues(res, ovKey);
    const unitOf = (cat) => app.outUnit('canvas', cat);
    const ctx = res ? { rho: res.fluid.rho, patm: res.patm } : {};
    const fmtOv = (v, cat) => F.fmt(F.conv(v, cat, unitOf(cat), ctx), 3);
    const jById = new Map(m.junctions.map((j) => [j.id, j]));
    const s = view.s;

    let out = `<defs>
      <pattern id="g-minor" width="${GRID}" height="${GRID}" patternUnits="userSpaceOnUse" patternTransform="translate(${view.tx} ${view.ty}) scale(${s})">
        <path d="M ${GRID} 0 L 0 0 0 ${GRID}" fill="none" style="stroke:var(--grid)" stroke-width="${1 / s}"/>
      </pattern>
      <pattern id="g-major" width="${GRID * 5}" height="${GRID * 5}" patternUnits="userSpaceOnUse" patternTransform="translate(${view.tx} ${view.ty}) scale(${s})">
        <rect width="${GRID * 5}" height="${GRID * 5}" fill="url(#g-minor)"/>
        <path d="M ${GRID * 5} 0 L 0 0 0 ${GRID * 5}" fill="none" style="stroke:var(--grid-major)" stroke-width="${1 / s}"/>
      </pattern>
    </defs>`;
    if (app.prefs.grid) out += `<rect width="100%" height="100%" fill="url(#g-major)"/>`;
    out += `<g transform="translate(${view.tx} ${view.ty}) scale(${s})">`;

    // pipes
    const ends = new Map(); // pipe id → [start, end] of its line, for the handles of the selected pipe
    for (const p of m.pipes) {
      const a = endOf(p, 'up', jById, drag), b = endOf(p, 'down', jById, drag);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      const ux = dx / L, uy = dy / L;
      const x1 = a.x + ux * a.r, y1 = a.y + uy * a.r, x2 = b.x - ux * b.r, y2 = b.y - uy * b.r;
      ends.set(p.id, [{ x: x1, y: y1 }, { x: x2, y: y2 }]);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      const key = 'p:' + p.id;
      const r = res && res.pipes[p.id];
      const cls = ['pipe'];
      if (sel.has(key)) cls.push('sel');
      if (undef.has(key)) cls.push('undef');
      const eff = app.effObj(key);
      if (eff && eff.closed) cls.push('closed');
      if (r && r.isolated) cls.push('iso');
      if (drag && drag.kind === 'end' && drag.moved && drag.pid === p.id) cls.push('moving');
      let color = '';
      let val = '';
      let over = false;
      if (ov && ov.vals.has(p.id)) {
        const v = ov.vals.get(p.id);
        const t = ov.max > ov.min ? (v - ov.min) / (ov.max - ov.min) : 0.5;
        if (!sel.has(key)) { color = CS.pipeColor(ovKey, v, t, gas); over = CS.beyondScale(ovKey, v, gas); }
        val = CS.labelOf(fmtOv, unitOf, v, CS.OVERLAY[ovKey].cat);
      }
      const lineStyle = color ? ` style="stroke:${color};stroke-width:4.5"` : '';
      const arrowStyle = color ? ` style="fill:${over ? '#ffffff' : color}"` : '';
      // beyond the scale the line is black; a light outline keeps it visible on the dark theme
      const underlay = over ? `<line class="p-under" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>` : '';
      // arrow in the actual flow direction when there are results; otherwise in the reference direction
      const flip = r && !r.isolated && r.m < 0;
      const nx = -uy, ny = ux;
      const name = eff && eff.name;
      out += `<g class="${cls.join(' ')}" data-p="${p.id}">
        <line class="p-hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
        ${underlay}<line class="p-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${lineStyle}/>
        <path class="p-arrow" d="M5 0L-4 -4.5L-4 4.5z" transform="translate(${mx} ${my}) rotate(${ang + (flip ? 180 : 0)})"${arrowStyle}/>
        ${besidePipe(mx, my, nx, ny, 13, [['p-label', 'P' + p.id], ...(name ? [['p-name', name]] : [])])}
        ${val ? besidePipe(mx, my, -nx, -ny, 15, [['p-val', val]]) : ''}
        ${a.loose ? ring('up', a) : ''}${b.loose ? ring('down', b) : ''}
      </g>`;
    }

    // pipe being drawn
    if (tool === 'pipe' && pending !== null && mouseW) {
      const a = jById.get(pending);
      if (a) out += `<line class="rubber" x1="${a.x}" y1="${a.y}" x2="${mouseW.x}" y2="${mouseW.y}"/>`;
    }

    // junctions
    for (const j of m.junctions) {
      const key = 'j:' + j.id;
      const cls = ['junction'];
      if (sel.has(key) || pending === j.id) cls.push('sel');
      if (undef.has(key)) cls.push('undef');
      const jr = res && res.junctions[j.id];
      if (jr && jr.isolated) cls.push('iso');
      if (drag && drag.kind === 'move' && drag.ids.includes(j.id)) cls.push('dragging');
      if (drag && drag.kind === 'end' && drag.moved && drag.target === j.id) cls.push('target');
      if (drag && drag.kind === 'end' && drag.moved && drag.refused === j.id) cls.push('refused');
      const rot = symbolAngle(m, j, jById);
      const effJ = app.effObj(key) || j;
      const name = effJ.name ? `<text class="j-name" y="40" text-anchor="middle">${F.esc(effJ.name)}</text>` : '';
      let val = '';
      if (jr && ovKey !== 'none' && !jr.isolated) {
        const v = ovKey === 'HGL' ? jr.HGL : jr.Pin;
        val = ovKey === 'HGL' ? fmtOv(v, 'head') + ' ' + F.unit(unitOf('head')) : fmtOv(v, 'pressure') + ' ' + F.unit(unitOf('pressure'));
      }
      out += `<g class="${cls.join(' ')}" data-j="${j.id}" transform="translate(${j.x} ${j.y})">
        <circle class="j-bg" r="${R}"/>
        <g class="j-sym" transform="rotate(${rot})">${views.get(j.type).symbol || ''}</g>
        <text class="j-label" y="28" text-anchor="middle">J${j.id}</text>
        ${name}
        ${val ? `<text class="j-val" y="-22" text-anchor="middle">${F.esc(val)}</text>` : ''}
      </g>`;
    }

    // the ends of the selected pipe: a handle at each end on a junction, to drag it to another junction or away (a
    // loose end has its ring)
    const one = tool === 'select' && sel.size === 1 && app.sel && app.sel.kind === 'pipe' ? ends.get(app.sel.id) : null;
    if (one && !(drag && drag.kind === 'end' && drag.moved)) {
      const p = m.pipes.find((x) => x.id === app.sel.id);
      const hs = ['up', 'down'].map((end, i) => (p[end] === null || p[end] === undefined ? '' : handle(end, one[i]))).join('');
      if (hs) out += `<g class="p-ends" data-p="${p.id}">${hs}</g>`;
    }

    // selection box
    if (drag && drag.kind === 'box') {
      const x0 = Math.min(drag.x0, drag.x1), y0 = Math.min(drag.y0, drag.y1);
      out += `<rect class="box-sel" x="${x0}" y="${y0}" width="${Math.abs(drag.x1 - drag.x0)}" height="${Math.abs(drag.y1 - drag.y0)}"/>`;
    }
    out += '</g>';
    svg.innerHTML = out;

    // colour scale legend
    CS.renderLegend(document.getElementById('legend'), ov, ovKey, unitOf, fmtOv, gas);
  }

  // Texts beside a pipe, on the side of the normal (nx, ny), d px from its middle: centred over or under a lying pipe,
  // and running outwards from the pipe beside a sloping one, so they never cross the line or its arrow. The first line
  // is the nearest to the pipe.
  function besidePipe(mx, my, nx, ny, d, lines) {
    const x = mx + nx * d, y = my + ny * d;
    const anchor = Math.abs(nx) > 0.2 ? (nx > 0 ? 'start' : 'end') : 'middle';
    const step = anchor === 'middle' && ny < 0 ? -12 : 12;
    return lines.map(([cls, text], i) => `<text class="${cls}" x="${x}" y="${y + 4 + i * step}" text-anchor="${anchor}">${F.esc(text)}</text>`).join('');
  }

  // the ring of a loose end, which takes the pointer to drag it onto a junction
  const ring =(end, at) => `<circle class="p-loose" data-end="${end}" cx="${at.x}" cy="${at.y}" r="${LOOSE_R}"><title>${F.esc(t('network.ends.looseTitle'))}</title></circle>`;
  const handle = (end, at) => `<circle class="p-end" data-end="${end}" cx="${at.x}" cy="${at.y}" r="${HANDLE_R}"><title>${F.esc(t('network.ends.handleTitle'))}</title></circle>`;

  PumpIt.ui.drawing = { render, symbolAngle, R };
})(typeof window !== 'undefined' ? window : globalThis);
