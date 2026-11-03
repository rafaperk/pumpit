// The time data of a junction in the inspector (§4, §5 and §10.4 of the specification of the time simulation): used or
// kept aside, the quantity its table drives (from the hook of its type), absolute or relative values, how the tables
// start (by the clock or after events, with the condition of each event), the tables of time × value, whether they
// repeat and how they go between points. A pump driven by its speed also says what it does when the table stops it.
// The section shows with the time simulation on, or when the junction has time data kept. Every change writes the time
// data whole (one undo step).
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, M = PumpIt.model, U = PumpIt.units;
  const I = UI.inspector;
  const app = PumpIt.app;
  const F = UI.format;
  const { el } = UI.dom;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('time.data.' + key, params);
  const E = () => PumpIt.time.events;

  // the unit a new table or condition starts with, by the category of its values
  const DEFAULT_UNIT = {
    flow: 'm³/h', pressure: 'kgf/cm²(g)', dp: 'kgf/cm²', length: 'm', area: 'cm²', percent: '%', none: '', time: 'h',
    volume: 'm³', volFlow: 'm³/h', massFlow: 'kg/s', velocity: 'm/s', head: 'm',
  };
  // a flow of a gas over time is a mass or a normal volume (a volume at the conditions of the pipe changes with them)
  const gasFlow = (cat) => cat === 'flow' && M.isCompressible(app.eff());
  const unitFor = (cat, basis) => (basis === 'relative' ? '%' : gasFlow(cat) ? 'Nm³/h' : DEFAULT_UNIT[cat] ?? U.list(cat)[0]);
  // the column of values of a table: its category on the screen ('%' or 'none' have no choice of unit)
  const valueCat = (qt, basis) => (basis === 'relative' || qt.cat === 'percent' ? '%' : qt.cat);

  // conversions with the fluid of the model (a volume flow needs the density, a normal volume flow of a gas its normal
  // density, a gauge pressure the ambient pressure)
  function fluidCtx() {
    const sys = app.eff().system;
    const ctx = {};
    try { ctx.patm = U.toSI(sys.patm.value, sys.patm.unit, 'pressure'); } catch (e) { /* incomplete: none */ }
    try {
      if (M.isCompressible(app.eff())) ctx.rhoN = PumpIt.fluids.normalDensity(PumpIt.fluids.evaluateGas(sys).MW);
      else ctx.rho = PumpIt.fluids.evaluate(sys).rho;
    } catch (e) { /* incomplete: none */ }
    return ctx;
  }
  // the steady value of a quantity of junction j in a unit (100 for a relative table); NaN when it cannot be told
  function steadyIn(j, qt, unit) {
    const ctx = fluidCtx();
    try {
      const v = qt.steady(j, (x, cat) => U.toSI(x.value, x.unit, cat, ctx));
      if (unit === '%' && qt.cat !== 'percent') return 100;
      return +U.fromSI(v, unit === '%' ? '%' : unit, qt.cat === 'none' ? 'none' : qt.cat, ctx).toPrecision(6);
    } catch (e) { return NaN; }
  }

  // new time data: the first quantity of the junction, by the clock, its steady value held for an hour
  function newData(j, qt) {
    const unit = unitFor(qt.cat, 'absolute');
    const v = steadyIn(j, qt, unit);
    const x = Number.isFinite(v) ? v : 0;
    return { use: true, what: qt.what, basis: 'absolute', start: 'time', when: [], tables: [{ t: [0, 1], v: [x, x], tUnit: 'h', vUnit: unit }], repeat: false, interp: 'linear' };
  }
  // a new condition: the time, from one hour on
  const newCondition = () => ({ q: 'time', op: '>=', value: { value: 1, unit: 'h' } });

  I.addSection('junction', (host, id) => {
    const key = 'j:' + id;
    const j = app.effObj(key);
    const def = j && PumpIt.junctionTypes.get(j.type);
    if (!def || !def.time || !def.time.quantities) return;
    const on = app.timeOn();
    const d = j.time && typeof j.time === 'object' ? j.time : null;
    if (!on && !d) return;
    const qs = def.time.quantities(j, { gas: M.isCompressible(app.eff()) });
    const s = UI.forms.section(tx('title'), { info: tx('hint') });
    host.appendChild(s);
    if (!on) s.appendChild(UI.forms.hint(F.esc(tx('off'))));
    if (!qs.length) { s.appendChild(UI.forms.hint(F.esc(tx('noQuantity')))); return; }
    if (!d) {
      const b = el('button', { class: 'btn small', type: 'button' }, F.esc(tx('add')));
      b.addEventListener('click', () => app.setVal(key, 'time', newData(j, qs[0])));
      s.appendChild(b);
      return;
    }
    const write = (fn) => { const next = M.clone(d); fn(next); app.setVal(key, 'time', next); };
    const field = (label, ctl, opts) => UI.forms.wrap(key, 'time', label, ctl, opts);
    const select = (id2, options, value, onChange) => {
      const sel = el('select', { id: `td-${id}-${id2}` }, options.map(([v, l]) => F.option(v, l, String(v) === String(value))).join(''));
      sel.addEventListener('change', () => onChange(sel.value));
      return sel;
    };

    s.appendChild(UI.forms.chk(key, 'time.use', tx('use')));
    const qt = qs.find((x) => x.what === d.what) || null;
    // the quantity: a change brings the tables to a unit of its category
    s.appendChild(field(tx('what'), select('what', (qt ? [] : [[d.what, '—']]).concat(qs.map((x) => [x.what, tx('whats.' + x.what)])), d.what, (v) => write((n) => {
      const nq = qs.find((x) => x.what === v);
      n.what = v;
      for (const tb of n.tables || []) if (n.basis !== 'relative') tb.vUnit = unitFor(nq.cat, 'absolute');
    }))));
    if (!qt) { s.appendChild(UI.forms.hint(F.esc(tx('whatGone')))); return; }
    // absolute or relative values: the numbers of the tables follow, when the steady value is known
    s.appendChild(field(tx('basis'), select('basis', PumpIt.time.inputs.BASES.map((b) => [b, tx('bases.' + b)]), d.basis, (v) => write((n) => {
      for (const tb of n.tables || []) {
        const unit = unitFor(qt.cat, v);
        const from = steadyIn(j, qt, tb.vUnit), to = steadyIn(j, qt, unit);
        if (qt.cat !== 'percent' && Number.isFinite(from) && Number.isFinite(to) && from !== 0) tb.v = tb.v.map((x) => +((x / from) * to).toPrecision(6));
        tb.vUnit = unit;
      }
      n.basis = v;
    })), { info: tx('basisHint') }));
    // how the tables start: the conditions and the tables the trigger needs are added
    s.appendChild(field(tx('start'), select('start', E().STARTS.map((x) => [x, tx('starts.' + x)]), d.start, (v) => write((n) => {
      n.start = v;
      n.when = n.when || [];
      while (n.when.length < E().EVENTS[v]) n.when.push(newCondition());
      while (n.tables.length < E().TABLES[v]) n.tables.push(M.clone(n.tables[n.tables.length - 1]));
      if (v !== 'time') for (const tb of n.tables) if (tb.t.length && tb.t[0] !== 0) { const t0 = tb.t[0]; tb.t = tb.t.map((x) => x - t0); }
    })), { info: tx('startHint') }));
    const nE = E().EVENTS[d.start] || 0, nT = E().TABLES[d.start] || 1;
    for (let e = 0; e < nE; e++) s.appendChild(conditionBlock(`td-${id}-e${e}`, tx('event', { n: e + 1 }), (d.when || [])[e] || newCondition(), (c) => write((n) => { n.when = n.when || []; n.when[e] = c; })));
    // a combined event: one of the named events of the model (the system window holds them)
    if (d.start === 'combined') {
      const names = (app.eff().events || []).map((x) => x.name).filter((x) => typeof x === 'string' && x);
      if (!names.length) s.appendChild(UI.forms.hint(F.esc(tx('combinedNone'))));
      else s.appendChild(field(tx('combined'), select('combined', (names.includes(d.combined) ? [] : [['', '—']]).concat(names.map((x) => [x, x])), d.combined || '', (v) => write((n) => { n.combined = v; }))));
    }
    for (let i = 0; i < nT && i < d.tables.length; i++) {
      const tb = d.tables[i];
      const box = el('div', { class: 'td-block' });
      box.appendChild(el('div', { class: 'td-title' }, F.esc(nT > 1 ? tx('tableOf', { n: i + 1 }) : tx('table'))));
      box.appendChild(UI.pointTable.build({
        id: `td-${id}-t${i}`,
        x: { label: tx('time'), cat: 'time', unit: tb.tUnit },
        y: { label: tx('whats.' + d.what), cat: valueCat(qt, d.basis) === '%' ? '%' : qt.cat, unit: tb.vUnit, only: gasFlow(qt.cat) ? (u) => !U.isVolumetric(u) : undefined },
        xs: tb.t, ys: tb.v, steps: d.interp === 'step',
        onChange: (x) => write((n) => { n.tables[i] = { t: x.xs, v: x.ys, tUnit: x.xUnit, vUnit: d.basis === 'relative' || qt.cat === 'percent' ? '%' : x.yUnit }; }),
      }));
      s.appendChild(box);
    }
    s.appendChild(UI.forms.chk(key, 'time.repeat', tx('repeat')));
    s.appendChild(UI.forms.sel(key, 'time.interp', tx('interp'), PumpIt.time.inputs.INTERP.map((x) => [x, tx('interps.' + x)])));
    // a pump stopped by its table: blocked or with the flow going through
    if (d.what === 'speed' || d.what === 'ratio') s.appendChild(UI.forms.sel(key, 'stopMode', tx('stopMode'), [['closed', tx('stopModes.closed')], ['open', tx('stopModes.open')]], { info: tx('stopModeHint') }));
    const rm = el('button', { class: 'btn small', type: 'button' }, F.esc(tx('remove')));
    rm.addEventListener('click', () => app.setVal(key, 'time', null));
    const row = el('div', { class: 'btn-row' });
    row.appendChild(rm);
    s.appendChild(row);
  });

  // ------------------------------------------------------------ the condition of an event (pfx: the start of the ids of
  // its fields; title: the title of its block, none when empty)
  const OP_LABEL = { '>': '>', '>=': '≥', '<': '<', '<=': '≤', '=': '=', '!=': '≠' };
  function conditionBlock(pfx, title, c, onChange) {
    const eff = app.eff();
    const Q = E().QUANTITIES;
    const box = el('div', { class: 'td-block' });
    if (title) box.appendChild(el('div', { class: 'td-title' }, F.esc(title)));
    const lab = (txt, ctl) => { const f = el('div', { class: 'field' }); const l = el('label', { for: ctl.id }); l.textContent = txt; const cc = el('div', { class: 'ctl' }); cc.appendChild(ctl); f.append(l, cc); return f; };
    const select = (suffix, options, value, fn) => {
      const s = el('select', { id: `${pfx}-${suffix}` }, options.map(([v, l]) => F.option(v, l, String(v) === String(value))).join(''));
      s.addEventListener('change', () => fn(s.value));
      return s;
    };
    const q = Q[c.q] || Q.time;
    // the objects where the quantity can be read
    const objects = () => {
      if (!q.at) return [];
      const list = eff.pipes.map((p) => ['p:' + p.id, `P${p.id}${p.name ? ' ' + p.name : ''}`]).concat(eff.junctions.map((j) => ['j:' + j.id, `J${j.id}${j.name ? ' ' + j.name : ''}`]));
      return list.filter(([k]) => { const ob = E().objectOf(eff, k); return ob && E().fits(q.at, ob); });
    };
    // a change of the quantity starts the rest of the condition again
    const fresh = (qn) => {
      const nq = Q[qn];
      const obs = nq.at ? objectsFor(nq) : [];
      const obj = nq.at ? (obs.find(([k]) => k === c.obj) || obs[0] || [undefined])[0] : undefined;
      const n = { q: qn, op: nq.at === 'state' ? '=' : '>=' };
      if (obj) n.obj = obj;
      if (E().needsEnd(nq.at)) n.end = c.end === 'out' ? 'out' : 'in';
      if (nq.at === 'state') { const ob = obj && E().objectOf(eff, obj); n.value = ob && ob.def.time.states ? ob.def.time.states[0] : ''; }
      else n.value = { value: 0, unit: unitFor(nq.cat, 'absolute') };
      return n;
    };
    const objectsFor = (nq) => eff.pipes.map((p) => ['p:' + p.id]).concat(eff.junctions.map((j) => ['j:' + j.id]))
      .filter(([k]) => { const ob = E().objectOf(eff, k); return ob && E().fits(nq.at, ob); });
    box.appendChild(lab(tx('cond.q'), select('q', Object.keys(Q).map((k) => [k, tx('cond.qs.' + k)]), c.q, (v) => onChange(fresh(v)))));
    if (q.at) {
      const obs = objects();
      box.appendChild(lab(tx('cond.obj'), select('obj', (obs.some(([k]) => k === c.obj) ? [] : [['', '—']]).concat(obs), c.obj || '', (v) => {
        const n = Object.assign({}, c, { obj: v || undefined });
        if (q.at === 'state') { const ob = E().objectOf(eff, v); n.value = ob && ob.def.time.states.includes(c.value) ? c.value : ob ? ob.def.time.states[0] : ''; }
        onChange(n);
      })));
      if (E().needsEnd(q.at)) box.appendChild(lab(tx('cond.end'), select('end', [['in', tx('cond.ends.in')], ['out', tx('cond.ends.out')]], c.end, (v) => onChange(Object.assign({}, c, { end: v })))));
      // the difference to the same quantity of a second object (a pressure difference takes a unit of its own)
      if (E().canDiffer(c.q)) {
        box.appendChild(lab(tx('cond.diff'), select('obj2', [['', tx('cond.noDiff')]].concat(obs), c.obj2 || '', (v) => {
          const n = Object.assign({}, c);
          if (v) { n.obj2 = v; if (E().needsEnd(q.at)) n.end2 = c.end2 === 'out' ? 'out' : 'in'; } else { delete n.obj2; delete n.end2; }
          const cat = E().valueCat(n);
          if (n.value && typeof n.value === 'object' && !PumpIt.units.has(cat, n.value.unit)) n.value = { value: n.value.value, unit: unitFor(cat, 'absolute') };
          onChange(n);
        })));
        if (c.obj2 && E().needsEnd(q.at)) box.appendChild(lab(tx('cond.end2'), select('end2', [['in', tx('cond.ends.in')], ['out', tx('cond.ends.out')]], c.end2, (v) => onChange(Object.assign({}, c, { end2: v })))));
      }
    }
    const ops = q.at === 'state' ? E().STATE_OPS : E().NUMERIC_OPS;
    box.appendChild(lab(tx('cond.op'), select('op', ops.map((o) => [o, OP_LABEL[o]]), c.op, (v) => onChange(Object.assign({}, c, { op: v })))));
    if (q.at === 'state') {
      const ob = c.obj && E().objectOf(eff, c.obj);
      const states = ob && ob.def && ob.def.time && ob.def.time.states ? ob.def.time.states : [];
      box.appendChild(lab(tx('cond.value'), select('state', states.map((x) => [x, tx('cond.states.' + x)]), c.value, (v) => onChange(Object.assign({}, c, { value: v })))));
    } else {
      const vcat = E().valueCat(c);
      const v = c.value && typeof c.value === 'object' ? c.value : { value: NaN, unit: unitFor(vcat, 'absolute') };
      const inp = el('input', { type: 'text', inputmode: 'decimal', id: `${pfx}-v`, autocomplete: 'off' });
      inp.value = F.inputStr(v.value);
      inp.addEventListener('change', () => { const n = F.parseNum(inp.value); onChange(Object.assign({}, c, { value: { value: Number.isFinite(n) ? n : null, unit: v.unit } })); });
      const f = lab(tx('cond.value'), inp);
      if (vcat !== 'none' && vcat !== 'percent') {
        const label = tx('cond.value');
        const us = el('select', { class: 'unit', id: `${pfx}-u`, 'aria-label': t('inspector.fields.unitOf', { label }) }, UI.forms.unitOptions(vcat, v.unit));
        us.addEventListener('change', () => onChange(Object.assign({}, c, { value: { value: v.value, unit: us.value } })));
        f.querySelector('.ctl').appendChild(us);
      } else if (vcat === 'percent') f.querySelector('.ctl').appendChild(el('span', { class: 'muted small', style: 'align-self:center;padding:0 2px' }, '%'));
      box.appendChild(f);
    }
    return box;
  }

  // ------------------------------------------------------------ the model data view: the time data and the tanks
  const objLabel = (eff, key) => { const o = M.getObj(eff, key); return o ? (key[0] === 'p' ? 'P' : 'J') + o.id : key || '—'; };
  function conditionText(c, eff) {
    const Q = E().QUANTITIES[c && c.q];
    if (!Q) return '—';
    const parts = [tx('cond.qs.' + c.q)];
    if (Q.at) parts.push(objLabel(eff, c.obj));
    if (c.end && E().needsEnd(Q.at)) parts.push(tx('cond.ends.' + c.end));
    if (c.obj2) parts.push('− ' + objLabel(eff, c.obj2) + (c.end2 && E().needsEnd(Q.at) ? ' ' + tx('cond.ends.' + c.end2) : ''));
    const v = Q.at === 'state' ? tx('cond.states.' + c.value) : c.value && Number.isFinite(c.value.value) ? `${F.fmt(c.value.value, 5)} ${F.unit(c.value.unit)}`.trim() : '—';
    return `${parts.join(' ')} ${OP_LABEL[c.op] || '?'} ${v}`;
  }
  function modelData(eff) {
    const q = (v) => (v && Number.isFinite(v.value) ? `${F.fmt(v.value, 5)} ${F.unit(v.unit)}`.trim() : '—');
    const timed = eff.junctions.filter((j) => j.time && typeof j.time === 'object' && PumpIt.junctionTypes.get(j.type).time);
    // the finite tanks of a liquid, or the finite vessels of a gas
    const gas = M.isCompressible(eff);
    const tanks = gas ? [] : eff.junctions.filter((j) => PumpIt.time.tanks.isFinite(j));
    const vessels = gas ? eff.junctions.filter((j) => PumpIt.time.vessels.isFinite(j)) : [];
    if (!timed.length && !tanks.length && !vessels.length) return '';
    const off = eff.solution.time && eff.solution.time.on ? '' : ` <span class="muted small">${F.esc(t('time.modelData.off'))}</span>`;
    let html = '';
    if (timed.length) {
      const rows = timed.map((j) => {
        const d = j.time;
        const nT = E().TABLES[d.start] || 1, nE = E().EVENTS[d.start] || 0;
        const when = d.start === 'combined' ? d.combined || '—' : (d.when || []).slice(0, nE).map((c) => conditionText(c, eff)).join(' · ');
        const pts = (d.tables || []).slice(0, nT).map((tb) => (tb && tb.t ? tb.t.length : 0)).join(' · ');
        return `<tr data-key="j:${j.id}"><td class="txt num">J${j.id}</td><td class="txt">${F.esc(j.name)}</td><td class="txt">${F.esc(M.JT[j.type].label)}</td><td class="txt">${d.use ? '✓' : '—'}</td>
          <td class="txt">${F.esc(tx('whats.' + d.what))}</td><td class="txt">${F.esc(tx('bases.' + d.basis))}</td><td class="txt">${F.esc(tx('starts.' + d.start))}${when ? ': ' + F.esc(when) : ''}</td>
          <td class="num">${F.esc(pts)}</td><td class="txt">${d.repeat ? '✓' : '—'}</td><td class="txt">${F.esc(tx('interps.' + d.interp))}</td></tr>`;
      }).join('');
      const th = ['junction', 'name', 'type', 'use', 'what', 'basis', 'start', 'points', 'repeat', 'interp'].map((k) => `<th class="${k === 'points' ? '' : 'txt'}">${F.esc(t('time.modelData.col.' + k))}</th>`).join('');
      html += `<div class="card"><div class="card-head"><h3>${F.esc(tx('title'))}${off}</h3></div><div class="table-scroll"><table class="grid"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }
    if (tanks.length) {
      const rows = tanks.map((j) => {
        const tk = j.tank, cyl = tk.shape === 'horizontalCylinder';
        const sec = tk.shape === 'table' ? t('time.modelData.tablePoints', { n: tk.table && tk.table.h ? tk.table.h.length : 0 })
          : cyl ? `${t('time.tank.shapes.horizontalCylinder')} ${q(tk.diameter)} × ${q(tk.length)}` : q(tk.area);
        // a level unknown at the start: a dash
        const level = PumpIt.time.tanks.knownOf(tk).level ? q(j.liquidElev) : '—';
        return `<tr data-key="j:${j.id}"><td class="txt num">J${j.id}</td><td class="txt">${F.esc(j.name)}</td><td class="txt">${F.esc(t('time.tank.models.' + tk.model))}</td><td class="num">${F.esc(q(tk.bottom))}</td><td class="num">${F.esc(q(cyl ? tk.diameter : tk.height))}</td><td class="txt">${F.esc(sec)}</td><td class="num">${F.esc(level)}</td></tr>`;
      }).join('');
      const th = ['junction', 'name', 'model', 'bottom', 'height', 'section', 'level'].map((k) => `<th class="${['bottom', 'height', 'level'].includes(k) ? '' : 'txt'}">${F.esc(t('time.modelData.col.' + k))}</th>`).join('');
      html += `<div class="card"><div class="card-head"><h3>${F.esc(t('time.modelData.tanks'))}${off}</h3></div><div class="table-scroll"><table class="grid"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }
    if (vessels.length) {
      const rows = vessels.map((j) => `<tr data-key="j:${j.id}"><td class="txt num">J${j.id}</td><td class="txt">${F.esc(j.name)}</td><td class="num">${F.esc(q(j.vessel.volume))}</td><td class="num">${F.esc(q(j.surfP))}</td></tr>`).join('');
      const th = [['junction', 'txt'], ['name', 'txt'], ['volume', ''], ['level', '']].map(([k, c]) => `<th class="${c}">${F.esc(k === 'level' ? t('time.vessel.start') : t('time.modelData.col.' + k))}</th>`).join('');
      html += `<div class="card"><div class="card-head"><h3>${F.esc(t('time.modelData.vessels'))}${off}</h3></div><div class="table-scroll"><table class="grid"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }
    return html;
  }

  UI.timeData = { newData, newCondition, DEFAULT_UNIT, modelData, conditionText, conditionBlock };
})(window);
