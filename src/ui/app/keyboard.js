// Keyboard shortcuts: F1 (help), Esc, Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z), and on the network view Ctrl+C, Ctrl+V, Ctrl+A,
// Del / Backspace, P (pipe tool), V (select tool), 1 / 2 (schematic, 3D), Home (fit) and + / − (zoom); the 3D view
// adds its camera keys (src/ui/view3d/navigation.js) and the view cube its own (src/ui/view3d/cube.js).
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const { isModalOpen, closeModal } = UI.dialogs;

  // zoom and fit of the schematic; true when the key was used
  function schematicKey(k) {
    if (k === 'Home') UI.canvas.fit();
    else if (k === '+' || k === '=') UI.canvas.zoomBy(1.25);
    else if (k === '-' || k === '_') UI.canvas.zoomBy(0.8);
    else return false;
    return true;
  }

  function bind() {
    document.addEventListener('keydown', (e) => {
      const typing = e.target.closest('input, textarea, select');
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'F1') { e.preventDefault(); if (!isModalOpen()) UI.help.open(); return; }
      if (e.key === 'Escape') {
        if (isModalOpen()) { closeModal(); return; }
        if (UI.help.isOpen()) { UI.help.close(); return; }
        if (UI.systemWindow.isOpen()) { UI.systemWindow.close(); return; }
        app.hideMenus();
        if (!typing) UI.canvas.cancel();
        return;
      }
      // the help window takes no drawing shortcuts (Del must not delete the selection behind it)
      if (typing || isModalOpen() || UI.help.isOpen()) return;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? app.redo() : app.undo(); return; }
      if (mod && k === 'y') { e.preventDefault(); app.redo(); return; }
      // the system window takes undo and redo only
      if (app.view !== 'net' || UI.systemWindow.isOpen()) return;
      // does not steal the copy of text selected on the page
      const textSel = String(root.getSelection ? root.getSelection() : '').length > 0;
      if (mod && k === 'c' && !textSel) { e.preventDefault(); app.copySelection(); return; }
      if (mod && k === 'v') { e.preventDefault(); app.paste(); return; }
      if (mod && k === 'a') { e.preventDefault(); app.selectAll(); return; }
      if (mod) return;
      const VIEW_KEYS = { 1: '2d', 2: '3d' };
      if (VIEW_KEYS[e.key] && !e.altKey) { UI.scene3d.setMode(VIEW_KEYS[e.key]); return; }
      if (UI.scene3d.active() ? UI.nav3d.key(e) : schematicKey(e.key)) { e.preventDefault(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); app.deleteSelection(); }
      else if (k === 'p') UI.canvas.setTool('pipe');
      else if (k === 'v') UI.canvas.setTool('select');
    });
  }

  PumpIt.ui.keyboard = { bind };
})(window);
