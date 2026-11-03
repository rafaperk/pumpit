// Scenarios: the base scenario defines everything; each child stores only what differs from its parent
// (specification section 2). Changes flow down to descendants that did not override the attribute.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model;

  const scen = (m, sid) => m.scenarios.list.find((s) => s.id === sid);
  function chain(m, sid) {
    const out = [];
    for (let s = scen(m, sid); s; s = s.parent ? scen(m, s.parent) : null) out.unshift(s);
    return out;
  }

  // effective model of a scenario: a copy of the base with the overrides applied from the root to the leaf
  function effective(m, sid) {
    // the named events of the time simulation belong to the model, the same in every scenario (§5.4 of its specification)
    const e = M.clone({ system: m.system, solution: m.solution, pipes: m.pipes, junctions: m.junctions, title: m.title, events: m.events || [] });
    for (const s of chain(m, sid)) {
      const keys = Object.keys(s.overrides).sort((a, b) => a.length - b.length);
      for (const k of keys) {
        const [objKey, path] = k.split('|');
        const o = M.getObj(e, objKey);
        if (o) M.setPath(o, path, M.clone(s.overrides[k]));
      }
    }
    return e;
  }

  function effValue(m, sid, objKey, path) {
    const o = M.getObj(effective(m, sid), objKey);
    return o ? M.getPath(o, path) : undefined;
  }

  // edit: equal to the inherited value = relink to the parent; different = break the link of that attribute only
  function setField(m, sid, objKey, path, value) {
    const s = scen(m, sid);
    if (!s.parent) {
      const o = M.getObj(m, objKey);
      M.setPath(o, path, M.clone(value));
      return;
    }
    const k = objKey + '|' + path;
    // more specific overrides of this scenario inside the path no longer apply
    for (const ok of Object.keys(s.overrides)) if (ok.startsWith(k + '.')) delete s.overrides[ok];
    const inherited = effValue(m, s.parent, objKey, path);
    if (M.deepEqual(inherited, value)) delete s.overrides[k];
    else s.overrides[k] = M.clone(value);
  }

  function isOverridden(m, sid, objKey, path) {
    const s = scen(m, sid);
    if (!s || !s.parent) return false;
    const k = objKey + '|' + path;
    return Object.keys(s.overrides).some((ok) => ok === k || ok.startsWith(k + '.') || k.startsWith(ok + '.'));
  }
  function clearOverride(m, sid, objKey, path) {
    const s = scen(m, sid);
    const k = objKey + '|' + path;
    for (const ok of Object.keys(s.overrides)) if (ok === k || ok.startsWith(k + '.')) delete s.overrides[ok];
  }

  function removeObjectOverrides(m, objKey) {
    for (const s of m.scenarios.list) {
      for (const k of Object.keys(s.overrides)) if (k.split('|')[0] === objKey) delete s.overrides[k];
    }
  }

  function addScenario(m, parentId, name) {
    let n = 1;
    while (m.scenarios.list.some((s) => s.id === 's' + n)) n++;
    const s = { id: 's' + n, name, parent: parentId, overrides: {}, notes: '' };
    m.scenarios.list.push(s);
    return s;
  }
  function descendants(m, sid) {
    const out = [];
    const walk = (id) => m.scenarios.list.filter((s) => s.parent === id).forEach((s) => { out.push(s.id); walk(s.id); });
    walk(sid);
    return out;
  }
  function deleteScenario(m, sid) {
    const s = scen(m, sid);
    if (!s || !s.parent) return false;
    const kill = new Set([sid, ...descendants(m, sid)]);
    m.scenarios.list = m.scenarios.list.filter((x) => !kill.has(x.id));
    if (kill.has(m.scenarios.current)) m.scenarios.current = s.parent;
    return true;
  }

  Object.assign(M, {
    chain, effective, effValue, setField, isOverridden, clearOverride, removeObjectOverrides,
    addScenario, deleteScenario, descendants,
  });
})(typeof window !== 'undefined' ? window : globalThis);
