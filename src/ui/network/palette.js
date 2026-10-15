// Palette: the select and pipe tools plus one button per junction type, grouped and ordered as in the
// junction type registry. Click a type and then the drawing, or drag it onto the drawing.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const F = UI.format;
  const { $, $$ } = UI.dom;
  const { t } = PumpIt.i18n;

  function bindTool(b) {
    b.addEventListener('click', () => UI.canvas.setTool(UI.canvas.tool === b.dataset.tool && b.dataset.tool !== 'select' ? 'select' : b.dataset.tool));
    b.addEventListener('dragstart', (e) => { if (b.dataset.tool.startsWith('place:')) e.dataTransfer.setData('text/plain', b.dataset.tool.slice(6)); });
  }

  // one button per junction type, under its group title (texts in the current language)
  function render() {
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
  }

  PumpIt.ui.palette = { bind, render };
})(typeof window !== 'undefined' ? window : globalThis);
