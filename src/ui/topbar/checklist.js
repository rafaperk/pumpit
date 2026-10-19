// Checklist pop-up: what is still missing before the model can be calculated, with links to the system window and to
// the undefined objects, and the error when the calculation was refused.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const F = UI.format;
  const { $ } = UI.dom;
  const { t } = PumpIt.i18n;

  function fill() {
    const v = app.validation();
    const pop = $('#checklist-pop');
    let html = `<div class="eyebrow" style="margin-bottom:6px">${t('app.checklist.title')}</div>`;
    html += v.items.map((i) => {
      const inner = `<span class="dot ${i.ok ? 'ok' : 'bad'}"></span><div>${F.esc(i.label)}${i.detail && !i.ok ? `<small>${F.esc(i.detail)}</small>` : ''}</div>`;
      // the system and the solution control open the system window, where they are edited
      return i.key ? `<button type="button" class="check-item" data-system>${inner}</button>` : `<div class="check-item">${inner}</div>`;
    }).join('');
    if (v.undef.size) {
      html += `<div class="menu-sep"></div><div class="eyebrow" style="margin:6px 0 4px">${t('app.checklist.undefined')}</div>`;
      html += [...v.undef].slice(0, 30).map(([k, miss]) => `<button type="button" data-goto="${k}" style="flex-direction:column;align-items:flex-start"><b class="num">${k[0] === 'p' ? 'P' : 'J'}${k.slice(2)}</b><small class="muted">${F.esc(miss.join('; '))}</small></button>`).join('');
    }
    const r = app.currentResults();
    if (v.ok && r && !r.ok) html += `<div class="menu-sep"></div><p class="small" style="margin:6px 0 0;color:var(--crit)">${F.esc(r.errors[0])}</p>`;
    pop.innerHTML = html;
  }

  function open() {
    app.hideMenus();
    fill();
    $('#checklist-pop').hidden = false;
  }

  function bind() {
    $('#btn-checklist').addEventListener('click', (e) => { e.stopPropagation(); const p = $('#checklist-pop'); if (p.hidden) open(); else p.hidden = true; });
    $('#checklist-pop').addEventListener('click', (e) => {
      if (e.target.closest('[data-system]')) { UI.systemWindow.open(); return; }
      const b = e.target.closest('[data-goto]');
      if (!b) return;
      app.gotoKey(b.dataset.goto);
      app.hideMenus();
    });
  }

  PumpIt.ui.checklist = { fill, open, bind };
})(window);
