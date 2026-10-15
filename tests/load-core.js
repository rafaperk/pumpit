// Loads the calculation core (with the language catalogs it reads its texts from) into a Node vm context and
// returns the PumpIt namespace. The script list and its order come from index.html (the single place where
// they are defined), so a new core or catalog file only has to be added there.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function coreScripts(indexFile = path.join(ROOT, 'index.html')) {
  const html = fs.readFileSync(indexFile, 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((src) => /^src\/(core|i18n)\//.test(src));
}

// lang: interface language of the messages (default: the base language, pt-BR); log: console to use
function loadCore(lang, log = console) {
  const ctx = vm.createContext({ console: log });
  for (const file of coreScripts()) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
  }
  if (lang) ctx.PumpIt.i18n.setLanguage(lang);
  return ctx.PumpIt;
}

module.exports = { ROOT, coreScripts, loadCore };
