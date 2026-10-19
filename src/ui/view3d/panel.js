// 3D views: the "3D drawing" sections of the inspector (3D views specification §6.3), once the 3D views were opened.
// Nothing selected: the vertical scale (typed, or chosen for the model) and fitting every pipe to the grid. A pipe: its
// drawn length, bends and grid snapping, fit to the grid, the next route and removing the bends. A junction: its place
// in the plan (X and Y) and the roll of its symbol; its height is its elevation, a field of its own panel.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, V = PumpIt.view3d;
  const F = UI.format;
  const app = PumpIt.app;
  const { el } = UI.dom;
  const { section, readout } = UI.forms;
  const S3 = UI.scene3d, C3 = UI.commands3d;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('inspector.view3.' + key, params);

  function button(label, onClick, title) {
    const b = el('button', { class: 'btn small', type: 'button', title: title || null });
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }
  const row = (...buttons) => { const r = el('div', { class: 'btn-row' }); r.append(...buttons); return r; };
  const unitSpan = (text) => el('span', { class: 'muted small', style: 'align-self:center;padding:0 2px' }, F.esc(text));
  // a number field: label, input and unit; onSet(n) receives a finite number, anything else puts the value back
  function numberField(id, label, value, unit, onSet) {
    const f = el('div', { class: 'field' });
    f.appendChild(el('label', { for: id }, F.esc(label)));
    const c = el('div', { class: 'ctl' });
    const inp = el('input', { type: 'text', id, inputmode: 'decimal', autocomplete: 'off' });
    inp.value = F.inputStr(value);
    inp.addEventListener('change', () => {
      const n = F.parseNum(inp.value);
      if (!Number.isFinite(n) || onSet(n) === false) inp.value = F.inputStr(value);
    });
    c.append(inp, unitSpan(unit));
    f.appendChild(c);
    return f;
  }

  // nothing selected: the vertical scale of the 3D views and fitting every pipe to the grid
  UI.inspector.addSection('system', (host) => {
    const v = app.model.view3;
    if (!v) return;
    const s = section(tx('title'), { info: tx('note') });
    s.appendChild(numberField('zscale3', tx('zScale'), v.zScale, tx('zScaleUnit'), (k) => (k > 0 && k <= 1000 ? C3.setView({ zScale: k }) : false)));
    // the scale that the first entry chose: heights about half the size of the plan
    const auto = () => C3.setView({ zScale: V.autoZScale(app.eff().junctions.map((j) => ({ x: j.x, y: j.y, elev: S3.elevationM(j) }))) });
    s.append(row(button(tx('autoScale'), auto, tx('autoScaleTitle')), button(tx('fitAll'), () => C3.fitToGrid(null))));
    host.appendChild(s);
  });

  // a pipe: drawn length (R-14), bends, grid snapping (R-23), fit to the grid (R-30), the next route (§8.8) and
  // removing the bends (R-47)
  UI.inspector.addSection('pipe', (host, id) => {
    const p = app.model.pipes.find((x) => x.id === id);
    const pts = app.model.view3 && p && S3.scene().routes.get(id);
    if (!pts) return;
    const s = section(tx('title'));
    s.appendChild(readout(tx('drawnLength'), tx('drawnLengthValue', { len: F.fixed(V.drawnLength(pts), 1) })));
    s.appendChild(readout(tx('bends'), String(Math.max(0, pts.length - 2))));
    const f = el('div', { class: 'field check' });
    const box = el('input', { type: 'checkbox', id: 'snap3-' + id });
    box.checked = p.snap3 !== false;
    box.addEventListener('change', () => C3.setSnap(id, box.checked));
    const c = el('div', { class: 'ctl' });
    c.appendChild(box);
    f.append(c, el('label', { for: 'snap3-' + id }, F.esc(tx('snap'))));
    const buttons = [button(tx('fit'), () => C3.fitToGrid([id])), button(tx('nextRoute'), () => C3.nextRoute(id, 1), tx('nextRouteTitle'))];
    if (pts.length > 2) buttons.push(button(tx('removeBends'), () => C3.removeBends(id), tx('removeBendsTitle')));
    s.append(f, row(...buttons));
    host.appendChild(s);
  });

  // a junction: its place in the plan, X and Y in du (the isometric view rounds them to the grid step), and the roll of
  // an oriented symbol (R-29)
  UI.inspector.addSection('junction', (host, id) => {
    const j = app.model.junctions.find((x) => x.id === id);
    const p = app.model.view3 && j && S3.scene().pos.get(id);
    if (!p) return;
    const s = section(tx('title'), { info: tx('heightNote') });
    const setPlan = (k, n) => {
      const v = app.model.view3;
      const q = [...p];
      q[k] = v.mode === 'iso' ? Math.round(n / v.step) * v.step : n;
      if (V.pointsEqual(q, p, 1e-9)) return false;
      if (S3.junctionAt(q, id) !== null) { app.toast(tx('occupied')); return false; } // two junctions never share a point
      C3.moveJunction(id, q);
      return true;
    };
    const round2 = (n) => Math.round(n * 100) / 100;
    s.appendChild(numberField('pos3x-' + id, 'X', round2(p[0]), tx('du'), (n) => setPlan(0, n)));
    s.appendChild(numberField('pos3y-' + id, 'Y', round2(p[1]), tx('du'), (n) => setPlan(1, n)));
    if (UI.solids3d.orientOf(j.type)) {
      const deg = j.icon3 ? j.icon3.roll : 0;
      s.appendChild(readout(tx('symbol'), j.icon3 ? tx('symbolRoll', { deg }) : tx('symbolAuto')));
      s.appendChild(row(button(tx('roll'), () => C3.roll(id, deg + 90)), button(tx('auto'), () => C3.roll(id, null))));
    }
    host.appendChild(s);
  });
})(window);
