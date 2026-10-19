# Pump It

Web simulator of steady-state pipe networks for liquids (incompressible flow) and gases (compressible flow). The user draws the network (pipes and junctions) and fills in the properties. The calculation runs again automatically after every change. Results appear in tables, charts, a data card per object (right click) and on the drawing itself.

The product uses no trademarks, names, icons, texts or screens of any commercial software. The interface is available in Portuguese, English and Spanish (selector at the top right), in a light and a dark mode (the sun and moon button next to it); the code and its documentation are in English.

## How to use

- **Open:** double-click `index.html` (it works straight from disk, with no server and no installation). Fonts come from Google Fonts when online; offline, the browser uses system fonts.
- **Tests:** `npm test` (Node 18 or newer) runs the calculation core checks (`tests/run-tests.js`, also run by `node tests/motor.test.cjs`), the compressible mode checks (`tests/gas.test.cjs`), the language consistency check (`tests/check-i18n.js`, which also checks the references inside the help) and the checks of the 3D views geometry and of the drawing/calculation contract (`tests/view3d.test.cjs`).
- **Help:** the Help menu (or F1) opens the guide to the whole app, the guided tour of the screen and the technical reference of the calculation, for liquids and for gases.
- **Validation against stored reference results:** `node tests/validate-fth.js "<folder with .fth files>"` (see Verification).

Workflow (interface names in English; the Portuguese and Spanish screens have the same layout):

1. Drag a junction type from the palette onto the drawing (or click the type and then the drawing).
2. **Pipe** tool, key `P`: click a junction and then another one. The reference direction goes from the first to the second. Clicking empty space creates a branch node. A new pipe copies length, material, section and friction from the selected pipe (or else from the last one created); the first pipe of a model gets 100 m. The drawn length never counts.
3. Select an object to edit it in the inspector on the right. Whatever is still missing for it to be defined appears in red; an *i* in a circle next to a field shows its note when the mouse rests on it. The arrow on the left edge of the inspector collapses it to give the drawing more room. The fluid, the environment and the solution control are in the *System properties* window: the regime stamp at the top, *Edit → System properties…*, or the button of the inspector with nothing selected.
4. When the checklist is complete, the indicator at the top changes to **Calculated** and the results appear. There is no Run button: every change recalculates the current scenario.
5. See **Results** (pipes, junctions, pumps, valves, warnings), **Charts** (pump × system and profile), the right-click card, or pick a quantity in "Results on the drawing".

Shortcuts and selection:

| Action | How |
| --- | --- |
| Copy and paste | `Ctrl+C` and `Ctrl+V` (copies the selected junctions, the end junctions of the selected pipes and the pipes between them; each paste is shifted) |
| Select several | `Ctrl+click` or `Shift+click`; `Shift+drag` on empty space selects by area; `Ctrl+A` selects all |
| Move as a group | drag any selected junction |
| Data of an object | right click: flow, velocity, head loss, pressures, pump head, elevation, length etc. |
| Undo and redo | `Ctrl+Z` and `Ctrl+Y` |
| Delete | `Del` |
| Cancel the tool | `Esc` |
| Zoom and view | mouse wheel; drag the background |

Isometric and 3D views (see [docs/3D-VIEWS.md](docs/3D-VIEWS.md)): *Schematic · Isometric · 3D* at the top left of the drawing, or the keys 1, 2 and 3. The three views show one geometry: the schematic is the plan and the height of every junction is its elevation, so moving a junction in one view moves it in the others, and moving it up or down in a 3D view changes its elevation. Pipes are drawn as tubes, along the axes unless drawn freely in the 3D view, nearer ones over farther ones, with shadows on the floor; junctions are small shaded solids (tank, pump, valves, nozzle…) that lie along their pipes and turn with the camera. Both views draw and edit: in the isometric view junctions go on the grid and pipes follow route candidates along the axes; in the free 3D view pipes go in any direction (Shift up and down, Ctrl along an axis) and bends can be moved, inserted and deleted. *Help → Keyboard shortcuts…* lists the keys of every view. No length ever comes from the drawing. Phones are not supported.

Default units: flow in m³/h, length and elevation in m, pressure in kgf/cm²(g), temperature in °C. Diameters and roughness are typed in mm. Each field keeps the unit it was typed in, and each result column can switch units without recalculating.

## Compressible mode (gas)

Pump It also calculates networks of a gas (see [docs/decisoes-gas.md](docs/decisoes-gas.md) and the Help, chapters *Gas (compressible mode)* and *Technical reference for gases*).

