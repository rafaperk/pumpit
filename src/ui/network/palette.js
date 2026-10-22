// Palette: the select and pipe tools plus one button per junction type, grouped and ordered as in the
// junction type registry. Click a type and then the drawing, or drag it onto the drawing. The arrow on the left edge
// of the drawing collapses the palette, to give the drawing more room, and brings it back; the choice is kept with
// the preferences, as for the properties panel.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const F = UI.format;
  const { $, $$ } = UI.dom;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;

  function bindTool(b) {
    b.addEventListener('click', () => UI.canvas.setTool(UI.canvas.tool === b.dataset.tool && b.dataset.tool !== 'select' ? 'select' : b.dataset.tool));
    b.addEventListener('dragstart', (e) => { if (b.dataset.tool.startsWith('place:')) e.dataTransfer.setData('text/plain', b.dataset.tool.slice(6)); });
  }

  // one button per junction type, under its group title (texts in the current language)
  function render() {
    labelToggle(); // its texts follow the language
    const groups = {};
    for (const def of PumpIt.junctionTypes.list()) (groups[def.group] = groups[def.group] || []).push([def.type, def]);
    $('#palette-junctions').innerHTML = Object.entries(groups).map(([g, items]) => `<div class="palette-group">${t('junctions.groups.' + g)}</div>` +
      items.map(([k, def]) => `<button class="tool" data-tool="place:${k}" draggable="true" title="${F.esc(t('network.palette.toolTitle', { label: def.label }))}">${UI.junctionTypes.icon(k, 24)}<span>${F.esc(def.label)}</span></button>`).join('')).join('');
    $$('#palette-junctions .tool').forEach((b) => {
      bindTool(b);
      b.classList.toggle('active', b.dataset.tool === UI.canvas.tool);
    });
  }

  function bind() {
    render();
    $$('.palette > .tool').forEach(bindTool);
    $('#palette-toggle').addEventListener('click', () => setCollapsed(!isCollapsed()));
    setCollapsed(!!app.prefs.paletteCollapsed);
    new ResizeObserver(centre).observe($('#palette'));
  }

  // ------------------------------------------------------------ collapsing the palette

  const isCollapsed = () => $('#view-net').classList.contains('pal-off');
  function setCollapsed(on) {
    $('#view-net').classList.toggle('pal-off', on);
    labelToggle();
    if (!!app.prefs.paletteCollapsed !== on) { app.prefs.paletteCollapsed = on; app.savePrefs(); }
  }
  // the arrow says what it does: collapse the palette, or show it again
  function labelToggle() {
    const b = $('#palette-toggle');
    const on = isCollapsed();
    const label = t(on ? 'network.palette.toggle.show' : 'network.palette.toggle.hide');
    b.title = label;
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-expanded', String(!on));
  }

  // the scroll bar of a short window takes room between the tools and the right border: half its width, at most 6 px,
  // goes to --bar, which moves that much from the right padding (6 px) to the left one (network.css). The sum of the
  // paddings stays the same, so the room of the tools does not change and the observer is not called again
  function centre() {
    const p = $('#palette'), cs = getComputedStyle(p);
    const bar = p.offsetWidth - p.clientWidth - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
    p.style.setProperty('--bar', Math.min(Math.max(bar, 0), 12) / 2 + 'px');
  }

  PumpIt.ui.palette = { bind, render, isCollapsed, setCollapsed };
})(typeof window !== 'undefined' ? window : globalThis);
