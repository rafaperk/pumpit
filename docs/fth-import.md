# Import of .fth files

*File → Open* (or a file dropped on the window) reads a `.fth` model and turns one of its scenarios into a Pump It model. The reader is `src/core/import/fth.js` (`PumpIt.importers.fth`), with the parts it shares with the reader of `.aro` files in `src/core/import/shared.js`; the choice of the scenario and the report shown after the import are `src/ui/app/import-report.js`; the checks are `tests/fth-import.test.cjs`.

## Clean room

**F-01 Sources.** The importer follows only the descriptions of the format written by the specification team, and this repository:

- Annex A of the specification `Clean Room.md`, the first layout of the records (October 2026);
- the format description of 20 October 2026 (`formato-fth.md`), which completes it: scenarios, valves, control valves, open and closed states, pumps, nozzles, fluid and units. The specification team wrote it from data files only; it states that no program, help or installer was inspected.

The description came with a reference reader and synthetic tests written for another code base. They were read as part of the description. The importer of Pump It is its own code, written for the model of Pump It, and its tests adapt the same synthetic cases. No file of another program was opened during this work. The repository holds no `.fth` file: the tests write their files in code. The product names no other program: the menu says ".fth", the notes speak of "the program it came from", and the first line of a file is recognised by a hash of its program word (F-02).

## File

**F-02 First line.** The first line has the form "maker program VERSION n INPUT FILE". The version is read. A file whose program word is that of another program of the same family is refused with a message: a transient model saved with this extension, for example. The word is compared by a hash (FNV-1a), so that the code does not hold it. A file without such a line is read anyway.

**F-03 Text.** Windows-1252. Inside texts, the byte 0x15 stands for a comma, 0x16 for a line break and 0x14 separates subfields (read as a space).

**F-04 Sections and keys.** The sections are "[NAME]" lines. The sections of a scenario are named "NAME -- SCENARIO #n -- scenario name", or just "NAME -- SCENARIO #n", so that #1 is not taken for #10. A file without scenarios has the plain "NAME". Section names and keys are read in any case. Records are the lines that start with an integer and a comma.

**F-05 Values.** A key of the form "value,unit" has the unit in its last field. The rest, joined with a point, is the number, which reads a file saved with a decimal comma. In records, an empty field and the markers −9999 and −999999 mean "not given", and −9E+29 is an empty result. A record too short to reach the section of a pipe (b+16) or the special condition of a junction (b+24) is left out, with a note.

**F-06 Add-on modules and settings.** These settings make the program adjust or replace the input while it calculates:

- an add-on module switched on (a key "XYZ Use" other than 0);
- goal seek and control (variables applied in a three-letter control section);
- time simulation (AnalysisType 2);
- automatic sizing (OptimizationLevel above 0).

Their data are not imported, and each one has a note. With sizing, the stored results may belong to other diameters, so they are not used for the losses of F-21 and F-23.

## Units

**F-07 Units.** A value keeps the unit of the file when Pump It has it (feet, inches, gal/min, m³/h, kg/h, psig, bar(g), kPa(a)…). Any other unit becomes a near unit of Pump It: m³/h for volume flows, kg/s for mass flows, kPa for pressures, cP for viscosities.

- A gauge unit (barG, psig, "kPa (g)"…) is relative to the ambient pressure of the file, which becomes the atmospheric pressure of the system.
- Water columns ("m H2O std." and the like) use 1000 kg/m³ and standard gravity.
- "S.G. water" is relative to 62.375 lbm/ft³ (about 999.15 kg/m³).
- A curve given in head of liquid becomes a pressure through the density of the fluid.
- A unit that is not known leaves the value blank, with a note. The unit "None" leaves a value undefined: blank, with a note when the model needs the value.

## Scenarios

**F-08 One scenario.** The scenario manager lists the scenarios with their parent path and a description read by its length. When a file has more than one, the import first asks which one to bring in (the base scenario is chosen by default).

- The scenario is rebuilt from the base scenario through its chain of ancestors. Each child deletes records, adds whole ones and changes others field by field: an empty field inherits.
- A list with a count holds a new list (count n), keeps the n items of the parent and changes the filled ones (−n), or is left out (0).
- The fields after a list are realigned by the end of the list. The fields per pipe of a branch, reservoir or imposed pressure are realigned by their pipe. Each configuration of a pump has three lists of its own.
- The fluid data of the base are replaced by those of each child of the chain.

