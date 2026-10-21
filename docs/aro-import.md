# Import of .aro files

*File → Open* (or a file dropped on the window) reads a `.aro` model, a network of a gas, and turns one of its scenarios into a Pump It model in the compressible mode. The reader is `src/core/import/aro.js` (`PumpIt.importers.aro`). It shares with the `.fth` reader what the two formats have in common, in `src/core/import/shared.js`: sections, records, scenarios, units, the notes of an import, the drawing positions and the comparison with stored results. The choice of the scenario and the report are those of `.fth` files (`src/ui/app/import-report.js`), and the checks are `tests/aro-import.test.cjs`.

## Clean room

**A-01 Sources.** The importer follows only the format description written by the specification team (`formato-aro.md`, version 1.1 of 20 October 2026) and this repository. The specification team wrote the description from data files only, and it states that no program, help or installer was inspected.

- The description came with a reference reader and synthetic tests written for another code base. They were read as part of the description.
- The importer of Pump It is its own code, written for the model of Pump It. Its tests adapt the same synthetic cases and add their own; the gas of their files has properties of its own.
- No `.aro` file was opened during this work, and the repository holds none (`*.aro` is in `.gitignore`).
- The product names no other program. The menu says ".aro", the notes speak of "the program it came from", and the first line of a file is recognised by a hash of its program word (A-02). The description names its fields after the codes of the format; the names of add-on modules are not used here.

## File

**A-02 First line.** The first line reads "[maker] program VERSION n INPUT FILE"; the maker word is optional, since some versions leave it out. The version is read.

- A file whose program word is the one of the liquid models of the family is refused, with a message asking to give it the `.fth` extension.
- A file of any other program of the family is refused too.
- The words are compared by their hashes (FNV-1a), so that the code does not hold them. A file without such a line is read anyway, as a `.fth` file is (F-02); the description itself refuses it.

**A-03 Text, sections, keys and values.** As for `.fth` files (F-03 to F-05), which the description confirms:

- Windows-1252 text. Inside texts, 0x15 stands for a comma, 0x16 for a line break and 0x14 separates subfields.
- Sections "NAME -- SCENARIO #n -- name", keys in any case, a decimal comma in a key of the form "value,unit".
- In records, an empty field and the markers −9999 and −999999 mean "not given".

**A-04 Settings that change the input.** Goal seek and control (variables applied in a three-letter control section) and a time simulation (AnalysisType 2) adjust or replace the input while the program calculates. Their data are not imported, and each one has a note. The stored results of such a file reflect the adjusted values, so the comparison of the report (A-26) may differ.

## Units

**A-05 Units.** The units are written out in full, as in `.fth` files, and the same tables read them (F-07): length, area, absolute and gauge pressures, pressure differences, temperatures, mass flows, volume flows and viscosities.

- A gauge unit is relative to the ambient pressure of the file, or of the scenario, which becomes the atmospheric pressure of the system.
- The specific heat of a gas comes in kJ/(kg·K), Btu/(lbm·°R), cal/(g·K) or ft·lbf/(lbm·°R).
- Gravity and the Reynolds numbers of the transition come from the fluid data.

**A-06 Flows of a gas.**

- Mass flows keep their unit, or become kg/s.
- Volumes at the local conditions keep their unit, or become m³/h. Pump It reads them at the conditions of the node, as the file does.
- Volumes at reference conditions (sm³/h, scfm, MMscfd, Nm³/h, Ncfm…) become normal volume flows of Pump It (Nm³/s, /min, /h or /d), whose 0 °C and 101.325 kPa are the normal conditions of the description (a hypothesis there). A standard volume is converted through the STP keys of the file, as an ideal gas: V_N = V_s·(P_s/101.325 kPa)·(273.15 K/T_s), with a note. Without those keys, 1 atm and 60 °F are assumed, with a note.

The mass flow of a normal volume is ρ_N·V_N with the molar mass of the gas (G-15), as the description computes it.

## Scenarios

**A-07 One scenario.** As for `.fth` files (F-08): the scenario chosen is rebuilt from the base scenario through its chain of ancestors. It becomes the base scenario of a Pump It model, named after it.

**A-08 Changes of a child.** The rules of the description are those of `.fth` files, and the same code applies them:

- empty fields inherit;
- lists with a count are new (n), kept and changed (−n) or left out (0);
- the fields per pipe of a branch, reservoir or imposed pressure are realigned by their pipe;
- the block of a junction type is realigned by the anchor;
- the counted coefficients of a valve, orifice and heat exchanger have their count at t+8;
- each configuration of a compressor has three counted lists.

