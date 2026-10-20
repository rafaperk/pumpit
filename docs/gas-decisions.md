# Compressible mode (gas)

Pump It calculates networks of a gas as well as networks of a liquid. The user picks the **regime** of the model: incompressible (liquid, as before) or compressible (gas), and, for a gas, the **thermal model**: isothermal or adiabatic. The compressible mode follows the *compressible mode specification* (version 1, 19 October 2026), written for the earlier code base of the app; this file maps it onto Pump It and records the decisions that the specification leaves open or that the adaptation required (its §1 asks for this record).

Clean room (§1.1): only the specification, the code of this repository and public engineering knowledge (compressible flow in ducts, gas thermodynamics) were used. No other hydraulic program, manual, example file or installation folder was opened; for that reason `tests/validate-fth.js`, which reads example files of another program, was not run during this work.

## Progress

| Phase | Content | State |
| --- | --- | --- |
| 0. Physics | `src/core/gas/gas.js` (appendix A), `tests/gas.test.cjs` (appendix B), the calculation chosen by the regime | Done |
| 1. Isothermal network | The gas network of a model, the flow relations of every junction type, Newton on the node pressures, choking, regime fields on load, the example of appendix D | Done |
| 2. Interface | Regime and thermal model, gas library, gas columns and units, the stamp, the advice of §5 | Done |
| 3. Adiabatic network | Temperature loop, temperature of the sources, isothermal start, a scenario of the example | Done |
| 4. Finishing | Compressor and blower, normal volume flows (done in phase 2), finer steps near choking (done in phase 1), help, speed, a second example | Done |

## Where things are

| Specification | Pump It |
| --- | --- |
| `js/gas.js` (appendix A) | `src/core/gas/gas.js`, as `PumpIt.gas` |
| `solveModelGas` | `src/core/gas/solver.js` (passes, temperature loop), with `network.js` (the gas network of a model), `flow.js` (relations of the links), `newton.js` (node pressures) and `results.js` |
| Junction types for the gas (§8.3, §10.4) | the `gas` hooks of each type in `src/core/junctions/*.js` (contract in `registry.js`) |
| Gas library (R-11) | `src/core/fluids/gases.js` |
| `normalize()` (§8.5) | `PumpIt.model.normalizeRegime`, called by `src/ui/app/files.js` |
| Integration in `engine.js` (appendix C) | `PumpIt.solver.run` (`src/core/solver/solver.js`) |
| `tests/motor.test.cjs` | `tests/motor.test.cjs`, which runs `tests/run-tests.js` |
| Example of appendix D | `src/core/examples/compressed-air.js` ("Compressed air line (gas)", with an adiabatic scenario); also `air-plant.js` ("Compressed air plant (gas)") |
| "Fluid and system" dialog, stamp (R-01, §12) | the system window (`src/ui/inspector/system-window.js`, its fields in `system-panel.js`) and the stamp of the top bar (`src/ui/topbar/header.js`), which opens it |
| Gas results in the interface (§12.2) | `src/ui/results/columns.js` (`GAS_COLS`), the inspector panels, the right-click card, `src/ui/network/color-scales.js`, the profile chart |
| Compressor (§10.5) | the `gas` hooks of `src/core/junctions/pump.js` and its view `src/ui/junctions/pump.js` |
| Help (phase 4) | chapters `gas` and `gasTech` of `src/ui/help/help.js`, the formulas in `src/ui/help/equations.js`, texts in `src/i18n/<language>/help.js` |

## Decisions

**G-01 Module and namespace.** `src/core/gas/gas.js` holds appendix A with its statements unchanged (checked token by token, comments aside), except the names of the thermal models, in English like every stored value (G-04); its comments are in English, as the code base requires. It attaches itself to `PumpIt.gas` (one global namespace) and to `module.exports` when required from Node; `window.PumpItGas` is not created.

**G-02 Choosing the calculation.** `PumpIt.solver.run` hands a model whose `system.regime` is `'compressible'` to `PumpIt.gas.solveModelGas`, after removing the drawing fields, as it does for a liquid. The incompressible path is unchanged: every example and scenario gives byte-identical results in the three languages, against a record taken before the work.

**G-03 Tests.** `tests/gas.test.cjs` is appendix B (T1–T11: the checks of the appendix, with their names and messages in English) followed by T12 onwards for the models of the app; it loads the module of the repository, or a file given as its argument (the usage of the appendix). `tests/motor.test.cjs` runs `tests/run-tests.js`, the suite of the incompressible engine. `npm test` runs both.