The scenario becomes the base scenario of a Pump It model, named after it, and the title takes its name. The scenarios of Pump It cannot add or delete objects, which the children of the file do, so the other scenarios are imported one at a time, by opening the file again.

## Pipes

**F-09 Record.** Field 5 counts the segments of the pipe, each a pair (length, elevation at its end). After the segments come one field, the count of drawing points and 3 fields per point; the block b starts after them. The length is the sum of the segments, and the outlet elevation is that of the last one. The intermediate elevations and the drawing points are not read.

**F-10 Special condition (b+38).** Condition 1 is a pipe closed by the user. Conditions 3 and 4 are pipes the program found stopped by a closed junction or isolated, saved with the scenario: they come in closed too, so that their flow stays at zero, with a note asking to open them again if the junctions that closed them are opened. A junction left without an open pipe on its path stops, as in the file: its imposed flow or source becomes zero, a fixed-flow pump turns off, and a control valve closes. Pump It would otherwise refuse a flow with no pressure reference.

**F-11 Missing length.** A pipe without a length that is frictionless or closed loses nothing by its length: it takes 1 mm. Any other one is left blank for the user.

**F-12 Section.** Geometry code 0 is circular, by the (hydraulic) diameter at b+5. Code 2 is a section given by its area (b+7) and wetted perimeter (b+9). Any other code is read by its area and perimeter when both are given, or else by the diameter, and reported.

**F-13 Friction (b+12).** Codes 0 (absolute roughness), 1 (relative roughness), 2 (smooth), 3 (Hazen-Williams C), 4 (Darcy f in every regime) and 7 (frictionless) are the models of Pump It of the same names. Any other code leaves the roughness blank, with a note.

**F-14 Fittings and design factor.** The sum of the K values of the fittings (b+20) becomes one item. A design factor other than 1 (b+22 of a pipe, b+15 of a junction) is not applied, since Pump It has none, and is reported.

## Junctions

**F-15 Record.** Field 5 counts the pipes of the junction, listed with a sign: − the pipe leaves the junction, + it arrives. The fields of the type are read from the pipes connected to the junction in the pipe records, and a list that differs is reported. The common block starts at b = 6 + np: the drawing position (b+0, b+1), the elevation (b+7, unit b+9) and the special condition (b+24: −1 does not apply, 0 none, 1 closed, 2 open without control). It ends with tables closed by the anchor −999, its first occurrence from b+46. The block of the type starts after it, at t. The state the program worked out (b+25) is not read.

**F-16 Branch (1).** The K of each connection (3 fields per pipe from t, the second one) uses the velocity of its own pipe in both directions. It goes into the per-pipe table of the junction, where Pump It reports the pressure of the pipe on the pipe side, as the file does. The source (t+3np+1, + enters the network) is the source of the branch. With one pipe, the branch is an imposed flow. A closed branch closes its pipes.

**F-17 Reservoir (2).** The liquid surface is at t+21+o and the surface pressure at t+7+o, with o = 5·(np − 1). Each pipe has 5 fields from t: the K of the flow entering the pipe, the K of the flow entering the reservoir, two fields that are not described, and the depth of the connection below the surface, in the unit at t+6+o (a probable reading). Each pipe connects at the elevation of its end, the confirmed reading:

- Pump It keeps that connection as a depth below the surface (`connBy: 'depth'`), in the unit of the level, so the reservoir shows how deep each pipe is. The reservoir switches to elevations without moving any connection.
- The depth kept in the file only checks it. When the two differ by more than 1 mm per metre of depth, the end of the pipe is used and the report gives both values. A pipe above the surface is not checked.
- Whether the file entered a connection as a depth or as an elevation is not described, so it is not read; a note per import says so.
- The bottom of the reservoir, the junction elevation of Pump It, is its lowest connection, never above the surface. The elevation of the junction in the file (b+7) usually is that of the surface, and it would read as a bottom at the surface.
- A pipe above the surface has a negative depth and discharges at the surface pressure, which Pump It already does.

So a reservoir with pipes at several depths or with several losses stays one reservoir. A surface that cannot be read takes the elevation of the junction, with a note; if neither can be read, the pipes connect by the elevations of their ends. The elevation of the junction only stands in for the surface and the bottom: when it is undefined or in an unknown unit, the report asks for it only if the reservoir is left without one of them.

**F-18 Imposed flow (3) and imposed pressure (4).**

