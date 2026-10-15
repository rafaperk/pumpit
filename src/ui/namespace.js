// Namespace of the browser interface. Every file under src/ui/ attaches its module to PumpIt.ui.<name>;
// the application controller (state and commands shared by all panels) is PumpIt.app.
(function (root) {
  root.PumpIt.ui = root.PumpIt.ui || {};
})(typeof window !== 'undefined' ? window : globalThis);
