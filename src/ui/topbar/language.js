// Interface language: the selector in the top bar, the texts written in index.html (data-i18n attributes) and the
// switch itself, which redraws everything and recalculates (results and the checklist carry texts).
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const i18n = PumpIt.i18n;
  const F = UI.format;
  const { $, $$ } = UI.dom;
  const { t } = i18n;

  // static page texts: data-i18n = element text; data-i18n-<attribute> = attribute value
  const ATTRS = ['title', 'aria-label', 'placeholder', 'content'];
  function applyPage() {
    for (const e of $$('[data-i18n]')) setText(e, t(e.dataset.i18n));
    for (const a of ATTRS) for (const e of $$(`[data-i18n-${a}]`)) e.setAttribute(a, t(e.getAttribute('data-i18n-' + a)));
    document.documentElement.lang = i18n.language();
  }

  // replaces the element's own text, keeping child elements (a <kbd>, a badge) and the spacing around the text
  function setText(e, text) {
    if (!e.children.length) { e.textContent = text; return; }
    const node = [...e.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (!node) { e.insertBefore(document.createTextNode(text), e.firstChild); return; }
    const [, lead, trail] = node.nodeValue.match(/^(\s*)[\s\S]*?(\s*)$/);
    node.nodeValue = lead + text + trail;
  }

  // saved choice, else the browser's language when supported, else the base language
  function init() {
    const saved = app.prefs.lang;
    const known = i18n.languages().some((l) => l.code === saved);
    i18n.setLanguage(known ? saved : i18n.detect(navigator.languages || [navigator.language]));
    applyPage();
  }

  function bind() {
    const sel = $('#lang-select');
    sel.innerHTML = i18n.languages().map((l) => `<option value="${F.esc(l.code)}"${l.code === i18n.language() ? ' selected' : ''}>${F.esc(l.name)}</option>`).join('');
    sel.addEventListener('change', () => app.setLanguage(sel.value));
  }

  // the example on screen, if still untouched (equal to a fresh build in the current language)
  function untouchedExample() {
    const json = JSON.stringify(app.model);
    return PumpIt.examples.EXAMPLES.find((ex) => JSON.stringify(ex.build()) === json) || null;
  }

  app.setLanguage = (code) => {
    const example = untouchedExample();
    i18n.setLanguage(code);
    app.prefs.lang = i18n.language();
    app.savePrefs();
    applyPage();
    $('#lang-select').value = i18n.language();
    app.hideMenus();
    UI.menus.renderExamples();
    UI.palette.render();
    UI.fullScreen.label();
    UI.help.refresh();
    UI.tour.refresh();
    UI.theme.render();
    // an untouched example is rebuilt, so its names follow the language; the user's own models are kept as they are
    if (example) { app.model = example.build(); app.pruneSelection(); app.save(); }
    app.version++;
    app.results = {};
    app.recalc();
    app.renderAll();
  };

  PumpIt.ui.language = { init, bind, applyPage };
})(window);
