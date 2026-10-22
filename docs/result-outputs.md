# Result outputs

Each results table (Pipes, Junctions, Pumps, Valves) can show many more outputs than its default columns. The user chooses which ones, in which order and in which unit, separately for a liquid and for a gas, and keeps the choice in the browser. Named templates of the four tables are kept in the user's *profile*, which can be taken to another browser as a file. The Excel export writes every table with the columns chosen.

The selection of outputs follows a list of result outputs written by the specification team (version 1, 21 October 2026). The list itself is not in the repository. Every output here is a public engineering quantity, worked out from Pump It's own results with the formulas below. The window and its texts are this project's own design, following the user's request: all outputs on the left, the shown ones on the right, a unit for each, saved for the next times.

## Where each part lives

| Part | File |
| --- | --- |
| The outputs of each table and regime, the default columns, the rows of the tables | `src/ui/results/catalog.js` (`PumpIt.ui.resultCatalog`; no DOM, loaded by the tests) |
| The columns chosen, the templates and the profile file | `src/ui/results/column-setup.js` (`PumpIt.ui.columnSetup`) |
| The column window | `src/ui/results/column-window.js` (`PumpIt.ui.columnWindow`) |
| Tables, cells and unit lists of the headers | `src/ui/results/columns.js`, `results.js` |
| Copy as text and the `.xlsx` file, one sheet per table | `src/ui/results/export.js`, `src/ui/common/xlsx.js` |
| Fields added to the results of the core | `eD` and `dPend` of a liquid pipe, `eD` of a gas pipe, `QBEP` and `bepPct` of a pump or compressor; `curveMax` in `src/core/hydraulics/curves.js` |
| Texts | `results.columns`, `results.gasColumns`, `results.groups` and `results.setup` in `src/i18n/<language>/results.js` |
| Checks | `tests/result-columns.test.cjs` |

## Using it

- The button with three columns at the head of each table opens the window, on that table and on the fluid of the open model (marked with a dot).
- On the left are the outputs the table can show and does not, in groups, with a filter. On the right are the columns it shows, in order, each with its unit list.
- A click selects an output, and several can be selected. *Add* and *Remove* move the selected ones across, and a double click moves one. The arrows move the selected columns up or down, and the cross of a row removes it.
- *Save* keeps every change in this browser, for the next results and the next times Pump It opens. *Cancel*, Esc or a click outside the window leave everything as it was.
- *Default of this table* brings back the default columns of the table on screen.
- The unit list in each column header of a table changes the same setting, and keeps the change at once.
- *Templates of your profile*:
  - *Save as template* keeps the four tables of the fluid on screen under a name.
  - *Apply* brings a template into the window.
  - *Delete* removes one.
  - *Export profile* writes the columns and the templates to a file, and *Import profile* reads such a file.
- *Export to Excel*, on every table and in the File menu, creates one `.xlsx` file with a sheet per table.

## Outputs

*Liquid* and *Gas* say in which regime the output is offered; *default* marks the columns shown before anything is chosen. Pressures are absolute inside the app and shown in the unit chosen, gauge or absolute. "In" and "out" follow the reference direction of the pipe.

### Pipes

