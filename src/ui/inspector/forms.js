// Field builders of the inspector. Every field reads the effective value of the current scenario and writes
// through app.setVal, which applies the scenario inheritance rule. Quantities are stored as { value, unit },
// as typed.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, UI = PumpIt.ui;
  const F = UI.format;
  const { el } = UI.dom;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;

  const idOf = (objKey, path) => ('f-' + objKey + '-' + path).replace(/[^a-zA-Z0-9_-]/g, '_');

  // a note on a field or a section: an "i" in a circle that shows the text (HTML from the catalogs) while the pointer
  // rests on it or it has the focus (the bubble: src/ui/common/tips.js)
  const INFO_ICON = '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="4.9" r="1" fill="currentColor"/><path d="M8 7.3v4.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  let notes = 0;
  function info(html) {
    const id = 'note-' + ++notes;
    const b = el('button', { type: 'button', class: 'info', 'aria-label': t('inspector.fields.info'), 'aria-describedby': id }, INFO_ICON);
    b.appendChild(el('span', { class: 'info-text', id, hidden: true }, html));
    return b;
  }
  // adds a note to a section (its title gets the "i"; a second note joins the first one)
  function note(sec, html) {
    const h = sec.querySelector(':scope > h4');
    if (!h) { sec.appendChild(hint(html)); return; }
    const old = h.querySelector('.info-text');
    if (old) old.insertAdjacentHTML('beforeend', `<br><br>${html}`); else h.appendChild(info(html));
  }

  // opts.info: a note on the section, by its title
  function section(title, opts = {}) {
    const s = el('div', { class: 'insp-sec' });
    if (title) s.appendChild(el('h4', {}, F.esc(title)));
    if (opts.info) note(s, opts.info);
    return s;
  }

  // label + control; an overridden attribute gets a dot that restores the inherited value; opts.info: a note, whose
  // "i" stands next to the label (outside it, so the label alone stays the name of the control)
  function wrap(objKey, path, label, ctl, opts = {}) {
    const f = el('div', { class: 'field' + (opts.check ? ' check' : '') + (opts.wide ? ' wide' : '') });
    const lab = el('label', { for: ctl.id || null });
    lab.textContent = label;
    // bare: the section title already names the field; the label stays for screen readers (and the override dot)
    if (opts.bare) lab.classList.add('sr-label');
    if (opts.title) lab.title = opts.title;
    if (objKey && app.isOv(objKey, path)) {
      f.classList.add('overridden');
      const dot = el('button', { class: 'ov-dot', type: 'button', title: t('inspector.fields.overridden'), 'aria-label': t('inspector.fields.restore') });
      dot.addEventListener('click', () => app.clearOv(objKey, path));
      lab.prepend(dot);
    }
    const c = el('div', { class: 'ctl' });
    c.appendChild(ctl);
    if (opts.after) c.appendChild(opts.after);
    let head = lab;
    if (opts.info) { head = el('div', { class: 'lab' }); head.append(lab, info(opts.info)); }
    if (opts.check) { f.appendChild(c); f.appendChild(head); } else { f.appendChild(head); f.appendChild(c); }
    return f;
  }

  function unitOptions(cat, current) {
    // a flow: mass or volume; for a gas (compressible mode) also a normal volume (§8.4)
    const gas = cat === 'flow' && PumpIt.model.isCompressible(app.eff());
    const units = cat === 'flow' ? U.list('massFlow').concat(U.list('volFlow'), gas ? U.list('normFlow') : []) : U.list(cat);
    if (current && !units.includes(current)) units.unshift(current);
    return units.map((u) => `<option value="${F.esc(u)}"${u === current ? ' selected' : ''}>${F.esc(F.unit(u))}</option>`).join('');
  }

  // quantity with a unit
  function qty(objKey, path, label, cat, opts = {}) {
    const v = app.getVal(objKey, path) || { value: NaN, unit: U.list(cat)[0] };
    const id = idOf(objKey, path);
    const inp = el('input', { type: 'text', id, inputmode: 'decimal', autocomplete: 'off', disabled: opts.disabled });
    inp.value = F.inputStr(v.value);
    const us = el('select', { class: 'unit', 'aria-label': t('inspector.fields.unitOf', { label }), id: id + '-u', disabled: opts.disabled }, unitOptions(cat, v.unit));
    inp.addEventListener('change', () => {
      const n = F.parseNum(inp.value);
      app.setVal(objKey, path, { value: Number.isFinite(n) ? n : null, unit: us.value });
    });
    us.addEventListener('change', () => app.setVal(objKey, path, { value: v.value, unit: us.value }));
    return wrap(objKey, path, label, inp, Object.assign({ after: us }, opts));
  }

  // plain number
  function num(objKey, path, label, opts = {}) {
    const v = app.getVal(objKey, path);
    const id = idOf(objKey, path);
    const inp = el('input', { type: 'text', id, inputmode: 'decimal', autocomplete: 'off', disabled: opts.disabled });
    inp.value = F.inputStr(v);
    inp.addEventListener('change', () => {
      let n = F.parseNum(inp.value);
      if (opts.int && Number.isFinite(n)) n = Math.round(n);
      app.setVal(objKey, path, Number.isFinite(n) ? n : null);
    });
    const after = opts.suffix ? el('span', { class: 'muted small', style: 'align-self:center;padding:0 2px' }, F.esc(opts.suffix)) : null;
    return wrap(objKey, path, label, inp, Object.assign({}, opts, { after }));
  }

  // list of options: [[value, label], ...]
  function sel(objKey, path, label, options, opts = {}) {
    const v = app.getVal(objKey, path);
    const id = idOf(objKey, path);
    const s = el('select', { id, disabled: opts.disabled },
      options.map(([val, lab]) => `<option value="${F.esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${F.esc(lab)}</option>`).join(''));
    s.addEventListener('change', () => {
      const raw = s.value;
      const opt = options.find(([val]) => String(val) === raw);
      app.setVal(objKey, path, opt ? opt[0] : raw);
    });
    return wrap(objKey, path, label, s, opts);
  }

  // a choice among a few options shown side by side, as buttons (regime, thermal model): [[value, label], ...]
  function seg(objKey, path, label, options, opts = {}) {
    const v = app.getVal(objKey, path);
    const id = idOf(objKey, path);
    const g = el('div', { class: 'seg', role: 'radiogroup', id, 'aria-label': label });
    for (const [val, lab] of options) {
      const on = String(val) === String(v);
      const b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(on), class: on ? 'on' : null, 'data-v': val }, F.esc(lab));
      b.addEventListener('click', () => { if (!on) app.setVal(objKey, path, val); });
      g.appendChild(b);
    }
    return wrap(objKey, path, label, g, Object.assign({ wide: true }, opts));
  }

  function chk(objKey, path, label, opts = {}) {
    const v = !!app.getVal(objKey, path);
    const id = idOf(objKey, path);
    const c = el('input', { type: 'checkbox', id });
    c.checked = v;
    c.addEventListener('change', () => app.setVal(objKey, path, c.checked));
    return wrap(objKey, path, label, c, Object.assign({ check: true }, opts));
  }

  function text(objKey, path, label, opts = {}) {
    const v = app.getVal(objKey, path) ?? '';
    const id = idOf(objKey, path);
    const inp = el('input', { type: 'text', id, class: 'txt', autocomplete: 'off', placeholder: opts.placeholder });
    inp.value = v;
    inp.addEventListener('change', () => app.setVal(objKey, path, inp.value));
    return wrap(objKey, path, label, inp, opts);
  }

  // read-only label/value row
  function readout(label, value, title) {
    const r = el('div', { class: 'readout', title });
    r.innerHTML = `<span>${F.esc(label)}</span><b>${F.esc(value)}</b>`;
    return r;
  }
  // a line of text that stays in sight: a state (an isolated pipe, the fitted curve) or an error; notes go in info()
  function hint(t) { return el('p', { class: 'hint' }, t); }

  PumpIt.ui.forms = { el, section, qty, num, sel, seg, chk, text, readout, hint, info, note, unitOptions, idOf, wrap };
})(typeof window !== 'undefined' ? window : globalThis);
