// DOM shortcuts shared by the interface modules.
(function (root) {
  const PumpIt = root.PumpIt;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // element with attributes (false/null/undefined are skipped, true becomes an empty attribute) and inner HTML
  function el(tag, attrs = {}, html = '') {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') e.className = v; else e.setAttribute(k, v === true ? '' : v);
    }
    if (html) e.innerHTML = html;
    return e;
  }

  PumpIt.ui.dom = { $, $$, el };
})(typeof window !== 'undefined' ? window : globalThis);
