// Pump It global namespace.
//
// Every source file is a classic script (no build step, so the app opens straight from disk) wrapped in
// an IIFE that attaches its public API to PumpIt.<module>. The load order is defined once, in index.html;
// the Node test-suite reads the same script list from there (see tests/load-core.js).
(function (root) {
  root.PumpIt = root.PumpIt || {};
})(typeof window !== 'undefined' ? window : globalThis);