**A-28 A base scenario without a network.** As for `.fth` files (F-33): a file whose base scenario is empty, with the network only in the scenarios derived from it, is read. The scenarios without a network are shown in the choice but cannot be chosen, the import of the others carries a note, and a file in which no scenario has a network is refused with a message. The description has the base scenario hold the whole network; such files have turned up, and the shared reader takes them.

## Pipes

**A-09 Record.** As for `.fth` files (F-09): the segments (length, elevation at the end), one field, the drawing points, and the block b after them.

**A-10 Ends.** A pipe whose end is not at a junction of the file is left out, with a note. The elevations of its ends are read: the inlet, and the end of the last segment (A-16).

**A-11 Special condition and length.**

- Condition 3 (b+38), stopped by a closed junction, comes in closed, as in F-10.
- Condition 1 is a closed pipe in the `.fth` format, a hypothesis in this one. It comes in closed, with a note.
- A pipe without a length is left blank for the user, unless it is closed (then 1 mm).
- A pipe without a diameter is kept, with its diameter blank for the user. The description leaves such pipes out; Pump It keeps them so that the network stays whole.

**A-12 Section, friction and fittings.**

- Geometry code 0 is circular, by the diameter at b+5. Code 4, with two lengths at b+7 and b+9, is a rectangular duct (a probable reading, with a note). Another code is read by its area and the hydraulic diameter, with a note.
- Friction (b+12):

| Code | Reading | Pump It |
| --- | --- | --- |
| 0 | absolute roughness | roughness |
| 1 | relative roughness | relative roughness |
| 2 | smooth (taken from `.fth`) | smooth, with a note |
| 4 | Darcy f | fixed f |
| 8 | Weymouth (probable) | fixed Darcy f = 0.032/d^(1/3), d in inches, with a note |
| 9 | Panhandle (probable) | commercial steel, 0.046 mm, with a note |

  Any other code leaves the roughness blank, with a note.
- The K of the fittings (b+20) becomes one item. A design factor other than 1 is not applied, and is reported (F-14).

**A-13 Thermal model.** Pump It has one thermal model per model.

- When every pipe of the file is isothermal (b+53 = 1), the model is isothermal at their temperature (b+57), in its unit. With several temperatures, it takes their mean, with a note.
- Any other mix is adiabatic: pipes with heat transfer with the surroundings (b+53 = 2), and isothermal pipes among other models, each have a note.

## The gas

**A-14 The gas.** It becomes a custom gas of Pump It, with its molar mass, k, Z and viscosity. Its temperature is the one of A-13, or the mean of the temperatures of the sources (reservoirs, imposed pressures and imposed flows that enter), in their unit; without one, 20 °C, with a note.

- **A library with polynomials (source 1).** The molar mass is read. The viscosity and the specific heat come from their polynomials at that temperature, and k = cp/(cp − R). A temperature outside the range of the file is reported.
- **Z of a library gas.** Z comes from the virial correlation of Pitzer and Abbott, with the critical point and the acentric factor of the file, at the mean absolute pressure of the sources. Outside its range (Tr ≤ 0.8), Z = 1, with a note; |Z − 1| > 0.02 is reported.
- **Mixtures (sources 2 and 6).** Mass fractions (Fraction Units Type 1) or molar ones. Each component comes from a table of Pump It: molar mass from the standard atomic weights, specific heat of the ideal gas at 300 K, and viscosity at 300 K and 100 kPa (sources in the README).
  - The molar mass and the specific heat follow the fractions, the viscosity follows the rule of Herning and Zipperer, and Z = 1.
  - Components without data, at most 5 % of the mixture, are left out of the estimate. More of them, and the gas becomes air, with a note.
  - A single component reads as a pure gas.
- **Several gases mixed through the network.** The composition per junction is not described: the first gas is used, with a note.
- **A source of the gas that is not described,** or a gas that cannot be read: air, with a note.

## Junctions

**A-15 Record and kinds.** As for `.fth` files (F-15): the common block, the elevation, the special condition (b+24) and the block of the type after the anchor. The codes of the kinds follow the description: 5 is an unidentified component, 16 a discharge nozzle and 17 a compressor or fan.

**A-16 Elevation.** Each junction keeps the elevation of the file (b+7). The description found junctions without a defined elevation whose pipes give one at their ends. Such a junction takes the elevation of the ends of its pipes, with a note. When neither is given, the elevation is left blank for the user. A pipe that ends at another elevation than its junction is reported (F-27).