| Output | Liquid | Gas | Value |
| --- | --- | --- | --- |
| Pipe | default | default | P and the id; always the first column |
| Name | ✓ | ✓ | the name of the pipe |
| Nominal size | default | default | of a catalogue pipe; otherwise the inner diameter |
| Schedule / class | default | default | of a catalogue pipe |
| Length, inner diameter, flow area | ✓ | ✓ | L, D<sub>h</sub> and A of the calculation (after the fouling), of one pipe |
| Internal volume | ✓ | ✓ | A·L·N, N parallel pipes |
| Start and end elevation | default | default | where the pipe connects |
| Flow | default | default (at the inlet) | volume flow; for a gas, at the local conditions of the inlet |
| Flow at the outlet | | ✓ | ṁ/ρ<sub>out</sub> |
| Mass flow | ✓ | ✓ | ṁ |
| Normal flow | | ✓ | ṁ/ρ<sub>N</sub> (0 °C, 101.325 kPa) |
| Velocity | default | default (the higher of the ends), ✓ (in and out) | for a gas, the higher velocity of the two ends (C-16) |
| Stagnation pressure in and out | default | default | P<sub>0</sub>, inside the pipe, after the loss of the end |
| Static pressure in and out | ✓ | ✓ | P = P<sub>0</sub> − ρV²/2 for a liquid |
| Highest and lowest static pressure | ✓ | ✓ | of the ends; for a gas also of the points of its profile (C-11) |
| Stagnation pressure drop | ✓ | ✓ | P<sub>0 in</sub> − P<sub>0 out</sub> |
| Static pressure drop | ✓ | ✓ | P<sub>in</sub> − P<sub>out</sub> |
| Drop due to elevation | ✓ | ✓ | ρ·g·(z<sub>out</sub> − z<sub>in</sub>); for a gas, the mean density of the ends |
| Friction loss, fitting loss | ✓ | ✓ | the terms of the loss; for a gas, the loss split in the ratio of f·L/D to ΣK (C-13) |
| Loss at the ends | ✓ | | the K of the junction at each end of the pipe |
| Head loss | ✓ | | h<sub>L</sub> = (friction + fittings + ends)/(ρg) |
| Head loss gradient | ✓ | | h<sub>L</sub>/L |
| Pressure loss per length | ✓ | ✓ | ρ·g·h<sub>L</sub>/L; for a gas, (friction + fittings)/L |
| HGL and EGL in and out | ✓ | | P/(ρg) + z and P<sub>0</sub>/(ρg) + z, with the absolute pressure (C-10) |
| Mach number in and out | | ✓ | |
| Speed of sound in and out | | ✓ | a = √(k·Z·R·T) at the static temperature |
| Choking | | ✓ | |
| Reynolds number, flow regime | ✓ | ✓ | regime: laminar below Re<sub>lam</sub>, turbulent above Re<sub>turb</sub> |
| Friction factor | ✓ | ✓ | Darcy |
| K | default | default | ΣK of the fittings, on the area of the pipe |
| Relative roughness | ✓ | ✓ | ε/D of the models with a roughness; none for Hazen-Williams, a given f or frictionless |
| Static and stagnation temperature in and out | | ✓ | |
| Density | ✓ | ✓ (in and out) | |
| Viscosity | ✓ | ✓ | of the fluid |

### Junctions

| Output | Liquid | Gas | Value |
| --- | --- | --- | --- |
| Junction, name, type | default | default | |
| Elevation | default | default | the liquid surface of a reservoir |
| Flow through, mass flow through | default (volume) | default (mass, local volume) | the larger of what comes in and what goes out |
| Normal flow | | ✓ | |
| Net flow into the network | ✓ (volume and mass) | ✓ (mass and normal volume) | as in *System boundaries* of the summary: positive when it enters at the junction; blank for a junction that is not a boundary (C-14) |
| Mass imbalance | | default | |
| Stagnation and static pressure in and out | default | default | |
| ΔP0 | default | default | of a component between two pipes or of a discharge |
| Static ΔP | ✓ | ✓ | P<sub>in</sub> − P<sub>out</sub>, of a component between two pipes |
| Head loss | ✓ | | ΔP<sub>0</sub>/(ρg) |
| HGL and EGL in and out | default (HGL in) | | as for the pipes |
| Effective K | default | ✓ | ΔP<sub>0</sub> over the dynamic pressure at the inlet |
| Choking | | ✓ | |
| Static and stagnation temperature in and out | | default (in) | |
| Density | | ✓ | |

### Pumps (compressors for a gas)

