// Inspector (properties panel): the system, the selected pipe or junction, or the multiple selection, with
// what is still missing for the object to be defined. Each panel lives in its own file and registers in
// PumpIt.ui.inspector.panels; this file dispatches and holds the helpers they share.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, UI = PumpIt.ui;
  const F = UI.format;
  const { el } = UI.dom;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;
  const panels = {};
  // sections that other blocks add after a panel: fn(host) for the system, fn(host, id) for a pipe or a junction
  const extras = { system: [], pipe: [], junction: [] };
  const addSection = (panel, fn) => extras[panel].push(fn);
  let host;

  function init(hostEl) { host = hostEl; }

  function render() {
    const focusId = document.activeElement && host.contains(document.activeElement) ? document.activeElement.id : null;
    const scroll = host.scrollTop;
    host.innerHTML = '';
    const s = app.sel;
    if (app.selSet.size > 1) panels.selection(host);
    else if (!s) { panels.system(host); extras.system.forEach((fn) => fn(host)); }
    else if (s.kind === 'pipe') { panels.pipe(host, s.id); extras.pipe.forEach((fn) => fn(host, s.id)); }
    else { panels.junction(host, s.id); extras.junction.forEach((fn) => fn(host, s.id)); }
    host.scrollTop = scroll;
    if (focusId) { const f = document.getElementById(focusId); if (f) f.focus(); }
  }

  // ------------------------------------------------------------ helpers shared by the panels

  function head(host, title, idTxt, meta) {
    const h = el('div', { class: 'insp-head' });
    h.innerHTML = `<h3>${idTxt ? `<span class="id">${F.esc(idTxt)}</span>` : ''}${F.esc(title)}</h3>${meta ? `<div class="meta">${meta}</div>` : ''}`;
    host.appendChild(h);
    return h;
  }

  // "undefined" box with what is missing
  function missingBox(host, key) {
    const miss = app.undefSet().get(key);
    if (!miss) return;
    const sct = UI.forms.section();
    sct.appendChild(el('div', { class: 'missing' }, t('inspector.missing', { items: F.esc(miss.join('; ')) })));
    host.appendChild(sct);
  }

  // a result value in the inspector's output unit
  const out = (v, cat) => {
    const res = app.okResults();
    const ctx = res ? { rho: res.fluid.rho, patm: res.patm } : {};
    const u = app.outUnit('insp', cat);
    return `${F.fmt(F.conv(v, cat, u, ctx))} ${F.unit(u)}`;
  };

  // SI geometry of an effective pipe (flow area of all parallel tubes, hydraulic diameter)
  function pipeGeom(p) {
    if (!p) return null;
    const si = (q, c) => U.toSI(q.value, q.unit, c);
    const g = p.geometry;
    let A, Dh;
    try {
      if (g.kind === 'circular') { const d = si(g.d, 'length'); A = Math.PI * d * d / 4; Dh = d; }
      else if (g.kind === 'annulus') { const a = si(g.dOuter, 'length'), b = si(g.dInner, 'length'); A = Math.PI * (a * a - b * b) / 4; Dh = a - b; }
      else if (g.kind === 'rectangular') { const w = si(g.width, 'length'), h = si(g.height, 'length'); A = w * h; Dh = 2 * w * h / (w + h); }
      else { A = si(g.area, 'area'); Dh = 4 * A / si(g.perim, 'length'); }
    } catch (e) { return null; }
    const red = 1 - (p.idReduction || 0) / 100;
    return { A: A * red * red * (p.nParallel || 1), Dh: Dh * red };
  }

  PumpIt.ui.inspector = { init, render, panels, addSection, head, missingBox, out, pipeGeom };
})(typeof window !== 'undefined' ? window : globalThis);
