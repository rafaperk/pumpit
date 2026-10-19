// Junction type views: the interface side of each junction type. Every type registers one view here from its
// own file in src/ui/junctions/ (the calculation side lives in src/core/junctions/). Generic panels never test
// for a specific type; they read these properties and hooks instead.
//
// View contract (all optional except symbol and form):
//   symbol                      SVG markup in a 32×32 box centred on the origin, drawn with currentColor
//   orient                      'ports': the symbol turns from the inlet to the outlet neighbour (two-port types)
//                               'pipe': the symbol turns along its single pipe
//   solid                       symbol of the 3D views: { parts, reach, orient } made with PumpIt.view3d.solid
//                               (src/core/view3d/solids.js); orient overrides the one above in the 3D views
//   closed(j)                   the junction stops the flow: its 3D symbol turns red
//   elevationLabel              label of the elevation field (default: the common elevation label)
//   connectionElevation         the per-pipe loss table also edits each pipe's connection elevation
//   form(sec, ctx)              fills the inspector's data section; ctx = { key, j, f, gas } (f = field builders,
//                               gas = the model is in the compressible regime)
//   sections(ctx)               extra inspector sections after the data section (ctx also has curveEditor)
//   summary(j, q)               one-line summary in the model data table (q formats an input quantity)
//   infoInputs(j, add, inp, gas) input rows of the right-click card (gas: the model is in the compressible regime)
//   quickResults(row, r, c)     extra rows of the inspector's result section; c = { id, j, res, out, flow, gas }
//                               (flow(m): a mass flow as the regime shows it, volume for a liquid, mass for a gas)
//   infoResults(add, r, c)      result rows of the right-click card, replacing the common ones (false = keep them);
//                               c = { id, j, res, vr, out, flow, gas }
//   pressureRise                two-port: the inspector shows the pressure rise instead of the drop
//   boundaryFlow(r)             net flow into the network listed among the system boundaries (null = not listed)
(function (root) {
  const PumpIt = root.PumpIt;

  const views = new Map();
  const EMPTY = Object.freeze({});

  // keeps getters (texts read from the language catalogs on every use)
  function register(type, view) { views.set(type, Object.defineProperties({ type }, Object.getOwnPropertyDescriptors(view))); }
  const get = (type) => views.get(type) || EMPTY;

  // palette icon of a junction type
  const icon = (type, size = 26) => `<svg viewBox="-16 -16 32 32" width="${size}" height="${size}" aria-hidden="true">${get(type).symbol}</svg>`;

  // SVG attributes shared by the symbols
  const SVG = {
    stroke: 'stroke="currentColor" fill="none" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"',
    fill: 'fill="currentColor"',
  };

  PumpIt.ui.junctionTypes = { register, get, icon, SVG };
})(typeof window !== 'undefined' ? window : globalThis);
