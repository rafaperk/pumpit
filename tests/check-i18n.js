// Consistency of the interface languages. Usage: node tests/check-i18n.js
//   1. every language has exactly the keys of the base language (en), with the same {placeholders};
//   2. every key written literally in the code (t('…'), tx('…') with its file prefix, need('…'), data-i18n
//      attributes in index.html) exists in the base language;
//   3. every example and scenario calculates in every language without missing texts or unfilled placeholders;
//   4. every pipe catalogue has the texts the interface reads by its material and its kinds of size, series and grade.
// Keys built at run time (for example 'junctions.' + type + '.label') are covered by points 1, 3 and 4.
const fs = require('fs');
const path = require('path');
const { ROOT, loadCore } = require('./load-core');

let problems = 0;
const fail = (msg) => { problems++; console.log('  FAIL ' + msg); };
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

const PumpIt = loadCore();
const i18n = PumpIt.i18n;
const base = i18n.catalog(i18n.BASE);

console.log('\nLanguages');
for (const { code, name } of i18n.languages()) {
  const cat = i18n.catalog(code);
  let missing = 0, extra = 0, mismatched = 0;
  for (const [key, text] of base) {
    if (!cat.has(key)) { missing++; fail(`${code}: missing ${key}`); }
    else if (placeholders(cat.get(key)) !== placeholders(text)) { mismatched++; fail(`${code}: placeholders of ${key} differ ({${placeholders(text)}} × {${placeholders(cat.get(key))}})`); }
  }
  for (const key of cat.keys()) if (!base.has(key)) { extra++; fail(`${code}: key not in ${i18n.BASE}: ${key}`); }
  console.log(`  ${missing + extra + mismatched ? 'FAIL' : 'ok  '} ${code} (${name}): ${cat.size} texts`);
}

console.log('\nKeys used in the code');
{
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  const files = walk(path.join(ROOT, 'src')).filter((f) => f.endsWith('.js') && !f.includes(path.join('src', 'i18n')));
  const used = new Map(); // key → first file
  const use = (key, file) => { if (!used.has(key)) used.set(key, path.relative(ROOT, file)); };
  const isKey = (s) => /^[A-Za-z]\w*(\.[\w()]+)+$/.test(s);
  // string literals inside the argument list of each call to fn (balanced parentheses)
  function callArgs(src, fn) {
    const out = [];
    const re = new RegExp(`(^|[^\\w.])${fn}\\(`, 'g');
    let m;
    while ((m = re.exec(src))) {
      let i = m.index + m[0].length, depth = 1;
      const start = i;
      for (; i < src.length && depth; i++) {
        const c = src[i];
        if (c === '(') depth++; else if (c === ')') depth--;
        else if (c === "'" || c === '"' || c === '`') { const q = c; for (i++; i < src.length && src[i] !== q; i++) if (src[i] === '\\') i++; }
      }
      const args = src.slice(start, i - 1);
      // literals that are whole keys (a literal followed by + is a prefix, built at run time)
      for (const lit of args.matchAll(/'([^'\n]*)'(?!\s*\+)/g)) if (isKey(lit[1])) out.push(lit[1]);
    }
    return out;
  }
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const key of callArgs(src, 't')) use(key, file);
    // tx('…') in a file whose tx adds a prefix: its first argument is the rest of the key
    const tx = src.match(/const tx = \(key, params\) => t\('([^']+)' \+ key, params\);/);
    if (tx) for (const m of src.matchAll(/(^|[^\w.])tx\('([^'\n]*)'(?!\s*\+)/g)) use(tx[1] + m[2], file);
    const need = src.match(/const need = \(k\) => miss\.push\(t\('([^']+)' \+ k\)\);/);
    if (need) for (const m of src.matchAll(/need\('([^']+)'\)/g)) use(need[1] + m[1], file);
  }
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const m of html.matchAll(/data-i18n(?:-[\w-]+)?="([^"]+)"/g)) use(m[1], path.join(ROOT, 'index.html'));
  let bad = 0;
  for (const [key, file] of used) if (!base.has(key)) { bad++; fail(`${file}: unknown key ${key}`); }
  console.log(`  ${bad ? 'FAIL' : 'ok  '} ${used.size} literal keys checked`);
}

console.log('\nPipe catalogues');
{
  const D = PumpIt.data;
  let bad = 0;
  for (const kind of D.PIPE_KINDS) {
    const c = D.pipeCatalog(kind);
    const keys = [`core.data.pipes.materials.${kind}`, `inspector.pipe.materials.${kind}`,
      `core.data.pipes.size.${c.system}`, `core.data.pipes.nominal.${c.system}`, `inspector.pipe.sizes.${c.system}`,
      `core.data.pipes.series.${c.seriesKind}`, `inspector.pipe.series.${c.seriesKind}`];
    if (c.grades) keys.push('core.data.pipes.pn', ...Object.keys(c.grades).map((g) => `core.data.pipes.grades.${g}`));
    for (const key of keys) if (!base.has(key)) { bad++; fail(`pipe catalogue ${kind}: missing ${key}`); }
  }
  console.log(`  ${bad ? 'FAIL' : 'ok  '} ${D.PIPE_KINDS.length} catalogues with their texts`);
}

