// Keyboard shortcuts: Esc, Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z), and on the network view Ctrl+C, Ctrl+V, Ctrl+A,
// Del / Backspace, P (pipe tool) and V (select tool).
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const { isModalOpen, closeModal } = UI.dialogs;

  function bind() {
    document.addEventListener('keydown', (e) => {
      const typing = e.target.closest('input, textarea, select');
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') {
        if (isModalOpen()) { closeModal(); return; }
        app.hideMenus();
        if (!typing) UI.canvas.cancel();
        return;
      }
      if (typing || isModalOpen()) return;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? app.redo() : app.undo(); return; }
      if (mod && k === 'y') { e.preventDefault(); app.redo(); return; }
      if (app.view !== 'net') return;
      // does not steal the copy of text selected on the page
      const textSel = String(root.getSelection ? root.getSelection() : '').length > 0;
      if (mod && k === 'c' && !textSel) { e.preventDefault(); app.copySelection(); return; }
      if (mod && k === 'v') { e.preventDefault(); app.paste(); return; }
      if (mod && k === 'a') { e.preventDefault(); app.selectAll(); return; }
      if (mod) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); app.deleteSelection(); }
      else if (k === 'p') UI.canvas.setTool('pipe');
      else if (k === 'v') UI.canvas.setTool('select');
    });
  }

  PumpIt.ui.keyboard = { bind };
})(window);