- Imposed flow: the flow at t+1 (volume or mass, kept as such) and t+3 (1 leaves the network, 0 enters). A negative flow turns around. The K of the connection (t+6) changes only the pressure of the junction. Closed, the flow is zero.
- Imposed pressure: 3 fields per pipe (the K entering the pipe and the K entering the junction), then at t+3np the kind (1 static, 0 stagnation) and the pressure. A static pressure needs a single pipe and no losses at its connection: otherwise it becomes a stagnation pressure, or its losses are left out, with notes.

**F-19 Valve (8).** t+1 is the loss model: 1 K, 0 Cv, 3 a loss curve. The curve has its units at t+3 and t+5, its largest flow at t+6 and its coefficients counted at t+8. After them (u = t+9+nc) come the outlet pressure (u+1) and the K or Cv (u+7).

- Between two pipes, it is a valve, closed when the file says so. Cv follows the convention of Pump It (water at 999 kg/m³).
- On a single pipe, it is an exit valve to its outlet pressure, with the K or Cv of the valve; closed, a closed end.
- Any other loss model leaves K = 0, with a note.

**F-20 Control valve (9).** t+0 is the kind (2 flow, 0 pressure reducing, 3 pressure drop, 1 pressure sustaining) and t+3, t+4 the set point. The kinds 0, 1 and 3 are readings the specification team still has to confirm, and have a note. They become the control valves of Pump It (FCV, PRV, PDCV, PSV).

- A valve that cannot reach its set point opens fully, as the program does: always control off, opening on failure, open K = 0.
- The special conditions become the fixed states of Pump It: 1 closed, 2 open without control.
- A pressure set point is read as a static pressure, unless the stored results show the valve controlling a stagnation pressure: the pressure next to it falls on one basis or the other, within a quarter of the dynamic pressure.

**F-21 Loss curves.** A curve ΔP = Σ cᵢ·Qⁱ that is a pure square law becomes an exact K at the area of the inlet pipe. Between two pipes, another curve that starts from zero becomes a generic component with that curve. Points from zero to the largest flow of the curve (or twice the stored flow) are fitted with its degree, which gives the polynomial back. Otherwise, as for an exit valve or a nozzle, the K is taken at the stored flow, or at half of the largest flow of the curve (an approximation), with a note.

**F-22 Other components with a loss.**

- Bend (6) and area change (5): the K at t+3. The K of an area change is referred to the inlet pipe, as in Pump It.
- Orifice (12): its K at u+6 and its diameter at u+3 (u = t+9+nc).
- Heat exchanger (15) and generic component (20): the loss curve, as the valve. The heat transfer is not calculated.

They become generic components (an orifice, an orifice by its K). Closed, they become closed valves.

**F-23 Tee or wye (7).** t+3 = 2 is a simple tee, a node without losses. t+3 = 1 has detailed losses, which the program works out from correlations that Pump It does not have. They are taken from the stored results:

- the node takes the stagnation pressure of its only inflow (or only outflow);
- the loss of each path becomes a K at the end of its pipe, in the per-pipe table.

A path that gains pressure gets a negative K, which goes into the fittings of its pipe, within their K. The stored pressure of that end then moves to the junction side, where Pump It reports it, so that the comparison of F-31 holds. Without stored results, the tee has no losses of its own, with a note.

**F-24 Nozzle (16).** t+4 is the model: 1 a K factor, with Q = K·√ΔP; 3 a loss curve. The units of ΔP and flow are at t+6 and t+8 and the coefficients are counted at t+11. After them (v = t+12+nc) come the K factor (v+3) and the outlet pressure (v+5). The file applies ΔP = (Q/K)² to any fluid. Pump It refers a K factor to water (1000 kg/m³), so the K factor is multiplied by √(ρ/1000) to keep the same loss, with a note. A curve that is not a square law gives the K factor of the stored flow, or of half of its largest flow. A closed nozzle is a closed end.

**F-25 Pump (17).** t+0 is the mode: 0 curve, 1 fixed flow (t+2, t+3); other modes are not known. The head and flow units of the curve are at t+6 and t+8. The configurations (impellers or speeds) are counted at t+12 and the one in use is at t+11. Each configuration has its largest flow and the coefficients of head, NPSHR and efficiency. After them comes the relative speed (1 = 100 %), applied by the affinity laws.

