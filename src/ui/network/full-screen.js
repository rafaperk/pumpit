// Full screen: the drawing, the palette and the properties panel take the whole screen, to model with more room. The
// top bar and the tabs go away and the browser goes full screen when it allows it (a page in a frame may not: the room
// of the bars is still gained). The last button over the drawing, the F key and Edit → Full screen bring everything
// back; so does Esc or anything else that ends the browser's full screen.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const { $ } = UI.dom;
  const { t } = PumpIt.i18n;
  const doc = root.document;

  const isOn = () => $('#app').classList.contains('full');

  function set(on) {
    if (on === isOn()) return;
    if (on && app.view !== 'net') app.setView('net');
    app.hideMenus();
    $('#app').classList.toggle('full', on);
    label();
    try {
      if (on && !doc.fullscreenElement && doc.documentElement.requestFullscreen) doc.documentElement.requestFullscreen().catch(() => {});
      if (!on && doc.fullscreenElement && doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
    } catch (e) { /* the browser's full screen is not available: the page alone */ }
  }
  const toggle = () => set(!isOn());

  // the button says what it does: enter full screen, or leave it (its texts follow the language)
  function label() {
    const b = $('#full-screen'), on = isOn();
    const text = t(on ? 'network.fullScreen.exit' : 'network.fullScreen.enter');
    b.title = text;
    b.setAttribute('aria-label', text);
    b.setAttribute('aria-pressed', String(on));
  }

  function bind() {
    $('#full-screen').addEventListener('click', toggle);
    doc.addEventListener('fullscreenchange', () => { if (!doc.fullscreenElement && isOn()) set(false); });
    label();
  }

  PumpIt.ui.fullScreen = { bind, set, toggle, isOn, label };
})(window);
