// Light and dark mode: the sun and moon button of the top bar. The colours of both modes are in tokens.css; without
// a choice the page follows the system (prefers-color-scheme), and a choice is kept with the preferences and set
// on <html> as data-theme. This script is loaded in the head of index.html, so a chosen mode is on the page from
// its first paint; at load time it uses only the browser, and the button is connected at start-up (bind).
(function (root) {
  const PumpIt = (root.PumpIt = root.PumpIt || {});
  PumpIt.ui = PumpIt.ui || {};
  const html = root.document.documentElement;
  const PREFS = 'pumpit.prefs'; // the preferences of src/ui/app/state.js, read here before the app exists
  const MODES = ['light', 'dark'];
  const system = root.matchMedia ? root.matchMedia('(prefers-color-scheme: dark)') : null;
  const t = (key) => PumpIt.i18n.t(key);

  function set(mode) {
    if (MODES.includes(mode)) html.dataset.theme = mode;
    else delete html.dataset.theme;
  }
  // the mode on the screen: the chosen one, else the system's
  const current = () => (MODES.includes(html.dataset.theme) ? html.dataset.theme : system && system.matches ? 'dark' : 'light');

  try { set((JSON.parse(root.localStorage.getItem(PREFS)) || {}).theme); } catch (e) { /* storage unavailable: the system's mode */ }

  // the button shows the mode it switches to: the moon on the light page, the sun on the dark one
  function render() {
    const b = root.document.getElementById('theme-toggle');
    if (!b) return;
    const dark = current() === 'dark';
    const label = dark ? t('app.theme.toLight') : t('app.theme.toDark');
    b.dataset.mode = dark ? 'dark' : 'light';
    b.title = label;
    b.setAttribute('aria-label', label);
  }

  function toggle() {
    const app = PumpIt.app;
    const next = current() === 'dark' ? 'light' : 'dark';
    set(next);
    app.prefs.theme = next;
    app.savePrefs();
    render();
    // the icon turns in (not on load: only when the mode is switched)
    const b = root.document.getElementById('theme-toggle');
    b.classList.remove('turn');
    void b.offsetWidth;
    b.classList.add('turn');
  }

  function bind() {
    const b = root.document.getElementById('theme-toggle');
    b.addEventListener('click', toggle);
    b.addEventListener('animationend', () => b.classList.remove('turn'));
    // while no mode is chosen, the page follows the system, and the button with it
    if (system && system.addEventListener) system.addEventListener('change', render);
    render();
  }

  PumpIt.ui.theme = { bind, render, current, toggle };
})(window);