**G-04 Values.** The fields take the values of §8, named in English like every value Pump It stores: `regime` `'incompressible'` | `'compressible'`, `gasMode` `'isothermal'` | `'adiabatic'`. A model saved with the Portuguese names of the specification (before 19 October 2026) still opens: `PumpIt.model.normalizeRegime` reads them as the English ones, in the system and in the scenarios.

**G-05 Both fluids kept.** `system.fluid` stays the liquid, as in every model saved before; `system.fluidGas` holds the gas. The regime chooses which one the calculation uses, so a change of regime moves nothing and scenario overrides keep their paths (R-03, §8.5). A gas written as the active fluid (`system.fluid.kind: 'gas'`, the layout of §8.1) becomes `fluidGas` on load, its numbers read in SI, and the liquid goes back to the default one.

**G-06 Gas data.** `fluidGas = { gas, name, MW, k, Z, mu, T }`: `gas` is a library id or `'custom'`; `mu` and `T` are quantities with the unit typed (cP, Pa·s…; °C, K…). A library gas takes MW and k from the library and μ from Sutherland's law at T; a custom gas gives MW, k and μ; Z is always the user's. Library: air, nitrogen, oxygen, methane, natural gas (specific gravity 0.6), carbon dioxide, hydrogen.

**G-07 Pressure at the nodes.** Junctions carry the static pressure in the isothermal model (R-31) and the stagnation pressure in the adiabatic one (R-32). Boundaries keep their nature: a reservoir is gas at rest (stagnation), an imposed pressure is static or stagnation as chosen in the junction (Pump It already had this choice), and an outside pressure (nozzle, exit valve) is static. A link converts at its ends: from a stagnation node the gas enters through an isentropic acceleration, P₁ = P₀·(1 + (k−1)/2·M₁²)^(−k/(k−1)); into a stagnation node its outlet stagnation pressure is what meets the node. At low speed this is the incompressible treatment of the boundaries (P6).

**G-08 Pipe relation.** Isothermal and horizontal: the closed form of §9.4 (R-31). Isothermal with a difference of elevation, and every adiabatic pipe: the march (R-21, R-23, R-32). K elements (valves, fittings, orifices), which have no length: the closed forms, isothermal with f·L/D + ΣK = K and Fanno with f·L*/D = K. The friction factor is Pump It's (Colebrook, 64/Re in laminar flow, the linear transition) with Re = G·D/μ, constant along a pipe since μ is constant. ΣK — fittings and the entrance and exit K of the junctions for the flow direction — is added to f·L/D in the closed form and distributed as f + ΣK·D/L in the march (§9.8). The laminar correction of the K values is the incompressible one.

**G-09 Network.** Newton-Raphson on the pressures of the free nodes until every mass balance closes (§10, R-30), with, as further unknowns, the flows of the links that impose a pressure, a pressure difference or a flow given as a volume (control valves, links without loss). The flow of every other link comes from the pressures of its two nodes: its relation is solved for the mass flux by a bracketed secant and capped at the critical flux when it chokes; its derivatives come from differences at the solution. Dense Gaussian elimination with equilibration (the incompressible one), line search, pressures kept positive, a small damping when the matrix is nearly singular. Converged when every free node balances within 1·10⁻⁸ of the flow through it (R-40). First pressures: the linear theory of gas networks on P², damped, 12 passes. `solveGasNetworkIso` stays in `gas.js` as the verified reference of the classic method (T10, T11); the app does not call it because it needs what that function does not have: f(Re), K per flow direction, elevation, choking, static and stagnation boundaries, elements and devices.

**G-10 Tiny drives.** Below 10⁻⁹ of the pressure, the flow of a link is linear in its drive, so it has a finite slope through zero where a K or a constant f gives a square root.

**G-11 March step.** 100 steps (§9.6); a step changes M by at most 0.005 and by at most 5 % of what is left to the limit, and a step with no subsonic solution is cut by four — the refinement of §9.7, applied at any Mach. Error against exact Fanno: about 10⁻⁶ in pressure when the outlet Mach is 0.4, 5·10⁻⁵ at 0.6, 2·10⁻⁴ at 0.77 and 10⁻³ at 0.94; critical flux within 1.5·10⁻⁵ (the uniform march of the appendix, 200 steps: 10⁻⁴).

**G-12 Choking.** A link chokes when no subsonic state gives the flux its nodes ask for: its flow is then the critical one (the largest flux that does not choke), the pressure downstream no longer changes it, and a critical warning is given (R-24). The limit is M = 1/√k in the isothermal model and M = 1 in the adiabatic one; the results show the state at the outlet of the pipe, before the expansion to the pressure of the node.

