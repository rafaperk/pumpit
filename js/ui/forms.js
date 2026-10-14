// Construtores de campos do inspetor. Todo campo lê o valor efetivo do cenário atual e grava por app.setVal,
// que aplica a regra de herança de cenários. Grandezas são gravadas como { value, unit } como digitadas.
(function (root) {
  const HR = (root.HR = root.HR || {});
  const U = HR.units, F = HR.fmt;
  let app;

  const idOf = (objKey, path) => ('f-' + objKey + '-' + path).replace(/[^a-zA-Z0-9_-]/g, '_');

  function el(tag, attrs = {}, html = '') {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') e.className = v; else e.setAttribute(k, v === true ? '' : v);
    }
    if (html) e.innerHTML = html;
    return e;
  }

  function section(title) {
    const s = el('div', { class: 'insp-sec' });
    if (title) s.appendChild(el('h4', {}, F.esc(title)));
    return s;
  }

  function wrap(objKey, path, label, ctl, opts = {}) {
    const f = el('div', { class: 'field' + (opts.check ? ' check' : '') });
    const lab = el('label', { for: ctl.id || null });
    lab.textContent = label;
    if (opts.title) lab.title = opts.title;
    if (objKey && app.isOv(objKey, path)) {
      f.classList.add('overridden');
      const dot = el('button', { class: 'ov-dot', type: 'button', title: 'Alterado neste cenário. Clique para voltar a herdar do cenário pai.', 'aria-label': 'Restaurar valor herdado' });
      dot.addEventListener('click', () => app.clearOv(objKey, path));
      lab.prepend(dot);
    }
    const c = el('div', { class: 'ctl' });
    c.appendChild(ctl);
    if (opts.after) c.appendChild(opts.after);
    if (opts.check) { f.appendChild(c); f.appendChild(lab); } else { f.appendChild(lab); f.appendChild(c); }
    return f;
  }

  function unitOptions(cat, current) {
    const units = cat === 'flow' ? U.list('massFlow').concat(U.list('volFlow')) : U.list(cat);
    if (current && !units.includes(current)) units.unshift(current);
    return units.map((u) => `<option value="${F.esc(u)}"${u === current ? ' selected' : ''}>${F.esc(u)}</option>`).join('');
  }

  // grandeza com unidade
  function qty(objKey, path, label, cat, opts = {}) {
    const v = app.getVal(objKey, path) || { value: NaN, unit: U.list(cat)[0] };
    const id = idOf(objKey, path);
    const inp = el('input', { type: 'text', id, inputmode: 'decimal', autocomplete: 'off', disabled: opts.disabled });
    inp.value = F.inputStr(v.value);
    const us = el('select', { class: 'unit', 'aria-label': label + ' — unidade', id: id + '-u', disabled: opts.disabled }, unitOptions(cat, v.unit));
    inp.addEventListener('change', () => {
      const n = F.parseNum(inp.value);
      app.setVal(objKey, path, { value: Number.isFinite(n) ? n : null, unit: us.value });
    });
    us.addEventListener('change', () => app.setVal(objKey, path, { value: v.value, unit: us.value }));
    return wrap(objKey, path, label, inp, Object.assign({ after: us }, opts));
  }

  // número puro
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

  // lista de opções: [[valor, rótulo], ...]
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

  function readout(label, value, title) {
    const r = el('div', { class: 'readout', title });
    r.innerHTML = `<span>${F.esc(label)}</span><b>${F.esc(value)}</b>`;
    return r;
  }
  const hint = (t) => el('p', { class: 'hint' }, t);

  HR.forms = { init: (a) => { app = a; }, el, section, qty, num, sel, chk, text, readout, hint, unitOptions, idOf };
})(typeof window !== 'undefined' ? window : globalThis);
