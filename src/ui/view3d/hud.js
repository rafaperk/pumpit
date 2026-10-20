// 3D view: the view switch (Schematic · 3D) and the menu of the 3D view (3D views specification §6.1, R-01). The arrow
// beside 3D opens the menu to its right and closes it again (decisions D-33 and D-34 of docs/3D-VIEWS.md): the menu
// shows only while the 3D view is on the screen, the app remembers whether it was left open (with the preferences,
// not in the model), and it slides unless the system asks for reduced motion. The markup is in index.html; the view
// cube is cube.js, and the grid density and the projection are in the Options menu (src/ui/topbar/options.js).
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const F = UI.format;
  const { $, $$ } = UI.dom;
  const { t } = PumpIt.i18n;
  const S3 = UI.scene3d, N3 = UI.nav3d, C3 = UI.commands3d;
  const round = (v) => Math.round(v * 1e6) / 1e6;
  const SLIDE_MS = 180;

  // grid, snapping, shadows and drop lines of the 3D view: view settings, saved but outside undo (R-61)
  function toggle(name) {
    const v = app.model.view3;
    if (!v || S3.mode() !== '3d') return;
    v.free[name] = !v.free[name];
    S3.saveSoon();
    UI.canvas.render();
  }
  // working level (m): the elevation of the plane where new junctions go; ± one grid step
  function stepLevel(dir) {
    const v = app.model.view3;
    C3.setView({ level: round(v.level + (dir * v.step) / v.zScale) });
  }

  // ------------------------------------------------------------ the menu (D-33)
  const isOpen = () => !!(app.prefs.view3Menus || {})['3d'];
  let shown = false;   // whether the menu is open, or opening, on the screen
  let sliding = null;  // its slide in progress
  let ready = false;   // while the app starts, the first state is put in place at once
  const reducedMotion = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // the arrow: opens the menu, bringing the 3D view to the screen, or closes it
  function toggleMenu() {
    const here = S3.mode() === '3d';
    app.prefs.view3Menus = { ...(app.prefs.view3Menus || {}), '3d': here ? !isOpen() : true };
    app.savePrefs();
    if (here) sync(); else S3.setMode('3d');
  }

  // Opens or closes the menu. It slides between its width and nothing while its content keeps the width it ends with,
  // so that it never wraps differently on the way; a slide in progress turns back from where it is.
  function slide(open, animate) {
    const menu = $('#hud-menu-3d'), inner = menu.firstElementChild;
    const widths = () => [menu.getBoundingClientRect().width, inner.getBoundingClientRect().width];
    const [from, contentFrom] = menu.hidden ? [0, 0] : widths();
    if (sliding) { sliding.cancel(); sliding = null; }
    shown = open;
    if (!open && menu.contains(document.activeElement)) $('#view-hud [data-view-menu]').focus();
    menu.hidden = !open;
    menu.inert = !open;
    inner.style.width = '';
    if (!animate || document.hidden || reducedMotion()) return;
    const [to, content] = open ? widths() : [0, contentFrom];
    if (from === to) return;
    menu.hidden = false;
    inner.style.width = content + 'px';
    const s = menu.animate([{ width: from + 'px' }, { width: to + 'px' }], { duration: SLIDE_MS, easing: 'ease-out', fill: 'forwards' });
    sliding = s;
    s.finished.then(() => {
      sliding = null;
      menu.hidden = !open;
      inner.style.width = '';
      s.cancel();
    }, () => {}); // cancelled: the slide that took over puts everything in place
  }

  function bind() {
    $('#view-hud').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const d = b.dataset;
      if (d.mode) S3.setMode(d.mode);
      else if (d.viewMenu) toggleMenu();
      else if (d.rot) N3.turn(Number(d.rot));
      else if (d.camera === 'center') N3.fit();
      else if (d.toggle) toggle(d.toggle);
      else if (d.level) stepLevel(Number(d.level));
    });
    const lv = $('#level3');
    lv.addEventListener('change', () => {
      const v = F.parseNum(lv.value);
      if (Number.isFinite(v)) C3.setView({ level: v }); else sync();
    });
    lv.addEventListener('keydown', (e) => { if (e.key === 'Enter') lv.blur(); });
    setTimeout(() => { ready = true; }); // the menu the app starts with is shown at once
  }

  // state of the controls, from the model and the preferences (called on every redraw of the drawing)
  function sync() {
    const mode = S3.mode(), v = app.model.view3, on = mode === '3d' && isOpen();
    for (const s of $$('#view-hud .hud-split')) s.classList.toggle('on', s.dataset.view === mode);
    for (const b of $$('#view-hud [data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    // the arrow says what it does: open the menu, or close it
    const a = $('#view-hud [data-view-menu]');
    const label = t(`network.view3.menu.${on ? 'hide' : 'show'}`);
    if (a.getAttribute('aria-label') !== label) { a.title = label; a.setAttribute('aria-label', label); }
    a.setAttribute('aria-expanded', String(on));
    if (shown !== on) slide(on, ready);
    if (!v) return;
    for (const b of $$('#hud-menu-3d [data-toggle]')) b.setAttribute('aria-pressed', String(!!v.free[b.dataset.toggle]));
    const lv = $('#level3');
    if (document.activeElement !== lv) lv.value = F.inputStr(round(v.level));
  }

  PumpIt.ui.hud3d = { bind, sync, toggle };
})(window);
