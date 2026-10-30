// The keyboard shortcuts box of the Help menu: the keys of the drawing and of the 3D view (3D views specification
// §6.3, §6.4). The help window lists the main ones too and opens this box.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const F = UI.format;
  const { t } = PumpIt.i18n;

  // the rows of each group, in the order shown (texts in app.shortcuts.<group>.<row>.keys / .does)
  const GROUPS = {
    all: ['help', 'views', 'tools', 'cancel', 'delete', 'undo', 'copy', 'fit', 'zoom', 'full'],
    free: ['orbit', 'pan', 'level', 'vertical', 'lock', 'bend', 'route', 'delBend', 'mouse', 'cube'],
  };

  function show() {
    const tx = (key) => t('app.shortcuts.' + key);
    let html = `<p class="muted" style="margin:0">${F.esc(tx('intro'))}</p>`;
    for (const [group, rows] of Object.entries(GROUPS)) {
      html += `<h4>${F.esc(tx(`groups.${group}`))}</h4><table><tbody>`;
      for (const row of rows) html += `<tr><th>${F.esc(tx(`${group}.${row}.keys`))}</th><td>${F.esc(tx(`${group}.${row}.does`))}</td></tr>`;
      html += '</tbody></table>';
    }
    UI.dialogs.modal({ title: tx('title'), body: `<div class="shortcuts">${html}</div>`, actions: [{ label: t('app.dialog.close'), primary: true }] });
  }

  PumpIt.ui.shortcuts = { show };
})(window);
