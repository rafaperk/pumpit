// Inspector (properties panel): the summary of the system, the selected pipe or junction, or the multiple selection,
// with what is still missing for the object to be defined. Each panel lives in its own file and registers in
// PumpIt.ui.inspector.panels; this file dispatches and holds the helpers they share. The panel follows the selection:
// it opens when something is selected and collapses when nothing is. The arrow on its left edge collapses it or brings
// it back by hand, until the selection changes again.
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

  function init(hostEl) {
    host = hostEl;
    document.getElementById('panel-toggle').addEventListener('click', () => setCollapsed(!isCollapsed()));
    delete app.prefs.inspectorCollapsed; // kept by older versions, whose arrow alone collapsed the panel
    root.addEventListener('pointerdown', () => { pressed = true; }, true);
    root.addEventListener('pointerup', released);
    root.addEventListener('pointercancel', released);
    root.addEventListener('blur', released); // the window lost the focus during the press: no release comes
  }

  // ------------------------------------------------------------ opening and collapsing the panel

  // The panel follows each change of the selection, and opens again at a click on an object that is already
  // selected (selection.js); between two of them the arrow decides. During a press on the page (a click or a drag on
  // the drawing) it waits for the button to be released, so that the drawing area never changes width under a drag.
  let followed = null; // the selection the panel last followed, as its keys
  let pressed = false, wanted = null; // wanted: the state waiting for the release (true: collapsed)
  const selected = () => [...app.selSet].sort().join(' ');
  function follow() {
    followed = selected();
    wanted = !app.selSet.size;
    if (!pressed) released();
  }
  function released() {
    pressed = false;
    if (wanted === null) return;
    setCollapsed(wanted);
    wanted = null;
  }

  const isCollapsed = () => document.getElementById('view-net').classList.contains('insp-off');
  function setCollapsed(on) {
    document.getElementById('view-net').classList.toggle('insp-off', on);
    labelToggle();
  }
  // the arrow says what it does: collapse the panel, or show it again
  function labelToggle() {
    const b = document.getElementById('panel-toggle');
    const on = isCollapsed();
    const label = t(on ? 'inspector.toggle.show' : 'inspector.toggle.hide');
    b.title = label;
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-expanded', String(!on));
  }

  function render() {
    if (selected() !== followed) follow(); // a selection changed elsewhere: an object added, pasted or deleted, a load
    labelToggle(); // its texts follow the language
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

  PumpIt.ui.inspector = { init, render, panels, addSection, head, missingBox, out, pipeGeom, follow, isCollapsed, setCollapsed };
})(typeof window !== 'undefined' ? window : globalThis);
