// Junction type registry.
//
// Every junction type lives in its own file under src/core/junctions/ and registers one definition here;
// its interface side (symbol, inspector form, summaries, result rows) lives under src/ui/junctions/. Adding a
// type means adding those two files and their <script> tags in index.html — no other file has to change.
// Helpers shared by several types are in junctions/shared.js (PumpIt.junctionTypes.shared).
//
// Definition contract (core):
//   type, order                 id and display order (palette, type selector)
//   group                       palette group: 'boundary' | 'connection' | 'equipment' | 'valves' | 'losses'
//   label                       name shown in the UI; read from the language catalogs (junctions.<type>.label)
//   pipes: [min, max]           accepted number of connected pipes
//   multi                       true: one network node; false: an element between an inlet and an outlet node
//   directional                 two-port only: one pipe must arrive and the other leave
//   ref                         the junction can act as a pressure reference
//   defaults()                  → type-specific fields of a new junction
//   validate(j, miss, v)        pushes missing-input texts (from the catalogs); v = { fin, pos, curveOk, pipeCount, gas,
//                               gasP }: gas, the model is compressible; gasP(x, key), a pressure the gas takes must be
//                               above vacuum (key: the catalog name of the field)
//   pipeEndElevation(j, pk, si) optional; elevation (m) where a pipe connects (undefined = junction elevation)
//   buildNode(j, net, z)        multi: creates the node (and any discharge link) through the network builder
//   buildElement(j, lk, net)    two-port: fills the element link (loss function, modes, device behaviour)
//   nodeResults(j, jr, rc)      multi, optional: adds type-specific results (before HGL and isolation masking)
//   elementResults(j, jr, rc)   two-port, optional: adds pump/valve results and warnings
//   reverseFlowCaution          two-port: caution when the flow runs against the reference direction (default true)
//   gas                         compressible mode (src/core/gas/); without it the type is refused in that mode:
//     node(j, net, z)           multi: creates the node of the gas network (and any discharge link)
//     element(j, lk, net)       two-port: fills the element link of the gas network (relation, modes, device)
//     results(j, jr, rc)        optional: type-specific results in the compressible mode
//
// Network links may carry, for the solver stages:
//   phi(m), mref                pressure loss function and flow scale (mode 'loss')
//   mode, value                 'loss' | 'closed' | 'fixedFlow' | 'pDown' | 'pUp' | 'dP' and its set value
//   controlMode                 mode used while a control device is controlling
//   device                      state machine of a control device (see solver/devices.js)
//   Hof(Q)                      head curve; its shutoff head enters the pressure scale
//   m0                          initial mass flow of a discharge link
(function (root) {
  const PumpIt = root.PumpIt;

  const defs = new Map();
  let table = null;

  function register(def) {
    if (!def || !def.type) throw new Error('A junction type definition needs a "type".');
    if (!Object.getOwnPropertyDescriptor(def, 'label')) {
      Object.defineProperty(def, 'label', { get: () => PumpIt.i18n.t('junctions.' + def.type + '.label'), enumerable: true });
    }
    defs.set(def.type, def);
    table = null;
  }
  const get = (type) => defs.get(type);
  const list = () => [...defs.values()].sort((a, b) => a.order - b.order);

  // { type: definition } in display order — what the rest of the app reads as PumpIt.model.JT
  function asTable() {
    if (!table) {
      table = {};
      for (const d of list()) table[d.type] = d;
    }
    return table;
  }

  PumpIt.junctionTypes = { register, get, list, table: asTable };
})(typeof window !== 'undefined' ? window : globalThis);
