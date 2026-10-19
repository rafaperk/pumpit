// SVG markup of the network: grid, pipes (with flow arrows and result labels), junction symbols, the pipe
// being drawn and the selection box. Junction symbols and their orientation come from the junction views.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, app = PumpIt.app;
  const F = UI.format, CS = UI.colorScales;
  const views = UI.junctionTypes;

  const R = 16; // touch radius of the junctions

  // symbol angle: from the inlet neighbour to the outlet neighbour (or along the single pipe)
  function symbolAngle(m, j, jById) {
    const orient = views.get(j.type).orient;
    if (orient === 'pipe') {
      const p = m.pipes.find((x) => x.up === j.id || x.down === j.id);
      const o = p && jById.get(p.up === j.id ? p.down : p.up);
      return o ? (Math.atan2(j.y - o.y, j.x - o.x) * 180) / Math.PI : 0;
    }
    if (orient !== 'ports') return 0;
    const pr = PumpIt.model.ports(m, j);
    if (!pr) return 0;
    const ai = jById.get(pr.in.up === j.id ? pr.in.down : pr.in.up);
    const bo = jById.get(pr.out.up === j.id ? pr.out.down : pr.out.up);
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
    for (const p of m.pipes) {
      const a = jById.get(p.up), b = jById.get(p.down);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      const ux = dx / L, uy = dy / L;
      const x1 = a.x + ux * R, y1 = a.y + uy * R, x2 = b.x - ux * R, y2 = b.y - uy * R;
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
      const lx = mx + nx * 13, ly = my + ny * 13;
      out += `<g class="${cls.join(' ')}" data-p="${p.id}">
        <line class="p-hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
        ${underlay}<line class="p-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${lineStyle}/>
        <path class="p-arrow" d="M5 0L-4 -4.5L-4 4.5z" transform="translate(${mx} ${my}) rotate(${ang + (flip ? 180 : 0)})"${arrowStyle}/>
        <text class="p-label" x="${lx}" y="${ly + 4}" text-anchor="middle">P${p.id}</text>
        ${val ? `<text class="p-val" x="${mx - nx * 15}" y="${my - ny * 15 + 4}" text-anchor="middle">${F.esc(val)}</text>` : ''}
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

  PumpIt.ui.drawing = { render, symbolAngle };
})(typeof window !== 'undefined' ? window : globalThis);
