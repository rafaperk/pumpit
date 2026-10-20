# Import of .fth files

*File → Open* (or a file dropped on the window) reads a `.fth` model and turns its base scenario into a Pump It model. The reader is `src/core/import/fth.js` (`PumpIt.importers.fth`); the report shown after the import is `src/ui/app/import-report.js`; the checks are `tests/fth-import.test.cjs`.

## Clean room

**F-01 Sources.** The importer follows only Annex A of the specification `Clean Room.md` (the layout of the format, written by the specification team) and this repository: the unit names already read by `tests/validate-fth.js` and the inferred meaning of the laminar correction code recorded in the README. Annex A itself foresees the importer, "only to bring in the user's own models", and Annex B asks for a best-effort import that reports what it leaves out. No file of another program was opened during this work. The tests write their own synthetic files from Annex A, in code, so the repository holds no `.fth` file. The product names no other program: the menu says ".fth", and the report speaks of "the program it came from".

## Scope

**F-02 Base scenario.** Only scenario #1 is read. The records of child scenarios are sparse and their layout is not decoded (Annex B). The names of the other scenarios, from the scenario manager section, go into the report.

**F-03 Add-on modules.** A flag of the application section of the form `XYZ Use= -1` (three capital letters) marks an add-on module in use. Its data are not read, and the report says so without naming the module. A model of a slurry or of a time simulation still comes in as its steady state with a plain liquid.

**F-04 Missing values and records.** An empty field and the markers −9999 and −999999 mean "not given". A value whose unit is not recognised is left blank: the checklist asks for it, and the report names the unit. A name with commas splits into extra fields; the reader joins them back while the fields after the name do not make sense (known length units and the count of drawing points for a pipe; the count of pipes, their IDs and the elevation unit for a junction). A record that still does not make sense is left out, as is a pipe whose end junction is not in the file.

## Pipes

**F-05 Section.** Geometry code 0 is circular, by the (hydraulic) diameter at b+5. Code 2 is a section given by its area (b+7) and wetted perimeter (b+9). Any other code is read by its area and perimeter when both are given, or else by the hydraulic diameter, and reported.

**F-06 Friction.** Codes 0 (absolute roughness), 1 (relative roughness), 2 (smooth), 3 (Hazen-Williams C), 4 (given f) and 7 (frictionless) map onto the models of Pump It. Codes 5, 6 and 10 have no counterpart: the roughness is left blank and the report asks for a model.

**F-07 Fittings.** The sum of the K values of the fittings (b+20) becomes one item, "Fittings of the imported file (sum of K)", with a constant K. The list of the fittings (b+21) is not read.

**F-08 Units.** Each value keeps the unit of the file when Pump It has it (feet, inches, gal/min, m³/h, psia, psig...); a unit Pump It does not list is converted to SI (m³/s, m). Pressure units carry a gauge or absolute mark (`psig`, `bar(g)`, `kPa a`, `kg/cm2g`...). A pressure unit without a mark (`bar`, `kPa`) is read as absolute, the usual convention of engineering programs, and reported. Pressures given as a head of liquid are not read.

## Junctions

**F-09 Reservoir.** Annex A does not place the liquid level, so the elevation of the junction (b+7) is taken as the level, and reported. A pipe whose end elevation differs from it gets its own connection elevation in the per-pipe table. With one pipe, the entrance K (b+69) is the K of the flow leaving the reservoir, and the surface pressure is read at b+76 and b+77. With more pipes those positions are not known: atmospheric surface pressure and no entrance losses, reported.

**F-10 Valve with one pipe.** A valve (code 8) at the end of a single pipe becomes an exit valve with the K of b+90. Annex A does not give its outlet pressure: the valve discharges to the atmosphere, and the report says so.

**F-11 K per pipe.** The K given for each pipe of a branch (the first field of each block of 3 from b+70) and the K of an imposed flow (b+75) go into the per-pipe loss table, with the same K for both directions of flow, and the report says so.

**F-12 Kinds without their data.** Area change, venturi, screen, heat exchanger and generic component become a generic component with its K blank; a check valve becomes a valve with its K blank (Pump It has no check valve); an orifice, an orifice given by a blank K; a control valve, a pressure-reducing valve with its set point blank; a spray nozzle, a nozzle with its K factor blank, discharging to the atmosphere. A tee or wye becomes a node without losses of its own. Relief valves, three-way valves, ejectors, volume balances, weirs and unknown codes become a plain node, or a closed end with one pipe. A junction whose number of pipes the matching type does not accept also becomes a plain node. Every case goes into the report, and the blank data into the checklist.

**F-13 Elevations of the pipe ends.** A junction of Pump It has one elevation (a reservoir excepted, F-09). When the ends of its pipes are at another elevation, the junction elevation is used and the report names the junction.

**F-14 Pump.** The curve H(Q) = a₀ + a₁Q + a₂Q² + … (count at b+92, coefficients from b+93, head unit at b+79, flow unit at b+81) becomes 11 points from zero flow to zero head, fitted with the polynomial of the same degree, so the curve is the same. Above degree 4, 41 points with linear interpolation. Without a zero of head, the points go to twice the stored flow through the pump. A curve in mass flow is turned into volume flow at the density of the stored results. Speed 100 %, one pump, no efficiency or NPSHR curve. A curve in another form is left empty, for the user, and reported.

## System and drawing

**F-15 System.** The fluid is a user fluid with the average density, viscosity and vapour pressure of the stored results (the pipe results of the base scenario); if they vary from pipe to pipe, the report says so. A file without results keeps water at 20 °C, and the report asks for the fluid. Gravity and the Reynolds numbers of the transition come from the fluid data. The laminar correction code 0 means no correction (inferred, README "Clean-room record"); any other code keeps the default of Pump It and is reported. The atmospheric pressure and the solution control are the defaults of Pump It.

**F-16 Drawing.** The coordinates of the junctions (b+0, b+1) are scaled so that neighbouring junctions sit about 160 units apart, snapped to the 20-unit grid of the drawing and moved to a 100-unit margin; the axes of the screen (y downwards) are assumed. Two junctions on the same point of the grid are set apart by one step. Without usable coordinates, the junctions go on a grid, with a note. The drawing points of the pipes are not read.

## Report

**F-17 Comparison.** After the first calculation, the report compares it with the results stored in the file, with the measure of section 10 of the specification: the mass flow of each pipe relative to the largest stored flow, and the stagnation pressure at both ends relative to the largest stored pressure drop in a pipe. Below 0.1 % on both, the report says that the results match. A difference points at what the import assumed (F-09, F-10) or left blank.

**F-18 Opening.** *File → Open* accepts `.json` and `.fth`; a file dropped anywhere on the window opens the same way. A `.fth` file is read as Windows-1252 text. Undo brings back the model that was open before.
