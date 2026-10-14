// Área de trabalho: único lugar onde a topologia muda. Desenho em SVG com pan, zoom, grade, encaixe,
// seleção múltipla (Ctrl/Shift+clique, Shift+arrastar no vazio) e arraste em grupo.
(function (root) {
  const HR = (root.HR = root.HR || {});
  const { SYM, ROTATES } = HR.symbols;
  const F = HR.fmt;

  const R = 16;          // raio de toque das junções
  const GRID = 20;
  const RAMP = ['#2f6db5', '#2a9d8f', '#d9a53a', '#cf4a3c'];

  let app, svg, wrap;
  const view = { tx: 40, ty: 40, s: 1 };
  let tool = 'select';          // 'select' | 'pipe' | 'place:<tipo>'
  let pending = null;           // junção de partida ao desenhar tubo
  let drag = null;              // { kind: 'move' | 'pan' | 'box', ... }
  let mouseW = null;            // última posição do mouse em coordenadas do mundo
  let autoFit = true;           // reenquadra ao redimensionar até o usuário mover ou dar zoom

  function init(svgEl, wrapEl, appRef) {
    app = appRef; svg = svgEl; wrap = wrapEl;
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('contextmenu', onContext);
    wrap.addEventListener('dragover', (e) => { e.preventDefault(); wrap.classList.add('drop-ok'); });
    wrap.addEventListener('dragleave', () => wrap.classList.remove('drop-ok'));
    wrap.addEventListener('drop', (e) => {
      e.preventDefault(); wrap.classList.remove('drop-ok');
      const type = e.dataTransfer.getData('text/plain');
      if (!HR.model.JT[type]) return;
      const w = toWorld(e.clientX, e.clientY);
      app.addJunction(type, snap(w.x), snap(w.y));
    });
    new ResizeObserver(() => (autoFit ? fit() : render())).observe(wrap);
  }

  // ---------- coordenadas ----------
  function toWorld(cx, cy) {
    const r = svg.getBoundingClientRect();
    return { x: (cx - r.left - view.tx) / view.s, y: (cy - r.top - view.ty) / view.s };
  }
  const snap = (v) => (app.prefs.grid ? Math.round(v / GRID) * GRID : Math.round(v));
  const keyOf = (hit) => (hit.kind === 'pipe' ? 'p:' : 'j:') + hit.id;

  function setTool(t) {
    tool = t;
    pending = null;
    document.querySelectorAll('.palette .tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
    const hints = {
      select: '',
      pipe: 'Clique numa junção e depois em outra para ligar um tubo. Clique no vazio para criar um nó. Esc encerra.',
    };
    app.hint(t.startsWith('place:') ? `Clique no desenho para posicionar: ${HR.model.JT[t.slice(6)].label}. Shift mantém a ferramenta.` : hints[t] || '');
    svg.style.cursor = t === 'select' ? 'default' : 'crosshair';
    render();
  }

  // ---------- eventos ----------
  function hitTarget(e) {
    const j = e.target.closest('[data-j]');
    if (j) return { kind: 'junction', id: Number(j.dataset.j) };
    const p = e.target.closest('[data-p]');
    if (p) return { kind: 'pipe', id: Number(p.dataset.p) };
    return null;
  }

  function onDown(e) {
    if (e.button === 2) return;
    svg.focus({ preventScroll: true });
    const hit = hitTarget(e);
    const w = toWorld(e.clientX, e.clientY);
    app.hideMenus();

    if (e.button === 1 || (tool === 'select' && !hit)) {
      if (e.button === 0 && e.shiftKey) {
        drag = { kind: 'box', x0: w.x, y0: w.y, x1: w.x, y1: w.y };
      } else {
        drag = { kind: 'pan', x0: e.clientX, y0: e.clientY, tx: view.tx, ty: view.ty, moved: false, clickEmpty: !hit && e.button === 0 };
      }
      svg.setPointerCapture(e.pointerId);
      return;
    }

    if (tool === 'select') {
      const additive = e.ctrlKey || e.metaKey || e.shiftKey;
      if (additive) { app.select(hit, { toggle: true }); return; }
      // clicar num objeto já selecionado mantém o grupo (para arrastar todos)
      if (!(app.selSet.has(keyOf(hit)) && app.selSet.size > 1)) app.select(hit);
      else app.setPrimary(hit);
      if (hit.kind === 'junction') {
        const ids = [...app.selSet].filter((k) => k[0] === 'j').map((k) => Number(k.slice(2)));
        if (!ids.includes(hit.id)) ids.push(hit.id);
        const start = {};
        for (const id of ids) { const j = app.model.junctions.find((x) => x.id === id); if (j) start[id] = { x: j.x, y: j.y }; }
        drag = { kind: 'move', id: hit.id, ids, start, w0: w, moved: false };
        svg.setPointerCapture(e.pointerId);
      }
      return;
    }

    if (tool === 'pipe') {
      if (hit && hit.kind === 'junction') {
        if (pending === null) { pending = hit.id; render(); return; }
        if (pending !== hit.id) app.addPipe(pending, hit.id);
        pending = hit.id;
        render();
        return;
      }
      if (!hit) {
        const id = app.addJunction('branch', snap(w.x), snap(w.y), { silent: true });
        if (pending !== null) app.addPipe(pending, id);
        pending = id;
        render();
      }
      return;
    }

    if (tool.startsWith('place:')) {
      app.addJunction(tool.slice(6), snap(w.x), snap(w.y));
      if (!e.shiftKey) setTool('select');
    }
  }

  function onMove(e) {
    mouseW = toWorld(e.clientX, e.clientY);
    if (!drag) { if (tool === 'pipe' && pending !== null) render(); return; }
    if (drag.kind === 'pan') {
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      view.tx = drag.tx + dx; view.ty = drag.ty + dy;
      if (drag.moved) autoFit = false;
      render();
    } else if (drag.kind === 'box') {
      drag.x1 = mouseW.x; drag.y1 = mouseW.y;
      render();
    } else if (drag.kind === 'move') {
      const s0 = drag.start[drag.id];
      const dx = snap(s0.x + mouseW.x - drag.w0.x) - s0.x, dy = snap(s0.y + mouseW.y - drag.w0.y) - s0.y;
      const j0 = app.model.junctions.find((x) => x.id === drag.id);
      if (j0.x === s0.x + dx && j0.y === s0.y + dy) return;
      if (!drag.moved) { app.pushUndo(); drag.moved = true; }
      for (const id of drag.ids) {
        const j = app.model.junctions.find((x) => x.id === id);
        if (j) { j.x = drag.start[id].x + dx; j.y = drag.start[id].y + dy; }
      }
      render();
    }
  }

  function onUp() {
    if (!drag) return;
    if (drag.kind === 'pan' && !drag.moved && drag.clickEmpty) app.select(null);
    if (drag.kind === 'move' && drag.moved) app.save();
    if (drag.kind === 'box') {
      const x0 = Math.min(drag.x0, drag.x1), x1 = Math.max(drag.x0, drag.x1), y0 = Math.min(drag.y0, drag.y1), y1 = Math.max(drag.y0, drag.y1);
      const inside = new Set(app.model.junctions.filter((j) => j.x >= x0 && j.x <= x1 && j.y >= y0 && j.y <= y1).map((j) => j.id));
      const keys = [...inside].map((id) => 'j:' + id).concat(app.model.pipes.filter((p) => inside.has(p.up) && inside.has(p.down)).map((p) => 'p:' + p.id));
      drag = null;
      app.selectKeys(keys);
      return;
    }
    drag = null;
  }

  function onWheel(e) {
    e.preventDefault();
    const f = Math.exp(-e.deltaY * 0.0015);
    zoomAt(e.clientX, e.clientY, f);
  }
  function zoomAt(cx, cy, f) {
    const r = svg.getBoundingClientRect();
    const sx = cx - r.left, sy = cy - r.top;
    const s2 = Math.min(4, Math.max(0.15, view.s * f));
    autoFit = false;
    view.tx = sx - (sx - view.tx) * (s2 / view.s);
    view.ty = sy - (sy - view.ty) * (s2 / view.s);
    view.s = s2;
    render();
  }
  function zoomBy(f) { const r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); }

  function fit() {
    const js = app.model.junctions;
    const r = svg.getBoundingClientRect();
    autoFit = true;
    if (!js.length || !r.width) { view.tx = 40; view.ty = 40; view.s = 1; render(); return; }
    const xs = js.map((j) => j.x), ys = js.map((j) => j.y);
    const x0 = Math.min(...xs) - 70, x1 = Math.max(...xs) + 70, y0 = Math.min(...ys) - 70, y1 = Math.max(...ys) + 80;
    const s = Math.min(1.6, Math.max(0.2, Math.min(r.width / (x1 - x0), r.height / (y1 - y0))));
    view.s = s;
    view.tx = (r.width - (x1 - x0) * s) / 2 - x0 * s;
    view.ty = (r.height - (y1 - y0) * s) / 2 - y0 * s;
    render();
  }

  function onContext(e) {
    e.preventDefault();
    const hit = hitTarget(e);
    if (!hit) return;
    if (!app.selSet.has(keyOf(hit))) app.select(hit);
    app.showInfo(hit, e.clientX, e.clientY);
  }

  function cancel() {
    if (pending !== null) { pending = null; render(); return true; }
    if (tool !== 'select') { setTool('select'); return true; }
    return false;
  }

  // ---------- desenho ----------
  function rampColor(t) {
    t = Math.max(0, Math.min(1, t));
    const k = t * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(k)), w = k - i;
    const a = hex(RAMP[i]), b = hex(RAMP[i + 1]);
    return `rgb(${a.map((v, n) => Math.round(v + w * (b[n] - v))).join(',')})`;
  }
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

  // escala fixa de velocidade da água (faixas em HR.data.WATER_VELOCITY, em m/s)
  const VEL = HR.data.WATER_VELOCITY;
  function velColor(v) {
    v = Math.abs(v);
    if (v > VEL.max) return VEL.over;
    const st = VEL.stops;
    let i = 1;
    while (i < st.length - 1 && v > st[i][0]) i++;
    const [v0, c0] = st[i - 1], [v1, c1] = st[i];
    const w = v1 > v0 ? Math.max(0, Math.min(1, (v - v0) / (v1 - v0))) : 0;
    const a = hex(c0), b = hex(c1);
    return `rgb(${a.map((x, n) => Math.round(x + w * (b[n] - x))).join(',')})`;
  }
  function velLegend() {
    const pct = (v) => (v / VEL.max) * 100;
    const grad = VEL.stops.map(([v, c]) => `${c} ${pct(v).toFixed(1)}%`).join(',');
    const ticks = [0, 0.6, 1.5, 2.5, 3, 5].map((v) => `<span style="left:${pct(v)}%">${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span>`).join('');
    return `<div class="eyebrow">Velocidade (m/s) · água</div>
      <div class="vel-bar"><div class="vel-ramp" style="background:linear-gradient(90deg,${grad})"></div><div class="vel-over" title="Acima de ${VEL.max} m/s"></div></div>
      <div class="vel-ticks"><div class="vel-ticks-in">${ticks}</div><span class="vel-gt">&gt;${VEL.max}</span></div>
      <div class="vel-key"><i style="background:${VEL.stops[1][1]}"></i>baixa<i style="background:${VEL.stops[3][1]}"></i>econômica<i style="background:${VEL.stops[7][1]}"></i>5 m/s<i style="background:${VEL.over};box-shadow:inset 0 0 0 1px var(--ink-3)"></i>acima</div>`;
  }

  function overlayValues(res, key) {
    if (!res || key === 'none') return null;
    const vals = new Map();
    for (const [id, r] of Object.entries(res.pipes)) {
      if (r.isolated) continue;
      let v;
      if (key === 'P') v = (r.Pin + r.Pout) / 2;
      else if (key === 'HGL') v = (r.HGLin + r.HGLout) / 2;
      else if (key === 'Q' || key === 'V' || key === 'dP0') v = Math.abs(r[key]);
      else v = r[key];
      if (Number.isFinite(v)) vals.set(Number(id), v);
    }
    if (!vals.size) return null;
    const arr = [...vals.values()];
    return { vals, min: Math.min(...arr), max: Math.max(...arr) };
  }

  const OVERLAY = {
    Q: { label: 'Vazão volumétrica', cat: 'volFlow' },
    V: { label: 'Velocidade', cat: 'velocity' },
    dP0: { label: 'Queda de pressão', cat: 'dp' },
    P: { label: 'Pressão estática média', cat: 'pressure' },
    HGL: { label: 'HGL média', cat: 'head' },
  };

  // ângulo do símbolo: da junção vizinha de entrada para a de saída
  function symbolAngle(m, j, jById) {
    if (!ROTATES.has(j.type)) return 0;
    if (j.type === 'exitvalve') {
      const p = m.pipes.find((x) => x.up === j.id || x.down === j.id);
      const o = p && jById.get(p.up === j.id ? p.down : p.up);
      return o ? (Math.atan2(j.y - o.y, j.x - o.x) * 180) / Math.PI : 0;
    }
    const pr = HR.model.ports(m, j);
    if (!pr) return 0;
    const ai = jById.get(pr.in.up === j.id ? pr.in.down : pr.in.up);
    const bo = jById.get(pr.out.up === j.id ? pr.out.down : pr.out.up);
    return ai && bo ? (Math.atan2(bo.y - ai.y, bo.x - ai.x) * 180) / Math.PI : 0;
  }

  function render() {
    if (!svg) return;
    const m = app.model;
    const res0 = app.currentResults();
    const res = res0 && res0.ok ? res0 : null;
    const sel = app.selSet;
    const undef = app.undefSet();
    const ovKey = app.prefs.overlay;
    const ov = overlayValues(res, ovKey);
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

    // tubos
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
        // velocidade: escala fixa de referência; demais grandezas: do menor ao maior valor do modelo
        if (!sel.has(key)) { color = ovKey === 'V' ? velColor(v) : rampColor(t); over = ovKey === 'V' && Math.abs(v) > VEL.max; }
        const cat = OVERLAY[ovKey].cat;
        val = `${fmtOv(v, cat)} ${unitOf(cat)}`;
      }
      const lineStyle = color ? ` style="stroke:${color};stroke-width:4.5"` : '';
      const arrowStyle = color ? ` style="fill:${over ? '#ffffff' : color}"` : '';
      // acima do limite a linha é preta; o contorno claro a mantém visível no tema escuro
      const underlay = over ? `<line class="p-under" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>` : '';
      // seta no sentido real do escoamento quando há resultado; senão no de referência
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

    // tubo em desenho
    if (tool === 'pipe' && pending !== null && mouseW) {
      const a = jById.get(pending);
      if (a) out += `<line class="rubber" x1="${a.x}" y1="${a.y}" x2="${mouseW.x}" y2="${mouseW.y}"/>`;
    }

    // junções
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
        val = ovKey === 'HGL' ? fmtOv(v, 'head') + ' ' + unitOf('head') : fmtOv(v, 'pressure') + ' ' + unitOf('pressure');
      }
      out += `<g class="${cls.join(' ')}" data-j="${j.id}" transform="translate(${j.x} ${j.y})">
        <circle class="j-bg" r="${R}"/>
        <g class="j-sym" transform="rotate(${rot})">${SYM[j.type] || ''}</g>
        <text class="j-label" y="28" text-anchor="middle">J${j.id}</text>
        ${name}
        ${val ? `<text class="j-val" y="-22" text-anchor="middle">${F.esc(val)}</text>` : ''}
      </g>`;
    }

    // caixa de seleção
    if (drag && drag.kind === 'box') {
      const x0 = Math.min(drag.x0, drag.x1), y0 = Math.min(drag.y0, drag.y1);
      out += `<rect class="box-sel" x="${x0}" y="${y0}" width="${Math.abs(drag.x1 - drag.x0)}" height="${Math.abs(drag.y1 - drag.y0)}"/>`;
    }
    out += '</g>';
    svg.innerHTML = out;

    // legenda da escala de cores
    const lg = document.getElementById('legend');
    if (ov && ovKey === 'V') {
      lg.hidden = false;
      lg.innerHTML = velLegend();
    } else if (ov) {
      const cat = OVERLAY[ovKey].cat;
      lg.hidden = false;
      lg.innerHTML = `<div class="eyebrow">${OVERLAY[ovKey].label} (${F.esc(unitOf(cat))})</div>
        <div class="ramp" style="background:linear-gradient(90deg,${RAMP.join(',')})"></div>
        <div class="ends"><span>${fmtOv(ov.min, cat)}</span><span>${fmtOv(ov.max, cat)}</span></div>`;
    } else lg.hidden = true;
  }

  HR.canvas = { init, render, fit, zoomBy, setTool, cancel, velColor, get tool() { return tool; }, view };
})(typeof window !== 'undefined' ? window : globalThis);
