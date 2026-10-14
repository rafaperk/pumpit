// Aplicação: estado, edição com desfazer, cenários, cálculo automático, visões e arquivos.
// Qualquer alteração na entrada apaga todos os resultados e recalcula o cenário atual na hora,
// para nunca se ler saída de um modelo desatualizado.
(function (root) {
  const HR = root.HR;
  const M = HR.model, F = HR.fmt, U = HR.units, D = HR.data;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const KEY = { model: 'pumpit.model', prefs: 'pumpit.prefs' };

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* armazenamento indisponível */ } },
  };

  const app = {
    model: null,
    sel: null,              // objeto principal da seleção { kind, id }
    selSet: new Set(),      // todas as chaves selecionadas ('p:3', 'j:5')
    results: {},
    version: 0,
    undoStack: [],
    redoStack: [],
    clipboard: null,
    view: 'net',
    prefs: Object.assign({ grid: true, overlay: 'none', colUnits: {}, outTab: 'general', chart: 'pump', chartPump: null, profile: null }, store.get(KEY.prefs) || {}),
  };
  let effCache = { key: null, eff: null, val: null };

  // ------------------------------------------------------------ acesso ao modelo
  app.scenario = () => app.model.scenarios.list.find((s) => s.id === app.model.scenarios.current);
  app.scenarioById = (id) => app.model.scenarios.list.find((s) => s.id === id);
  function cacheKey() { return app.version + '|' + app.model.scenarios.current; }
  app.eff = () => {
    if (effCache.key !== cacheKey()) effCache = { key: cacheKey(), eff: M.effective(app.model, app.model.scenarios.current), val: null };
    return effCache.eff;
  };
  app.validation = () => { const e = app.eff(); if (!effCache.val) effCache.val = M.validate(e); return effCache.val; };
  app.undefSet = () => app.validation().undef;
  app.effObj = (key) => M.getObj(app.eff(), key);
  app.getVal = (key, path) => { const o = app.effObj(key); return o ? M.getPath(o, path) : undefined; };
  app.isOv = (key, path) => M.isOverridden(app.model, app.model.scenarios.current, key, path);
  app.currentResults = () => app.results[app.model.scenarios.current] || null;
  app.okResults = () => { const r = app.currentResults(); return r && r.ok ? r : null; };
  const KEY_DEFAULT = { 'gen.pv': 'kgf/cm²(a)', 'gen.patm': 'kgf/cm²(a)' };
  app.outUnit = (key, cat) => {
    const u = app.prefs.colUnits[key] || KEY_DEFAULT[key];
    return u && U.has(cat, u) ? u : F.DEFAULT_OUT[cat] || U.list(cat)[0];
  };

  // ------------------------------------------------------------ seleção
  const keyOf = (hit) => (hit.kind === 'pipe' ? 'p:' : 'j:') + hit.id;
  const hitOf = (key) => ({ kind: key[0] === 'p' ? 'pipe' : 'junction', id: Number(key.slice(2)) });
  function selectionChanged() { HR.canvas.render(); HR.inspector.render(); }
  app.select = (hit, opts = {}) => {
    if (!hit) { app.selSet.clear(); app.sel = null; }
    else if (opts.toggle) {
      const k = keyOf(hit);
      if (app.selSet.has(k)) { app.selSet.delete(k); app.sel = app.selSet.size ? hitOf([...app.selSet].pop()) : null; }
      else { app.selSet.add(k); app.sel = hit; }
    } else { app.selSet = new Set([keyOf(hit)]); app.sel = hit; }
    selectionChanged();
  };
  app.setPrimary = (hit) => { app.sel = hit; HR.inspector.render(); };
  app.selectKeys = (keys) => {
    app.selSet = new Set(keys);
    app.sel = keys.length ? hitOf(keys.find((k) => k[0] === 'j') || keys[0]) : null;
    selectionChanged();
  };
  function pruneSelection() {
    for (const k of [...app.selSet]) if (!M.getObj(app.model, k)) app.selSet.delete(k);
    if (app.sel && !app.selSet.has(keyOf(app.sel))) app.sel = app.selSet.size ? hitOf([...app.selSet][0]) : null;
  }

  // ------------------------------------------------------------ edição
  app.pushUndo = () => {
    app.undoStack.push(JSON.stringify(app.model));
    if (app.undoStack.length > 80) app.undoStack.shift();
    app.redoStack = [];
  };
  function restore(json) {
    app.model = JSON.parse(json);
    pruneSelection();
    changed();
  }
  app.undo = () => { if (!app.undoStack.length) return toast('Nada para desfazer.'); app.redoStack.push(JSON.stringify(app.model)); restore(app.undoStack.pop()); };
  app.redo = () => { if (!app.redoStack.length) return toast('Nada para refazer.'); app.undoStack.push(JSON.stringify(app.model)); restore(app.redoStack.pop()); };

  app.save = () => { store.set(KEY.model, app.model); };
  function savePrefs() { store.set(KEY.prefs, app.prefs); }

  // cálculo automático do cenário atual (sem botão Executar)
  function recalc() {
    const sid = app.model.scenarios.current;
    if (!app.validation().ok) { delete app.results[sid]; return null; }
    const t0 = performance.now();
    const r = HR.solver.run(app.eff());
    r.elapsed = performance.now() - t0;
    app.results[sid] = r;
    return r;
  }

  // alteração de entrada: apaga os resultados, recalcula e redesenha
  function changed() {
    app.version++;
    app.results = {};
    app.save();
    recalc();
    renderAll();
  }

  app.setVal = (key, path, value) => {
    app.pushUndo();
    const sid = app.model.scenarios.current;
    M.setField(app.model, sid, key, path, value);
    // aço da ASME B36.10M: o tamanho nominal e o schedule definem o diâmetro interno
    if (key.startsWith('p:') && path.startsWith('material')) {
      const p = M.getObj(M.effective(app.model, sid), key);
      if (p.material.kind === 'steel') {
        const d = D.steelID(p.material.nps, p.material.sch);
        M.setField(app.model, sid, key, 'geometry.kind', 'circular');
        M.setField(app.model, sid, key, 'geometry.d', { value: +d.toFixed(2), unit: 'mm' });
        if (path === 'material.kind') M.setField(app.model, sid, key, 'friction', { model: 'roughness', eps: { value: 0.046, unit: 'mm' }, rel: 0.0001, f: 0.02, C: 120 });
      }
    }
    changed();
  };
  app.clearOv = (key, path) => { app.pushUndo(); M.clearOverride(app.model, app.model.scenarios.current, key, path); changed(); };

  app.addJunction = (type, x, y, opts = {}) => {
    app.pushUndo();
    const id = app.model.nextId.j++;
    app.model.junctions.push(M.newJunction(type, id, x, y));
    if (!opts.silent) { app.selSet = new Set(['j:' + id]); app.sel = { kind: 'junction', id }; }
    changed();
    return id;
  };

  app.addPipe = (up, down) => {
    if (up === down) return null;
    app.pushUndo();
    const id = app.model.nextId.p++;
    const tpl = app.model.pipes[app.model.pipes.length - 1];
    app.model.pipes.push(M.newPipe(id, up, down, tpl));
    app.selSet = new Set(['p:' + id]); app.sel = { kind: 'pipe', id };
    changed();
    return id;
  };

  function dropPipeRefs(pid) {
    for (const j of app.model.junctions) if (j.pipeK) delete j.pipeK[pid];
    for (const s of app.model.scenarios.list) {
      for (const k of Object.keys(s.overrides)) if (/\|pipeK\.(\d+)/.test(k) && Number(k.match(/\|pipeK\.(\d+)/)[1]) === pid) delete s.overrides[k];
    }
    M.removeObjectOverrides(app.model, 'p:' + pid);
  }

  app.deleteSelection = () => {
    if (!app.selSet.size) return;
    app.pushUndo();
    const jIds = new Set([...app.selSet].filter((k) => k[0] === 'j').map((k) => Number(k.slice(2))));
    const pIds = new Set([...app.selSet].filter((k) => k[0] === 'p').map((k) => Number(k.slice(2))));
    for (const p of app.model.pipes) if (jIds.has(p.up) || jIds.has(p.down)) pIds.add(p.id);
    app.model.pipes = app.model.pipes.filter((p) => !pIds.has(p.id));
    pIds.forEach(dropPipeRefs);
    app.model.junctions = app.model.junctions.filter((j) => !jIds.has(j.id));
    jIds.forEach((id) => M.removeObjectOverrides(app.model, 'j:' + id));
    app.selSet.clear(); app.sel = null;
    changed();
  };

  app.reversePipe = (id) => {
    const p = app.model.pipes.find((x) => x.id === id);
    if (!p) return;
    app.pushUndo();
    [p.up, p.down] = [p.down, p.up];
    changed();
  };

  // trocar o tipo mantém os dados compatíveis
  app.changeType = (id, type) => {
    const old = app.model.junctions.find((j) => j.id === id);
    if (!old || old.type === type) return;
    app.pushUndo();
    const nj = M.newJunction(type, id, old.x, old.y);
    for (const k of ['name', 'elevation']) nj[k] = old[k];
    if (old.pipeK && nj.pipeK) nj.pipeK = old.pipeK;
    if (old.lossModel && nj.lossModel) for (const k of ['lossModel', 'K', 'Cv', 'Kv']) nj[k] = old[k];
    Object.keys(old).forEach((k) => delete old[k]);
    Object.assign(old, nj);
    for (const s of app.model.scenarios.list) {
      for (const k of Object.keys(s.overrides)) {
        const [ok, path] = k.split('|');
        if (ok === 'j:' + id && !/^(name|elevation)$/.test(path)) delete s.overrides[k];
      }
    }
    changed();
  };

  // ------------------------------------------------------------ copiar e colar (Ctrl+C / Ctrl+V)
  // Copia as junções selecionadas, as pontas dos tubos selecionados e os tubos entre elas,
  // com os valores efetivos do cenário atual.
  app.copySelection = () => {
    if (!app.selSet.size) { toast('Selecione objetos para copiar (Ctrl+clique ou Shift+arrastar).'); return; }
    const eff = app.eff();
    const jIds = new Set([...app.selSet].filter((k) => k[0] === 'j').map((k) => Number(k.slice(2))));
    for (const k of app.selSet) if (k[0] === 'p') { const p = eff.pipes.find((x) => x.id === Number(k.slice(2))); if (p) { jIds.add(p.up); jIds.add(p.down); } }
    const junctions = eff.junctions.filter((j) => jIds.has(j.id));
    const pipes = eff.pipes.filter((p) => jIds.has(p.up) && jIds.has(p.down));
    app.clipboard = { junctions: M.clone(junctions), pipes: M.clone(pipes), pastes: 0 };
    try { navigator.clipboard.writeText(JSON.stringify({ pumpit: 1, junctions, pipes })).catch(() => {}); } catch (e) { /* só a área interna */ }
    toast(`Copiado: ${junctions.length} junção(ões) e ${pipes.length} tubo(s). Ctrl+V cola.`);
  };
  app.paste = () => {
    const cb = app.clipboard;
    if (!cb || !cb.junctions.length) { toast('Nada copiado ainda.'); return; }
    app.pushUndo();
    cb.pastes++;
    const off = 40 * cb.pastes;
    const jMap = new Map(), pMap = new Map();
    for (const j of cb.junctions) jMap.set(j.id, app.model.nextId.j++);
    for (const p of cb.pipes) pMap.set(p.id, app.model.nextId.p++);
    const keys = [];
    for (const j0 of cb.junctions) {
      const j = M.clone(j0);
      j.id = jMap.get(j0.id); j.x += off; j.y += off;
      if (j.pipeK) j.pipeK = Object.fromEntries(Object.entries(j.pipeK).filter(([pid]) => pMap.has(Number(pid))).map(([pid, v]) => [pMap.get(Number(pid)), v]));
      app.model.junctions.push(j);
      keys.push('j:' + j.id);
    }
    for (const p0 of cb.pipes) {
      const p = M.clone(p0);
      p.id = pMap.get(p0.id); p.up = jMap.get(p0.up); p.down = jMap.get(p0.down);
      app.model.pipes.push(p);
      keys.push('p:' + p.id);
    }
    app.selSet = new Set(keys);
    app.sel = hitOf(keys[0]);
    changed();
    toast(`Colado: ${cb.junctions.length} junção(ões) e ${cb.pipes.length} tubo(s).`);
  };
  app.selectAll = () => app.selectKeys(app.model.junctions.map((j) => 'j:' + j.id).concat(app.model.pipes.map((p) => 'p:' + p.id)));

  // ------------------------------------------------------------ desenho geral
  function renderAll() {
    renderHeader();
    HR.canvas.render();
    HR.inspector.render();
    renderView();
  }

  function renderHeader() {
    $('#model-title').value = app.model.title || '';
    const list = app.model.scenarios.list;
    const depth = (s) => { let d = 0; for (let c = s; c.parent; c = app.scenarioById(c.parent)) d++; return d; };
    const ordered = [];
    const walk = (pid) => list.filter((s) => s.parent === pid).forEach((s) => { ordered.push(s); walk(s.id); });
    walk(null);
    $('#scenario-select').innerHTML = ordered.map((s) => `<option value="${s.id}"${s.id === app.model.scenarios.current ? ' selected' : ''}>${' '.repeat(depth(s))}${depth(s) ? '└ ' : ''}${F.esc(s.name)}</option>`).join('');
    $('#btn-scn-del').disabled = !app.scenario().parent;
    // lista de verificação e estado do cálculo
    const v = app.validation();
    const r = app.currentResults();
    const bad = v.items.filter((i) => !i.ok).length;
    let cls = 'bad', txt = `${bad} pendência(s)`;
    if (v.ok && r && r.ok && r.converged) { cls = 'ok'; txt = 'Calculado'; }
    else if (v.ok && r && r.ok) { cls = 'warn'; txt = 'Não convergiu'; }
    else if (v.ok && r && !r.ok) { cls = 'bad'; txt = 'Cálculo recusado'; }
    $('#check-dot').className = 'dot ' + cls;
    $('#check-text').textContent = txt;
    if (!$('#checklist-pop').hidden) fillChecklist();
    const st = $('#status-line');
    if (!v.ok) st.textContent = 'Complete a lista de verificação para calcular';
    else if (!r) st.textContent = '';
    else if (!r.ok) st.textContent = r.errors[0];
    else st.textContent = `Cálculo automático · ${r.converged ? 'convergiu' : 'não convergiu'} em ${r.iterations} iterações · ${r.elapsed.toFixed(0)} ms`;
    const badge = $('#out-badge');
    if (r && r.ok && r.warnings.length) {
      badge.hidden = false;
      badge.textContent = r.warnings.length;
      badge.className = 'badge' + (r.warnings.some((w) => w.level === 'critical') ? ' crit' : '');
    } else badge.hidden = true;
  }

  function renderView() {
    $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === app.view)));
    $$('.view').forEach((v) => { v.hidden = v.id !== 'view-' + app.view; });
    if (app.view === 'data') HR.tables.renderData($('#data-tables'));
    if (app.view === 'out') HR.tables.renderOut($('#out-body'), $('#out-tabs'), $('#out-sub'));
    if (app.view === 'charts') {
      $$('#chart-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.chart === app.prefs.chart));
      HR.charts.render(app.prefs.chart, $('#chart-box'), $('#chart-controls'), $('#chart-notes'));
    }
  }

  function setView(v) {
    app.view = v;
    renderView();
    if (v === 'net') requestAnimationFrame(() => HR.canvas.render());
  }

  // ------------------------------------------------------------ interface auxiliar
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.h);
    toast.h = setTimeout(() => { t.hidden = true; }, 3800);
  }
  app.toast = toast;
  app.hint = (msg) => { $('#canvas-hint').textContent = msg; };

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

  function askText(title, label, initial, onOk) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<label class="muted small" for="ask-in">${F.esc(label)}</label>`;
    const inp = document.createElement('input');
    inp.type = 'text'; inp.id = 'ask-in'; inp.value = initial || '';
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#modal-actions .primary').click(); } });
    wrap.appendChild(inp);
    modal({ title, body: wrap, actions: [{ label: 'Cancelar' }, { label: 'OK', primary: true, onClick: () => { const v = inp.value.trim(); if (!v) return false; onOk(v); } }] });
  }
  function confirmBox(title, text, okLabel, onOk) {
    modal({ title, body: `<p class="muted" style="margin:0">${F.esc(text)}</p>`, actions: [{ label: 'Cancelar' }, { label: okLabel, primary: true, onClick: onOk }] });
  }

  app.hideMenus = () => {
    $$('.menu-pop').forEach((m) => { m.hidden = true; });
    $('#ctxmenu').hidden = true;
  };

  // clique direito: ficha com os dados principais e ações
  app.showInfo = (hit, x, y) => {
    const cm = $('#ctxmenu');
    const card = HR.infocard.build(app, hit);
    if (!card) return;
    cm.innerHTML = HR.infocard.html(card) + '<div class="info-actions"></div>';
    const acts = cm.querySelector('.info-actions');
    const many = app.selSet.size > 1;
    const items = [];
    if (hit.kind === 'pipe' && !many) items.push(['Inverter sentido', () => app.reversePipe(hit.id)]);
    items.push([many ? `Copiar ${app.selSet.size} objetos` : 'Copiar', () => app.copySelection()]);
    if (app.clipboard) items.push(['Colar', () => app.paste()]);
    items.push([many ? `Excluir ${app.selSet.size} objetos` : 'Excluir', () => app.deleteSelection()]);
    for (const [label, fn] of items) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.addEventListener('click', () => { cm.hidden = true; fn(); });
      acts.appendChild(b);
    }
    cm.hidden = false;
    const w = cm.offsetWidth, h = cm.offsetHeight;
    cm.style.left = Math.max(8, Math.min(x + 6, innerWidth - w - 8)) + 'px';
    cm.style.top = Math.max(8, Math.min(y + 6, innerHeight - h - 8)) + 'px';
  };

  function fillChecklist() {
    const v = app.validation();
    const pop = $('#checklist-pop');
    let html = '<div class="eyebrow" style="margin-bottom:6px">Lista de verificação</div>';
    html += v.items.map((i) => `<div class="check-item"><span class="dot ${i.ok ? 'ok' : 'bad'}"></span><div>${F.esc(i.label)}${i.detail && !i.ok ? `<small>${F.esc(i.detail)}</small>` : ''}</div></div>`).join('');
    if (v.undef.size) {
      html += '<div class="menu-sep"></div><div class="eyebrow" style="margin:6px 0 4px">Objetos indefinidos</div>';
      html += [...v.undef].slice(0, 30).map(([k, miss]) => `<button type="button" data-goto="${k}" style="flex-direction:column;align-items:flex-start"><b class="num">${k[0] === 'p' ? 'P' : 'J'}${k.slice(2)}</b><small class="muted">${F.esc(miss.join('; '))}</small></button>`).join('');
    }
    const r = app.currentResults();
    if (v.ok && r && !r.ok) html += `<div class="menu-sep"></div><p class="small" style="margin:6px 0 0;color:var(--crit)">${F.esc(r.errors[0])}</p>`;
    pop.innerHTML = html;
  }
  function openChecklist() {
    app.hideMenus();
    fillChecklist();
    $('#checklist-pop').hidden = false;
  }

  app.showDiffs = () => {
    const s = app.scenario();
    const parent = s.parent;
    const rows = Object.entries(s.overrides).map(([k, v]) => {
      const [ok, path] = k.split('|');
      const label = ok === 'sys' ? 'Sistema' : ok === 'sol' ? 'Controle da solução' : (ok[0] === 'p' ? 'P' : 'J') + ok.slice(2);
      const pv = M.effValue(app.model, parent, ok, path);
      const show = (x) => (x && typeof x === 'object' && 'value' in x ? `${F.fmt(x.value, 5)} ${x.unit}` : typeof x === 'object' ? 'tabela' : String(x));
      return `<tr><td class="txt">${label}</td><td class="txt">${F.esc(path)}</td><td class="num">${F.esc(show(v))}</td><td class="num muted">${F.esc(show(pv))}</td></tr>`;
    }).join('');
    modal({
      title: `Diferenças: ${s.name} × ${app.scenarioById(parent).name}`,
      body: `<div class="table-scroll"><table class="grid"><thead><tr><th class="txt">Objeto</th><th class="txt">Atributo</th><th>Neste cenário</th><th>No pai</th></tr></thead><tbody>${rows}</tbody></table></div>`,
      actions: [{ label: 'Fechar', primary: true }],
    });
  };

  // ------------------------------------------------------------ arquivos
  function normalize(m) {
    if (!m || !Array.isArray(m.pipes) || !Array.isArray(m.junctions)) throw new Error('O arquivo não é um modelo deste aplicativo.');
    const base = M.newModel();
    m.system = Object.assign(base.system, m.system || {});
    m.solution = Object.assign(base.solution, m.solution || {});
    if (!m.scenarios || !m.scenarios.list || !m.scenarios.list.length) m.scenarios = base.scenarios;
    if (!m.scenarios.list.some((s) => s.id === m.scenarios.current)) m.scenarios.current = m.scenarios.list[0].id;
    m.nextId = m.nextId || {};
    m.nextId.p = Math.max(m.nextId.p || 1, 1 + Math.max(0, ...m.pipes.map((p) => p.id)));
    m.nextId.j = Math.max(m.nextId.j || 1, 1 + Math.max(0, ...m.junctions.map((j) => j.id)));
    m._notes = M.migrate(m);
    return m;
  }
  function loadModel(m, { fit = true } = {}) {
    app.model = normalize(m);
    const notes = app.model._notes;
    delete app.model._notes;
    app.selSet.clear(); app.sel = null;
    app.version++;
    app.results = {};
    app.save();
    recalc();
    renderAll();
    if (fit) requestAnimationFrame(() => HR.canvas.fit());
    if (notes && notes.length) toast(`Tipos de junção convertidos: ${notes.join('; ')}.`);
  }

  // Salva um arquivo: na página publicada usa a capacidade de downloads do visualizador; no
  // arquivo local, um link de download comum.
  async function saveFile(filename, blob) {
    let dl = null;
    try { dl = root.claude && root.claude.use ? await root.claude.use('downloads') : null; } catch (e) { dl = null; }
    if (dl) {
      try { await dl.save({ filename, data: blob }); toast(`Arquivo salvo: ${filename}`); }
      catch (e) { toast(e && e.code === 'declined' ? 'Download cancelado.' : 'Não foi possível salvar o arquivo aqui. Use "Copiar para Excel".'); }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast(`Download iniciado: ${filename}`);
  }
  const safeName = (s) => (s || 'modelo').replace(/[^\w\-. ]+/g, '_').trim() || 'modelo';

  app.exportPipesXlsx = () => {
    const res = app.okResults();
    if (!res) { toast('Sem resultados para exportar. Complete a lista de verificação.'); return; }
    const sheet = HR.tables.pipeSheet(res, app.eff());
    const blob = HR.xlsx.workbook({ sheet: 'Tubos', columns: sheet.columns, rows: sheet.rows });
    saveFile(`${safeName(app.model.title)} - ${safeName(app.scenario().name)} - tubos.xlsx`, blob);
  };

  function copyText(text, okMsg) {
    const fallback = () => modal({ title: 'Copie o texto', body: `<textarea id="copy-area" readonly>${F.esc(text)}</textarea>`, actions: [{ label: 'Fechar', primary: true }] });
    try {
      navigator.clipboard.writeText(text).then(() => toast(okMsg), () => { fallback(); setTimeout(() => $('#copy-area') && $('#copy-area').select(), 30); });
    } catch (e) { fallback(); }
  }

  const ACTIONS = {
    new: () => confirmBox('Novo modelo', 'O modelo atual será substituído (ainda dá para desfazer).', 'Criar', () => { app.pushUndo(); loadModel(M.newModel()); }),
    open: () => $('#file-input').click(),
    save: () => saveFile(`${safeName(app.model.title)}.pumpit.json`, new Blob([JSON.stringify(app.model, null, 1)], { type: 'application/json' })),
    'copy-json': () => copyText(JSON.stringify(app.model), 'Modelo copiado para a área de transferência.'),
    'paste-json': () => {
      const ta = document.createElement('textarea');
      ta.id = 'paste-area';
      ta.placeholder = 'Cole aqui o JSON de um modelo';
      modal({ title: 'Colar modelo', body: ta, actions: [{ label: 'Cancelar' }, { label: 'Abrir', primary: true, onClick: () => {
        try { app.pushUndo(); loadModel(JSON.parse(ta.value)); toast('Modelo aberto.'); } catch (e) { toast('Não foi possível ler: ' + e.message); return false; }
      } }] });
    },
    'export-xlsx': () => app.exportPipesXlsx(),
    undo: () => app.undo(),
    redo: () => app.redo(),
    copy: () => app.copySelection(),
    paste: () => app.paste(),
    'select-all': () => { setView('net'); app.selectAll(); },
    reverse: () => { if (app.sel && app.sel.kind === 'pipe') app.reversePipe(app.sel.id); else toast('Selecione um tubo.'); },
    delete: () => (app.selSet.size ? app.deleteSelection() : toast('Nada selecionado.')),
    fit: () => { setView('net'); requestAnimationFrame(() => HR.canvas.fit()); },
    'toggle-grid': () => { app.prefs.grid = !app.prefs.grid; savePrefs(); HR.canvas.render(); toast(app.prefs.grid ? 'Grade e encaixe ligados.' : 'Grade e encaixe desligados.'); },
  };

  // ------------------------------------------------------------ ligações de eventos
  function bind() {
    $$('[data-menu]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const pop = $('#menu-' + b.dataset.menu);
      const was = pop.hidden;
      app.hideMenus();
      pop.hidden = !was;
    }));
    $$('.menu-pop [data-act]').forEach((b) => b.addEventListener('click', () => { app.hideMenus(); ACTIONS[b.dataset.act](); }));
    $('#menu-examples').innerHTML = HR.examples.EXAMPLES.map((ex) => `<button type="button" data-ex="${ex.id}">${F.esc(ex.name)}</button>`).join('');
    $('#menu-examples').addEventListener('click', (e) => {
      const b = e.target.closest('[data-ex]');
      if (!b) return;
      app.hideMenus();
      app.pushUndo();
      loadModel(HR.examples.get(b.dataset.ex).build());
      toast(`Exemplo carregado: ${HR.examples.get(b.dataset.ex).name}.`);
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.menu') && !e.target.closest('.run') && !e.target.closest('.ctxmenu')) app.hideMenus();
    });
    $('#btn-checklist').addEventListener('click', (e) => { e.stopPropagation(); const p = $('#checklist-pop'); if (p.hidden) openChecklist(); else p.hidden = true; });
    $('#checklist-pop').addEventListener('click', (e) => {
      const b = e.target.closest('[data-goto]');
      if (!b) return;
      gotoKey(b.dataset.goto);
      app.hideMenus();
    });

    $('#file-input').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try { app.pushUndo(); loadModel(JSON.parse(rd.result)); toast(`Aberto: ${f.name}`); } catch (err) { toast('Não foi possível abrir: ' + err.message); }
      };
      rd.readAsText(f);
      e.target.value = '';
    });

    $('#model-title').addEventListener('change', (e) => { app.pushUndo(); app.model.title = e.target.value.trim() || 'Modelo sem título'; app.save(); });

    // cenários: ao trocar, calcula o cenário escolhido
    $('#scenario-select').addEventListener('change', (e) => {
      app.model.scenarios.current = e.target.value;
      app.save();
      if (!app.currentResults()) recalc();
      renderAll();
    });
    $('#btn-scn-add').addEventListener('click', () => askText('Novo cenário', `Nome do cenário filho de "${app.scenario().name}"`, '', (name) => {
      app.pushUndo();
      const s = M.addScenario(app.model, app.model.scenarios.current, name);
      app.model.scenarios.current = s.id;
      changed();
      toast(`Cenário "${name}" criado. Ele herda tudo do pai até você alterar algum valor.`);
    }));
    $('#btn-scn-rename').addEventListener('click', () => askText('Renomear cenário', 'Novo nome', app.scenario().name, (name) => {
      app.pushUndo(); app.scenario().name = name; app.save(); renderAll();
    }));
    $('#btn-scn-del').addEventListener('click', () => {
      const s = app.scenario();
      if (!s.parent) return;
      const n = M.descendants(app.model, s.id).length;
      confirmBox('Excluir cenário', `Excluir "${s.name}"${n ? ` e ${n} cenário(s) filho(s)` : ''}? Dá para desfazer.`, 'Excluir', () => {
        app.pushUndo(); M.deleteScenario(app.model, s.id); changed();
      });
    });

    // abas
    $$('.tab').forEach((t) => t.addEventListener('click', () => setView(t.dataset.view)));
    $('#out-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-out]');
      if (!b) return;
      app.prefs.outTab = b.dataset.out; savePrefs(); renderView();
    });
    $('#chart-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-chart]');
      if (!b) return;
      app.prefs.chart = b.dataset.chart; savePrefs(); renderView();
    });

    // unidades por coluna (resultados e gráficos)
    document.addEventListener('change', (e) => {
      const s = e.target.closest('.unit-sel');
      if (s) { app.prefs.colUnits[s.dataset.t + '.' + s.dataset.c] = s.value; savePrefs(); renderView(); return; }
      if (e.target.id === 'ch-pump') { app.prefs.chartPump = Number(e.target.value); savePrefs(); renderView(); }
      if (e.target.id === 'pf-a' || e.target.id === 'pf-b' || e.target.id === 'pf-what') {
        app.prefs.profile = { a: Number($('#pf-a').value), b: Number($('#pf-b').value), what: $('#pf-what').value };
        savePrefs(); renderView();
      }
    });
    // botões das tabelas e clique em linhas → seleciona o objeto
    $('#view-out').addEventListener('click', (e) => {
      const x = e.target.closest('[data-xlsx]');
      if (x) { app.exportPipesXlsx(); return; }
      const c = e.target.closest('[data-copy]');
      if (c) { copyText(HR.tables.tableTSV(c.dataset.copy, app.okResults(), app.eff()), 'Tabela copiada. Cole no Excel.'); return; }
      if (e.target.closest('select')) return;
      const r = e.target.closest('[data-key]');
      if (r && r.dataset.key) gotoKey(r.dataset.key);
    });
    $('#view-data').addEventListener('click', (e) => {
      const r = e.target.closest('[data-key]');
      if (r) gotoKey(r.dataset.key);
    });

    // paleta
    const groups = {};
    for (const [k, t] of Object.entries(M.JT)) (groups[t.group] = groups[t.group] || []).push([k, t]);
    $('#palette-junctions').innerHTML = Object.entries(groups).map(([g, items]) => `<div class="palette-group">${g}</div>` +
      items.map(([k, t]) => `<button class="tool" data-tool="place:${k}" draggable="true" title="${F.esc(t.label)}: clique e depois clique no desenho, ou arraste">${HR.symbols.icon(k, 24)}<span>${F.esc(t.label)}</span></button>`).join('')).join('');
    $$('.palette .tool').forEach((b) => {
      b.addEventListener('click', () => HR.canvas.setTool(HR.canvas.tool === b.dataset.tool && b.dataset.tool !== 'select' ? 'select' : b.dataset.tool));
      b.addEventListener('dragstart', (e) => { if (b.dataset.tool.startsWith('place:')) e.dataTransfer.setData('text/plain', b.dataset.tool.slice(6)); });
    });

    // ferramentas da área de trabalho
    $('#overlay-select').value = app.prefs.overlay;
    $('#overlay-select').addEventListener('change', (e) => {
      app.prefs.overlay = e.target.value; savePrefs(); HR.canvas.render();
      if (e.target.value !== 'none' && !app.okResults()) toast('Complete a lista de verificação para colorir o desenho com resultados.');
    });
    $('#zoom-in').addEventListener('click', () => HR.canvas.zoomBy(1.25));
    $('#zoom-out').addEventListener('click', () => HR.canvas.zoomBy(0.8));
    $('#zoom-fit').addEventListener('click', () => HR.canvas.fit());

    // teclado
    document.addEventListener('keydown', (e) => {
      const typing = e.target.closest('input, textarea, select');
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') {
        if (!$('#modal').hidden) { closeModal(); return; }
        app.hideMenus();
        if (!typing) HR.canvas.cancel();
        return;
      }
      if (typing || !$('#modal').hidden) return;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? app.redo() : app.undo(); return; }
      if (mod && k === 'y') { e.preventDefault(); app.redo(); return; }
      if (app.view !== 'net') return;
      // não rouba a cópia de um texto selecionado na página
      const textSel = String(root.getSelection ? root.getSelection() : '').length > 0;
      if (mod && k === 'c' && !textSel) { e.preventDefault(); app.copySelection(); return; }
      if (mod && k === 'v') { e.preventDefault(); app.paste(); return; }
      if (mod && k === 'a') { e.preventDefault(); app.selectAll(); return; }
      if (mod) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); app.deleteSelection(); }
      else if (k === 'p') HR.canvas.setTool('pipe');
      else if (k === 'v') HR.canvas.setTool('select');
    });
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  }

  function gotoKey(key) {
    if (!key) return;
    app.selSet = new Set([key]);
    app.sel = hitOf(key);
    setView('net');
    HR.inspector.render();
  }

  // ------------------------------------------------------------ partida
  function start() {
    HR.forms.init(app);
    HR.inspector.init(app, $('#inspector'));
    HR.tables.init(app);
    HR.charts.init(app);
    HR.canvas.init($('#canvas'), $('#canvas-wrap'), app);
    bind();
    let m = store.get(KEY.model);
    try { if (m) normalize(m); } catch (e) { m = null; }
    loadModel(m || HR.examples.get('pump').build());
    if (!m) toast('Exemplo carregado: bombeamento entre tanques. O cálculo é refeito a cada alteração.');
  }

  HR.app = app;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