console.log('\nExamples in every language');
for (const { code } of i18n.languages()) {
  const warnings = [];
  const log = Object.assign(Object.create(console), { warn: (...a) => warnings.push(a.join(' ')) });
  const P = loadCore(code, log);
  const M = P.model, S = P.solver;
  const texts = [];
  for (const ex of P.examples.EXAMPLES) {
    const m = ex.build();
    texts.push(ex.name, m.title, ...m.junctions.map((j) => j.name), ...m.scenarios.list.flatMap((s) => [s.name, s.notes]));
    for (const s of m.scenarios.list) {
      const eff = M.effective(m, s.id);
      const v = M.validate(eff);
      texts.push(...v.items.map((it) => it.label));
      const r = S.run(eff);
      texts.push(...(r.errors || []), ...(r.warnings || []).map((w) => w.text));
      if (r.ok) texts.push(...Object.values(r.valves).map((x) => x.state), ...Object.values(r.pipes).map((x) => x.regime));
    }
  }
  // an incomplete model: checklist texts
  const bad = M.newModel();
  bad.junctions.push(M.newJunction('pump', 1, 0, 0), M.newJunction('exitvalve', 2, 0, 0), M.newJunction('spray', 3, 0, 0));
  bad.pipes.push(M.newPipe(1, 1, 2));
  const v = M.validate(M.effective(bad, 'base'));
  texts.push(...v.items.flatMap((it) => [it.label, it.detail || '']), ...[...v.undef.values()].flat());
  for (const tx of P.junctionTypes.list()) texts.push(tx.label);
  const unfilled = texts.filter((s) => /\{\w+\}/.test(String(s)));
  if (warnings.length) fail(`${code}: ${warnings.join('; ')}`);
  if (unfilled.length) fail(`${code}: unfilled placeholders: ${unfilled.slice(0, 3).join(' | ')}`);
  console.log(`  ${warnings.length || unfilled.length ? 'FAIL' : 'ok  '} ${code}: ${texts.length} texts produced`);
}

console.log('\nHelp');
{
  // the tokens of the help bodies point to things that exist: labels ([[t:key]]), sections ([[go:chapter.section]]),
  // formulas ([[eq:id]]), examples ([[act:example:id]]) and areas of the screen ([[show:area]]); the formulas have their
  // words in every language, and every step of the guided tour has its texts
  const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const helpSrc = read('src/ui/help/help.js'), tourSrc = read('src/ui/help/tour.js');
  const chapters = [...helpSrc.match(/const CHAPTERS = \[([\s\S]*?)\];/)[1].matchAll(/\['(\w+)', \[([^\]]*)\]\]/g)]
    .map((m) => [m[1], [...m[2].matchAll(/'(\w+)'/g)].map((x) => x[1])]);
  const sections = new Set(chapters.flatMap(([ch, secs]) => secs.map((s) => `${ch}.${s}`)));
  const areas = new Set([...tourSrc.match(/const AREAS = \{([\s\S]*?)\};/)[1].matchAll(/(\w+):/g)].map((m) => m[1]));
  const steps = [...tourSrc.match(/const STEPS = \[([^\]]*)\]/)[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
  const vm = require('vm');
  const ectx = vm.createContext({ PumpIt: { ui: {} } });
  vm.runInContext(read('src/ui/help/equations.js'), ectx);
  const E = ectx.PumpIt.ui.helpEquations;
  let bad = 0, n = 0;
  const err = (msg) => { bad++; fail(msg); };
  const AUTHOR = 'Rafael Perktold';
  for (const { code } of i18n.languages()) {
    const cat = i18n.catalog(code);
    for (const id of sections) {
      const [ch, s] = id.split('.');
      const body = cat.get(`help.chapters.${ch}.sections.${s}.body`);
      if (!cat.has(`help.chapters.${ch}.title`) || !cat.has(`help.chapters.${ch}.sections.${s}.title`) || body === undefined) { err(`${code}: help section ${id} without its texts`); continue; }
      for (const m of body.matchAll(/\[\[(\w+):([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
        n++;
        const [, kind, arg] = m;
        if (kind === 't' && !base.has(arg)) err(`${code}: ${id}: unknown label ${arg}`);
        if (kind === 'go' && !sections.has(arg)) err(`${code}: ${id}: link to a missing section ${arg}`);
        if (kind === 'eq') { const f = E.formula(arg, code); if (f === undefined) err(`${code}: ${id}: unknown formula ${arg}`); else if (/«\w+»/.test(f)) err(`${code}: ${id}: formula ${arg} with a word missing`); }
        if (kind === 'show' && !areas.has(arg)) err(`${code}: ${id}: unknown area ${arg}`);
        if (kind === 'act' && arg.startsWith('example:') && !PumpIt.examples.get(arg.slice(8))) err(`${code}: ${id}: unknown example ${arg}`);
        if (kind === 'icon' && !PumpIt.junctionTypes.get(arg)) err(`${code}: ${id}: unknown junction type ${arg}`);
      }
    }
    for (const st of steps) if (!cat.has(`help.tour.steps.${st}.title`) || !cat.has(`help.tour.steps.${st}.body`)) err(`${code}: tour step ${st} without its texts`);
    // the About section credits the person who conceived the app, in every language, and shows the legal notices that
    // the licence asks of a program with a user interface; NOTICE makes every copy keep the credit (AGPL section 7(b))
    const about = String(cat.get('help.chapters.about.sections.about.body'));
    if (!new RegExp(`<p class="credit">[^<]*<b>${AUTHOR}</b>`).test(about)) err(`${code}: the About section lost the credit to ${AUTHOR}`);
    for (const s of [`Copyright © 2026 ${AUTHOR}`, 'GNU Affero General Public License', 'NOTICE', 'LICENSE']) if (!about.includes(s)) err(`${code}: the About section lost its legal notice (${s})`);
  }
  console.log(`  ${bad ? 'FAIL' : 'ok  '} ${sections.size} sections, ${n} tokens and ${steps.length} tour steps checked in every language`);
}

console.log(problems ? `\n${problems} problem(s)` : '\nAll languages consistent');
process.exit(problems ? 1 : 0);
