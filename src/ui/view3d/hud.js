// 3D views: the view switch (Schematic · Isometric · 3D), the menu of each 3D view and the seal of the 3D views (3D
// views specification §6.1, R-01, R-05). The arrow beside Isometric and 3D opens the menu of that view to its right,
// pushing what follows, and closes it again (decision D-33 of docs/3D-VIEWS.md): only the view on the screen shows its
// menu, each view remembers whether its menu was open (with the preferences, not in the model) and the menus slide
// unless the system asks for reduced motion. The markup is in index.html.
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

  // grid, snapping (free 3D view), shadows and drop lines of a view, the one on the screen unless named: view
  // settings, saved but outside undo (R-61)
  function toggle(name, which = S3.mode()) {
    const v = app.model.view3;
    if (!v || which === '2d') return;
    const set = which === 'iso' ? v.iso : v.free;
    set[name] = !set[name];
    S3.saveSoon();
    UI.canvas.render();
  }
  function setIsoStyle(style) {
    app.model.view3.iso.style = style;
    S3.saveSoon();
    UI.canvas.render();
  }
  // working level (m): the elevation of the plane where new junctions go; ± one grid step
  function stepLevel(dir) {
    const v = app.model.view3;
    C3.setView({ level: round(v.level + (dir * v.step) / v.zScale) });
  }
  // the turn buttons: 90° in the isometric view, 15° in the free 3D view
  const turn = (which, dir) => (which === 'iso' ? N3.rotateIso(dir) : N3.turnFree(dir));

  // ------------------------------------------------------------ menus (D-33)
  const openMenus = () => app.prefs.view3Menus || {};
  const shown = new Map();  // menu → whether it is open, or opening, on the screen
  const slides = new Map(); // menu → its slide in progress
  let ready = false;        // while the app starts, the first state is put in place at once
  const reducedMotion = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // the arrow of a 3D view: opens its menu, bringing that view to the screen, or closes it
  function toggleMenu(which) {
    const here = S3.mode() === which, open = openMenus();
    app.prefs.view3Menus = { ...open, [which]: here ? !open[which] : true };
    app.savePrefs();
    if (here) sync(); else S3.setMode(which);
  }

  // Opens and closes menus. Each one slides between its width and nothing while its content keeps the width it ends
  // with, so that it never wraps differently on the way; the menus that open are measured with those that close
  // already gone, as they will be at the end. A slide in progress turns back from where it is. When an open menu
  // needs the row, the seal goes below the bar: during a slide it stays in the lower of its places at the start and
  // at the end, so that it moves before a menu opens or after it closes, never on the way.
  function slide(changes, animate) {
    const inner = (menu) => menu.firstElementChild;
    const widths = (menu) => [menu.getBoundingClientRect().width, inner(menu).getBoundingClientRect().width];
    const row = $('#view-hud').parentElement, seal = $('#seal3');
    const sealBelow = () => !seal.hidden && seal.getBoundingClientRect().top > $('#view-hud').getBoundingClientRect().top + 1;
    const before = new Map(changes.map(({ menu }) => [menu, menu.hidden ? [0, 0] : widths(menu)]));
    const belowBefore = sealBelow();
    for (const { menu } of changes) {
      const s = slides.get(menu);
      if (s) { s.cancel(); slides.delete(menu); }
    }
    row.classList.remove('seal-below');
    for (const { menu, open } of changes) {
      shown.set(menu, open);
      if (!open && menu.contains(document.activeElement)) $(`#view-hud [data-view-menu="${menu.dataset.for}"]`).focus();
      menu.hidden = !open;
      menu.inert = !open;
      inner(menu).style.width = '';
    }
    if (!animate || document.hidden || reducedMotion()) return;
    const after = new Map(changes.map(({ menu, open }) => [menu, open ? widths(menu) : [0, before.get(menu)[1]]]));
    const belowAfter = sealBelow();
    for (const { menu, open } of changes) {
      const [from] = before.get(menu), [to, content] = after.get(menu);
      if (from === to) continue;
      menu.hidden = false;
      inner(menu).style.width = content + 'px';
      const s = menu.animate([{ width: from + 'px' }, { width: to + 'px' }], { duration: SLIDE_MS, easing: 'ease-out', fill: 'forwards' });
      slides.set(menu, s);
      s.finished.then(() => {
        slides.delete(menu);
        menu.hidden = !open;
        inner(menu).style.width = '';
        s.cancel();
        if (!slides.size) row.classList.remove('seal-below');
      }, () => {}); // cancelled: the slide that took over puts everything in place
    }
    row.classList.toggle('seal-below', slides.size > 0 && (belowBefore || belowAfter));
  }

  function bind() {
    $('#view-hud').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const d = b.dataset, menu = b.closest('.hud-menu'), which = menu ? menu.dataset.for : S3.mode();
      if (d.mode) S3.setMode(d.mode);
      else if (d.viewMenu) toggleMenu(d.viewMenu);
      else if (d.rot) turn(which, Number(d.rot));
      else if (d.camera === 'center') N3.fit();
      else if (d.toggle) toggle(d.toggle, which);
      else if (d.style) setIsoStyle(d.style);
      else if (d.step) C3.setView({ step: Number(d.step) });
      else if (d.level) stepLevel(Number(d.level));
      else if (d.proj) N3.setProjection(d.proj);
      else if (d.preset) N3.preset(d.preset);
    });
    for (const lv of $$('#view-hud .hud-level input')) {
      lv.addEventListener('change', () => {
        const v = F.parseNum(lv.value);
        if (Number.isFinite(v)) C3.setView({ level: v }); else sync();
      });
      lv.addEventListener('keydown', (e) => { if (e.key === 'Enter') lv.blur(); });
    }
    setTimeout(() => { ready = true; }); // the menus the app starts with are shown at once
  }

  // state of the controls, from the model and the preferences (called on every redraw of the drawing)
  function sync() {
    const mode = S3.mode(), v = app.model.view3, open = openMenus();
    for (const s of $$('#view-hud .hud-split')) s.classList.toggle('on', s.dataset.view === mode);
    for (const b of $$('#view-hud [data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    const changes = [];
    for (const a of $$('#view-hud [data-view-menu]')) {
      const which = a.dataset.viewMenu, menu = document.getElementById('hud-menu-' + which);
      const on = which === mode && !!open[which];
      // the arrow says what it does: open the menu, or close it
      const label = t(`network.view3.menu.${on ? 'hide' : 'show'}.${which}`);
      if (a.getAttribute('aria-label') !== label) { a.title = label; a.setAttribute('aria-label', label); }
      a.setAttribute('aria-expanded', String(on));
      if (shown.get(menu) !== on) changes.push({ menu, open: on });
    }
    if (changes.length) slide(changes, ready);
    $('#seal3').hidden = mode === '2d';
    if (!v) return;
    for (const menu of $$('#view-hud .hud-menu')) {
      const set = menu.dataset.for === 'iso' ? v.iso : v.free;
      for (const b of menu.querySelectorAll('[data-toggle]')) b.setAttribute('aria-pressed', String(!!set[b.dataset.toggle]));
    }
    for (const b of $$('#view-hud [data-style]')) b.classList.toggle('on', b.dataset.style === v.iso.style);
    for (const b of $$('#view-hud [data-step]')) b.classList.toggle('on', Number(b.dataset.step) === v.step);
    for (const b of $$('#view-hud [data-proj]')) b.classList.toggle('on', b.dataset.proj === v.free.projection);
    for (const lv of $$('#view-hud .hud-level input')) if (document.activeElement !== lv) lv.value = F.inputStr(round(v.level));
  }

  PumpIt.ui.hud3d = { bind, sync, toggle };
})(window);