**G-13 Orifice.** A K element whose flow also cannot exceed the critical flow of its vena contracta, an isentropic nozzle of area Cc·Ao: Cc = Cd for the Cd model, 0.61 for a sharp edge, and 0.61 + 0.39·(1 − 10^(−7.7·r/dO)) for a rounded edge (an interpolation made up for Pump It after the edge term of the Idelchik formula it already uses). A restriction orifice therefore chokes at its hole.

**G-14 Valves.** A K element: the K given, or the K that the liquid relations of Cv and Kv give at the inlet area — the same, flow-free loss as in the incompressible mode. The critical pressure ratio of a valve trim is not modelled; the K element chokes at the area of the pipe.

**G-15 Normal conditions.** 0 °C and 101.325 kPa, ideal gas (Z = 1), for the normal density and normal volume flows.

**G-16 Junction types.** Reservoir: fixed stagnation pressure, the temperature of its gas. Imposed pressure: fixed static or stagnation pressure. Imposed flow and branch: a mass flow; a volume flow is read at the conditions of the node (§8.4). Valve, orifice and generic: K elements; the curve of a generic component is read against the volume flow at the inlet conditions. Control valve (PRV, PSV, FCV, PDCV): the states and rules of the incompressible device with the gas relations; the basis of a pressure set point (static or stagnation) is converted with the Mach number of the pipe at that end. Exit valve: a K element from the end of the pipe to the outside static pressure (without a loss, an isentropic exit in the adiabatic model). Nozzle: isentropic flow through Cd·A, choked below the critical pressure ratio; a K factor gives CdA = K·√(1000/2), as in the incompressible mode. Pump: off, a closed link or a link without loss; running, a compressor (phase 4). Pump It has no check valve, so the state loop of §10.4 for check valves has nothing to act on; the device loop serves the control valves.

**G-17 Hazen-Williams.** It has no meaning for a gas: such pipes are calculated with Darcy and the roughness stored in the pipe (0.046 mm if none), and a caution lists them (§8.2).

**G-18 Results.** The fields of R-25 beside the incompressible ones: Q is the volume flow at the inlet (in the flow direction), Qout at the outlet and QN the normal one; V is the larger of the two ends; T, T₀, ρ and M at both ends; heads (HGL, EGL, hL) are left out (NaN) for a gas. The drop of stagnation pressure is split between friction and the K values in the ratio of f·L/D to ΣK — an estimate, since the march does not separate them. `fluid.rho` of the results is the density at the mean fixed pressure, for the places of the interface that need one density.

**G-19 Warnings.** Choking (critical); Mach above `system.machLimit` (0.7 by default); velocity above `system.gasVelLimit` (30 m/s by default); and those the incompressible mode also gives.

**G-20 Gravity and reservoirs.** g = g₀ × `system.gravity`, as for a liquid. The "liquid level" of a reservoir is the elevation where its pressure applies; the column of gas from there to a pipe end is part of the pipe, as the column of liquid is.

**G-21 Speed of the tests.** The hot code (`flow.js`, `newton.js`) keeps local names for the Math functions: in the Node `vm` contexts of the tests a global lookup is about 16 times slower. Results do not change.

**G-22 Where the regime is chosen.** The "Fluid and system" dialog of the specification is the *System properties* window: the regime is its first section, two buttons, and the thermal model, the gas and the design limits follow it. The stamp of R-01 sits next to the model title ("Gas · isothermal · Air"); a click on it opens the window, as do *Edit → System properties…* and the button of the inspector when nothing is selected.

**G-23 Gas results in the interface.** The result tables have columns of their own for a gas (`GAS_COLS`); the inspector, the right-click card and the junction views show mass flows where a liquid shows volume flows, and add the Mach number, both pressures and the temperature. On the drawing, a gas adds mass flow and Mach number and drops the hydraulic grade line; its velocity is coloured over the range of the model, since the fixed scale is a water scale. The profile chart draws the points of the march (or of the closed form) inside each pipe. The pump × system chart is not drawn for a gas.

**G-24 The advice of §5.** In the incompressible mode, a fluid lighter than 50 kg/m³ (as light as a gas) in a pipe past Mach 0.3 — speed of sound √(k·P/ρ), with the k of the gas of the model — or with a drop above 10% of its absolute pressure brings a caution that suggests the compressible mode; liquids are not affected. In the compressible mode, when every pipe stays below Mach 0.1, every drop (pipes, valves, fittings, discharges) stays below 2% of the absolute pressure and no compressor runs, an *information* says that the incompressible mode would give practically the same. Information is a new, fourth level of message, not counted in the badge of the Results tab.