- The curve of the configuration in use becomes 11 points from zero to its largest flow, fitted with its degree (above degree 4, 41 points with linear interpolation). A curve without a largest flow ends at zero head.
- The efficiency curve (%) is imported. The NPSHR curve is read in the unit of the head, with a note.
- A control by speed of kind 1 with a flow unit, about 10 fields after the speed, is a flow control of Pump It. Its place moves in the records of children, so it is searched in a short window. Other controls are not read: the pump runs on its curve, with a note.
- On a single pipe, a fixed flow is an imposed flow. With a curve, the missing end becomes an imposed pressure through a frictionless pipe of 1 mm. The pressure is the one the file gives after the configurations (a pressure, or a height of liquid), or the ambient pressure. New IDs follow the largest of the file.
- Closed, the pump is off without flow. An unknown mode without a curve leaves the flow blank.

**F-26 Other kinds.** Kinds without data in the description become a generic component with K = 0 between two pipes, with a note: check valve, venturi, screen and unknown codes. Otherwise they become a plain node (or a closed end on one pipe), with a note. The three-way valve, relief valve, ejector, volume balance and weir are among them.

**F-27 Elevations at a junction.** A junction of Pump It has one elevation (a reservoir excepted, F-17). When the end of a pipe is at another elevation, the junction elevation is used and the report names the junction.

## System

**F-28 Fluid.** The fluid comes from the keys of the fluid data, already evaluated by the program at its temperature: the name (Fluid 1), Density, Viscosity and Vapor Pressure. The vapour pressure may be gauge and negative; it becomes absolute.

- Without them, the average density and viscosity of the stored results are used; without those either, water at 20 °C, with a note asking for the fluid.
- Properties that vary with the temperature, a non-Newtonian or slurry model and several fluids are reported. Pump It calculates a Newtonian liquid with the constant properties of the keys.
- Gravity, the Reynolds numbers of the transition and the ambient pressure (F-07) come from the same section.
- The laminar correction code 0 means no correction (inferred, README "Clean-room record"); any other code keeps the default of Pump It and is reported.

## Stored results

**F-29 Stored results.** The pipe results of the imported scenario, always in US units: mass flow (lbm/s), stagnation pressure at the inlet and outlet (psia), density (lbm/ft³) and viscosity. They serve for the comparison of the report, the losses of F-21 and F-23, and the basis of F-20. `read(text, { calibrate: false })` keeps them out of the model (the tee without losses, curves at half of their largest flow).

## Drawing and report

**F-30 Drawing.** The coordinates of the junctions (b+0, b+1) are scaled so that neighbouring junctions sit about 160 units apart, snapped to the 20-unit grid and moved to a 100-unit margin; the axes of the screen (y downwards) are assumed. Two junctions on the same point of the grid are set one step apart. Without usable coordinates, the junctions go on a grid, with a note. A junction the import creates stands beside its pump.

**F-31 Report.** After the first calculation, the report compares it with the stored results by the measure of section 10 of the specification: the mass flow of each pipe relative to the largest stored flow, and the stagnation pressure at both ends relative to the largest stored pressure drop in a pipe. Below 0.1 % on both, it says that the results match. The notes follow, by level: what needs the user, what was assumed, what was left out and what was read.

**F-32 Opening.** *File → Open* accepts `.json`, `.fth` and `.aro` (docs/aro-import.md); a file dropped anywhere on the window opens the same way. A `.fth` file with several scenarios first shows them to choose from. Undo brings back the model that was open before.

## Known gaps

What the description leaves open, and how the importer treats it:

| Gap | Treatment |
|---|---|
| Correlations of the detailed tee | the stored point (F-23); without it, no losses |
| Whether a reservoir connection was entered as a depth or as an elevation; the two fields of each pipe before its depth | a depth below the surface, from the end of the pipe, with a note (F-17) |
| Kinds 0, 1 and 3 of the control valve; the basis of a pressure set point | read as such, with notes (F-20) |
| Heat transfer, variable properties, slurries, non-Newtonian fluids | constant Newtonian properties, with notes (F-28) |
| Design factors | not applied (F-14) |
| Valve loss model 10 and other unknown loss models | K = 0, with a note |
| Pump modes 2 and 3, controls other than flow | the curve, or the flow left blank (F-25) |
| NPSHR unit | that of the head, with a note (F-25) |
| Thermal data of the heat exchanger, three-way valve | not read (F-22, F-26) |
| Check valves, relief valves and the kinds not seen in files | K = 0 or a node (F-26) |
| Result columns after the ninth | not read |
| Writing .fth files | out of scope |

A gap is closed only by a new description from the specification team, never by studying files of other programs here (CONTRIBUTING, clean-room rules).
