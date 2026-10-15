// Consistency of the interface languages. Usage: node tests/check-i18n.js
//   1. every language has exactly the keys of the base language (pt-BR), with the same {placeholders};
//   2. every key written literally in the code (t('…'), tx('…') with its file prefix, need('…'), data-i18n
//      attributes in index.html) exists in the base language;
//   3. every example and scenario calculates in every language without missing texts or unfilled placeholders.
// Keys built at run time (for example 'junctions.' + type + '.label') are covered by points 1 and 3.
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
    const tx = src.match(/const tx = \(key, params\) => t\('([^']+)' \+ key, params\);/);
    if (tx) for (const k of callArgs(src, 'tx')) use(tx[1] + k, file);
    const need = src.match(/const need = \(k\) => miss\.push\(t\('([^']+)' \+ k\)\);/);
    if (need) for (const m of src.matchAll(/need\('([^']+)'\)/g)) use(need[1] + m[1], file);
  }
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const m of html.matchAll(/data-i18n(?:-[\w-]+)?="([^"]+)"/g)) use(m[1], path.join(ROOT, 'index.html'));
  let bad = 0;
  for (const [key, file] of used) if (!base.has(key)) { bad++; fail(`${file}: unknown key ${key}`); }
  console.log(`  ${bad ? 'FAIL' : 'ok  '} ${used.size} literal keys checked`);
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

console.log(problems ? `\n${problems} problem(s)` : '\nAll languages consistent');
process.exit(problems ? 1 : 0);
