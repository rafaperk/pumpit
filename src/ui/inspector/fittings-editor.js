// Fittings of a pipe: list with quantity and K (or K/f_T, Crane TP-410), ΣK and the Crane f_T of the pipe.
(function (root) {
  const PumpIt = root.PumpIt;
  const D = PumpIt.data, H = PumpIt.hyd, UI = PumpIt.ui;
  const F = UI.format;
  const { el, section, readout } = UI.forms;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('inspector.fittings.' + key, params);

  function build(key, p, gm) {
    const s = section(tx('title'), { info: tx('hint') });
    const fT = gm ? H.craneFT(gm.Dh) : NaN;
    const list = (p.fittings || []).map((x) => Object.assign({}, x));
    const save = () => app.setVal(key, 'fittings', list);
    if (list.length) {
      const table = el('table', { class: 'mini-table' });
      table.innerHTML = `<thead><tr><th>${tx('qty')}</th><th>${tx('item')}</th><th>${tx('value')}</th><th></th></tr></thead>`;
      const tb = el('tbody');
      list.forEach((it, i) => {
        const tr = el('tr');
        const qn = el('input', { type: 'text', inputmode: 'decimal', id: `fit-q-${key}-${i}`, 'aria-label': tx('qtyAria'), style: 'width:44px' });
        qn.value = F.inputStr(it.qty);
        qn.addEventListener('change', () => { const n = F.parseNum(qn.value); it.qty = Number.isFinite(n) ? n : 0; save(); });
        const vn = el('input', { type: 'text', inputmode: 'decimal', id: `fit-v-${key}-${i}`, 'aria-label': tx('value'), style: 'width:64px' });
        vn.value = F.inputStr(it.value);
        vn.addEventListener('change', () => { const n = F.parseNum(vn.value); it.value = Number.isFinite(n) ? n : 0; save(); });
        const x = el('button', { class: 'row-btn', type: 'button', 'aria-label': tx('remove') }, '×');
        x.addEventListener('click', () => { list.splice(i, 1); save(); });
        const td1 = el('td'); td1.appendChild(qn);
        const td2 = el('td', {}, `<span style="font-size:12.5px">${F.esc(D.fittingName(it))}</span>`);
        const td3 = el('td'); td3.appendChild(vn); td3.insertAdjacentHTML('beforeend', ` <span class="muted small">${it.model === 'KfT' ? '·f<sub>T</sub>' : 'K'}</span>`);
        const td4 = el('td', { class: 'x' }); td4.appendChild(x);
        tr.append(td1, td2, td3, td4);
        tb.appendChild(tr);
      });
      table.appendChild(tb);
      s.appendChild(table);
    }
    const add = el('select', { id: 'fit-add-' + key, 'aria-label': tx('addAria') },
      `<option value="">${tx('add')}</option><option value="custom">${F.esc(t('core.data.fittings.custom'))}</option>` +
      D.FITTINGS.map((f, i) => `<option value="${i}">${F.esc(f.name)} (${f.model === 'KfT' ? f.value + '·f_T' : 'K = ' + F.fmt(f.value, 3)})</option>`).join(''));
    add.addEventListener('change', () => {
      if (add.value === '') return;
      list.push(add.value === 'custom' ? D.customFitting() : Object.assign({ qty: 1 }, D.FITTINGS[+add.value]));
      save();
    });
    s.appendChild(add);
    let Ksum = 0;
    for (const it of list) Ksum += (it.qty ?? 1) * (it.model === 'KfT' ? it.value * fT : it.value);
    s.appendChild(readout(tx('sumK'), F.fmt(Ksum, 4)));
    s.appendChild(readout(tx('craneFT'), F.fmt(fT, 3)));
    return s;
  }

  PumpIt.ui.fittingsEditor = { build };
})(typeof window !== 'undefined' ? window : globalThis);