**A-17 Sources.**

- **Reservoir (2).** A vessel of gas at rest. Its stagnation pressure (t+7+o) applies at the elevation of the junction, and the temperature of its gas (t+11+o) goes into the field of Pump It for the temperature of a source; o = 5·(np − 1).
- **Imposed pressure (4).** 3 fields per pipe, then at t+3np the kind (1 static, 0 stagnation), the pressure and the temperature. The description gives the places for one pipe; the same per-pipe region it describes for merging gives them for several. As in F-18, a static pressure needs a single pipe and no losses at its connection.
- **Temperature of a static pressure.** Pump It takes the temperature of every source as a stagnation temperature (G-28). With a static pressure, the description's own check (Mach 0.30 in a textbook problem of Fanno flow) reads the temperature as static. The stagnation temperature stored at the end of the pipe replaces it when the file has one, with a note; otherwise it is taken as stagnation, with a note.
- **Imposed flow (3).** The flow (t+1), the direction (t+3: 1 leaves the network) and the temperature of the gas that enters (t+4). A negative flow turns around; closed, the flow is zero.
- **Branch (1).** The source at t+3np+1 (+ enters the network) is a hypothesis, with a note. With one pipe, a branch is an imposed flow.
- **Losses K at the connections.** Their places come from `.fth` files: the first two of the 5 fields per pipe of a reservoir (entering the pipe, entering the reservoir), of the 3 of an imposed pressure, the second of the 3 of a branch, and t+6 of an imposed flow. They have a note when they are not zero.
- A closed reservoir, imposed pressure or branch closes its pipes, as for `.fth` files.

**A-18 Bend (6).** The K is at t+3. A negative K is not stored, since the program works it out from the geometry (the angle at t+1 and r/D at t+2). Pump It then takes the K from the Crane L/D of a 90° pipe bend of that r/D, times f_T of the inlet pipe:

- in proportion to the angle up to 90°;
- beyond 90°, the Crane rule for n bends of 90°: K = (n − 1)·(0.25·π·f_T·r/D + 0.5·K₉₀) + K₉₀.

A missing angle is 90° and a missing r/D is 1.5, and the bend has a note.

**A-19 Tee and valve.**

- **Tee or wye (7).** Its losses come from correlations of the program, so it is a node without losses of its own, with a note.
- **Valve (8).** t+1 is the loss model: 1 the K, read at u+7 after the coefficients (u = t+9+nc).
  - A loss curve (3) depends on the density of the gas and is not converted: K = 0, with a note. Another model (0, Cv, Kv or another one, not described) also takes K = 0, with a note.
  - On a single pipe, the valve discharges: an exit valve to its outlet pressure (u+1), with its K.
  - Closed (special condition 1), a closed valve, or a closed end on a single pipe.

**A-20 Control valve (9).** t+0 is the kind: 2 flow, 0 pressure reducing, 3 pressure drop and 1 pressure sustaining. They become the FCV, PRV, PDCV and PSV of Pump It, with the set point at t+3 and its flow units of A-06. The kinds other than flow are readings still to be confirmed, with a note.

- As in F-20: always-control off, opening on failure, open K = 0. The special conditions 1 and 2 become the closed and open states.
- A pressure set point is static or stagnation. The stored results tell which one when the valve was controlling at that point: the stagnation pressure stored at the pipe next to it, or the static one from it and the stored Mach number, P = P₀·(1 + (k − 1)/2·M²)^(−k/(k−1)), falls on the set point within a quarter of the dynamic part. Otherwise static, with a note.

**A-21 Compressor or fan (17).** t+0 is the mode.

- **Mode 2: fixed flow** (t+2, units of A-06).
- **Mode 0: a curve.** The curve of the first configuration (its count at t+12): the rise ΔP = Σ cᵢ·Qⁱ, its unit at t+6, the flow at t+8, the coefficients counted at t+19 and the largest flow at t+17 (to the zero rise without it).
  - Pump It's compressor reads a curve of head against the volume flow at the suction (G-27). The rise is converted at a suction state: the ratio r = 1 + ΔP/P₀ gives the isentropic head H = Z·R·T₀·k/(k − 1)·(r^((k−1)/k) − 1)/g, and the flow its volume Q = ṁ·Z·R·T₀/P₀. A volume at the local conditions is taken as the one at the suction.
  - That state is the stagnation pressure and temperature stored at the end of the inlet pipe; or, without stored results, the nearest source upstream (leaving out the losses of the suction line); or else the mean of the sources. Each case has a note.
  - The curve becomes 21 points from zero to its largest flow, joined by straight lines (exact at the points, no wiggles of a fit). At the suction state of the conversion, the compressor gives back the rise of the file; away from it, it behaves as a machine of constant head against volume flow.
  - Several configurations: the first is used (the one in use is not described), with a note.