| Output | Liquid | Gas | Value |
| --- | --- | --- | --- |
| Pump, name | default | default | |
| State | ✓ | default | on, off with flow, off and closed |
| Flow | default | default (at the suction) | |
| Mass flow | ✓ | default | |
| Normal flow | | ✓ | |
| Suction and discharge pressures, stagnation and static | ✓ | ✓ | those of the junction of the pump |
| Head, ΔP | default | default (ΔP0) | the rise of the stagnation pressure |
| Static ΔP | ✓ | ✓ | P<sub>discharge</sub> − P<sub>suction</sub> |
| Pressure ratio, isentropic head | | default (ratio), ✓ | |
| Speed, efficiency | default | ✓ | for a compressor, the polytropic efficiency |
| Hydraulic and shaft power | default | | |
| Power to the gas | | default | |
| BEP flow, flow as % of BEP | ✓ | ✓ | C-09 |
| NPSH available and required | default | | |
| NPSH margin and ratio | ✓ | | NPSH<sub>A</sub> − NPSH<sub>R</sub> and NPSH<sub>A</sub>/NPSH<sub>R</sub> |
| T0 at the suction and at the discharge | | ✓, default (discharge) | |

### Valves

| Output | Liquid | Gas | Value |
| --- | --- | --- | --- |
| Valve, name, type, state | default | default | |
| Flow, mass flow | default (volume), ✓ | default | |
| Normal flow | | ✓ | |
| Static pressure in | default | default | |
| Static pressure out, stagnation pressure in and out | ✓ | ✓ | from the junction; out of an exit valve, the pressure outside |
| ΔP0 | default | default | |
| Static ΔP | ✓ | ✓ | |
| Head loss | ✓ | | ΔP<sub>0</sub>/(ρg) |
| Effective Cv | default | ✓ | |
| Effective Kv | ✓ | ✓ | 0.8645·C<sub>v</sub> (C-12) |
| Effective K | default | default | |
| Choking | | default | |

### Left out

- **Need data that Pump It does not have:**
  - intermediate elevations along a pipe, for the pressures between its ends (the route of the 3D view is drawing data);
  - the efficiency of the motor, for the power at the motor;
  - the characteristic of a valve, for its opening;
  - design limits per object, for warnings on them.
- **Need physics that Pump It does not have:**
  - heat transfer (heat rate, heat flux, coefficient);
  - the correction of a pump for viscous liquids and slurries;
  - sound power;
  - tanks whose volume changes in time.
- **Enthalpy of a gas.** It needs a reference state, which the app does not define. With the constant c<sub>p</sub> of the model it would be c<sub>p</sub>·T plus a constant.
- **Compressibility factor and ratio of specific heats at both ends.** They are constants of the gas model, shown in the summary.

## Decisions

**C-01. The defaults do not change.** The default columns of each table are the ones it had, in the same order. Their units are the same, and the classic pipe columns keep their fixed decimals. The gas pipe table is the exception (C-16).

Two headers were made clearer, since their pairs now exist:

- the junction table's *HGL* is *Inlet HGL*;
- for a gas, the junction temperatures say *in* (*Static T in*, *Stagnation T in*).

**C-02. Liquid and gas apart.** Each regime has its own columns and units (`prefs.outputs.liquid`, `prefs.outputs.gas`). The window opens on the regime of the open model, and can edit both before saving.

**C-03. The choice lives in the browser, not in the model.** It is a preference of the user, as the request said ("next times you use Pump It"). A model opened on another computer shows that computer's columns. A profile file carries them from one browser to another.

**C-04. Units.**

- Each column has its own unit, chosen in the window or in the header of the table. Both change the same setting.
- A change in the header is kept at once. A change in the window is kept only on *Save*.
- A unit chosen in the headers before the window existed (`prefs.colUnits`, keyed `<table>.<field>` for both regimes) becomes the unit of that column in the columns of each regime. The old key is removed.

**C-05. The first column stays.** The column that names the object (Pipe, Junction, Pump, Compressor, Valve) is always first and cannot be removed: a click on a row finds the object through it.

**C-06. The unit of a new column.**

- It is the unit of a column of the same quantity already in the table, so that a new pressure follows the pressures shown.
- Otherwise it is the default of its category, as elsewhere in the app.
- Default units of the new categories:
  - diameters in mm and areas in cm²;
  - volume in m³;
  - head loss gradient in m/100 m;
  - pressure loss per length in kgf/cm²/100 m.

