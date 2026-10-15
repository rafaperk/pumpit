// Curve editor (pump head, efficiency and NPSHR; generic component loss): table of points with units, fit
// type, and a small plot of the points against the fitted curve.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, H = PumpIt.hyd, UI = PumpIt.ui;
  const F = UI.format;
  const Fm = UI.forms;
  const { el, section, hint } = Fm;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('inspector.curve.' + key, params);

  // o = { xCat, yCat ('head' | 'dp' | 'pct'), yName, min }
  function build(key, path, title, o) {
    const s = section(title);
    const c0 = app.getVal(key, path) || { x: [], y: [], xUnit: 'm³/h', yUnit: o.yCat === 'head' ? 'm' : o.yCat === 'dp' ? 'bar' : '', fit: '2' };
    const c = M.clone(c0);
    if (!c.yUnit && o.yCat !== 'pct') c.yUnit = o.yCat === 'head' ? 'm' : 'bar';
    const save = () => app.setVal(key, path, c);
    const table = el('table', { class: 'mini-table' });
    const xu = el('select', { id: `cv-xu-${key}-${path}`, 'aria-label': tx('flowUnit'), style: 'min-height:24px;padding:1px 3px;font-size:11.5px' }, Fm.unitOptions(o.xCat, c.xUnit));
    xu.addEventListener('change', () => { c.xUnit = xu.value; save(); });
    let yu = null;
    if (o.yCat !== 'pct') {
      yu = el('select', { id: `cv-yu-${key}-${path}`, 'aria-label': tx('unit'), style: 'min-height:24px;padding:1px 3px;font-size:11.5px' }, Fm.unitOptions(o.yCat, c.yUnit));
      yu.addEventListener('change', () => { c.yUnit = yu.value; save(); });
    }
    const thead = el('thead');
    const hr = el('tr');
    const th1 = el('th', {}, tx('flow') + ' '); th1.appendChild(xu);
    const th2 = el('th', {}, F.esc(o.yName) + ' '); if (yu) th2.appendChild(yu);
    hr.append(th1, th2, el('th'));
    thead.appendChild(hr); table.appendChild(thead);
    const tb = el('tbody');
    c.x.forEach((xv, i) => {
      const tr = el('tr');
      const mk = (arr, aria, sfx) => {
        const inp = el('input', { type: 'text', inputmode: 'decimal', id: `cv-${key}-${path}-${sfx}-${i}`, 'aria-label': aria });
        inp.value = F.inputStr(arr[i]);
        inp.addEventListener('change', () => { const n = F.parseNum(inp.value); arr[i] = Number.isFinite(n) ? n : 0; save(); });
        const td = el('td'); td.appendChild(inp); return td;
      };
      const x = el('button', { class: 'row-btn', type: 'button', 'aria-label': tx('removePoint') }, '×');
      x.addEventListener('click', () => { c.x.splice(i, 1); c.y.splice(i, 1); save(); });
      const tdx = el('td', { class: 'x' }); tdx.appendChild(x);
      tr.append(mk(c.x, tx('pointFlow', { n: i + 1 }), 'x'), mk(c.y, tx('pointValue', { name: o.yName, n: i + 1 }), 'y'), tdx);
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    s.appendChild(table);
    const row = el('div', { class: 'btn-row' });
    const add = el('button', { class: 'btn small', type: 'button' }, tx('addPoint'));
    add.addEventListener('click', () => {
      const n = c.x.length;
      c.x.push(n ? +(c.x[n - 1] * 1.25 || 1).toFixed(3) : 0);
      c.y.push(n ? c.y[n - 1] : 0);
      save();
    });
    const fit = el('select', { id: `cv-fit-${key}-${path}`, 'aria-label': tx('fitType') },
      [['1', tx('poly', { n: 1 })], ['2', tx('poly', { n: 2 })], ['3', tx('poly', { n: 3 })], ['4', tx('poly', { n: 4 })], ['xy', tx('linear')]]
        .map(([v, l]) => `<option value="${v}"${v === String(c.fit) ? ' selected' : ''}>${l}</option>`).join(''));
    fit.addEventListener('change', () => { c.fit = fit.value; save(); });
    row.append(add, fit);
    if (c.x.length) {
      const clr = el('button', { class: 'btn small', type: 'button' }, tx('clear'));
      clr.addEventListener('click', () => { c.x = []; c.y = []; save(); });
      row.appendChild(clr);
    }
    s.appendChild(row);
    if (c.x.length >= 1) {
      try {
        const cv = H.makeCurve(c.x, c.y, c.fit);
        s.appendChild(miniPlot(c, cv));
        if (cv.kind === 'poly') {
          const terms = cv.a.map((a, i) => `${i === 0 ? '' : a >= 0 ? ' + ' : ' − '}${F.fmt(i === 0 ? a : Math.abs(a), 4)}${i ? '·Q' + (i > 1 ? '<sup>' + i + '</sup>' : '') : ''}`).join('');
          s.appendChild(hint(tx('fit', { terms })));
        }
      } catch (e) { s.appendChild(hint(F.esc(e.message))); }
    }
    return s;
  }

  // small plot of the points against the fitted curve
  function miniPlot(c, cv) {
    const W = 300, Hh = 130, pad = 26;
    const xs = c.x, ys = c.y;
    const xmax = Math.max(...xs, 1e-9) * 1.1;
    const samples = Array.from({ length: 41 }, (_, i) => { const x = (xmax * i) / 40; return [x, H.evalCurve(cv, x)]; });
    const allY = ys.concat(samples.map((p) => p[1])).filter(Number.isFinite);
    let ymin = Math.min(0, ...allY), ymax = Math.max(...allY, 1e-9);
    if (ymax === ymin) ymax = ymin + 1;
    const X = (x) => pad + (x / xmax) * (W - pad - 6);
    const Y = (y) => Hh - 16 - ((y - ymin) / (ymax - ymin)) * (Hh - 24);
    const path = samples.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(Math.max(ymin, Math.min(ymax, y))).toFixed(1)}`).join('');
    const pts = xs.map((x, i) => `<circle cx="${X(x)}" cy="${Y(ys[i])}" r="3" style="fill:var(--sel)"/>`).join('');
    const svg = `<svg viewBox="0 0 ${W} ${Hh}" width="100%" class="curve-chart" role="img" aria-label="${tx('plotAria')}">
      <line x1="${pad}" y1="${Y(0)}" x2="${W - 6}" y2="${Y(0)}" style="stroke:var(--line)"/>
      <line x1="${pad}" y1="6" x2="${pad}" y2="${Hh - 16}" style="stroke:var(--line)"/>
      <path d="${path}" fill="none" style="stroke:var(--accent)" stroke-width="2"/>${pts}
      <text x="${pad - 4}" y="12" text-anchor="end" style="font:10px var(--f-mono);fill:var(--ink-3)">${F.fmt(ymax, 3)}</text>
      <text x="${W - 6}" y="${Hh - 3}" text-anchor="end" style="font:10px var(--f-mono);fill:var(--ink-3)">${F.fmt(xmax, 3)}</text>
    </svg>`;
    return el('div', {}, svg);
  }

  PumpIt.ui.curveEditor = { build };
})(typeof window !== 'undefined' ? window : globalThis);
