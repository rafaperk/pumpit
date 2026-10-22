// Help: the guided tour of the screen, the spotlight of the help's "show on the screen" links and the one-time offer
// of the tour. The tour dims the page, lights one area at a time and explains it in a small card (Next, Back,
// Close; the arrow keys, Enter and Esc too). The page underneath cannot be clicked or typed into while it runs, so
// nothing changes by accident. Texts: help.tour.* and help.offer.* in the catalogs.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const F = UI.format;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('help.tour.' + key, params);

  // areas of the screen, by name (the help's [[show:area]] links use them too)
  const AREAS = {
    menus: '.menus', title: '#model-title', stamp: '#regime-stamp', scenario: '.scenario', status: '.run', language: '.lang', theme: '#theme-toggle', tabs: '.tabs',
    palette: '.palette', paletteToggle: '#palette-toggle', canvas: '#canvas-wrap', views: '#view-hud', overlay: '.overlay-pick', zoom: '.zoom',
    inspector: '#inspector', panel: '#panel-toggle', statusLine: '#status-line', help: '#btn-menu-help',
  };
  // the steps of the tour, in order (texts: help.tour.steps.<area>.title / .body)
  const STEPS = ['menus', 'title', 'stamp', 'scenario', 'status', 'language', 'theme', 'tabs', 'palette', 'canvas', 'views', 'overlay', 'zoom', 'inspector', 'panel', 'help'];
  const IN_NETWORK = new Set(['palette', 'paletteToggle', 'canvas', 'views', 'overlay', 'zoom', 'inspector', 'panel']);

  // an area of the network view on the screen: that view, and the palette or the properties panel open when it is the
  // one shown
  function reveal(area) {
    if (!IN_NETWORK.has(area)) return;
    if (app.view !== 'net') app.setView('net');
    if (area === 'palette') UI.palette.setCollapsed(false);
    if (area === 'inspector') UI.inspector.setCollapsed(false);
  }

  const node = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

  // the box of an area on the screen, with a margin (null when it is not shown)
  function boxOf(area, pad = 6) {
    const el = document.querySelector(AREAS[area]);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const x = Math.max(4, r.left - pad), y = Math.max(4, r.top - pad);
    return { x, y, w: Math.min(innerWidth - 4, r.right + pad) - x, h: Math.min(innerHeight - 4, r.bottom + pad) - y };
  }
  const fit = (box, el) => Object.assign(el.style, { left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' });

  // ------------------------------------------------------------ the tour
  let tour = null; // { layer, dims, hole, card, at }

  function start(from = 0) {
    end();
    dropOffer();
    app.hideMenus();
    if (UI.help) UI.help.close();
    UI.systemWindow.close();
    if (UI.dialogs.isModalOpen()) UI.dialogs.closeModal();
    if (app.view !== 'net') app.setView('net');
    const layer = node('div', 'tour-layer');
    const dims = [0, 1, 2, 3].map(() => node('div', 'tour-dim')); // the page around the light, dimmed
    const hole = node('div', 'tour-hole');
    const card = node('div', 'tour-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-live', 'polite');
    layer.append(...dims, hole, card);
    document.body.appendChild(layer);
    tour = { layer, dims, hole, card, at: from };
    card.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tour]');
      if (b) step(b.dataset.tour);
    });
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', place);
    requestAnimationFrame(() => show(from));
  }

  function step(what) {
    if (!tour) return;
    if (what === 'close') end();
    else if (what === 'back') show(Math.max(0, tour.at - 1));
    else if (tour.at >= STEPS.length - 1) end();
    else show(tour.at + 1);
  }

  function show(i) {
    if (!tour) return;
    tour.at = i;
    const area = STEPS[i], last = i === STEPS.length - 1;
    reveal(area);
    tour.card.innerHTML = `<div class="tour-count">${F.esc(tx('step', { n: i + 1, total: STEPS.length }))}</div>`
      + `<h4>${F.esc(tx(`steps.${area}.title`))}</h4><p>${UI.help.renderInline(tx(`steps.${area}.body`))}</p>`
      + `<div class="tour-actions"><button type="button" class="btn ghost" data-tour="close">${F.esc(tx('close'))}</button><span class="grow"></span>`
      + (i ? `<button type="button" class="btn" data-tour="back">${F.esc(tx('back'))}</button>` : '')
      + `<button type="button" class="btn primary" data-tour="next">${F.esc(tx(last ? 'done' : 'next'))}</button></div>`;
    tour.card.setAttribute('aria-label', tx(`steps.${area}.title`));
    place();
    tour.card.querySelector('[data-tour="next"]').focus({ preventScroll: true });
  }

  // the light on the area and the card next to it: below, above, to the right or to the left, wherever it fits
  function place() {
    if (!tour) return;
    const { hole, card, dims } = tour;
    const box = boxOf(STEPS[tour.at]);
    const cw = Math.min(340, innerWidth - 24), ch = card.offsetHeight || 180;
    card.style.width = cw + 'px';
    const W = innerWidth, H = innerHeight;
    const b = box || { x: W, y: H, w: 0, h: 0 };
    fit({ x: 0, y: 0, w: W, h: box ? b.y : H }, dims[0]);
    fit({ x: 0, y: b.y + b.h, w: W, h: Math.max(0, H - b.y - b.h) }, dims[1]);
    fit({ x: 0, y: b.y, w: b.x, h: b.h }, dims[2]);
    fit({ x: b.x + b.w, y: b.y, w: Math.max(0, W - b.x - b.w), h: b.h }, dims[3]);
    if (!box) {
      hole.style.display = 'none';
      Object.assign(card.style, { left: (innerWidth - cw) / 2 + 'px', top: (innerHeight - ch) / 2 + 'px' });
      return;
    }
    hole.style.display = '';
    fit(box, hole);
    const gap = 12;
    const room = { below: innerHeight - (box.y + box.h), above: box.y, right: innerWidth - (box.x + box.w), left: box.x };
    let x, y;
    if (room.below >= ch + gap) { y = box.y + box.h + gap; x = box.x; }
    else if (room.above >= ch + gap) { y = box.y - ch - gap; x = box.x; }
    else if (room.right >= cw + gap) { x = box.x + box.w + gap; y = box.y; }
    else if (room.left >= cw + gap) { x = box.x - cw - gap; y = box.y; }
    else { x = box.x + (box.w - cw) / 2; y = box.y + (box.h - ch) / 2; } // a large area: the card inside it
    Object.assign(card.style, {
      left: Math.max(12, Math.min(x, innerWidth - cw - 12)) + 'px',
      top: Math.max(12, Math.min(y, innerHeight - ch - 12)) + 'px',
    });
  }

  // while the tour runs, the keys belong to it
  function onKey(e) {
    if (!tour) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); end(); }
    else if (e.key === 'ArrowRight' || (e.key === 'Enter' && !e.target.closest('[data-tour]'))) { e.preventDefault(); step('next'); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step('back'); }
    else if (e.key === 'Tab') {
      // focus stays on the card
      const items = [...tour.card.querySelectorAll('button')];
      const k = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(k + (e.shiftKey ? items.length - 1 : 1)) % items.length].focus();
    } else if (e.key !== 'Enter' && e.key !== ' ') e.preventDefault();
  }

  function end() {
    if (!tour) return;
    tour.layer.remove();
    tour = null;
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', place);
  }

  // texts again, after a change of language
  function refresh() { if (tour) show(tour.at); if (offerCard) offer(true); }

  // ------------------------------------------------------------ the spotlight of a "show" link
  let ring = null;
  function spot(area) {
    UI.systemWindow.close();
    reveal(area);
    if (ring) { ring.remove(); ring = null; }
    requestAnimationFrame(() => {
      const box = boxOf(area);
      if (!box) return;
      ring = node('div', 'spot-ring');
      fit(box, ring);
      document.body.appendChild(ring);
      const mine = ring;
      setTimeout(() => { mine.remove(); if (ring === mine) ring = null; }, 2600);
    });
  }

  // ------------------------------------------------------------ the offer, once
  let offerCard = null;
  function offer(again = false) {
    if (!again && (app.prefs.tourOffered || tour || UI.help.isOpen())) return;
    if (offerCard) offerCard.remove();
    const ox = (key) => F.esc(t('help.offer.' + key));
    offerCard = node('div', 'tour-offer', `<b>${ox('title')}</b><p>${ox('body')}</p><div class="tour-actions">`
      + `<button type="button" class="btn ghost" data-offer="later">${ox('later')}</button><span class="grow"></span>`
      + `<button type="button" class="btn" data-offer="help">${ox('help')}</button>`
      + `<button type="button" class="btn primary" data-offer="tour">${ox('tour')}</button></div>`);
    offerCard.setAttribute('role', 'dialog');
    offerCard.setAttribute('aria-label', t('help.offer.title'));
    document.body.appendChild(offerCard);
    const anchor = document.querySelector(AREAS.help);
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      offerCard.style.left = Math.max(12, Math.min(r.left, innerWidth - offerCard.offsetWidth - 12)) + 'px';
      offerCard.style.top = r.bottom + 10 + 'px';
    }
    offerCard.addEventListener('click', (e) => {
      const b = e.target.closest('[data-offer]');
      if (!b) return;
      offerCard.remove(); offerCard = null;
      app.prefs.tourOffered = true; app.savePrefs();
      if (b.dataset.offer === 'tour') start();
      else if (b.dataset.offer === 'help') UI.help.open();
    });
  }
  const dropOffer = () => { if (offerCard) { offerCard.remove(); offerCard = null; app.prefs.tourOffered = true; app.savePrefs(); } };

  PumpIt.ui.tour = { start, end, spot, offer, dropOffer, refresh, isOn: () => !!tour, AREAS, STEPS };
})(window);