**C-07. Templates and the profile.**

- A template is the four tables of one regime, under a name.
- Saving under a name in use for the same regime replaces it.
- Templates are kept at once, whether or not the window is saved.
- The profile file is JSON: `{ format: 'pumpit-profile', version: 1, outputs, templates }`.
- Importing it replaces the saved columns and adds its templates; a template of the same name and regime is replaced.
- A file of another kind is refused with a message.

**C-08. Excel.**

- One file holds a sheet for each table that has rows, named after the tabs in the language of the interface.
- Every sheet has the columns, order and units chosen for the screen.
- The classic pipe columns keep their fixed decimals and widths.
- Any other number column shows five significant digits of its largest value. The cells hold the numbers in full.
- The button is on every table and in the File menu, and both export every table.

**C-09. Best efficiency point.**

- The peak of the efficiency curve lies between its first and last points:
  - for an interpolated curve, it is the highest point given;
  - for a fitted curve, it is found by a search of 200 steps, refined by golden section and by Newton on the slope, to the precision of the numbers.
- The BEP flow is that peak taken to the operating point by the affinity laws: Q<sub>BEP</sub> = N·n·Q<sub>peak</sub>, with N pumps in parallel and n the speed of the operating point (the solved one for a pump that controls).
- A curve whose highest point is one of its ends gives no BEP, since the peak lies outside the data.
- For a compressor, the curve is the polytropic efficiency against the volume flow at the suction, treated the same way.

**C-10. Grade lines in absolute pressure.** HGL and EGL use the absolute pressure, as the HGL the junction table already had and the profile chart do. They include the head of the atmosphere, about 10.3 m of water.

**C-11. Highest and lowest static pressure.** A pipe has no elevations between its ends, so the static pressure of a liquid changes in a straight line and its extremes are at the ends. For a gas, the points of the profile of the pipe are included.

**C-12. Kv from Cv.** Kv = 0.8645·Cv: the same loss with Cv in gpm (ΔP in psi, water at 60 °F, 999 kg/m³) and Kv in m³/h (ΔP in bar, 1000 kg/m³). It holds for a gas too, whose Cv is the liquid relation at the area of the valve.

**C-13. Friction and fitting losses of a gas.** The march along a gas pipe does not separate them. The core splits the loss in the ratio of f·L/D to ΣK, an estimate, and the pressure loss per length uses their sum.

**C-14. Net flow into the network.** It has the sign of *System boundaries* in the summary: positive when the flow enters the network at the junction. It is blank for a junction that is not a boundary.

**C-15. The core only gains fields.** `eD`, `dPend`, `QBEP` and `bepPct` are outputs added to the results. No number the calculation already gave changes: every test keeps its output.

**C-16. A gas pipe starts with the columns of a liquid pipe.** At the user's request, the default columns of the gas pipe table are those of the liquid one, in the same order: nominal size, schedule, elevations, flow, velocity, stagnation pressures in and out, and K.

- The outputs a gas pipe shares with a liquid pipe have the same names. Only two say how they differ:
  - the flow is the volume flow at the inlet, at its local conditions;
  - the velocity is the highest one.
- The velocity of a gas changes along the pipe. The column is the higher velocity of the two ends: the one shown by the pipe panel and by the card on the drawing, and checked by the velocity warning. The velocity of each end stays in the list.
- These columns have the fixed decimals of the liquid ones, on screen and in Excel: two for the elevations, the flow, the velocity and K, three for the pressures. A round-off at zero shows as 0.000, not as a power of ten. For a low-pressure gas a smaller unit reads better: 20 mbar shows as 0.020 in kgf/cm² and as 2.000 in kPa.
- What the table showed before stays in the window: the mass and normal flows; the velocity, Mach number, static pressure, temperature and density of each end; the friction factor; the drop of P0; the choking mark.
- A gas pipe table already saved in a browser keeps its columns, and *Default of this table* brings the new ones.