- **Regime:** the *System properties* window starts with *Incompressible (liquid)* or *Compressible (gas)*. Each regime keeps its own fluid, so switching loses nothing. The stamp next to the model title always shows the regime in use (for a gas: the thermal model and the gas); a click on it opens that window.
- **Gas:** air, nitrogen, oxygen, methane, natural gas (approximate), CO₂ and hydrogen from a small library (viscosity by Sutherland's law), or a custom gas with its molar mass, k and viscosity; the compressibility factor Z and the temperature are always given. Design limits for the warnings: Mach (0.7) and velocity (30 m/s).
- **Thermal model:** isothermal (constant temperature; junctions carry static pressures, the classic gas network method) or adiabatic (no heat exchange; stagnation pressures, the stagnation temperature kept along every pipe and mixed at the nodes; each source may have its own temperature).
- **Physics:** ideal gas with Z, the closed isothermal form for horizontal pipes and a finite-volume march (with gravity and finer steps near the sonic point) for the rest, Fanno for valves and fittings, isentropic entrances and nozzles, choking at M = 1/√k (isothermal) or 1 (adiabatic), the critical flow of an orifice's hole. The network is solved by Newton on the node pressures until every mass balance closes within 10⁻⁸.
- **Flows:** mass (kg/s, kg/h…), volume at the local conditions (m³/h…) or normal volume (Nm³/h at 0 °C and 101.325 kPa).
- **Compressor:** in the compressible mode a pump is a compressor or a blower: fixed pressure ratio, head curve (isentropic head against the suction flow), fixed flow or speed control; the polytropic efficiency gives the discharge temperature and the power to the gas.
- **Results:** mass flow, volume flows (local and normal), velocity and Mach number at both ends, static and stagnation pressures and temperatures, density, choking; mass flow and Mach on the drawing; pressure profiles drawn point by point inside each pipe. The app also says when a light fluid in the incompressible mode should be compressible, or when a gas is slow enough for the incompressible mode.
- **Examples:** *Compressed air line (gas)*, with an adiabatic scenario, and *Compressed air plant (gas)*, with a compressor, a pressure-reducing valve, consumers in Nm³/h and a choked blow-off nozzle.

## Languages

The selector at the top right switches the whole interface between **Português**, **English** and **Español** at once: menus, panels, tables, charts, warnings and the checklist, without reloading the page. The choice is remembered by the browser; on the first visit the app follows the browser's language (Portuguese when it is none of the three).

- Numbers follow the language: decimal comma in Portuguese and Spanish, decimal point in English. Typed numbers are accepted with either separator.
- Unit symbols stay the same, except water column, shown as mH₂O in English.
- Names typed by the user (model title, objects, scenarios) are never translated. The example models are built in the current language; an example still untouched is rebuilt when the language changes.
- Library fittings keep an id in the model, so their names are always shown in the current language.

Adding a language is a matter of copying a folder of message catalogs; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#interface-languages).

## Pipe results and Excel export

The **Results › Pipes** table shows, in this order: pipe, nominal size, schedule, start and end elevation (m), flow (m³/h), velocity (m/s), stagnation pressure at the inlet and at the outlet (kgf/cm²(g)) and K (sum of the pipe's fitting K values, on the pipe area).

- **Export to Excel** creates an `.xlsx` file with these columns in the same order: formatted header, numbers stored as numeric values with fixed decimals, row 1 frozen and a filter. The writer is our own and depends on no external library. Headers and sheet name follow the interface language.
- **Copy for Excel** copies the same table to paste straight into a spreadsheet (with the decimal separator of the interface language).
- On the published page, the download goes through the viewer's confirmation; from the local file it is an ordinary download.

## Velocity colour scale

In "Results on the drawing › Velocity", the colour of each pipe follows a fixed scale for water, not the minimum and maximum of the model. The same colour therefore means the same band in any network. The right-click card and the inspector show the band next to the velocity.

| Velocity (m/s) | Colour | Band | Basis |
| --- | --- | --- | --- |
| below 0.6 | blue | below the usual minimum | self-cleansing minimum of 0.6–0.7 m/s, to avoid sedimentation |
| 0.6 to 1.0 | blue → teal | low | pipe probably oversized for the flow |
| 1.0 to 1.5 | teal → green | economic range, low side | studies of economic velocity in pumping mains: 0.62–2.65 m/s |
| 1.5 to 2.5 | green | economic range | pumping practice of 1–3 m/s; general service of 1.2–3.0 m/s (Crane TP-410) |
| 2.5 to 3.0 | green → yellow | high | 3 m/s is the usual upper limit for water |
| 3.0 to 5.0 | yellow → orange → red | very high | erosion in carbon steel from ~4.6 m/s (15 ft/s); higher risk of water hammer |
| above 5.0 | black | off the scale | |

The values are design references, not code limits. The economic velocity of each installation depends on the energy cost, the operating hours, the static head and the material. The bands live in `src/core/data/water-velocity.js` (`WATER_VELOCITY`) and can be adjusted there.

Sources consulted:
- Caldas et al. (2016), economic velocity in pumping mains (galvanized steel 0.88–2.65 m/s; PVC 0.68–2.54 m/s): <https://periodicos.ufv.br/reveng/article/download/538/369/2945>
- Perroni et al. (2011), cited in UFPel proceedings (galvanized steel 0.67–1.63 m/s; PVC 0.62–1.97 m/s; 0.49–3.11 m/s measured in 40 stations): <https://anais-siiepe.ufpel.edu.br/2015/CA_02884.pdf>
- Suction and discharge design ranges, Crane TP-410 and the erosion limit in carbon steel (technical discussions): <https://www.eng-tips.com/viewthread.cfm?qid=425625>, <https://resources.skill-lync.com/branches/chemical-engineering/questions/fluid-mechanics-chem/pipe-sizing-velocity>
- Minimum of ~0.7 m/s against sedimentation and maximums of 5–8 ft/s in building distribution: <https://engineerexcel.com/water-velocity-in-pipe/>

## Project structure

The code is split into small blocks so that several people can work on it at the same time without touching the same files. Every file is a classic script (no build step) that attaches its module to the global `PumpIt` namespace; `index.html` lists them in load order and is the single source of that order (the Node tests read the core list from it). See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the block diagram and the extension points, and [CONTRIBUTING.md](CONTRIBUTING.md) for the working rules.

```
index.html                 page layout and the ordered list of scripts and stylesheets
src/i18n/                  interface languages: the i18n engine and one folder of message catalogs per language
  pt-BR/ en/ es/           one catalog per block (core, junctions, examples, app, network, inspector...)
src/core/                  calculation core, no DOM (runs in Node)
  units.js                 units; SI inside the core, conversion only at input and output
  fluids/                  fluid library (water from public correlations), the gases of the compressible mode, evaluation
  data/                    ASME B36.10M steel pipe, typical roughness, Crane fittings, water velocity bands
  hydraulics/              friction (original Colebrook, Hazen-Williams), curve fitting, orifice K
  model/                   model schema and factories, scenarios, checklist (validation), drawing-only fields
  solver/                  network building, connectivity, Newton, device states, results, system curve
  gas/                     compressible mode: reference physics (gas.js), link relations, gas network, Newton, results
  junctions/               junction type registry + one file per type (defaults, checks, equations, results)
  examples/                example builder + one file per example model
  view3d/                  geometry of the 3D views: camera, navigation, grids, pipe routes, symbols, plan and elevation, free editing, solids
src/ui/                    browser interface
  common/                  formatting, DOM helpers, dialogs, the bubble of the notes, downloads, .xlsx writer
  junctions/               junction type views + one file per type (symbol, 3D solid, form, summaries, result rows)
  app/                     application state and commands (PumpIt.app), keyboard, start-up
  topbar/                  menus, header status, scenarios, checklist, language selector, light and dark mode
  inspector/               field builders, one file per panel (system, pipe, junction, curves...) and the system window
  network/                 drawing area, SVG drawing, colour scales, palette, right-click card
  view3d/                  isometric and 3D views: scene, commands, editing (isometric and free), solids, drawing and quick frames, navigation, controls, inspector sections
  model-data/              model data view
  results/                 results view, result columns, TSV and Excel export
  charts/                  line chart, pump × system and profile charts
  styles/                  one stylesheet per block, loaded in cascade order (tokens first, responsive last)
tests/load-core.js         loads the core (and the catalogs) into Node in the order listed by index.html
tests/run-tests.js         verification against independent solutions (also `tests/motor.test.cjs`)
tests/gas.test.cjs         compressible mode: the physics and the calculation of gas networks
tests/check-i18n.js        every language has every text; every key used in the code exists
tests/validate-fth.js      validation against stored reference results (specification section 10)
tests/view3d.test.cjs      geometry of the 3D views; a drawing never changes a result
docs/ARCHITECTURE.md       blocks, data flow and how to extend the app
docs/3D-VIEWS.md           3D views: progress, where each part lives, decisions
docs/decisoes-gas.md       compressible mode: progress, where each part lives, decisions
CONTRIBUTING.md            conventions and how to work in parallel
```

## What is implemented

Reference: the clean-room specification (`Clean Room.md`), sections 0 to 8.

| Area | Implemented |
| --- | --- |
| Drawing | Palette, pipes with a reference direction, moving (also as a group), multiple selection, copy and paste, delete, reverse direction, change the junction type keeping the compatible data, grid with snapping, zoom, pan, fit to screen, undo and redo; isometric and free 3D views of the same model, with the elevation as height (drawing and editing in both) |
| Calculation | Automatic after every change and when switching scenarios; the checklist shows what is missing |
| Scenarios | Scenario tree; a child stores only what differs from its parent; editing with the inherited value relinks to the parent; marker on changed fields; table of differences |
| Fluid | Water (Kell 1975, Vogel, IAPWS-IF97 region 4) or the user's ρ, μ and Pv; in the compressible mode, a library gas or a custom one (MW, k, Z, μ, T) |
| Gas (compressible mode) | Isothermal and adiabatic models; closed isothermal form, march and Fanno; choking; static and stagnation pressures and temperatures, Mach number; compressor and blower; flows in Nm³/h; advice on the choice of regime |
| Pipes | ASME B36.10M steel (Sch 40, 80, STD, XS) as the default, or a given diameter; circular, annulus, rectangular and non-circular sections; fouling; N parallel pipes; closed pipe |
| Friction | Absolute or relative roughness, smooth, given f, Hazen-Williams, frictionless; Colebrook in its original form (1.14 and 9.35); laminar 64/Re; linear transition between Re 2300 and 4000 |
| Fittings | List with quantity; constant K or K/f<sub>T</sub> (Crane); laminar correction ATKF, improved ATKF or none |
| Junctions | Reservoir, assigned pressure, assigned flow, nozzle/sprinkler, branch, pump, valve (K, Cv, Kv), control valve (PRV, PSV, FCV, PDCV), **exit valve** (elevation and residual outlet pressure, with an optional loss by K, Cv or Kv), orifice, generic component (K or a ΔP × Q curve) |
| Pumps | H × Q curve by least squares or interpolation; affinity laws; pumps in parallel; variable speed controlling flow or pressure; efficiency, power, NPSH. In **fixed flow (sizing)** mode the pump reports the required head and the panel asks for no curve, efficiency or NPSH |
| Output | Summary, boundaries, pipes (format above), junctions, pumps, valves and warnings in three levels (plus information); right-click card; values with units and colours on the drawing; pump × system; profile of HGL, EGL and elevation |
| Files | Save and open `.json`; copy and paste the model; export pipes to `.xlsx`; automatic saving in the browser |
| Languages | Portuguese, English and Spanish, switched live; numbers in the format of the language |
| Properties | Inspector on the right for the selection, collapsed by the arrow on its edge (remembered by the browser); the system properties in a window of their own; the notes of the fields behind an *i* that shows them on hover |
| Appearance | Light and dark mode, switched by the sun and moon button at the top right and remembered by the browser; without a choice, the mode of the system |

Removed on request: area change, bend, check valve, dead end and the design factors. Older models are converted when opened: a check valve becomes a valve, a bend or an area change becomes a generic component with a K, a dead end becomes a zero assigned flow. Bend and check-valve losses are still available as pipe fittings (Crane).

### Not in this version

The XTS, GSC, ANS and SSL modules, cost calculation, heat transfer and non-Newtonian fluids (specification sections 4, 5 and 9). Also left out: detailed tee/wye, relief valve, three-way valve, heat exchanger, ejector, weir, volume balance, intermediate elevations, design alerts, NFPA report and importing files from other programs.

## Clean-room record

**Sources used in the implementation:** the specification `Clean Room.md` and the public references of its Annex C. No executables, help files, `.dat` databases, screens or texts of the reference software were used. The compressible mode follows its own clean-room specification (public compressible flow physics only; see [docs/decisoes-gas.md](docs/decisoes-gas.md)).

**Validation:** the `.fth` model files installed on the user's computer were read only as an output answer key, as section 10 allows (layout of Annex A). None of these files was copied into the project, and the validator only reads them when it runs. Two values were inferred from that comparison of results (marked as *inferred*, following the rule of section 0):

| Item | What the comparison showed | Decision |
| --- | --- | --- |
| Hazen-Williams constant | In 6 models and more than 50 pipes, with diameters from 102 to 2591 mm and velocities from 0.06 to 3.6 m/s, the constant implied by V = k·C·R<sub>h</sub><sup>0.63</sup>·S<sup>0.54</sup> is always 0.848684 (SI). The classic exponents match; only the coefficient differs from 0.8492 | Adopted k = 0.848684. The HW deviation fell from up to 1.1·10⁻² to 2.5·10⁻⁵ |
| Laminar correction of the K values in the verification models | In laminar flow (Re ≈ 700 and 1100), the effective K computed from the stored pressures equals the turbulent K given. 143 of 145 files use the same option | Those models use "no correction". The app default remains improved ATKF, as the specification says |

**Engineering data and their primary sources:**

| Data | Source |
| --- | --- |
| Steel pipe dimensions | ASME B36.10M (nominal outside diameter and wall thickness) |
| K/f<sub>T</sub> of fittings | Crane, Technical Paper 410 |
| f<sub>T</sub> by diameter | Fully turbulent Colebrook with ε = 0.0018 in, at the actual inner diameter |
| Typical roughness | Moody (1944); White, *Fluid Mechanics*, table 6.1 |
| Orifice | Idelchik, *Handbook of Hydraulic Resistance* |
| Water density | Kell, G. S. (1975), *J. Chem. Eng. Data* 20(1) |
| Water viscosity | Vogel equation |
| Water vapour pressure | IAPWS-IF97, region 4 |
| Network method | Todini & Pilati (1988); Jeppson (1976) |

**Interface:** our own layout, symbols, texts and colours. The symbols follow the generic process flow diagram convention, drawn here in SVG. The solids of the 3D views are shapes of our own, built from cylinders, cones, boxes and spheres.

## Engineering decisions (open points of Annex B)

| Point | Decision |
| --- | --- |
| Initial guess | 1 m/s in every pipe in the reference direction; pressures at the mean of the references. Converges in 4 to 7 iterations in the examples |
| Adaptive relaxation | Line search halving the step on the scaled residual norm; near the solution the full step is always accepted. Convergence is measured on the full Newton step |
| Convergence criterion | Relative change ≤ tolerance (default 10⁻⁴) in two consecutive iterations, with an absolute floor for flows and pressures near zero |
| Hazen-Williams | Classic exponents with k = 0.848684 (inferred, see above) |
| Laminar-turbulent transition | Linear between f<sub>lam</sub>(Re<sub>lam</sub>) and f<sub>turb</sub>(Re<sub>turb</sub>) |
| Laminar correction of K (ATKF) | Factor max(1, f<sub>lam</sub>/f<sub>ref</sub>) below Re<sub>lam</sub>, interpolated to 1 at Re<sub>turb</sub> so the loss stays continuous |
| SG in Cv and Kv | Water at 60 °F (999.0 kg/m³) for Cv; 1000 kg/m³ for Kv and for the sprinkler K factor |
| Exit valve | P<sub>0</sub> at the pipe end = residual pressure + valve loss (K on the pipe area, or Cv/Kv). With K = 0, P<sub>0</sub> at the pipe end = residual |
| Orifice by Cd | K = (1 − β⁴)/Cd² referred to the velocity in the orifice |
| HGL and EGL | Computed with absolute pressure, as in section 0 |
| Pipe K in the results table | Sum of the pipe's fitting K values (constant K + n·f<sub>T</sub>), on the pipe area, without laminar correction |
| Scenarios | Topology common to all scenarios; scenarios override properties |

## Verification

`node tests/run-tests.js` runs its checks against independent solutions. Among them:

- single pipe: original Colebrook solved analytically, deviation < 10⁻⁷;
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

`node tests/validate-fth.js` compares with the results stored in the reference verification models. Boundaries: at reservoirs, assigned pressures and discharge valves, the stagnation pressure stored at the pipe end; everything else is calculated. The measure is the worst deviation of the case: flow relative to the largest flow, and stagnation pressure at the pipe ends relative to the largest pressure drop in a pipe. Result:

| Set | Cases compared | Median deviation | Maximum deviation | Section 10 criterion |
| --- | --- | --- | --- | --- |
| Darcy-Weisbach | 37 | 5.6·10⁻⁷ | 5.2·10⁻⁵ | ≤ 10⁻⁴: met |
| Hazen-Williams | 6 | 4.6·10⁻⁶ | 2.5·10⁻⁵ | ≤ 2·10⁻³: met |

The 39 verification models left out of the comparison are:
- pumps with another curve form (14);
- SSL and ANS modules (13);
- area change (5), removed from the app;
- control valves whose file layout is not documented (4);
- per-pipe K at branches (2);
- one model without results.

The examples folder has no comparable answer key: 23 files were saved without results and the others use the XTS, GSC, ANS or SSL modules.
