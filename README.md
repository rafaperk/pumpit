# Pump It

Conceived by **Rafael Perktold**.

Web simulator of steady-state pipe networks for liquids (incompressible flow) and gases (compressible flow). The user draws the network (pipes and junctions) and fills in the properties. The calculation runs again automatically after every change. Results appear in tables, charts, a data card per object (right click) and on the drawing itself.

The product uses no trademarks, names, icons, texts or screens of any commercial software. The interface is available in Portuguese, English and Spanish (selector at the top right), in a light and a dark mode (the sun and moon button next to it); the code and its documentation are in English.

## How to use

- **Open:** double-click `index.html` (it works straight from disk, with no server and no installation). Fonts come from Google Fonts when online; offline, the browser uses system fonts.
- **Share:** `npm run build` (Node 18 or newer) runs the tests and, when they pass, writes `dist/PumpIt.html`, the whole app in one file with its fonts inside (IBM Plex, under the SIL Open Font License, whose text goes with them). Send that file: it opens with a double-click, offline too, with nothing to install. It never goes to the network: a Content-Security-Policy at its top makes the browser refuse every connection and run only its own scripts, and the build stops at a source that names a network API or a web address. `dist/PumpIt.sha256.txt` holds the SHA-256 of the file, for whoever receives it to check their copy.
- **Open a model:** *File → Open* reads a model saved as `.json`, or imports a `.fth` model of a liquid or a `.aro` model of a gas (see [Importing .fth files](#importing-fth-files) and [Importing .aro files](#importing-aro-files)). Dropping the file on the window does the same.
- **Tests:** `npm test` (Node 18 or newer) runs the calculation core checks (`tests/run-tests.js`, also run by `node tests/motor.test.cjs`), the compressible mode checks (`tests/gas.test.cjs`), the language consistency check (`tests/check-i18n.js`, which also checks the references inside the help), the checks of the 3D views geometry and of the drawing/calculation contract (`tests/view3d.test.cjs`), the checks of the `.fth` and `.aro` imports (`tests/fth-import.test.cjs`, `tests/aro-import.test.cjs`), the checks of the ends of pipes (`tests/pipe-ends.test.cjs`) and the checks of the result columns (`tests/result-columns.test.cjs`).
- **Help:** the Help menu (or F1) opens the guide to the whole app, the guided tour of the screen and the technical reference of the calculation, for liquids and for gases.
- **Validation against stored reference results:** `node tests/validate-fth.js "<folder with .fth files>"` (see Verification).

Workflow (interface names in English; the Portuguese and Spanish screens have the same layout):

1. Drag a junction type from the palette onto the drawing (or click the type and then the drawing). The arrow on the right edge of the palette collapses it to give the drawing more room.
2. **Pipe** tool, key `P`: click a junction and then another one. The reference direction goes from the first to the second. Clicking empty space creates a branch node. A new pipe copies length, material, section and friction from the selected pipe (or else from the last one created); the first pipe of a model gets 100 m. The drawn length never counts.
3. Select an object to edit it in the inspector on the right, which opens when something is selected and collapses when nothing is. Whatever is still missing for the object to be defined appears in red; an *i* in a circle next to a field shows its note when the mouse rests on it. The arrow on the left edge of the inspector also collapses it or brings it back, until the selection changes. The drawing stays put when the inspector opens or closes, unless the inspector would cover the object just selected. The fluid, the environment and the solution control are in the *System properties* window: the regime stamp at the top, *Edit → System properties…*, or the button of the inspector opened by its arrow with nothing selected.
4. When the checklist is complete, the indicator at the top changes to **Calculated** and the results appear. There is no Run button: every change recalculates the current scenario.
5. See **Results** (pipes, junctions, pumps, valves, warnings; the button with three columns at the head of a table chooses what it shows and in which units), **Charts** (pump × system and profile), the right-click card, or pick a quantity in "Results on the drawing".

Shortcuts and selection:

| Action | How |
| --- | --- |
| Copy and paste | `Ctrl+C` and `Ctrl+V` (copies the selected junctions, the end junctions of the selected pipes and the pipes between them; each paste is shifted) |
| Select several | `Ctrl+click` or `Shift+click`; `Shift+drag` on empty space selects by area; `Ctrl+A` selects all |
| Move as a group | drag any selected junction |
| Reconnect a pipe | select it and drag the handle at one end onto another junction, or to an empty spot to leave the end loose (a ring, which can be dragged onto a junction later); a right click offers *Disconnect from J…* on a pipe and *Disconnect pipes* on a junction, and the pipe panel chooses the junction of each end (see [docs/pipe-ends.md](docs/pipe-ends.md)) |
| Data of an object | right click: flow, velocity, head loss, pressures, pump head, elevation, length etc. |
| Undo and redo | `Ctrl+Z` and `Ctrl+Y` |
| Delete | `Del` |
| Cancel the tool | `Esc` |
| Zoom and view | mouse wheel; drag the background |
| Full screen | `F`, the last button of the zoom group or *Edit → Full screen*: only the drawing, the palette and the properties panel stay on screen, to model with more room; `F` or `Esc` brings the bars back |

3D view (see [docs/3D-VIEWS.md](docs/3D-VIEWS.md)): *Schematic · 3D* at the top left of the drawing, or the keys 1 and 2; the arrow beside 3D opens the menu of the view (turns, centring, grid, snapping, shadows, drop lines, working level) and closes it again. The view cube at the top right turns with the camera: a click on a face, an edge or a corner looks from that side (the top, the front, an isometric corner…) and a drag turns the camera. The *Options* menu, beside *File*, holds the grid density, the projection and the view cube. Both views show one geometry: the schematic is the plan and the height of every junction is its elevation, so moving a junction in one view moves it in the other, and moving it up or down in the 3D view changes its elevation. Pipes are drawn as tubes, along the axes unless drawn freely, nearer ones over farther ones, with shadows on the floor; junctions are small shaded solids (tank, pump, valves, nozzle…) that lie along their pipes and turn with the camera. Tubes and solids belong to the scene: they grow and shrink with the zoom, in the proportions of the schematic. The camera turns about what the middle of the screen shows, and in perspective the wheel zooms towards what lies under the cursor. The 3D view draws and edits: pipes go in any direction (Shift up and down, Ctrl along an axis) and bends can be moved, inserted and deleted, and the ends of pipes are dragged onto other junctions as in the schematic. *Help → Keyboard shortcuts…* lists the keys of every view. No length ever comes from the drawing. Phones are not supported.

Default units: flow in m³/h, length and elevation in m, pressure in kgf/cm²(g), temperature in °C. Diameters and roughness are typed in mm. Each field keeps the unit it was typed in, and each result column can switch units without recalculating.

## Compressible mode (gas)

Pump It also calculates networks of a gas (see [docs/gas-decisions.md](docs/gas-decisions.md) and the Help, chapters *Gas (compressible mode)* and *Technical reference for gases*).

- **Regime:** the *System properties* window starts with *Incompressible (liquid)* or *Compressible (gas)*. Each regime keeps its own fluid, so switching loses nothing. The stamp next to the model title always shows the regime in use (for a gas: the thermal model and the gas); a click on it opens that window.
- **Gas:** air, nitrogen, oxygen, methane, natural gas (approximate), CO₂ and hydrogen from a small library (viscosity by Sutherland's law), or a custom gas with its molar mass, k and viscosity; the compressibility factor Z and the temperature are always given. Design limits for the warnings: Mach (0.7) and velocity (30 m/s).
- **Thermal model:** isothermal (constant temperature; junctions carry static pressures, the classic gas network method) or adiabatic (no heat exchange; stagnation pressures, the stagnation temperature kept along every pipe and mixed at the nodes; each source may have its own temperature).
- **Physics:** ideal gas with Z, the closed isothermal form for horizontal pipes and a finite-volume march (with gravity and finer steps near the sonic point) for the rest, Fanno for valves and fittings, isentropic entrances and nozzles, choking at M = 1/√k (isothermal) or 1 (adiabatic), the critical flow of an orifice's hole. The network is solved by Newton on the node pressures until every mass balance closes within 10⁻⁸.
- **Flows:** mass (kg/s, kg/h…), volume at the local conditions (m³/h…) or normal volume (Nm³/h at 0 °C and 101.325 kPa).
- **Compressor:** in the compressible mode a pump is a compressor or a blower: fixed pressure ratio, head curve (isentropic head against the suction flow), fixed flow or speed control; the polytropic efficiency gives the discharge temperature and the power to the gas.
- **Results:** mass flow, volume flows (local and normal), velocity and Mach number at both ends, static and stagnation pressures and temperatures, density, choking; mass flow and Mach on the drawing; pressure profiles drawn point by point inside each pipe. The app also says when a light fluid in the incompressible mode should be compressible, or when a gas is slow enough for the incompressible mode.
- **Examples:** *Compressed air line (gas)*, with an adiabatic scenario, and *Compressed air plant (gas)*, with a compressor, a pressure-reducing valve, consumers in Nm³/h and a choked blow-off nozzle.

## Importing .fth files

*File → Open* also reads `.fth` model files, a text format of pipe network models. It follows the format descriptions of the specification team (Annex A of the specification and the description of 20 October 2026; decisions in [docs/fth-import.md](docs/fth-import.md)). A file with several scenarios first shows them to choose one; a child scenario is rebuilt from the base one. The base scenario may be empty, with the network only in its children: the scenarios without a network are shown but cannot be chosen. A file in which no scenario has pipes or junctions is refused, and the message lists its scenarios.

- **What comes in:**
  - pipes with their segments, section, friction model, fittings and closed state;
  - reservoirs (surface level and pressure; for each pipe, its entrance and exit K and its depth below the surface), imposed pressures and flows, branches with their source and the K of each connection;
  - valves by K, Cv or loss curve, open or closed, and exit valves with their outlet pressure;
  - control valves of flow, pressure reducing, pressure sustaining and pressure drop, with their set point and their fixed states;
  - pumps by the curve of the configuration in use, with speed, efficiency, NPSHR, fixed flow, flow control and on/off;
  - bends, area changes, orifices, nozzles by their K factor, generic components and heat exchangers (their loss only);
  - the fluid (density, viscosity and vapour pressure of the file), the ambient pressure (the reference of gauge units), units and drawing.
- **From the stored results:** the report compares the first calculation with them. The detailed losses of tees and wyes, which the program works out by correlations, become K values at the stored operating point.
- **Report:** what needs input, what was assumed (each reading of the format still to be confirmed has its note), what was left out and what was read.
- **Left out:** the data of add-on modules (time simulation, goal seek, sizing, slurries), heat transfer, design factors, and the components Pump It does not have (they become plain nodes, or components with K = 0).

## Importing .aro files

*File → Open* also reads `.aro` model files, the same family of text files for networks of a gas. It follows the format description of the specification team (version 1.1 of 20 October 2026; decisions in [docs/aro-import.md](docs/aro-import.md)) and shares with the `.fth` import the reading of sections, records, scenarios and units. The model comes in the compressible mode, with the scenario chosen as for `.fth` files.

- **What comes in:**
  - pipes with their segments, section (circular or rectangular), friction model (roughness, relative roughness, smooth, fixed f, Weymouth as a fixed f), fittings and closed state, and the thermal model: isothermal when every pipe is, adiabatic otherwise;
  - reservoirs (vessels of gas at their stagnation pressure and temperature), imposed pressures (static or stagnation) and flows with the temperature of their gas, branches with their source and the K of each connection;
  - valves by K, open or closed, exit valves with their outlet pressure, and control valves of flow, pressure reducing, pressure sustaining and pressure drop, with their set point, its basis and their fixed states;
  - compressors with a fixed flow, or with their curve of pressure rise turned into the head against the suction flow of Pump It;
  - the gas: molar mass, k from the specific heat and viscosity from the polynomials of the file, Z by the Pitzer–Abbott correlation; a mixture estimated from the properties of its components;
  - flows in mass, in local volume or in normal volume (standard volumes converted through the standard conditions of the file), the ambient pressure, units and drawing.
- **From the stored results:** the comparison of the report, the basis of a pressure set point, the suction state of a compressor curve and the temperature of a static pressure.
- **Left out:** heat transfer, the data of add-on modules (time simulation, goal seek), the loss curves of valves and the data of orifices and heat exchangers (K = 0, with a note), design factors, and the components Pump It does not have.

## Languages

The selector at the top right switches the whole interface between **Português**, **English** and **Español** at once: menus, panels, tables, charts, warnings and the checklist, without reloading the page. The choice is remembered by the browser; on the first visit the app follows the browser's language (English when it is none of the three).

- Numbers follow the language: decimal comma in Portuguese and Spanish, decimal point in English. Typed numbers are accepted with either separator.
- Unit symbols stay the same, except water column, shown as mH₂O in English.
- Names typed by the user (model title, objects, scenarios) are never translated. The example models are built in the current language; an example still untouched is rebuilt when the language changes.
- Library fittings keep an id in the model, so their names are always shown in the current language.

Adding a language is a matter of copying a folder of message catalogs; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#interface-languages).

## Result columns and Excel export

By default the **Results › Pipes** table shows, for a liquid and for a gas, in this order: pipe, nominal size, schedule or class (Sch. 40, SDR 11, K9), start and end elevation (m), flow (m³/h), velocity (m/s), stagnation pressure at the inlet and at the outlet (kgf/cm²(g)) and K (sum of the pipe's fitting K values, on the pipe area). For a gas, the flow is the one at the inlet and the velocity the higher of the two ends.

The button with three columns at the head of each table (pipes, junctions, pumps, valves) opens the column window:

- **Choosing outputs:** every output the table can show is on the left, grouped and with a filter, and the columns it shows are on the right. The user moves outputs across, sets the order and picks the unit of each column. About 55 outputs join the defaults for a liquid and 53 for a gas: mass flow, static and stagnation pressures, the losses by friction, fittings and ends, head loss and its gradient, HGL and EGL, Reynolds number, relative roughness, NPSH margin, best efficiency point, Kv, speed of sound, temperatures and more.
- **Saving:** a liquid and a gas have columns of their own. *Save* keeps them in the browser, for the next results and the next times Pump It opens. The unit list in each column header still changes the unit at once.
- **Profile:** the four tables of a fluid can be saved as a named template of the user's profile, and the profile can be exported to a file and imported in another browser.

The outputs, their formulas and the decisions are in [docs/result-outputs.md](docs/result-outputs.md).

- **Export to Excel**, on every table and in the File menu, creates one `.xlsx` file with a sheet for each table: the columns, order and units chosen, a formatted header, numbers stored as numeric values, row 1 frozen and a filter. The classic pipe columns keep their fixed decimals; other columns show five significant digits of their largest value. The writer is our own and depends on no external library. Headers and sheet names follow the interface language.
- **Copy for Excel** (pipes) and **Copy table** copy the table on screen to paste straight into a spreadsheet (with the decimal separator of the interface language).
- On the published page, the download goes through the viewer's confirmation; from the local file it is an ordinary download.

## Velocity colour scale

In "Results on the drawing › Velocity", the colour of each pipe follows a fixed scale for water, not the minimum and maximum of the model. The same colour therefore means the same band in any network. The right-click card and the inspector show the band next to the velocity.

The economic velocity is the one of the diameter with the lowest total cost over the life of the installation: a larger pipe costs more to buy and lay, a smaller one more in pumping energy, since the head loss grows with about the square of the velocity. The bands follow what reference books, standards and studies give for that optimum in water mains (revised on 29 October 2026):

| Velocity (m/s) | Colour | Band | Basis |
| --- | --- | --- | --- |
| below 0.6 | blue | below the usual minimum | minimum against deposits of 0.30 to 0.60 m/s by the quality of the water (Martins, 1976, in Tsutiya, 2006); 0.40 m/s in distribution networks (ABNT NBR 12218:2017). The scale keeps 0.6 m/s, the safe side |
| 0.6 to 0.9 | blue → green | low | below the economic optimum: the pipe is probably larger than it pays to be |
| 0.9 to 1.5 | green | economic range | Bresse's formula D = K·√Q with K from 0.9 to 1.2 in continuous pumping (Azevedo Netto) gives 0.9 to 1.6 m/s; 0.92 to 1.54 m/s computed by Zocoler et al. (2006); lowest cost at 3 to 4 ft/s (0.9 to 1.2 m/s) and water industry rule of 3 to 5 ft/s (0.9 to 1.5 m/s) (Pumps & Systems, 2025); 1.5 m/s for carbon steel (Chemical Engineering, 2018) |
| 1.5 to 2.0 | green → lime | above the economic range | still economic when the pump runs a few hours a day or the pipe is dear: the economic velocity rises as the operating time falls (Caldas et al., 2016: up to 2.5–2.6 m/s); Bresse with K = 0.8 gives 2.0 m/s; 2.7 m/s for stainless steel (Chemical Engineering, 2018) |
| 2.0 to 3.0 | lime → yellow | high | the energy lost in friction grows fast; 3.0 m/s is the usual technical and economic maximum of water mains (Tsutiya, 2006) |
| 3.0 to 5.0 | yellow → orange → red | very high | beyond that maximum: wear, noise and a stronger water hammer (the surge of a sudden stop grows with the velocity) |
| above 5.0 | black | off the scale | |

The values are design references, not code limits. The economic velocity of each installation depends on the energy cost, the operating hours, the static head, the material and the diameter: in distribution networks the head loss is kept to about 10 m/km, which gives lower velocities in small pipes (0.5 m/s in DN 50 to 1.8 m/s in DN 600; Martins, 1976, in Tsutiya, 2006). The bands live in `src/core/data/water-velocity.js` (`WATER_VELOCITY`) and can be adjusted there.

Sources consulted:
- Azevedo Netto, J. M. et al., *Manual de Hidráulica*, Blucher: Bresse's formula for continuous pumping, D = K·√Q with K from 0.8 to 1.3 (as given, from the 2010 edition, in the lecture notes of UFPel): <https://wp.ufpel.edu.br/hugoguedes/files/2019/10/Aula-5-Adutoras.pdf>
- Tsutiya, M. T., *Abastecimento de Água*, Escola Politécnica da USP, 2006: minimum velocities by the quality of the water (Martins, 1976), the technical and economic maximum of 3.0 m/s, the maximum velocities of distribution networks by diameter and the minimum of 0.40 m/s of NBR 12218:2017 (as given in the lecture notes of UFPR): <https://docs.ufpr.br/~rtkishi.dhs/TH028/TH028_06_Adutoras.pdf>, <https://docs.ufpr.br/~rtkishi.dhs/TH028/TH028_09_Rede.pdf>
- Zocoler, J. L.; Baggio Filho, F. C.; Oliveira, L. A. F.; Hernandez, F. B. T. (2006), "Model for determining flow diameter and economic velocity in water elevating systems", *Mathematical Problems in Engineering*, article 17263 (economic velocities of 0.92 to 1.54 m/s by the drive and the energy tariff): <https://doi.org/10.1155/MPE/2006/17263>
- Caldas et al. (2016), *Revista Engenharia na Agricultura* (UFV): galvanized steel 0.88–2.65 m/s, PVC 0.68–2.54 m/s; the economic velocity falls as the operating time and the static head grow: <https://periodicos.ufv.br/reveng/article/download/538/369/2945>
- Perroni et al. (2011), as cited in the proceedings of UFPel: galvanized steel 0.67–1.63 m/s, PVC 0.62–1.97 m/s: <https://anais-siiepe.ufpel.edu.br/2015/CA_02884.pdf>
- Anaya Durand, A.; Soto Estrada, J. A.; Cabrera Delgado, N. (2018), "Recommended fluid velocities in pipelines", *Chemical Engineering*: economic velocity of water 4.95 ft/s (1.5 m/s) in carbon steel and 8.88 ft/s (2.7 m/s) in stainless steel: <https://www.chemengonline.com/recommended-fluid-velocities-pipelines/>
- Despars, D. P. (2025), "Operating pump systems at best efficiency point", *Pumps & Systems*: lowest combined cost of pipe and pump energy at 3 to 4 ft/s; water industry rule of 3 to 5 ft/s: <https://www.pumpsandsystems.com/operating-pump-systems-best-efficiency-point>

## Project structure

The code is split into small blocks so that several people can work on it at the same time without touching the same files. Every file is a classic script (no build step) that attaches its module to the global `PumpIt` namespace; `index.html` lists them in load order and is the single source of that order (the Node tests read the core list from it). See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the block diagram and the extension points, and [CONTRIBUTING.md](CONTRIBUTING.md) for the working rules.

```
index.html                 page layout and the ordered list of scripts and stylesheets
src/i18n/                  interface languages: the i18n engine and one folder of message catalogs per language
  pt-BR/ en/ es/           one catalog per block (core, junctions, examples, app, network, inspector...)
src/core/                  calculation core, no DOM (runs in Node)
  units.js                 units; SI inside the core, conversion only at input and output
  fluids/                  fluid library (water from public correlations), the gases of the compressible mode, evaluation
  data/                    pipe catalogues (carbon and stainless steel, HDPE, ductile iron; one file each, registered in pipe-library.js), typical roughness, Crane fittings, water velocity bands
  hydraulics/              friction (original Colebrook, Hazen-Williams), curve fitting, orifice K
  model/                   model schema and factories, scenarios, checklist (validation), drawing-only fields
  solver/                  network building, connectivity, Newton, device states, results, system curve
  gas/                     compressible mode: reference physics (gas.js), link relations, gas network, Newton, results
  junctions/               junction type registry + one file per type (defaults, checks, equations, results)
  examples/                example builder + one file per example model
  import/                  import of model files of other formats, one per extension: .fth (liquids) and .aro (gases), with what the two share (sections, scenarios, units, the notes of the import, the comparison with stored results)
  view3d/                  geometry of the 3D views: camera, navigation, grids, pipe routes, symbols, plan and elevation, free editing, solids
src/ui/                    browser interface
  common/                  formatting, DOM helpers, dialogs, the bubble of the notes, downloads, .xlsx writer
  junctions/               junction type views + one file per type (symbol, 3D solid, form, summaries, result rows)
  app/                     application state and commands (PumpIt.app), files and the import report, keyboard, start-up
  topbar/                  menus (with the Options menu), header status, scenarios, checklist, language selector, light and dark mode
  inspector/               field builders, one file per panel (system, pipe, junction, curves...) and the system window
  network/                 drawing area, SVG drawing, colour scales, palette, right-click card, full screen
  view3d/                  3D view: scene, commands, editing, solids, drawing and quick frames, navigation, controls, view cube, inspector sections
  model-data/              model data view
  results/                 results view, the outputs of each table, the columns chosen and the column window, TSV and Excel export
  charts/                  line chart, pump × system and profile charts
  styles/                  one stylesheet per block, loaded in cascade order (tokens first, responsive last)
tests/load-core.js         loads the core (and the catalogs) into Node in the order listed by index.html
tests/run-tests.js         verification against independent solutions (also `tests/motor.test.cjs`)
tests/gas.test.cjs         compressible mode: the physics and the calculation of gas networks
tests/check-i18n.js        every language has every text; every key used in the code exists
tests/validate-fth.js      validation against stored reference results (specification section 10)
tests/view3d.test.cjs      geometry of the 3D views; a drawing never changes a result
tests/fth-import.test.cjs  import of .fth files, with synthetic files written by the test
tests/aro-import.test.cjs  import of .aro files, with synthetic files written by the test
tests/pipe-ends.test.cjs   the ends of pipes: freeing, connecting, loose ends in the checklist and the solvers
tests/result-columns.test.cjs  result outputs and their formulas, the columns kept in the browser, the .xlsx file
tools/build-standalone.cjs the single-file build (`npm run build`): `dist/PumpIt.html`, with the fonts inside and its security policy, and its SHA-256
tools/OFL-IBM-Plex.txt     licence of the IBM Plex fonts, copied into that file with them
docs/ARCHITECTURE.md       blocks, data flow and how to extend the app
docs/3D-VIEWS.md           3D views: progress, where each part lives, decisions
docs/pipe-ends.md          the ends of pipes: disconnecting, reconnecting and loose ends, decisions
docs/result-outputs.md     result outputs: what each table can show, the formulas, the column window, decisions (C-xx)
docs/gas-decisions.md      compressible mode: progress, where each part lives, decisions
docs/fth-import.md         import of .fth files: what is read, assumed and left out (decisions F-xx)
docs/aro-import.md         import of .aro files: what is read, assumed and left out (decisions A-xx)
docs/pipe-library.md       pipe catalogues: sources, rules and decisions (P-xx)
CONTRIBUTING.md            conventions and how to work in parallel
```

## What is implemented

Reference: the clean-room specification (`Clean Room.md`), sections 0 to 8.

| Area | Implemented |
| --- | --- |
| Drawing | Palette (collapsed by the arrow on its edge, remembered by the browser), pipes with a reference direction, moving (also as a group), multiple selection, copy and paste, delete, reverse direction, change the junction type keeping the compatible data, grid with snapping, zoom, pan, fit to screen, undo and redo; a 3D view of the same model, with the elevation as height (orbit camera, view cube; drawing and editing in it as well) |
| Calculation | Automatic after every change and when switching scenarios; the checklist shows what is missing |
| Scenarios | Scenario tree; a child stores only what differs from its parent; editing with the inherited value relinks to the parent; marker on changed fields; table of differences |
| Fluid | Water (Kell 1975, Vogel, IAPWS-IF97 region 4) or the user's ρ, μ and Pv; in the compressible mode, a library gas or a custom one (MW, k, Z, μ, T) |
| Gas (compressible mode) | Isothermal and adiabatic models; closed isothermal form, march and Fanno; choking; static and stagnation pressures and temperatures, Mach number; compressor and blower; flows in Nm³/h; advice on the choice of regime |
| Pipes | Catalogues of carbon steel (ASME B36.10M: Sch 40, 80, STD, XS; the default), stainless steel (ASME B36.19M: 5S, 10S, 40S, 80S), HDPE (ISO 4427-2 and NBR 15561: OD 20 to 1600 mm, SDR 41 to 7.4, PE 100 and PE 80) and ductile iron with cement mortar lining (NBR 7675 and ISO 2531: DN 80 to 1200, K7 and K9), each with the roughness of its material ([docs/pipe-library.md](docs/pipe-library.md)), or a given diameter; circular, annulus, rectangular and non-circular sections; fouling; N parallel pipes; closed pipe |
| Friction | Absolute or relative roughness, smooth, given f, Hazen-Williams, frictionless; Colebrook in its original form (1.14 and 9.35); laminar 64/Re; linear transition between Re 2300 and 4000 |
| Fittings | List with quantity; constant K or K/f<sub>T</sub> (Crane); laminar correction of K against the Crane f<sub>T</sub>, against the turbulent f of the pipe, or none |
| Junctions | Reservoir (each pipe connected at an elevation or at a depth below the liquid surface; its panel draws the tank cut through, with the bottom, the level and each connection), imposed pressure, imposed flow, nozzle/sprinkler, branch, pump, valve (K, Cv, Kv), control valve (PRV, PSV, FCV, PDCV), **exit valve** (elevation and residual outlet pressure, with an optional loss by K, Cv or Kv), orifice, generic component (K or a ΔP × Q curve) |
| Pumps | New pumps start in **fixed flow (sizing)** mode. H × Q curve by least squares or interpolation; affinity laws; pumps in parallel; variable speed controlling flow or pressure; efficiency, power, NPSH. In **fixed flow (sizing)** mode the pump reports the required head and the panel asks for no curve, efficiency or NPSH |
| Output | Summary, boundaries, pipes, junctions, pumps, valves and warnings in three levels (plus information); the columns of each table, their order and units chosen in a window, apart for liquids and gases, kept in the browser with named templates in a profile ([docs/result-outputs.md](docs/result-outputs.md)); right-click card; values with units and colours on the drawing; pump × system; profile of HGL, EGL and elevation |
| Files | Save and open `.json`; import `.fth` and `.aro` models (one scenario at a time, with a report); open a file dropped on the window; copy and paste the model; export the results to `.xlsx` (a sheet per table); export and import the profile of result columns; automatic saving in the browser |
| Languages | Portuguese, English and Spanish, switched live; numbers in the format of the language |
| Properties | Inspector on the right for the selection, open while something is selected and collapsed otherwise (the arrow on its edge also collapses it or brings it back); the system properties in a window of their own; the notes of the fields behind an *i* that shows them on hover |
| Appearance | Light and dark mode, switched by the sun and moon button at the top right and remembered by the browser; without a choice, the mode of the system |

Removed on request: area change, bend, check valve, dead end and the design factors. Older models are converted when opened: a check valve becomes a valve, a bend or an area change becomes a generic component with a K, a dead end becomes a zero imposed flow. Bend and check-valve losses are still available as pipe fittings (Crane).

### Not in this version

Time simulation, goal seek and control, automatic sizing and settling slurries, cost calculation, heat transfer and non-Newtonian fluids (specification sections 4, 5 and 9). Also left out: the correlations of the detailed tee/wye, relief valve, three-way valve, the heat transfer of heat exchangers, ejector, weir, volume balance, intermediate elevations, design alerts, NFPA report and the import of formats other than `.fth` and `.aro`.

## Clean-room record

**Sources used in the implementation:** the specification `Clean Room.md` and the public references of its Annex C. No executables, help files, `.dat` databases, screens or texts of the reference software were used. The compressible mode follows its own clean-room specification (public compressible flow physics only; see [docs/gas-decisions.md](docs/gas-decisions.md)). The import of `.fth` files follows only the format descriptions of the specification team (Annex A of the specification and the description of 20 October 2026, written from data files) and this repository: no file of another program was opened during that work, and its tests write synthetic files (see [docs/fth-import.md](docs/fth-import.md), F-01). The import of `.aro` files follows only the format description of the specification team (version 1.1 of 20 October 2026, written from data files) and this repository, in the same way: no `.aro` file was opened, and its tests write synthetic files (see [docs/aro-import.md](docs/aro-import.md), A-01).

**Validation:** the `.fth` model files installed on the user's computer were read only as an output answer key, as section 10 allows (layout of Annex A). None of these files was copied into the project, and the validator only reads them when it runs. Two values were inferred from that comparison of results (marked as *inferred*, following the rule of section 0):

| Item | What the comparison showed | Decision |
| --- | --- | --- |
| Hazen-Williams constant | In 6 models and more than 50 pipes, with diameters from 102 to 2591 mm and velocities from 0.06 to 3.6 m/s, the constant implied by V = k·C·R<sub>h</sub><sup>0.63</sup>·S<sup>0.54</sup> is always 0.848684 (SI). The classic exponents match; only the coefficient differs from 0.8492 | Adopted k = 0.848684. The HW deviation fell from up to 1.1·10⁻² to 2.5·10⁻⁵ |
| Laminar correction of the K values in the verification models | In laminar flow (Re ≈ 700 and 1100), the effective K computed from the stored pressures equals the turbulent K given. 143 of 145 files use the same option | Those models use "no correction" (code 0 of the file, which the importer reads as such). The app default remains the correction against the Crane f<sub>T</sub>, as the specification says |

**Engineering data and their primary sources:**

| Data | Source |
| --- | --- |
| Steel pipe dimensions | ASME B36.10M (nominal outside diameter and wall thickness) |
| Stainless steel pipe dimensions | ASME B36.19M-2018, as tabulated by the Hydraulic Institute (HI Data Tool, table 4.B.1) |
| HDPE pipe dimensions | ISO 4427-2 and ABNT NBR 15561 (outside diameters); ISO 4065 (minimum walls by SDR) |
| Ductile iron pipe dimensions | ABNT NBR 7675 and ISO 2531 (outside diameters, walls of the K classes); NBR 7675:2022 (cement mortar lining) |
| K/f<sub>T</sub> of fittings | Crane, Technical Paper 410 |
| f<sub>T</sub> by diameter | Fully turbulent Colebrook with ε = 0.0018 in, at the actual inner diameter |
| Typical roughness | Moody (1944); White, *Fluid Mechanics*, table 6.1; Hydraulic Institute, *Engineering Data Book* (stainless steel, plastics); Saint-Gobain PAM, cement mortar lining data (lined ductile iron) |
| Orifice | Idelchik, *Handbook of Hydraulic Resistance* |
| Water density | Kell, G. S. (1975), *J. Chem. Eng. Data* 20(1) |
| Water viscosity | Vogel equation |
| Water vapour pressure | IAPWS-IF97, region 4 |
| Network method | Todini & Pilati (1988); Jeppson (1976) |
| Gas mixtures of an imported file | Molar masses from the IUPAC standard atomic weights; specific heats of the ideal gas at 300 K: Çengel & Boles, *Thermodynamics: An Engineering Approach*, table A-2(a) (after Kyle), and the NIST Chemistry WebBook (isobutane, pentane, hydrogen sulfide, ammonia); viscosities at 300 K and 100 kPa: Huber & Harvey, "Viscosity of Gases", *CRC Handbook of Chemistry and Physics*, 92nd ed.; viscosity of a mixture: Herning & Zipperer (1936) |
| Compressibility of an imported gas | Virial correlation of Pitzer and Abbott: Smith, Van Ness & Abbott, *Introduction to Chemical Engineering Thermodynamics* |
| Weymouth friction of an imported pipe | f = 0.032/d^(1/3), d in inches, from the transmission factor of the Weymouth equation: Menon, *Gas Pipeline Hydraulics* |
| Bend without a K in an imported file | L/D of 90° pipe bends by r/D and the rule for several bends: Crane, Technical Paper 410 |

**Interface:** our own layout, symbols, texts and colours. The symbols follow the generic process flow diagram convention, drawn here in SVG. The solids of the 3D views are shapes of our own, built from cylinders, cones, boxes and spheres.

## Engineering decisions (open points of Annex B)

| Point | Decision |
| --- | --- |
| Initial guess | 1 m/s in every pipe in the reference direction; pressures at the mean of the references. Converges in 4 to 7 iterations in the examples |
| Adaptive relaxation | Line search halving the step on the scaled residual norm; near the solution the full step is always accepted. Convergence is measured on the full Newton step |
| Convergence criterion | Relative change ≤ tolerance (default 10⁻⁴) in two consecutive iterations, with an absolute floor for flows and pressures near zero |
| Hazen-Williams | Classic exponents with k = 0.848684 (inferred, see above) |
| Laminar-turbulent transition | Linear between f<sub>lam</sub>(Re<sub>lam</sub>) and f<sub>turb</sub>(Re<sub>turb</sub>) |
| Laminar correction of K | Factor max(1, f<sub>lam</sub>/f<sub>ref</sub>) below Re<sub>lam</sub>, interpolated to 1 at Re<sub>turb</sub> so the loss stays continuous |
| SG in Cv and Kv | Water at 60 °F (999.0 kg/m³) for Cv; 1000 kg/m³ for Kv and for the sprinkler K factor |
| Exit valve | P<sub>0</sub> at the pipe end = residual pressure + valve loss (K on the pipe area, or Cv/Kv). With K = 0, P<sub>0</sub> at the pipe end = residual |
| Orifice by Cd | K = (1 − β⁴)/Cd² referred to the velocity in the orifice |
| HGL and EGL | Computed with absolute pressure, as in section 0 |
| Pipe K in the results table | Sum of the pipe's fitting K values (constant K + n·f<sub>T</sub>), on the pipe area, without laminar correction |
| Inner diameter of a catalogue pipe | Outside diameter less two walls (and two linings) from the table of the standard, taken by the field rounded to 0.01 mm from its exact value: 8" Sch 80 and XS give 193.68 mm, where the code before the catalogues gave 193.67 through binary rounding ([docs/pipe-library.md](docs/pipe-library.md), P-05) |
| Scenarios | Topology common to all scenarios; scenarios override properties |

## Verification

`node tests/run-tests.js` runs its checks against independent solutions. Among them:

- single pipe: original Colebrook solved analytically, deviation < 10⁻⁷;
- reservoir connections: a depth below the surface equals the matching elevation, follows the surface when the level changes, and above the surface discharges in free fall;
- Hazen-Williams;
- pump operating point by bisection, also at 80 % speed;
- system curve;
- three reservoirs and looped network: continuity and energy;
- PRV holding 3 kgf/cm²(g) and opening at the peak;
- FCV;
- exit valve: exact residual and analytical flow with K = 0 and K = 2;
- fixed-flow pump without a curve;
- sprinkler;
- every example.

`node tests/gas.test.cjs` checks the compressible mode: the reference physics of its specification (air properties, the closed isothermal form, the march against it and against Fanno, choking, the incompressible limit, networks in series and branched) and the calculation of models — the compressed air example against an independent calculation, critical flows against the closed form and Fanno, a single adiabatic pipe against exact Fanno, the mixing of temperatures, nozzles, orifices, control valves and the compressor.

`node tests/fth-import.test.cjs` writes synthetic `.fth` files from the format descriptions and imports them. It checks every value read (units, fluid, pipes, each kind of junction, pumps and their configurations, open and closed states), the scenarios rebuilt from their parents (and a base scenario without a network), the losses taken from stored results, the depths of reservoir connections and their check against the file, the calculation against the same network built in Pump It (identical to 10⁻⁹), the energy balance of two reservoirs, the comparison with stored results, what is left blank, assumed or left out, the drawing positions, Windows-1252 names, the texts of every note and `tests/validate-fth.js` itself.

`node tests/aro-import.test.cjs` writes synthetic `.aro` files from the format description and imports them. It checks the units and the gas (the polynomials of a library, mixtures, Z), every kind of junction and its special conditions, the scenarios rebuilt from their parents (and a base scenario without a network), the calculation against the same network built in Pump It (identical to 10⁻⁹), the comparison with stored results, the basis of a pressure set point and the suction of a compressor read from them, a compressor curve that gives back the rise of the file, a textbook problem of Fanno flow, what is left blank, assumed or left out, and the texts of every note.

`node tests/result-columns.test.cjs` checks the result outputs ([docs/result-outputs.md](docs/result-outputs.md)):

- every output of every table, on every example and scenario;
- the formulas against the core:
  - friction, fittings and ends add up to the head loss;
  - the drop due to elevation;
  - EGL − HGL = V²/2g;
  - Kv against its definition;
  - the speed of sound against the Mach number;
  - the best efficiency point of fitted and interpolated curves, with the speed and the number of pumps;
- the default columns are those the tables always had, and a gas pipe has those of a liquid pipe;
- the columns kept in the preferences: the units of before, a unit chosen in a header, templates and the profile file;
- the `.xlsx` file with one sheet per table.

`node tests/validate-fth.js` compares with the results stored in the reference verification models. Boundaries: at reservoirs, imposed pressures and discharge valves, the stagnation pressure stored at the pipe end; everything else is calculated. The measure is the worst deviation of the case: flow relative to the largest flow, and stagnation pressure at the pipe ends relative to the largest pressure drop in a pipe. Result, measured on 15 October 2026:

| Set | Cases compared | Median deviation | Maximum deviation | Section 10 criterion |
| --- | --- | --- | --- | --- |
| Darcy-Weisbach | 37 | 5.6·10⁻⁷ | 5.2·10⁻⁵ | ≤ 10⁻⁴: met |
| Hazen-Williams | 6 | 4.6·10⁻⁶ | 2.5·10⁻⁵ | ≤ 2·10⁻³: met |

The 39 verification models left out of the comparison are:
- pumps with another curve form (14);
- add-on modules for slurries and for sizing (13);
- area change (5), removed from the app;
- control valves whose file layout is not documented (4);
- per-pipe K at branches (2);
- one model without results.

The examples folder has no comparable answer key: 23 files were saved without results and the others use add-on modules (time simulation, goal seek, sizing or slurries).
