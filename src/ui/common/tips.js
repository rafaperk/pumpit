// Notes of the fields: the bubble of the "i" in a circle (UI.forms.info). One bubble serves the whole page; it opens
// next to the "i" under the pointer, or the one with the keyboard focus, and stays inside the window. Its text is the
// hidden text of the "i" (.info-text), which screen readers get as the description of the button. The bubble takes no
// clicks (a field under it can be clicked at once) and closes when the pointer leaves the "i"; Esc, a scroll or a
// resize close it too.
(function (root) {
  const PumpIt = root.PumpIt;
  let bubble = null; // the bubble element, made on first use
  let anchor = null; // the "i" it belongs to

  function show(a) {
    const text = a.querySelector('.info-text');
    if (!text) return;
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'tip';
      bubble.setAttribute('aria-hidden', 'true'); // screen readers read the text through the "i" (aria-describedby)
      document.body.appendChild(bubble);
    }
    anchor = a;
    bubble.innerHTML = text.innerHTML;
    bubble.hidden = false;
    place();
  }

  function hide() {
    anchor = null;
    if (bubble) bubble.hidden = true;
  }

  // below the "i", or above it when there is no room below; always inside the window
  function place() {
    const r = anchor.getBoundingClientRect();
    const w = bubble.offsetWidth, h = bubble.offsetHeight, gap = 6, m = 8;
    const x = Math.max(m, Math.min(r.left - 10, innerWidth - w - m));
    const y = r.bottom + gap + h <= innerHeight - m ? r.bottom + gap : r.top - gap - h;
    bubble.style.left = x + 'px';
    bubble.style.top = Math.max(m, y) + 'px';
  }

  function bind() {
    document.addEventListener('mouseover', (e) => {
      const a = e.target.closest ? e.target.closest('.info') : null;
      if (a) { if (a !== anchor) show(a); return; }
      // off the "i": the bubble closes, unless the "i" keeps the keyboard focus (or was drawn again meanwhile)
      if (anchor && (document.activeElement !== anchor || !anchor.isConnected)) hide();
    });
    document.addEventListener('focusin', (e) => {
      const a = e.target.closest('.info');
      if (a) show(a); else if (anchor) hide();
    });
    document.addEventListener('focusout', (e) => { if (e.target === anchor && !anchor.matches(':hover')) hide(); });
    // a click (or a tap) on the "i" shows the note too, and does nothing else
    document.addEventListener('click', (e) => {
      const a = e.target.closest('.info');
      if (!a) return;
      e.preventDefault();
      show(a);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); }, true);
    root.addEventListener('scroll', hide, true);
    root.addEventListener('resize', hide);
  }

  PumpIt.ui.tips = { bind, hide };
})(window);
