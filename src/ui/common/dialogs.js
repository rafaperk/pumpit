// Transient messages and dialogs: toast, modal box, text prompt, confirmation and copy-to-clipboard.
(function (root) {
  const PumpIt = root.PumpIt;
  const F = PumpIt.ui.format;
  const { $ } = PumpIt.ui.dom;
  const { t } = PumpIt.i18n;

  function toast(msg) {
    const box = $('#toast');
    box.textContent = msg;
    box.hidden = false;
    clearTimeout(toast.h);
    toast.h = setTimeout(() => { box.hidden = true; }, 3800);
  }

  // actions: [{ label, primary, onClick }]; onClick returning false keeps the box open
  function modal({ title, body, actions }) {
    $('#modal-title').textContent = title;
    const b = $('#modal-body');
    b.innerHTML = '';
    if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
    const a = $('#modal-actions');
    a.innerHTML = '';
    for (const act of actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn' + (act.primary ? ' primary' : '');
      btn.textContent = act.label;
      btn.addEventListener('click', () => { if (act.onClick && act.onClick() === false) return; closeModal(); });
      a.appendChild(btn);
    }
    $('#modal').hidden = false;
    const first = b.querySelector('input, textarea') || a.querySelector('.primary');
    if (first) setTimeout(() => first.focus(), 0);
  }
  function closeModal() { $('#modal').hidden = true; }
  const isModalOpen = () => !$('#modal').hidden;

  function askText(title, label, initial, onOk) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<label class="muted small" for="ask-in">${F.esc(label)}</label>`;
    const inp = document.createElement('input');
    inp.type = 'text'; inp.id = 'ask-in'; inp.value = initial || '';
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#modal-actions .primary').click(); } });
    wrap.appendChild(inp);
    modal({ title, body: wrap, actions: [{ label: t('app.dialog.cancel') }, { label: t('app.dialog.ok'), primary: true, onClick: () => { const v = inp.value.trim(); if (!v) return false; onOk(v); } }] });
  }

  function confirmBox(title, text, okLabel, onOk) {
    modal({ title, body: `<p class="muted" style="margin:0">${F.esc(text)}</p>`, actions: [{ label: t('app.dialog.cancel') }, { label: okLabel, primary: true, onClick: onOk }] });
  }

  // copies text to the clipboard; when that is not allowed, shows it in a box to copy by hand
  function copyText(text, okMsg) {
    const fallback = () => modal({ title: t('app.dialog.copyTitle'), body: `<textarea id="copy-area" readonly>${F.esc(text)}</textarea>`, actions: [{ label: t('app.dialog.close'), primary: true }] });
    try {
      navigator.clipboard.writeText(text).then(() => toast(okMsg), () => { fallback(); setTimeout(() => $('#copy-area') && $('#copy-area').select(), 30); });
    } catch (e) { fallback(); }
  }

  // clicking the dimmed background closes the box
  function bind() {
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  }

  PumpIt.ui.dialogs = { toast, modal, closeModal, isModalOpen, askText, confirmBox, copyText, bind };
})(typeof window !== 'undefined' ? window : globalThis);
