// The named events of the model in the system window (§5.4 of the specification of the time simulation): each one is a
// condition, or several events joined by and, or or not. They belong to the model, the same in every scenario, and a
// junction starts its table with one of them ("Combined event"). A new name is carried to the events and the junctions
// that use the old one.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, M = PumpIt.model;
  const app = PumpIt.app;
  const F = UI.format;
  const { el } = UI.dom;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('time.system.events.' + key, params);
  const JOINS = () => PumpIt.time.events.JOINS;

  // the events of the model become the list given (one undo step, a new calculation)
  app.setEvents = (list) => {
    app.pushUndo();
    app.model.events = list;
    app.changed();
  };

  // a name changed from a to b: in the events that join it and in the time data of the junctions, in every scenario
  function rename(list, a, b) {
    for (const e of list) if (Array.isArray(e.of)) e.of = e.of.map((n) => (n === a ? b : n));
    const fix = (d) => { if (d && typeof d === 'object' && d.combined === a) d.combined = b; };
    for (const j of app.model.junctions) fix(j.time);
    for (const s of app.model.scenarios.list) {
      for (const k of Object.keys(s.overrides)) {
        if (k.endsWith('|time')) fix(s.overrides[k]);
        else if (k.endsWith('|time.combined') && s.overrides[k] === a) s.overrides[k] = b;
      }
    }
  }

  function section() {
    const s = UI.forms.section(tx('title'), { info: tx('hint') });
    const list = (app.model.events || []).map((e) => M.clone(e));
    const save = () => app.setEvents(list);
    list.forEach((e, i) => {
      const box = el('div', { class: 'td-block te-event' });
      const field = (label, ctl) => { const f = el('div', { class: 'field' }); const l = el('label', { for: ctl.id }); l.textContent = label; const c = el('div', { class: 'ctl' }); c.appendChild(ctl); f.append(l, c); return f; };
      // its name: unique, not empty
      const name = el('input', { type: 'text', id: `te-${i}-name`, autocomplete: 'off' });
      name.value = e.name || '';
      name.addEventListener('change', () => {
        const v = name.value.trim();
        if (!v || list.some((x, k) => k !== i && x.name === v)) { name.value = e.name || ''; return; }
        if (e.name && e.name !== v) rename(list, e.name, v);
        e.name = v;
        save();
      });
      box.appendChild(field(tx('name'), name));
      // a condition or a join of other events
      const kind = el('select', { id: `te-${i}-kind` }, ['cond'].concat(JOINS()).map((k) => F.option(k, tx('kinds.' + k), (e.op || 'cond') === k)).join(''));
      kind.addEventListener('change', () => {
        if (kind.value === 'cond') { delete e.op; delete e.of; e.cond = e.cond || UI.timeData.newCondition(); }
        else { e.op = kind.value; e.of = Array.isArray(e.of) ? e.of : []; delete e.cond; }
        save();
      });
      box.appendChild(field(tx('kind'), kind));
      if (!e.op) box.appendChild(UI.timeData.conditionBlock(`te-${i}`, '', e.cond || UI.timeData.newCondition(), (c) => { e.cond = c; save(); }));
      else {
        // the events it joins: every other one, ticked
        const others = list.filter((x, k) => k !== i && x.name);
        const g = el('div', { class: 'te-of', role: 'group', 'aria-label': tx('of') });
        g.appendChild(el('div', { class: 'td-title' }, F.esc(tx('of'))));
        others.forEach((x, k) => {
          const id = `te-${i}-of-${k}`;
          const c = el('input', { type: 'checkbox', id });
          c.checked = (e.of || []).includes(x.name);
          c.addEventListener('change', () => { e.of = list.filter((y) => y.name && y !== e && (y === x ? c.checked : (e.of || []).includes(y.name))).map((y) => y.name); save(); });
          const l = el('label', { for: id });
          l.textContent = x.name;
          const row = el('div', { class: 'check' });
          row.append(c, l);
          g.appendChild(row);
        });
        box.appendChild(g);
      }
      const rm = el('button', { class: 'btn small', type: 'button' }, F.esc(tx('remove')));
      rm.addEventListener('click', () => { list.splice(i, 1); save(); });
      const row = el('div', { class: 'btn-row' });
      row.appendChild(rm);
      box.appendChild(row);
      s.appendChild(box);
    });
    const add = el('button', { class: 'btn small', type: 'button' }, F.esc(tx('add')));
    add.addEventListener('click', () => {
      let n = list.length + 1;
      while (list.some((x) => x.name === tx('newName', { n }))) n++;
      list.push({ name: tx('newName', { n }), cond: UI.timeData.newCondition() });
      save();
    });
    const row = el('div', { class: 'btn-row' });
    row.appendChild(add);
    s.appendChild(row);
    return s;
  }

  UI.timeEvents = { section };
})(window);