**G-25 Normal volume flows.** A unit category of its own (`normFlow`: Nm³/s, Nm³/min, Nm³/h, Nm³/d), part of the flow inputs; a mass flow is ρ_N·Q_N (G-15). A liquid given a normal unit uses its own density.

**G-26 From a library gas to a custom one.** Choosing *Custom gas* copies the molar mass, k, the viscosity at the given temperature and the name of the library gas chosen before, in one step (one undo).

**G-27 Compressor and blower (§10.5).** A running pump of a gas model is a compressor whose flow is an unknown with a row of its own: a fixed ratio of stagnation pressures; or the curve, its head read as the isentropic head of the gas against the volume flow at the suction, r = [1 + g·H·(k−1)/(k·Z·R·T₀)]^(k/(k−1)), which is ΔP = ρgH for a small head, the pump of a liquid; or a fixed flow (mass, volume at the suction, normal volume); or the speed control of the discharge or suction static pressure, with the speed found by bisection as for a pump. The polytropic efficiency (the efficiency curve, or a field of its own, 75% by default) gives T₀ out = T₀ in·r^((k−1)/(k·η)) and the power to the gas ṁ·c_p·ΔT₀. In the adiabatic model that temperature goes into the network (the temperature loop); in the isothermal model an aftercooler is assumed and the discharge temperature is only reported. A fixed ratio exists only in the compressible mode (the checklist refuses it for a liquid); a pump that is off is a closed link or a tie. For the first pressures, the ratio (or the ratio of the head at 60% of the curve) enters the linear theory (G-30).

**G-28 Temperatures of the adiabatic model (R-12, R-32).** The temperature given with the gas is the stagnation temperature of the sources. A reservoir, an imposed pressure, an entering imposed flow and the source of a node have an optional field of their own (`gasT`), shown in the adiabatic model; empty means the temperature of the sources. The adiabatic calculation starts from the isothermal solution of the same network (§10.3): on a grid of 276 pipes with elevations the adiabatic Newton then needs 4 iterations instead of 10, although the isothermal solution costs about as much there (both use the march).

**G-29 Choking of junctions.** A choked pipe is critical (R-24). A choked valve, fitting, orifice or nozzle is a *warning*: a restriction orifice and a blow-off nozzle choke by design.

**G-30 Linear theory with relations.** The first pressures come from the linear theory on u = P², extended with the links that impose a relation linear in u: a ratio (u_b = r²·u_a), a set pressure (u = set²) and a tie or a set difference; their flows are unknowns of that linear system too. Without it, a compressor or a reducing valve started the network at the inlet pressure, and a plant with fixed consumers fell into choking before the Newton could recover.

**G-31 Flows set as a volume.** A flow control valve or a compressor whose flow is given as a volume at the inlet conditions is a fixed flow (for the connectivity analysis) with a row of its own, ṁ = Q·ρ(inlet).

**G-32 Speed (R-42).** Measured in Node with the core in the main context, as a browser runs it: 276 pipes with elevations, 0.25 s isothermal and 0.4 s adiabatic; the same grid horizontal, 0.04 s isothermal and 0.17 s adiabatic; 566 pipes with elevations, 0.6 to 0.9 s. The calculation is synchronous, like the incompressible one: the app opens straight from disk, where browsers do not allow the web workers that would move it off the interface thread. Models of tens of pipes take a few milliseconds.

**G-33 Help.** Two chapters in the help window — *Gas (compressible mode)*, for the user, and *Technical reference for gases*, with the equations — and a step of the guided tour on the stamp. `tests/check-i18n.js` now also checks every reference inside the help (labels, links, formulas, examples, areas of the screen, tour steps) in every language. The help texts that said the app calculates only liquids were updated.

**G-34 Hydraulic model of the liquid.** The incompressible model was reviewed while the gas path was built (laminar correction of the K values, end losses, static boundaries, Cv and Kv, nozzles, devices, results); no inconsistency was found that needed a correction. The refactors the gas path needed — the pipe data in SI shared with the gas (`PumpIt.solver.pipeData`), the effective area of a nozzle, the K of an orifice and the state of a control valve as helpers, the links that tie two pressures in the connectivity analysis — keep every result of the liquid byte-identical.
