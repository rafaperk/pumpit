// 3D views: the view switch (Schematic · Isometric · 3D), the controls of each view on the drawing and the seal of the
// 3D views (3D views specification §6.1, R-01, R-05). The markup is in index.html.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const F = UI.format;
  const { $, $$ } = UI.dom;
  const S3 = UI.scene3d, N3 = UI.nav3d, C3 = UI.commands3d;
  const round = (v) => Math.round(v * 1e6) / 1e6;

  // grid, snapping (free 3D view), shadows and drop lines of the current view: view settings, saved but outside undo
  // (R-61)
  function toggle(name) {
    const v = app.model.view3;
    if (!v || v.mode === '2d') return;
    const set = v.mode === 'iso' ? v.iso : v.free;
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

  function bind() {
    $('#view-hud').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const d = b.dataset;
      if (d.mode) S3.setMode(d.mode);
      else if (d.rot) N3.rotateIso(Number(d.rot));
      else if (d.toggle) toggle(d.toggle);
      else if (d.style) setIsoStyle(d.style);
      else if (d.step) C3.setView({ step: Number(d.step) });
      else if (d.level) stepLevel(Number(d.level));
      else if (d.proj) N3.setProjection(d.proj);
      else if (d.preset) N3.preset(d.preset);
    });
    const lv = $('#level3');
    lv.addEventListener('change', () => {
      const v = F.parseNum(lv.value);
      if (Number.isFinite(v)) C3.setView({ level: v }); else sync();
    });
    lv.addEventListener('keydown', (e) => { if (e.key === 'Enter') lv.blur(); });
  }

  // state of the controls, from the model (called on every redraw of the drawing)
  function sync() {
    const mode = S3.mode(), v = app.model.view3;
    for (const b of $$('#view-hud [data-mode]')) {
      const on = b.dataset.mode === mode;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    }
    for (const g of $$('#view-hud [data-for]')) g.hidden = !g.dataset.for.split(' ').includes(mode);
    $('#seal3').hidden = mode === '2d';
    if (mode === '2d') return;
    const set = mode === 'iso' ? v.iso : v.free;
    for (const b of $$('#view-hud [data-toggle]')) b.setAttribute('aria-pressed', String(!!set[b.dataset.toggle]));
    for (const b of $$('#view-hud [data-style]')) b.classList.toggle('on', b.dataset.style === v.iso.style);
    for (const b of $$('#view-hud [data-step]')) b.classList.toggle('on', Number(b.dataset.step) === v.step);
    for (const b of $$('#view-hud [data-proj]')) b.classList.toggle('on', b.dataset.proj === v.free.projection);
    const lv = $('#level3');
    if (document.activeElement !== lv) lv.value = F.inputStr(round(v.level));
  }

  PumpIt.ui.hud3d = { bind, sync, toggle };
})(window);
