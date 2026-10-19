// Interface languages. Every text the user can read comes from a message catalog: one folder per language
// under src/i18n/ (en is the base language), one file per block of the app. Catalogs are nested objects
// flattened into dotted keys ('app.menu.file'); texts may hold {name} placeholders filled by t(key, params).
//
//   PumpIt.i18n.register(code, { name, numberLocale })   declares a language (its language.js)
//   PumpIt.i18n.add(code, { block: { key: 'text' } })   adds messages to a language
//   PumpIt.i18n.t(key, params)                            text in the current language (falls back to en)
//   PumpIt.i18n.setLanguage(code), language(), languages(), numberLocale(), onChange(fn)
//
// The core uses it too (checklist, warnings, example models), so results come out in the current language;
// the app recalculates when the language changes.
(function (root) {
  const PumpIt = (root.PumpIt = root.PumpIt || {});

  const BASE = 'en';
  const langs = new Map(); // code → { meta, messages: Map(key → text) }
  const listeners = [];
  const reported = new Set();
  let current = BASE;

  function entry(code) {
    if (!langs.has(code)) langs.set(code, { meta: null, messages: new Map() });
    return langs.get(code);
  }

  function register(code, meta) { entry(code).meta = Object.assign({ code }, meta); }

  function add(code, tree) {
    const messages = entry(code).messages;
    const walk = (node, prefix) => {
      for (const [k, v] of Object.entries(node)) {
        const key = prefix ? prefix + '.' + k : k;
        if (v && typeof v === 'object') walk(v, key); else messages.set(key, String(v));
      }
    };
    walk(tree, '');
  }

  // text of a key in a language, falling back to the base language (undefined when missing in both)
  function lookup(key, code = current) {
    const own = langs.get(code);
    if (own && own.messages.has(key)) return own.messages.get(key);
    const base = langs.get(BASE);
    return base ? base.messages.get(key) : undefined;
  }
  const has = (key) => lookup(key) !== undefined;

  function t(key, params) {
    let s = lookup(key);
    if (s === undefined) {
      if (!reported.has(key)) { reported.add(key); console.warn('[i18n] missing text: ' + key); }
      return key;
    }
    if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
    return s;
  }

  // key under a prefix whose text, in any language, is the given one (texts stored in older models)
  function keyOfText(prefix, text) {
    for (const { messages } of langs.values()) {
      for (const [k, v] of messages) if (v === text && k.startsWith(prefix)) return k;
    }
    return null;
  }

  function setLanguage(code) {
    current = langs.has(code) && langs.get(code).meta ? code : BASE;
    for (const fn of listeners) fn(current);
    return current;
  }
  const language = () => current;
  const languages = () => [...langs.values()].filter((l) => l.meta).map((l) => l.meta);
  // locale used to format numbers (decimal separator, grouping)
  const numberLocale = () => (langs.get(current) && langs.get(current).meta && langs.get(current).meta.numberLocale) || current;
  const onChange = (fn) => { listeners.push(fn); };

  // first supported language among the browser's preferred ones (exact code, then the same base language)
  function detect(preferred) {
    const codes = languages().map((l) => l.code);
    for (const p of preferred || []) {
      const hit = codes.find((c) => c.toLowerCase() === String(p).toLowerCase())
        || codes.find((c) => c.split('-')[0] === String(p).toLowerCase().split('-')[0]);
      if (hit) return hit;
    }
    return BASE;
  }

  // own messages of a language (no fallback), for the consistency checks
  const catalog = (code) => new Map(langs.has(code) ? langs.get(code).messages : []);

  PumpIt.i18n = { BASE, register, add, lookup, has, t, keyOfText, setLanguage, language, languages, numberLocale, onChange, detect, catalog, missing: () => [...reported] };
})(typeof window !== 'undefined' ? window : globalThis);
