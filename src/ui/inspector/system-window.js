// System window: the properties of the system (system-panel.js) in a window over the page, opened by the regime stamp,
// the Edit menu, the checklist and the button of the inspector with nothing selected. As in the inspector, a field is
// written as soon as it changes (the model is recalculated; Ctrl+Z undoes it), and the window is drawn again after
// every change while it is open (app.renderAll). The page behind it takes no clicks and no focus.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('inspector.system.' + key, params);

  const ICON = {
    system: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3.5 7h9.3M17.2 7h3.3M3.5 12h3.3M11.2 12h9.3M3.5 17h10.3M18.2 17h2.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="15" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="12" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    close: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };
  // the parts of the page behind the window
  const behind = () => ['.topbar', '.tabs', '.views'].map((s) => document.querySelector(s));

  let box = null; // { back, win, body }
  let opener = null; // the element that had the focus before the window opened; it gets the focus back
  let pressedBack = false;

  function ensure() {
    if (box) return box;
    const back = document.createElement('div');
    back.className = 'sys-back';
    back.id = 'system-window';
    back.hidden = true;
    back.innerHTML = `<div class="sys-win" role="dialog" aria-modal="true" aria-labelledby="sys-title" tabindex="-1">
      <header class="sys-head">
        <span class="sys-logo">${ICON.system}</span>
        <div class="sys-titles"><h2 id="sys-title"></h2><div class="sys-meta" id="sys-meta"></div></div>
        <button type="button" class="btn ghost icon" id="sys-x">${ICON.close}</button>
      </header>
      <div class="sys-body" id="sys-body"></div>
      <footer class="sys-foot"><p class="hint" id="sys-note"></p><button type="button" class="btn primary" id="sys-done"></button></footer>
    </div>`;
    document.getElementById('app').appendChild(back);
    box = { back, win: back.querySelector('.sys-win'), body: back.querySelector('#sys-body') };
    // the dimmed background closes the window, unless the press began inside it (selecting the text of a field)
    back.addEventListener('mousedown', (e) => { pressedBack = e.target === back; });
    back.addEventListener('click', (e) => {
      if ((e.target === back && pressedBack) || e.target.closest('#sys-x, #sys-done')) close();
    });
    return box;
  }

  // the fields again, keeping the focus and the scroll
  function render() {
    if (!isOpen()) return;
    const { back, body } = box;
    const focusId = document.activeElement && body.contains(document.activeElement) ? document.activeElement.id : null;
    const scroll = body.scrollTop;
    back.querySelector('#sys-title').textContent = tx('title');
    back.querySelector('#sys-meta').innerHTML = UI.systemForm.meta();
    const x = back.querySelector('#sys-x');
    x.title = t('app.dialog.close');
    x.setAttribute('aria-label', t('app.dialog.close'));
    back.querySelector('#sys-note').textContent = tx('windowNote');
    back.querySelector('#sys-done').textContent = t('app.dialog.close');
    body.innerHTML = '';
    UI.systemForm.build(body);
    body.scrollTop = scroll;
    if (focusId) { const f = document.getElementById(focusId); if (f) f.focus({ preventScroll: true }); }
  }

  function open() {
    ensure();
    app.hideMenus();
    if (!isOpen()) opener = document.activeElement;
    box.back.hidden = false;
    behind().forEach((e) => { e.inert = true; });
    render();
    box.win.focus({ preventScroll: true });
  }

  function close() {
    if (!isOpen()) return;
    box.back.hidden = true;
    behind().forEach((e) => { e.inert = false; });
    UI.tips.hide();
    // the button of the inspector may have been drawn again meanwhile: the new one gets the focus
    const to = opener && !opener.isConnected && opener.classList.contains('sys-open') ? document.querySelector('.sys-open') : opener;
    if (to && to.isConnected) to.focus({ preventScroll: true });
    opener = null;
  }

  const isOpen = () => !!box && !box.back.hidden;

  PumpIt.ui.systemWindow = { open, close, isOpen, render };
})(window);
