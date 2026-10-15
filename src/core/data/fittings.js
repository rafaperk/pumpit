// Pipe fittings — Crane TP-410: K = n·f_T (n = K/f_T) or a constant K. The names come from the language
// catalogs (core.data.fittings.<id>); a fitting added to a pipe keeps its id, so it is shown in the current language.
(function (root) {
  const PumpIt = root.PumpIt;
  const i18n = PumpIt.i18n;

  const fitting = (id, model, value) => ({ get name() { return i18n.t('core.data.fittings.' + id); }, model, value, id });

  const FITTINGS = [
    fitting('elbow90', 'KfT', 30),
    fitting('elbow45', 'KfT', 16),
    fitting('returnBend', 'KfT', 50),
    fitting('flangedBend', 'KfT', 14),
    fitting('teeRun', 'KfT', 20),
    fitting('teeBranch', 'KfT', 60),
    fitting('gateValve', 'KfT', 8),
    fitting('globeValve', 'KfT', 340),
    fitting('angleValve', 'KfT', 150),
    fitting('ballValve', 'KfT', 3),
    fitting('butterflyValve', 'KfT', 45),
    fitting('plugValve', 'KfT', 18),
    fitting('swingCheck', 'KfT', 100),
    fitting('footValve', 'KfT', 75),
    fitting('sharpEntrance', 'K', 0.5),
    fitting('inwardEntrance', 'K', 0.78),
    fitting('roundedEntrance', 'K', 0.04),
    fitting('pipeExit', 'K', 1.0),
  ];

  // a fitting given directly by its K
  const customFitting = () => ({ name: i18n.t('core.data.fittings.custom'), model: 'K', value: 1, qty: 1, id: 'custom' });

  // name of a fitting stored in a pipe: by its id, or by recognising a library name in any language (older models)
  function fittingName(it) {
    if (it.id && i18n.has('core.data.fittings.' + it.id)) return i18n.t('core.data.fittings.' + it.id);
    const key = it.name ? i18n.keyOfText('core.data.fittings.', it.name) : null;
    return key ? i18n.t(key) : it.name;
  }

  PumpIt.data = Object.assign(PumpIt.data || {}, { FITTINGS, customFitting, fittingName });
})(typeof window !== 'undefined' ? window : globalThis);
