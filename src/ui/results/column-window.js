// The column window (docs/result-outputs.md): which outputs each results table shows, in which order and in which
// unit, for a liquid and for a gas. On the left, the outputs a table can show and does not, in groups; on the right,
// the columns it shows. A click selects an output (several may be selected), a double click or the arrow buttons move
// it to the other side, Up and Down change the order of the selected columns, and each column has its unit list.
// Save keeps everything in this browser (column-setup.js); Cancel, Esc or the dimmed background leave it as it was.
// The profile row saves the four tables of the fluid on screen as a named template, applies and deletes templates,
// and takes the profile out to a file and back in. The page behind takes no clicks and no focus while it is open.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, UI = PumpIt.ui;
  const F = UI.format;
  const Cat = UI.resultCatalog;
  const S = UI.columnSetup;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('results.setup.' + key, params);

  const ICON = {
    columns: '<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6.1 3v10M9.9 3v10" stroke="currentColor" stroke-width="1.3"/></svg>',
    close: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    up: '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M8 13V3.5M3.8 7.6L8 3.4l4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M8 3v9.5M3.8 8.4L8 12.6l4.2-4.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    drop: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  };
  // the parts of the page behind the window
  const behind = () => ['.topbar', '.tabs', '.views'].map((s) => document.querySelector(s));

  let box = null;
  let opener = null; // the element that had the focus before the window opened; it gets the focus back
  let pressedBack = false;
  // what the window shows: the fluid of the open model, the fluid and the table on screen, a copy of every table of both
  // fluids (draft), the outputs selected on each side, the filter of the left side and the template chosen
  let st = null;

  const cur = () => st.draft[st.regime][st.table];
  const label = (k) => Cat.label(st.regime, st.table, k);
  const entry = (k) => Cat.find(st.regime, st.table, k);
  // text compared by the filter: lower case, without accents
  const plain = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function ensure() {
    if (box) return box;
    const back = document.createElement('div');
    back.className = 'sys-back';
    back.id = 'columns-window';
    back.hidden = true;
    back.innerHTML = `<div class="sys-win cw-win" role="dialog" aria-modal="true" aria-labelledby="cw-title" tabindex="-1">
      <header class="sys-head">
        <span class="sys-logo">${ICON.columns}</span>
        <div class="sys-titles"><h2 id="cw-title"></h2><div class="sys-meta" id="cw-meta"></div></div>
        <button type="button" class="btn ghost icon" data-cw="cancel" id="cw-x">${ICON.close}</button>
      </header>
      <div class="cw-bar"><div class="seg" id="cw-regimes" role="group"></div><div class="seg" id="cw-tables" role="group"></div></div>
      <div class="cw-body">
        <section class="cw-pane">
          <div class="cw-pane-head"><h4 id="cw-left-title"></h4><input type="search" id="cw-filter" autocomplete="off" spellcheck="false"></div>
          <div class="cw-list" id="cw-left" role="group" aria-labelledby="cw-left-title"></div>
        </section>
        <div class="cw-mid">
          <button type="button" class="btn" data-cw="add"></button>
          <button type="button" class="btn" data-cw="remove"></button>
        </div>
        <section class="cw-pane">
          <div class="cw-pane-head"><h4 id="cw-right-title"></h4>
            <button type="button" class="btn small icon" data-cw="up">${ICON.up}</button>
            <button type="button" class="btn small icon" data-cw="down">${ICON.down}</button>
          </div>
          <div class="cw-list" id="cw-right" role="group" aria-labelledby="cw-right-title"></div>
        </section>
      </div>
      <div class="cw-profile">
        <label class="eyebrow" for="cw-tpl" id="cw-profile-label"></label>
        <select id="cw-tpl"></select>
        <button type="button" class="btn small" data-cw="apply"></button>
        <button type="button" class="btn small" data-cw="saveas"></button>
        <button type="button" class="btn small" data-cw="delete"></button>
        <span class="cw-spacer"></span>
        <button type="button" class="btn small ghost" data-cw="export"></button>
        <button type="button" class="btn small ghost" data-cw="import"></button>
        <input type="file" id="cw-file" accept=".json,application/json" hidden>
      </div>
      <footer class="sys-foot">
        <button type="button" class="btn" data-cw="reset"></button>
        <p class="hint" id="cw-note"></p>
        <button type="button" class="btn" data-cw="cancel"></button>
        <button type="button" class="btn primary" data-cw="save"></button>
      </footer>
    </div>`;
    document.getElementById('app').appendChild(back);
    box = { back, win: back.querySelector('.cw-win') };
    const $ = (sel) => back.querySelector(sel);
    // the dimmed background closes the window, unless the press began inside it
    back.addEventListener('mousedown', (e) => { pressedBack = e.target === back; });
    back.addEventListener('click', (e) => {
      if (e.target === back) { if (pressedBack) close(); return; }
      const rg = e.target.closest('[data-cw-regime]');
      if (rg) { show({ regime: rg.dataset.cwRegime }); return; }
      const tb = e.target.closest('[data-cw-table]');
      if (tb) { show({ table: tb.dataset.cwTable }); return; }
      const it = e.target.closest('.cw-item[data-k]');
      if (it) { pick(it); return; }
      const b = e.target.closest('[data-cw]');
      if (b && !b.disabled && ACTIONS[b.dataset.cw]) ACTIONS[b.dataset.cw](b);
    });
    // a double click moves the output to the other side
    back.addEventListener('dblclick', (e) => {
      const it = e.target.closest('.cw-item[data-k]');
      if (!it) return;
      const k = it.dataset.k, left = it.dataset.side === 'l';
      if (left) add(new Set([k])); else remove(new Set([k]));
      render(onItem(left ? 'r' : 'l', k));
    });
    back.addEventListener('change', (e) => {
      if (e.target.matches('.cw-unit')) { const c = cur().find((x) => x.k === e.target.dataset.k); if (c) c.u = e.target.value; return; }
      if (e.target.id === 'cw-tpl') { st.tpl = e.target.value; buttons(); return; }
      if (e.target.id === 'cw-file') { importFile(e.target.files[0]); e.target.value = ''; }
    });
    $('#cw-filter').addEventListener('input', (e) => { st.filter = e.target.value; $('#cw-left').innerHTML = leftHtml(); });
    // Esc in a filter with text clears it, as in the help window; the next one closes the window
    $('#cw-filter').addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !e.target.value) return;
      e.preventDefault(); e.stopPropagation();
      e.target.value = st.filter = '';
      $('#cw-left').innerHTML = leftHtml();
    });
    // Delete removes the columns selected on the right
    $('#cw-right').addEventListener('keydown', (e) => {
      if (e.key === 'Delete' && st.selR.size) { e.preventDefault(); ACTIONS.remove(); }
    });
    return box;
  }

  // ------------------------------------------------------------ the two sides
  // an output as a button that a click selects
  function item(side, e) {
    const on = (side === 'l' ? st.selL : st.selR).has(e.k);
    const hint = side === 'l' && e.c ? `<small>${F.esc(F.unit(S.defaultUnit(e)))}</small>` : '';
    return `<button type="button" class="cw-item" data-side="${side}" data-k="${e.k}" aria-pressed="${on}">${F.esc(label(e.k))}${hint}</button>`;
  }

  // the outputs the table can show and does not, by group, those the filter keeps
  function leftHtml() {
    const shown = new Set(cur().map((c) => c.k));
    const free = Cat.outputs(st.regime, st.table).filter((e) => !shown.has(e.k));
    if (!free.length) return `<p class="cw-empty">${F.esc(tx('allShown'))}</p>`;
    const q = plain(st.filter.trim());
    const vis = free.filter((e) => !q || plain(label(e.k)).includes(q));
    if (!vis.length) return `<p class="cw-empty">${F.esc(tx('noMatch'))}</p>`;
    return Cat.GROUPS.map((g) => {
      const items = vis.filter((e) => e.g === g);
      if (!items.length) return '';
      const name = F.esc(t('results.groups.' + g));
      return `<div class="cw-group" role="group" aria-label="${name}"><div class="cw-group-title" aria-hidden="true">${name}</div>${items.map((e) => item('l', e)).join('')}</div>`;
    }).join('');
  }

  // the columns of the table, in order, each with its unit; the identification is always first
  function rightHtml() {
    return cur().map((c) => {
      const e = entry(c.k);
      if (c.k === 'id') return `<div class="cw-row locked"><span class="cw-item">${F.esc(label('id'))}</span><span class="cw-lock">${F.esc(tx('always'))}</span></div>`;
      const name = label(c.k);
      const unit = e.c ? `<select class="cw-unit" data-k="${c.k}" aria-label="${F.esc(t('results.unitOf', { label: name }))}">${U.list(e.c).map((u) => F.option(u, F.unit(u), u === c.u)).join('')}</select>` : '';
      const drop = F.esc(tx('removeOne', { label: name }));
      return `<div class="cw-row${st.selR.has(c.k) ? ' on' : ''}">${item('r', e)}${unit}<button type="button" class="cw-x" data-cw="drop" data-k="${c.k}" title="${drop}" aria-label="${drop}">${ICON.drop}</button></div>`;
    }).join('');
  }

  // a click selects an output or lets it go (the buttons stay, so that a double click lands on the same one)
  function pick(it) {
    const set = it.dataset.side === 'l' ? st.selL : st.selR;
    const k = it.dataset.k;
    if (set.has(k)) set.delete(k); else set.add(k);
    it.setAttribute('aria-pressed', String(set.has(k)));
    if (it.dataset.side === 'r') it.parentElement.classList.toggle('on', set.has(k));
    buttons();
  }

  // a new column takes the unit of a column of the same quantity already in the table, otherwise its default unit
  function unitFor(e, list) {
    if (!e.c) return '';
    const same = list.find((c) => { const o = entry(c.k); return o && o.c === e.c; });
    return same ? same.u : S.defaultUnit(e);
  }
  // outputs to the right, in the order of the catalog; they stay selected there
  function add(keys) {
    const list = cur();
    const have = new Set(list.map((c) => c.k));
    const order = Cat.outputs(st.regime, st.table).filter((e) => keys.has(e.k) && !have.has(e.k));
    for (const e of order) list.push({ k: e.k, u: unitFor(e, list) });
    st.selL = new Set();
    st.selR = new Set(order.map((e) => e.k));
  }
  // columns back to the left, where they stay selected
  function remove(keys) {
    st.draft[st.regime][st.table] = cur().filter((c) => c.k === 'id' || !keys.has(c.k));
    st.selR = new Set();
    st.selL = new Set([...keys].filter((k) => k !== 'id'));
  }
  // the selected columns one place up or down, together (the identification stays first)
  function move(dir) {
    const list = cur();
    const on = (i) => !!list[i] && st.selR.has(list[i].k);
    if (dir < 0) { for (let i = 2; i < list.length; i++) if (on(i) && !on(i - 1)) [list[i - 1], list[i]] = [list[i], list[i - 1]]; }
    else { for (let i = list.length - 2; i >= 1; i--) if (on(i) && !on(i + 1)) [list[i + 1], list[i]] = [list[i], list[i + 1]]; }
  }

  // ------------------------------------------------------------ profile
  function importFile(f) {
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      let n = -1;
      try { n = S.importProfile(JSON.parse(rd.result)); } catch (e) { n = -1; }
      if (n < 0) { app.toast(tx('badProfile')); return; }
      Object.assign(st, { draft: S.snapshot(), selL: new Set(), selR: new Set(), tpl: '' });
      render();
      app.renderView();
      app.toast(tx('imported', { n }));
    };
    rd.readAsText(f);
  }

  // the first of a set of keys in the order of the catalog
  const first = (keys) => (Cat.outputs(st.regime, st.table).find((e) => keys.has(e.k)) || {}).k;
  const ACTIONS = {
    add: () => { add(new Set(st.selL)); render(onItem('r', first(st.selR))); },
    remove: () => { remove(new Set(st.selR)); render(onItem('l', first(st.selL))); },
    // the cross of a row: the focus goes to the cross of the row that takes its place
    drop: (b) => {
      const i = [...box.back.querySelectorAll('#cw-right .cw-x')].indexOf(b);
      remove(new Set([b.dataset.k]));
      render((back) => { const xs = back.querySelectorAll('#cw-right .cw-x'); return xs[Math.min(i, xs.length - 1)] || null; });
    },
    up: () => { move(-1); render(); },
    down: () => { move(1); render(); },
    reset: () => { st.draft[st.regime][st.table] = S.defaults(st.regime, st.table); st.selL = new Set(); st.selR = new Set(); render(); },
    cancel: () => close(),
    // the tables are drawn again before the window closes, so that the focus goes back to the new button of the table
    save: () => { S.saveAll(st.draft); app.renderView(); close(); app.toast(tx('saved')); },
    apply: () => {
      const tables = S.templateTables(st.regime, st.tpl);
      if (!tables) return;
      st.draft[st.regime] = tables;
      st.selL = new Set(); st.selR = new Set();
      render();
      app.toast(tx('applied', { name: st.tpl }));
    },
    saveas: () => UI.dialogs.askText(tx('saveAsTitle'), tx('nameLabel', { fluid: tx('fluids.' + st.regime) }), st.tpl, (name) => {
      S.saveTemplate(name, st.regime, st.draft[st.regime]);
      st.tpl = name;
      render();
      box.back.querySelector('#cw-tpl').focus();
      app.toast(tx('templateSaved', { name }));
    }),
    delete: () => {
      const name = st.tpl;
      UI.dialogs.confirmBox(tx('deleteTitle'), tx('deleteText', { name }), tx('delete'), () => { S.deleteTemplate(st.regime, name); st.tpl = ''; render(); });
    },
    export: () => UI.download.saveFile(`${UI.download.safeName(tx('profileFile'))}.json`, new Blob([JSON.stringify(S.profile(), null, 1)], { type: 'application/json' })),
    import: () => box.back.querySelector('#cw-file').click(),
  };

  // ------------------------------------------------------------ drawing
  // the buttons that need a selection or a template
  function buttons() {
    const q = (sel) => box.back.querySelector(sel);
    q('[data-cw="add"]').disabled = !st.selL.size;
    q('[data-cw="remove"]').disabled = !st.selR.size;
    q('[data-cw="up"]').disabled = q('[data-cw="down"]').disabled = !st.selR.size;
    q('[data-cw="apply"]').disabled = q('[data-cw="delete"]').disabled = !st.tpl;
  }

  // the control that has the focus, as a selector that finds it again after the window is drawn again
  function focusedSelector(back) {
    const a = document.activeElement;
    if (!a || !back.contains(a) || a === box.win) return null;
    const d = a.dataset || {};
    if (a.id) return '#' + a.id;
    if (a.matches('.cw-item[data-k], .cw-unit')) return `.${a.classList.contains('cw-unit') ? 'cw-unit' : 'cw-item'}[data-k="${d.k}"]`;
    if (d.cwRegime) return `[data-cw-regime="${d.cwRegime}"]`;
    if (d.cwTable) return `[data-cw-table="${d.cwTable}"]`;
    if (d.cw && d.cw !== 'drop') return `[data-cw="${d.cw}"]`;
    return null;
  }

  // everything again. The focus stays on the same control; focus(back), when given, says where it goes instead (the
  // output that moved, say). A control that is gone or disabled leaves the focus on the window.
  function render(focus) {
    if (!isOpen()) return;
    const back = box.back, q = (sel) => back.querySelector(sel);
    const keep = focusedSelector(back);
    q('#cw-title').textContent = tx('title');
    q('#cw-meta').textContent = tx('meta');
    const x = q('#cw-x');
    x.title = t('app.dialog.close');
    x.setAttribute('aria-label', t('app.dialog.close'));
    q('#cw-regimes').setAttribute('aria-label', tx('fluid'));
    // the fluid of the open model has a dot
    q('#cw-regimes').innerHTML = Cat.REGIMES.map((rg) => {
      const cls = [rg === st.regime ? 'on' : '', rg === st.model ? 'cur' : ''].filter(Boolean).join(' ');
      const title = rg === st.model ? ` title="${F.esc(tx('openModel'))}"` : '';
      return `<button type="button" data-cw-regime="${rg}" class="${cls}"${title} aria-pressed="${rg === st.regime}">${F.esc(tx(rg))}</button>`;
    }).join('');
    q('#cw-tables').setAttribute('aria-label', tx('table'));
    q('#cw-tables').innerHTML = Cat.TABLES.map((tb) => `<button type="button" data-cw-table="${tb}" class="${tb === st.table ? 'on' : ''}" aria-pressed="${tb === st.table}">${F.esc(t('results.tabs.' + tb))}</button>`).join('');
    q('#cw-left-title').textContent = tx('available');
    const fl = q('#cw-filter');
    fl.placeholder = tx('filter');
    fl.setAttribute('aria-label', tx('filter'));
    fl.value = st.filter;
    q('#cw-right-title').textContent = tx('shown');
    q('#cw-left').innerHTML = leftHtml();
    q('#cw-right').innerHTML = rightHtml();
    q('[data-cw="add"]').textContent = tx('add') + ' →';
    q('[data-cw="remove"]').textContent = '← ' + tx('remove');
    for (const d of ['up', 'down']) { const b = q(`[data-cw="${d}"]`); b.title = tx(d); b.setAttribute('aria-label', tx(d)); }
    q('#cw-profile-label').textContent = tx('templates');
    const tps = S.templates(st.regime);
    if (!tps.some((tp) => tp.name === st.tpl)) st.tpl = '';
    const sel = q('#cw-tpl');
    sel.innerHTML = tps.length
      ? F.option('', tx('choose'), !st.tpl) + tps.map((tp) => F.option(tp.name, tp.name, tp.name === st.tpl)).join('')
      : F.option('', tx('none'), true);
    sel.disabled = !tps.length;
    for (const k of ['apply', 'saveAs', 'delete', 'export', 'import', 'reset', 'save']) q(`[data-cw="${k.toLowerCase()}"]`).textContent = tx(k);
    q('[data-cw="export"]').title = tx('exportTitle');
    q('#cw-note').textContent = tx('note');
    q('.sys-foot [data-cw="cancel"]').textContent = t('app.dialog.cancel');
    buttons();
    const to = focus ? focus(back) : keep ? back.querySelector(keep) : null;
    if (!focus && !keep) return;
    const el = to && !to.disabled ? to : box.win;
    el.focus({ preventScroll: true });
    if (el.matches('.cw-item')) el.scrollIntoView({ block: 'nearest' });
  }
  // after a move: the focus on the output of key k, on the side it went to
  const onItem = (side, k) => (back) => back.querySelector(`.cw-item[data-side="${side}"][data-k="${k}"]`);

  // another fluid or table on screen
  function show(next) {
    Object.assign(st, next, { selL: new Set(), selR: new Set() });
    render();
  }

  // opens on a table of the results, for the fluid of the open model
  function open(table, regime) {
    ensure();
    app.hideMenus();
    if (!isOpen()) opener = document.activeElement;
    const rg = Cat.REGIMES.includes(regime) ? regime : 'liquid';
    st = { model: rg, regime: rg, table: Cat.TABLES.includes(table) ? table : 'pipes', draft: S.snapshot(), selL: new Set(), selR: new Set(), filter: '', tpl: '' };
    box.back.hidden = false;
    behind().forEach((e) => { e.inert = true; });
    render();
    box.win.focus({ preventScroll: true });
  }

  function close() {
    if (!isOpen()) return;
    box.back.hidden = true;
    behind().forEach((e) => { e.inert = false; });
    // the button of the table may have been drawn again meanwhile: the new one gets the focus
    const to = opener && !opener.isConnected && opener.dataset && opener.dataset.columns ? document.querySelector(`[data-columns="${opener.dataset.columns}"]`) : opener;
    if (to && to.isConnected) to.focus({ preventScroll: true });
    opener = null;
  }

  const isOpen = () => !!box && !box.back.hidden;

  PumpIt.ui.columnWindow = { open, close, isOpen };
})(window);
