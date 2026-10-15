// Right click on an object: the data card plus actions (reverse, copy, paste, delete).
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, app = PumpIt.app;
  const { $ } = UI.dom;
  const { t } = PumpIt.i18n;

  app.showInfo = (hit, x, y) => {
    const cm = $('#ctxmenu');
    const card = UI.infoCard.build(app, hit);
    if (!card) return;
    cm.innerHTML = UI.infoCard.html(card) + '<div class="info-actions"></div>';
    const acts = cm.querySelector('.info-actions');
    const many = app.selSet.size > 1;
    const items = [];
    if (hit.kind === 'pipe' && !many) items.push([t('network.menu.reverse'), () => app.reversePipe(hit.id)]);
    items.push([many ? t('network.menu.copyMany', { n: app.selSet.size }) : t('network.menu.copy'), () => app.copySelection()]);
    if (app.clipboard) items.push([t('network.menu.paste'), () => app.paste()]);
    items.push([many ? t('network.menu.deleteMany', { n: app.selSet.size }) : t('network.menu.delete'), () => app.deleteSelection()]);
    for (const [label, fn] of items) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.addEventListener('click', () => { cm.hidden = true; fn(); });
      acts.appendChild(b);
    }
    cm.hidden = false;
    const w = cm.offsetWidth, h = cm.offsetHeight;
    cm.style.left = Math.max(8, Math.min(x + 6, innerWidth - w - 8)) + 'px';
    cm.style.top = Math.max(8, Math.min(y + 6, innerHeight - h - 8)) + 'px';
  };
})(window);
