// Help window: the guide to the whole app and the technical reference of the calculation, in the current language,
// opened from the Help menu or with F1. On the left, the chapters and their sections (or the search results); on
// the right, one section at a time, with Previous and Next. The last section read is remembered.
//
// The chapters and sections are listed below; their texts live in the catalogs (help.chapters.<chapter>.title,
// help.chapters.<chapter>.sections.<section>.title and .body). A body is HTML with a few tokens:
//   [[t:key]]                 an interface label (a menu, a button, a field), as the user sees it in the language
//   [[eq:id]]                 a formula (equations.js), on a line of its own
//   [[icon:type]]             the palette symbol of a junction type
//   [[go:chapter.section|text]]   a link to another section (without text: its title)
//   [[show:area|text]]        a button that closes the help and lights that area of the screen (tour.js, AREAS)
//   [[act:action|text]]       a button: tour, shortcuts, or example:<id> (without text: the example's name)
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const F = UI.format;
  const i18n = PumpIt.i18n;
  const { t } = i18n;
  const hx = (key, params) => t('help.' + key, params);

  // chapters and their sections, in reading order
  const CHAPTERS = [
    ['start', ['welcome', 'firstModel', 'examples', 'autoCalc', 'saving']],
    ['screen', ['overview', 'topbar', 'tabs', 'inspector', 'units']],
    ['draw', ['place', 'pipes', 'select', 'edit', 'context', 'direction']],
    ['junctions', ['overview', 'reservoir', 'pressure', 'flow', 'spray', 'branch', 'pump', 'valve', 'control', 'exitvalve', 'orifice', 'generic']],
    ['pipes', ['geometry', 'friction', 'fittings', 'ends']],
    ['system', ['fluid', 'environment', 'solution']],
    ['gas', ['concept', 'setup', 'components', 'compressor', 'results']],
    ['scenarios', ['concept', 'working']],
    ['results', ['overlay', 'tables', 'warnings', 'velocity', 'inputs']],
    ['charts', ['pump', 'profile']],
    ['views3d', ['concept', 'iso', 'free', 'symbols']],
    ['files', ['files', 'language', 'shortcuts']],
    ['tech', ['overview', 'network', 'newton', 'friction', 'minor', 'pumps', 'valves', 'boundaries', 'fluid', 'outputs', 'references']],
    ['gasTech', ['properties', 'pipe', 'choking', 'network', 'machines', 'validation']],
    ['about', ['about']],
  ];
  const ORDER = CHAPTERS.flatMap(([ch, secs]) => secs.map((s) => `${ch}.${s}`));
  const DEFAULT = ORDER[0];
  const known = (id) => ORDER.includes(id);
  const chapterOf = (id) => id.split('.')[0];
  const chapterTitle = (ch) => t(`help.chapters.${ch}.title`);
  const sectionKey = (id) => { const [ch, s] = id.split('.'); return `help.chapters.${ch}.sections.${s}`; };
  const titleOf = (id) => t(sectionKey(id) + '.title');
  const bodyOf = (id) => t(sectionKey(id) + '.body');

  const ICON = {
    search: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.4 10.4L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    eye: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>',
    tour: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.6 5.4L9 9 5.4 10.6 7 7z" fill="currentColor"/></svg>',
    help: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.4 9.3a2.7 2.7 0 1 1 3.9 2.4c-.8.4-1.3 1-1.3 1.9v.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.15" fill="currentColor"/></svg>',
  };

  // ------------------------------------------------------------ tokens
  const TOKEN = /\[\[(\w+):([^\]|]+)(?:\|([^\]]*))?\]\]/g;
  function actLabel(act) {
    if (act.startsWith('example:')) { const ex = PumpIt.examples.get(act.slice(8)); return ex ? F.esc(ex.name) : act; }
    return F.esc(act);
  }
  // a body (or any help text) as HTML for the screen; plain: as text for the search, without formulas and symbols
  function render(html, plain = false) {
    return String(html).replace(TOKEN, (all, kind, arg, label) => {
      if (kind === 't') return plain ? t(arg) : `<b class="ui">${F.esc(t(arg))}</b>`;
      if (kind === 'eq') { if (plain) return ' '; const f = UI.helpEquations.formula(arg, i18n.language()); return f ? `<div class="eq">${f}</div>` : ''; }
      if (kind === 'icon') return plain ? '' : `<span class="help-icon">${UI.junctionTypes.icon(arg, 20)}</span>`;
      if (kind === 'go') { const text = label || F.esc(titleOf(arg)); return plain ? text : `<a href="#" class="help-go" data-go="${F.esc(arg)}">${text}</a>`; }
      if (kind === 'show') return plain ? label || '' : `<button type="button" class="help-show" data-show="${F.esc(arg)}">${ICON.eye}<span>${label || ''}</span></button>`;
      if (kind === 'act') { const text = label || actLabel(arg); return plain ? text : `<button type="button" class="btn small help-act" data-act="${F.esc(arg)}">${text}</button>`; }
      return all;
    });
  }

  // ------------------------------------------------------------ search
  const fold = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let index = null; // { lang, items: [{ id, title, text, ft, fx }] }
  function toText(html) {
    const d = document.createElement('div');
    d.innerHTML = html.replace(/<(td|th|tr|li|p|h4|div|br)/gi, ' <$1'); // cells and paragraphs apart
    return d.textContent.replace(/\s+/g, ' ').trim();
  }
  function searchIndex() {
    if (index && index.lang === i18n.language()) return index.items;
    const items = ORDER.map((id) => {
      const title = titleOf(id), text = toText(render(bodyOf(id), true));
      return { id, title, text, ft: fold(title), fx: fold(text) };
    });
    index = { lang: i18n.language(), items };
    return items;
  }
  const termsOf = (q) => fold(q).split(/\s+/).filter((w) => w.length > 1 || /\d/.test(w));
  function search(q) {
    const terms = termsOf(q);
    if (!terms.length) return [];
    const out = [];
    for (const it of searchIndex()) {
      if (!terms.every((w) => it.ft.includes(w) || it.fx.includes(w))) continue;
      const score = terms.reduce((s, w) => s + (it.ft.includes(w) ? 10 : 0) + it.fx.split(w).length - 1, 0);
      out.push({ it, score });
    }
    return out.sort((a, b) => b.score - a.score).map((r) => r.it);
  }
  function snippet(it, q) {
    const w = termsOf(q).find((x) => it.fx.includes(x));
    if (!w) return it.text.slice(0, 110) + (it.text.length > 110 ? '…' : '');
    const at = it.fx.indexOf(w), a = Math.max(0, at - 50), b = Math.min(it.text.length, at + w.length + 70);
    return (a ? '…' : '') + it.text.slice(a, b) + (b < it.text.length ? '…' : '');
  }
  // the search words marked in the text of a section (accents ignored)
  const LOOSE = { a: '[aáàâãä]', e: '[eéèêë]', i: '[iíìîï]', o: '[oóòôõö]', u: '[uúùûü]', c: '[cç]', n: '[nñ]' };
  function mark(el, q) {
    const terms = termsOf(q);
    if (!terms.length) return;
    const re = new RegExp(terms.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[aeioucn]/g, (c) => LOOSE[c])).join('|'), 'gi');
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest('.eq, mark') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const text = n.nodeValue;
      re.lastIndex = 0;
      if (!re.test(text)) continue;
      re.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = re.exec(text))) {
        frag.append(text.slice(last, m.index));
        const mk = document.createElement('mark');
        mk.textContent = m[0];
        frag.append(mk);
        last = m.index + m[0].length;
      }
      frag.append(text.slice(last));
      n.replaceWith(frag);
    }
  }

  // ------------------------------------------------------------ the window
  let box = null; // { back, nav, doc, q }
  const state = { cur: DEFAULT, q: '', open: new Set() };

  function ensure() {
    if (box) return box;
    const back = document.createElement('div');
    back.className = 'help-back';
    back.id = 'help';
    back.hidden = true;
    back.innerHTML = `<div class="help-win" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <header class="help-head">
        <span class="help-logo">${ICON.help}</span><h2 id="help-title"></h2>
        <label class="help-search">${ICON.search}<input type="search" id="help-q" autocomplete="off" spellcheck="false"></label>
        <button type="button" class="btn ghost" data-act="tour" id="help-tour">${ICON.tour}<span></span></button>
        <button type="button" class="btn ghost icon" id="help-x">${ICON.close}</button>
      </header>
      <div class="help-main"><nav class="help-nav" id="help-nav"></nav><article class="help-doc" id="help-doc" tabindex="-1"></article></div>
    </div>`;
    document.getElementById('app').appendChild(back);
    box = { back, nav: back.querySelector('#help-nav'), doc: back.querySelector('#help-doc'), q: back.querySelector('#help-q') };
    back.addEventListener('click', onClick);
    box.q.addEventListener('input', () => { state.q = box.q.value; renderNav(); renderDoc(false); });
    box.q.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && box.q.value) { e.stopPropagation(); box.q.value = ''; state.q = ''; renderNav(); renderDoc(false); }
      else if (e.key === 'Enter') { e.preventDefault(); const first = box.nav.querySelector('[data-go]'); if (first) go(first.dataset.go); }
      else if (e.key === 'ArrowDown') { const first = box.nav.querySelector('[data-go]'); if (first) { e.preventDefault(); first.focus(); } }
    });
    return box;
  }

  function onClick(e) {
    if (e.target === box.back || e.target.closest('#help-x')) { close(); return; }
    const go1 = e.target.closest('[data-go]');
    if (go1) { e.preventDefault(); go(go1.dataset.go); return; }
    const ch = e.target.closest('[data-ch]');
    if (ch) { const c = ch.dataset.ch; if (state.open.has(c)) state.open.delete(c); else state.open.add(c); renderNav(); return; }
    const show = e.target.closest('[data-show]');
    if (show) { close(); UI.tour.spot(show.dataset.show); return; }
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'tour') { close(); UI.tour.start(); }
      else if (a === 'shortcuts') UI.shortcuts.show();
      else if (a.startsWith('example:')) { close(); UI.menus.openExample(a.slice(8)); }
    }
  }

  function renderChrome() {
    const { back, q } = box;
    back.querySelector('#help-title').textContent = hx('title');
    q.placeholder = hx('search');
    q.setAttribute('aria-label', hx('search'));
    back.querySelector('#help-tour span').textContent = hx('tourButton');
    back.querySelector('#help-x').setAttribute('aria-label', hx('close'));
    back.querySelector('#help-x').title = hx('close');
    box.nav.setAttribute('aria-label', hx('contents'));
  }

  function renderNav() {
    const { nav } = box;
    if (state.q.trim()) {
      const found = search(state.q);
      nav.innerHTML = `<div class="help-nav-head">${F.esc(hx('found', { n: found.length }))}</div>` + (found.length
        ? found.map((it) => `<a href="#" class="help-hit${it.id === state.cur ? ' on' : ''}" data-go="${it.id}"><b>${F.esc(it.title)}</b><small>${F.esc(chapterTitle(chapterOf(it.id)))}</small><span>${F.esc(snippet(it, state.q))}</span></a>`).join('')
        : `<p class="help-none">${F.esc(hx('noMatch'))}</p>`);
      return;
    }
    const curCh = chapterOf(state.cur);
    nav.innerHTML = CHAPTERS.map(([ch, secs], k) => {
      const open = ch === curCh || state.open.has(ch);
      return `<div class="help-ch${open ? ' open' : ''}${ch === curCh ? ' cur' : ''}"><button type="button" class="help-ch-t" data-ch="${ch}" aria-expanded="${open}"><span class="n">${k + 1}</span><span>${F.esc(chapterTitle(ch))}</span></button>`
        + (open ? `<div class="help-secs">${secs.map((s) => { const id = `${ch}.${s}`; return `<a href="#" data-go="${id}"${id === state.cur ? ' class="on" aria-current="page"' : ''}>${F.esc(titleOf(id))}</a>`; }).join('')}</div>` : '')
        + '</div>';
    }).join('');
    const on = nav.querySelector('.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
  }

  function renderDoc(top = true) {
    const { doc } = box;
    const id = state.cur, k = ORDER.indexOf(id);
    const prev = ORDER[k - 1], next = ORDER[k + 1];
    const pager = (to, cls, label) => (to ? `<a href="#" class="${cls}" data-go="${to}"><small>${F.esc(label)}</small><span>${F.esc(titleOf(to))}</span></a>` : '<span></span>');
    doc.innerHTML = `<div class="help-crumb">${F.esc(chapterTitle(chapterOf(id)))}</div><h3>${F.esc(titleOf(id))}</h3>`
      + `<div class="help-body">${render(bodyOf(id))}</div>`
      + `<nav class="help-pager">${pager(prev, 'prev', '← ' + hx('prev'))}${pager(next, 'next', hx('next') + ' →')}</nav>`;
    if (state.q.trim()) mark(doc.querySelector('.help-body'), state.q);
    if (top) doc.scrollTop = 0;
  }

  // ------------------------------------------------------------ opening and navigating
  function go(id) {
    if (!known(id)) return;
    state.cur = id;
    app.prefs.helpAt = id;
    app.savePrefs();
    renderNav();
    renderDoc();
    box.doc.focus({ preventScroll: true });
  }

  // id: 'chapter.section'; without one, the last section read
  function open(id) {
    ensure();
    if (UI.tour) { UI.tour.dropOffer(); UI.tour.end(); }
    app.hideMenus();
    state.cur = known(id) ? id : known(app.prefs.helpAt) ? app.prefs.helpAt : DEFAULT;
    box.back.hidden = false;
    renderChrome();
    renderNav();
    renderDoc();
    box.doc.focus({ preventScroll: true });
  }

  function close() { if (box) box.back.hidden = true; }
  const isOpen = () => !!box && !box.back.hidden;

  // texts again, after a change of language
  function refresh() {
    index = null;
    if (isOpen()) { renderChrome(); renderNav(); renderDoc(false); }
  }

  PumpIt.ui.help = { open, close, isOpen, refresh, go, render, renderInline: (html) => render(html), CHAPTERS, ORDER };
})(window);