- The efficiency is not described. The polytropic efficiency of Pump It (75 %) sets the discharge temperature, with a note.
- Another mode with a curve uses the curve, with a note; without one, the flow is left blank.
- Closed, the compressor is off without flow.
- On a single pipe, as for a `.fth` pump (F-25), a fixed flow is an imposed flow. With a curve, the missing end becomes the ambient pressure through a frictionless pipe of 1 mm.

**A-22 Other kinds.**

- A discharge nozzle (16) on a single pipe is an exit valve to the ambient pressure without losses, with a note asking for its loss and outlet pressure.
- The kinds whose data the description does not give become, between two pipes, a component with K = 0, with a note: the unidentified component (5), check valve, orifice, venturi, screen, heat exchanger, volume balance, generic component and unknown codes. Closed, they are closed valves.
- With another number of pipes, they become a plain node, or a closed end.

**A-23 Stopped junctions.** As F-10: a junction left without an open pipe stops, as in the file.

## Stored results, drawing and report

**A-24 Stored results.** The pipe results of the imported scenario are always in US units:

| Column | Content | Unit |
| --- | --- | --- |
| 1 | mass flow | lbm/s |
| 2, 3 | stagnation pressure at the inlet and outlet | psia |
| 4, 5 | stagnation temperature at the inlet and outlet | °R |
| 12, 13 | Mach number at the inlet and outlet | — |

They serve for the comparison of the report (A-26), the basis of a pressure set point (A-20), the suction of a compressor (A-21) and the temperature of a static pressure (A-17). The junction results are not used.

**A-25 Drawing.** As F-30.

**A-26 Report.** As F-31: the first calculation against the stored mass flows and stagnation pressures, then the notes by level.

**A-27 Opening.** *File → Open* accepts `.json`, `.fth` and `.aro`; a file dropped anywhere on the window opens the same way. A file with several scenarios first shows them to choose from. Undo brings back the model that was open before.

## The model of Pump It

The description asks for some fields that its own model did not have (its E-1 to E-7). Pump It already had each of them, so the core did not change:

| Description | Pump It |
| --- | --- |
| E-1 a flow unit for flows of gas | every quantity keeps its unit: mass, local volume or normal volume |
| E-2 the temperature of each source | the temperature of the gas of a source (G-28) |
| E-3 a fixed Darcy f | the friction model "fixed f" |
| E-4 a compressor curve of pressure rise against mass flow | the curve of head against suction flow (G-27), converted as in A-21 |
| E-5 the standard conditions of the file | used during the import, to convert standard volumes (A-06) |
| E-6 the kind of junction in the file | not kept: the notes name the kinds |
| E-7 the stored results in the model | kept with the import for its report (A-24), not in the model |

## Known gaps

What the description leaves open, and how the importer treats it:

| Gap | Treatment |
| --- | --- |
| Valve loss model 0 (Cv, Kv or another one) | K = 0, with a note (A-19) |
| Loss curves of valves and heat exchangers | K = 0, with a note: their loss depends on the density of the gas |
| Orifice areas and discharge coefficient, heat exchanger data | a component with K = 0 (A-22) |
| Control valve kinds 0, 1 and 3; the basis of a pressure set point | read as such, with notes; the basis from the stored results (A-20) |
| Losses K at connections; the source of a branch | the places of `.fth` files, with notes (A-17) |
| Pipe special condition 1 | closed, with a note (A-11) |
| Friction codes 8 and 9 | Weymouth as a fixed f; Panhandle as commercial steel (A-12) |
| Normal units (N…) | 0 °C and 1 atm, as Pump It's normal conditions (A-06) |
| Fraction Units Type 2 | molar fractions (A-14) |
| Gases mixed through the network | the first gas (A-14) |
| The configuration in use of a compressor and its efficiency | the first one; 75 % (A-21) |
| Temperature of a static pressure | static, from the description's check; the stored stagnation temperature (A-17) |
| Vapour pressure, enthalpy table, result columns after the 13th | not read |
| A base scenario without a network | read: the network of the children as new records, with a note (A-28) |
| Writing .aro files | out of scope |

A gap is closed only by a new description from the specification team, never by studying files of other programs here (CONTRIBUTING, clean-room rules).
