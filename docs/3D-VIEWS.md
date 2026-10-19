# 3D views

Pump It has two views of the network besides the schematic: an **isometric** view (fixed camera, three-axis grid, snapping) and a **free 3D** view (orbit camera, optional grid). They follow the *3D views specification* (version 1, 15 October 2026), which was written for another code base; this file maps it onto Pump It and records the decisions that the specification leaves open or that the adaptation and the user's requests required (its §1 asks for this record).

**One geometry.** The schematic is the plan of the scene and the height of every junction is its elevation, so the three views always show the same network: moving a junction in one moves it in the others, and moving it up or down in a 3D view changes its elevation (D-20). Everything else in the drawing is visual only: the plan position, the routes of the pipes and the symbols never change the calculation, and no length ever comes from the drawing (R-10, R-13).

## Progress

| Phase | Content | State |
| --- | --- | --- |
| 0. Contract | Drawing/calculation contract, data of a new pipe, validation of loaded models, geometry module, tests | Done |
| 1. Read-only view | View switch, drawing with results and depth cues, navigation, selection | Done, reworked by D-20 |
| 2. Isometric editing | Placing junctions, drawing pipes with route candidates, moving junctions along an axis, segment handles, grid snapping, fit to the grid, next route, symbol roll, working level, grid density | Done |
| 3. Free 3D editing | Placing junctions, drawing pipes in any direction (Shift, Ctrl, bends), moving junctions across and up and down, bends (move, insert, delete, remove all), optional snapping, working level and grid density in both views | Done |
| 4. Finishing | Full panel, keyboard shortcuts box, fluid camera with hundreds of pipes, camera glides and reduced motion; no phone layout (D-24) | Done |
| Solid symbols (user request) | The junctions drawn as small shaded solids that turn with the camera, with the pipes stopping at their bodies (D-29) | Done |
| 5. Optional | Copy the view as SVG, oriented symbols in the schematic | — |

## Using the views

- **Switch:** *Schematic · Isometric · 3D* at the top left of the drawing, or the keys 1, 2 and 3. The first entry into a 3D view picks a vertical scale that suits the model (*Vertical scale*, in the inspector with nothing selected) and puts the working level at the lowest elevation.
- **Isometric, navigation:** drag empty space to pan, wheel to zoom, the turn buttons rotate by 90°; grid, shadows, the true or 2:1 style and the grid density on the controls.
- **Isometric, editing:**
  - *Junction tools* of the palette: click the grid to place the junction on the working plane, whose elevation is the *Level* of the controls (PageUp and PageDown move it by one grid step).
  - *Pipe* tool: click a junction or the grid, move the cursor and choose the route with ← and →; Alt+click or D makes a bend; near a junction the route goes to it; Esc stops. A click on the grid ends the pipe at a new node, at the height of the route.
  - *Select* tool: drag a junction to move it along one axis (along the vertical, its elevation changes); drag the handle in the middle of a segment of the selected pipe to move that segment; ← and → choose another order of the axes for the selected pipe.
- **3D, navigation:** drag empty space to orbit, right button, middle button or Shift+drag to pan, wheel to zoom at the cursor, double click to centre on an object; arrows orbit by 15°, Shift+arrows pan, Home frames, + and − zoom. Grid, snapping, shadows, drop lines, perspective or orthographic, and the views Top, Front, Side and Iso on the controls. On a touch screen, one finger orbits and two fingers pan and pinch.
- **3D, editing** (grid snapping optional, *Snap* on the controls):
  - *Junction tools:* click to place the junction on the working plane (the *Level* of the controls, PageUp and PageDown).
  - *Pipe* tool: click a junction or the plane, then move: the pipe runs across, on the plane of its last point; hold Shift to go up or down (the pipe turns where the cursor was, an L), Ctrl to keep it on the nearest axis; Alt+click or D makes a bend; near a junction it goes straight to it, and ← → offer the routes along the axes; a click on empty space ends it at a new node, at the height of the tip. The label at the cursor shows the offset and the elevation of the tip.
  - *Select* tool: drag a junction to move it across; with Shift, up and down (its elevation changes). With a pipe selected, every bend has a handle: drag it (Shift: up and down), click it and press Delete to remove it, double-click the pipe to insert one.
  - In the *Front* and *Side* views the floor is seen edge on, so placing, drawing and moving use the vertical plane that faces the camera.
- **Symbols:** every junction is a small solid: an open tank with its liquid (reservoir), a pump with its motor and an arrow along the flow on its casing, a valve with its handwheel, a control valve under its actuator, an exit valve with an arrow for the discharge, an orifice plate between flanges, a nozzle spraying drops, a ball where pipes meet, a drum (assigned flow, Q), a sphere (assigned pressure, P) and a block (loss K). They keep a fixed size on the screen (larger when nearer in perspective), lie along their pipes, turn about them with the roll of the panel, and turn red when the junction stops the flow (a closed valve, a pump off and closed).
- **Inspector,** with the 3D views open: the vertical scale, *Automatic scale* and *Fit every pipe to the grid* with nothing selected; the drawn length, the bends, *Snap to the isometric grid*, *Fit to the grid*, *Next route* and *Remove bends* for a pipe; X and Y in the plan and the roll of the symbol for a junction.
- **Keys:** *Edit → Keyboard shortcuts…* lists the keys of every view.
- **Camera jumps** (ready-made views, framing, centring, turns, the zoom buttons and the keys) glide for a quarter of a second, or happen at once when the system asks for reduced motion.

## Where things are

| Specification | Pump It |
| --- | --- |
| `js/view3d.js` (Appendix A), `window.HidroView3D` | `src/core/view3d/` (`camera`, `navigation`, `grids`, `routing`, `symbols`, `plan`, `free`, `solids`), `PumpIt.view3d` |
| `E.LAYOUT_KEYS`, `E.stripLayout` (Appendix B) | `PumpIt.model.LAYOUT_KEYS`, `PumpIt.model.stripLayout` (`src/core/model/layout.js`) |
| `E.solveModel` strips the drawing first | `PumpIt.solver.run` strips the drawing first (`src/core/solver/solver.js`) |
| `E.pipeDefaults(prev)`, used by `addPipe` | `PumpIt.model.pipeDefaults(prev)` (`src/core/model/model.js`), used by `app.addPipe` (`src/ui/app/editing.js`) |
| `normalize()` validating the 3D fields (§7.5) | `PumpIt.model.normalizeLayout(m)`, called by `PumpIt.ui.files.normalize` |
| default 3D settings (§7.4) | `PumpIt.model.newView3()` |
| junction `pos3`, `layoutFrom2D` (§8.14) | no stored position: `PumpIt.view3d.toScene(x, y, elevation, zScale)` (`src/core/view3d/plan.js`) |
| pipe `bends3` (absolute points) | `bends3` relative to the ends of the pipe: `anchorBends`, `resolveBends`, `orthogonalize` (`src/core/view3d/routing.js`) |
| `tests/view3d.test.cjs` (Appendix C) | `tests/view3d.test.cjs`, part of `npm test` |
| `tests/motor.test.cjs` | `tests/run-tests.js` (also part of `npm test`) |
| junction `z` (hydraulic elevation, m) | junction `elevation` (`{ value, unit }`): the height in the scene |
| pipe `from`, `to`, `L` | pipe `up`, `down`, `length` |
| `ui.view` (`'2d'`, `'iso'`, `'3d'`) | `model.view3.mode`; `app.view` keeps naming the tabs (network, data, results, charts) |
| `cam3`, `setCam3`, `posOf`, `poly3` (§9.3) | `PumpIt.ui.scene3d`: `camera`, `setCamera`, `scene` (positions and routes), `setMode` (`src/ui/view3d/scene.js`) |
| `commitLayout` and the drawing commands | `PumpIt.ui.commands3d` (`src/ui/view3d/commands.js`) |
| `onPointer3D*`, `draw3`, `drag3` (§8.7–8.10) | `PumpIt.ui.edit3d` (`src/ui/view3d/edit.js`: what both views share, and the hand-over to the editor of the active view), `PumpIt.ui.isoEdit3d` (`edit-iso.js`), `PumpIt.ui.freeEdit3d` (`edit-free.js`) |
| the geometry of §8.9 and §8.10 (tip of a pipe, dragging, inserting a bend) | `PumpIt.view3d` in `src/core/view3d/free.js`: `drawTip`, `dragPoint`, `closestOnSegment`, `routeKind`, `planeHit` |
| `renderCanvas3D` (§10) | `PumpIt.ui.render3d.render` (`src/ui/view3d/render.js`), called by `PumpIt.ui.canvas.render` in the 3D views; the frames while something moves are drawn by `PumpIt.ui.quick3d` (`quick.js`), and the editors redraw their own layer with `render3d.renderEdit` |
| navigation, zoom, fit, presets (§8.13), transitions (R-63) | `PumpIt.ui.nav3d` (`src/ui/view3d/navigation.js`), with `PumpIt.view3d.lerpCamera`; `src/ui/network/canvas.js` hands its events over in the 3D views |
| HUD and seal (§6.1) | markup in `index.html`, behaviour in `PumpIt.ui.hud3d` (`src/ui/view3d/hud.js`), styles in `src/ui/styles/view3d.css` |
| panel sections (§6.3) | `src/ui/view3d/panel.js`, through `PumpIt.ui.inspector.addSection` |
| junction symbols, `index.html` symbols as billboards or on the plane of their pipes (§8.11) | solids (D-29): the geometry in `src/core/view3d/solids.js` (`PumpIt.view3d.solid`, `solidAxes`, `solidPlacement`, `drawSolid`, `solidReach`), the shape of each type in its view (property `solid` in `src/ui/junctions/`), the markup in `PumpIt.ui.solids3d` (`src/ui/view3d/solids.js`) and the colours in `view3d.css` and the theme tokens |
| Help window section (§6.3, §6.4) | the keyboard shortcuts box of the Edit menu, `PumpIt.ui.shortcuts` (`src/ui/topbar/shortcuts.js`) |

## Decisions

**D-01. Sources.** Only the specification and this repository are used (§1.1). During this work the phase checks are `npm test`, whose T18 and T19 prove that a drawing never changes a result; the `.fth` validation is not run, because §1.1 excludes the files of other programs while this work goes on.

**D-02. Where the contract lives.** `LAYOUT_KEYS`, `stripLayout`, `newView3` and `normalizeLayout` belong to the model block, which defines the data; the solver calls `stripLayout` as the first step of `run`, the entry point of every calculation (automatic calculation, system curve, tests). The drawing fields are `view3` (model), `x`, `y`, `icon3` (junction) and `bends3`, `snap3` (pipe).

**D-03. Data of a new pipe (R-13).** Pump It never took the length from the drawing: a new pipe always got 10 m. Following R-13, a pipe the user draws now copies its length, material, section and friction from the reference pipe, which is the selected pipe or else the last one created, with the values the user sees in the current scenario. Without a reference, or when its length is not a positive number, the length is 100 m. `newPipe` keeps its 10 m default for code that builds models (examples, tests, validator).

**D-04. Names and values in English.** Code and stored values follow the project rule: the ready-made views are `top`, `front`, `side` and `iso`; the isometric style is `'true'` (true isometric) or `'2:1'`; coordinates are in drawing units (*du*). What the user reads comes from the message catalogs, in the three languages, like every other text of the interface (the specification asks for Portuguese texts only).

**D-05. Geometry module.** The code of Appendix A is kept as it is, with English comments, split into files by subject so that it can grow by blocks. Every function goes to `PumpIt.view3d`; the helpers that the files share (`clamp`, `focalPx`, `nearOf`, `pointsEqual`) are exported too.

**D-06. Tests.** Appendix C is adapted to the Pump It API and prints in the format of `tests/run-tests.js`. T17 now checks the plan and the elevations (D-20) and the automatic routes of every example; T18 and T19 check every scenario of every example, and T18 also checks that the effective model given to the solver is not changed; T20 adds a reference pipe with an invalid length; T21 (§7.5), T22 (routes that follow their ends, D-21), T23 (the tip of a pipe drawn in the free 3D view), T24 (dragging, inserting a bend, route kinds), T25 (the drawing through JSON), T26 (camera glides) and T27–T29 (the solid symbols of D-29: faces turned away, meeting the projection, painting order, shades, axes, where the pipes stop, a solid for every junction type) are new.

**D-07. Loaded models (§7.5).** Numbers out of range are clamped (scale, distance, field of view, elevation of the camera). Values that are not numbers, enumerations or booleans of the expected kind go back to the defaults of §7.4. A `step` outside (0, 100], a `major` that is not an integer from 2 to 20 or a `zScale` outside (0, 1000] also goes back to its default, and a `view3` that is not an object is removed. A valid `view3` is completed with every default, so the interface can rely on all of its fields. Stored 3D positions (`pos3`), conversion data (`map2d`) and bends in the old absolute form, from an earlier version of this work, are removed.

**D-08. Scenarios.** Drawing data is never per scenario: it lives on the objects of the base model, and drawing edits never write scenario overrides. The height follows the elevation of the current scenario, and changing it in a 3D view writes the elevation through the scenario rule, like the inspector does.

**D-09. Examples.** Where the specification says "the four examples", Pump It checks every example (seven today).

**D-10. Depth cues beyond the specification.** The specification draws lines only and leaves solids and shading out of scope; the user asked for a clear sense of depth and overlap (15 October 2026). So, in both views:
- pipes are tubes with light and shade, 4 to 12 px wide by their bore, and in perspective wider when nearer;
- every segment keeps the cut of R-55, so the nearer pipe interrupts the one behind it;
- farther items fade into the background (less when the colours show results, so that the colour scale still reads);
- every raised pipe and junction casts a shadow on the floor (*Shadows*, on by default, field `shadows` in `view3.iso` and `view3.free`; dark shadows on both themes come from the `--shade3d` tokens);
- the grids of §8.5 and §8.6 are drawn in both views.

**D-11. Heights from the elevations (superseded by D-20).** Phase 1 had an explicit command for it, since the generated scene was flat.

**D-12. Free 3D view before Phase 3 (superseded by D-23).** It only selected and navigated. Deleting, copying, pasting and every inspector edit work in any view (P2).

**D-13. Labels.** As in the Pump It schematic, the value of a junction goes above its symbol and its id and name below (R-53 says "under the symbol, as in the schematic"). A pipe id goes half a tube width plus 5 px above its anchor and its value half a width plus 13 px below, since tubes are wider than lines.

**D-14. Undo and the view.** `view3` holds view settings only (the active view, the grid, the working level, the vertical scale and the cameras): undo and redo leave it as it is (R-61).

**D-15. Conversion from the schematic (superseded by D-20).**

**D-16. Framing margin.** 64 px instead of 48, so that the scene stays clear of the controls on top of the drawing.

**D-17. Copy, paste, type change and reversing.** Pasted junctions move in the plan, and their pipes keep their routes (D-21); changing the type of a junction keeps its drawing; reversing a pipe also reverses its bends.

**D-18. Current positions everywhere.** A drawing edit makes the interface copy the effective model again (without recalculating), so that copying uses the current positions. This also fixes the schematic: copying right after moving junctions pasted them at the old place.

**D-19. Keys of the schematic.** Home, + and − also fit and zoom the schematic, as in the table of §6.4.

**D-20. One geometry: the plan and the elevation (user decision, 15 October 2026).** In place of 3D positions generated once from the schematic and kept apart from it (§8.14, P2, P3), a junction stands at `X = x / 20`, `Y = −y / 20` (one step of the schematic grid per du) and `Z = elevation × zScale`. So:
- moving a junction in the schematic moves it in the 3D views, and moving it along X or Y in the isometric view moves it in the schematic;
- changing the elevation (inspector, scenario) moves it up or down, and moving it along Z in the isometric view changes its elevation: a calculation input, so that edit recalculates (R-15 no longer holds; R-11 still guards every other drawing edit);
- there is no generation step (R-03): the first entry only creates the view settings, with a vertical scale of 1, 2 or 5 × 10ⁿ du per metre that makes the heights about half the size of the plan, and the working level at the lowest elevation;
- the working level is an elevation in metres; new junctions placed in a 3D view get it, and a node at the end of a pipe drawn in the isometric view gets the height of the route;
- the seal says *Height = elevation · the drawing never sets lengths* instead of *Visual only*.
Junctions placed one above the other share their place in the plan, so they overlap in the schematic.

**D-21. Routes that follow their junctions.** A pipe without `bends3` takes the automatic route along the axes (X, then Y, the vertical last), in both 3D views. A drawn or edited route is stored relative to the ends of the pipe: each coordinate of a bend follows the start or the end, plus an offset, so the route follows its junctions wherever they move; a leg that stops being along one axis (because an end moved across it) is split, the vertical last. A route equal to the automatic one stores nothing. `snap3: false` draws the pipe straight (with the dashed outline of R-30 in the isometric view).

**D-22. Moving in the isometric view.** One junction at a time (the one under the pointer) and one axis at a time, as in R-27; groups move in the schematic. A segment handle moves only a segment along an axis.

**D-23. Editing in the free 3D view.** What §5.4 and §8.9–8.10 leave open, or what the single geometry (D-20, D-21) changes:
- *Junctions that move:* one at a time, as in D-22, keeping their offset from the cursor; Shift may be pressed or released during the drag, and a Shift+click without dragging still toggles the junction in the selection. The bends of its pipes follow their ends (D-21), as in the other views, while R-46 keeps them where they are: with one geometry, bends that stayed put would be left behind whenever the junction moves in the schematic.
- *Shift while drawing:* the tip goes up or down the vertical of the last horizontal tip and the pipe turns there, so a move across followed by Shift gives an L, whose corner becomes a bend.
- *← → while drawing:* near a junction they choose between the straight pipe and the routes along the axes in each order (the "previous or next route" of §6.4); elsewhere they turn the camera, as R-41 asks.
- *Route kinds:* a route drawn or edited in this view stays on the grid when every leg runs along an axis and every inner point is a corner; any other route is free (`snap3: false`), its bends kept as they are. So a bend inserted in a straight run, or dragged off the axes, takes the pipe off the grid, and *Fit to the grid* brings it back. Bends are kept to 0.0001 du.
- *Bends of the selected pipe:* every inner point of its route has a handle, the corners of an automatic route included. A click marks a bend and Delete removes it; a double click inserts one on the segment under the cursor, but only on a pipe that was already selected before that double click (on anything else it centres the camera, R-41). *Remove bends* makes the pipe straight, on the grid only when its ends lie on one axis.
- *Edge-on floor:* with the camera within 10° of the horizontal (the Front and Side views), placing, drawing and moving use the vertical plane that faces the camera, through the target for new junctions and through the point being moved or the last point of the pipe; snapping then rounds Z and the horizontal axis that lies in that plane.
- *Controls:* grid density and the working level serve both views (the specification lists the level only for the free view and the density only for the isometric one); the label at the cursor also shows the elevation of the tip.
- *Drop lines* (R-48) go down to the floor (the working plane, or the lowest point of the scene when lower), not to Z = 0: with D-20, Z = 0 is the elevation 0 m, which can be far below the network.

**D-24. No phones (user decision, 16 October 2026).** Pump It no longer supports phones. The phone layout of Phase 4, the *View ▾* button below 980 px of §6.1 and the 375 px checks of §12.2 are dropped. What already exists for small screens (`src/ui/styles/responsive.css`) and the touch navigation of the 3D views (R-41) stay as they are, without further work.

**D-25. Keyboard shortcuts instead of a Help section.** Pump It has no Help window, so the section that §6.3 asks for is a box of its own: *Edit → Keyboard shortcuts…* lists the keys of every view (§6.4, as Pump It implements them) and says in one line that the 3D views share the schematic's geometry.

**D-26. The rest of the panel (§6.3).** With D-20 there is no generated scene and the heights are always the elevations, so *Generate again from the schematic* and *Heights from the elevations…* have nothing to do; their place goes to *Automatic scale*, which picks the vertical scale again as the first entry did. A junction shows X and Y as fields (du; the isometric view rounds the typed value to the grid step), and a point already taken by another junction is refused with a message. Z is not a field: the height is the elevation, edited in the junction's own fields. Item 12 of §13 holds by construction.

**D-27. Speed (R-62).** While the camera or a dragged object moves, the drawing is a lean copy of the scene, built once and then only moved and put back in depth order, moving as few elements as possible (`quick.js`); the grid and the marks of the editors are drawn again each time, and labels, shading, fading, shadows, flow arrows and drop lines come back when the movement stops. Widths change in half-pixel steps during the movement. While drawing or placing, the editors redraw only their own layer. Measured in the browser pane (drawing of 544 × 730 px), on grids of pipes between junctions at random elevations:

| Model | Orbit | Pan | Full drawing |
| --- | --- | --- | --- |
| 544 pipes (1056 segments) | 31 ms per frame (was 87) | 25 ms | 66 ms |
| 1984 pipes (3874 segments) | 106 ms | 81 ms | 216 ms |

**D-28. Camera glides (R-63).** The ready-made views, framing, centring on an object, the turns of the isometric view, the zoom buttons and the camera keys glide for 250 ms (easing in and out; the azimuth turns the short way, the distance and the scale change by equal ratios, `lerpCamera`), drawn with quick frames. Key presses during a glide add up; a pointer press or the wheel stops it where it is; switching between perspective and orthographic is immediate. With `prefers-reduced-motion` every change is immediate.

**D-29. Symbols as solids (user request, 18 October 2026).** The user found the flat symbols out of place in the 3D views, so there each junction is a small solid instead of the `index.html` symbol of §8.11 (billboard, or drawn on the plane of its pipes). The shapes are this project's own, made of cylinders, cones, boxes and spheres after general knowledge of the equipment (an open tank, a pump with its motor, valves with a handwheel or a diaphragm actuator, an orifice plate between flanges, a nozzle, a ball, a drum, a sphere, a block with the letters of the schematic symbols); no icon, drawing or shape of another program was consulted. The schematic keeps its symbols.
- *Orientation:* §8.11 still gives the direction (the last segment of the pipe that arrives, or the first one of the pipe that leaves; the exit valve and the nozzle along their single pipe), and the roll of R-29 turns the solid about it. "Up" is vertical for a horizontal pipe and the front of the plan (−Y) for a vertical one; unlike §8.11, it never depends on the camera, so a solid keeps its shape while the camera turns. Types without a direction stand upright.
- *Size:* fixed on the screen like the symbols of §8.11 (`clamp(k / k_target, 0.6, 1.4)` in perspective), 1.3 times a schematic symbol, whose disc fills more. The labels go above and below the drawn solid instead of at fixed distances.
- *Drawing:* the faces turned away are left out, every face takes one of 16 shades from a light tied to the camera (from the top left, in front), and the parts are painted from the farthest to the nearest; a solid is one item in the painter's order of §8.12, at the depth of its centre. The solid is drawn through the derivative of the projection at its centre, so it meets the pipes of the true projection (to a fraction of a pixel in perspective) and in perspective a ball stays round. A thin outline marks every part; the selection is a halo around the whole solid, an undefined junction a dashed red one; far solids fade like the rest.
- *Pipes:* a pipe stops where it enters the body of the solid (along its own direction), instead of at the edge of a 16 px disc; the cut of R-55 stops short of the solid, which it would bite into.
- *Closed:* an optional `closed(j)` of the junction view says when a junction stops the flow; a closed valve or control valve and a pump off and closed are drawn red.
- *Speed:* a solid is drawn at the size of a schematic symbol and scaled by a transform, so that during quick frames (D-27) it is drawn again only when its shape on the screen changes; a ball, the symbol of the many nodes of large models, never is. On the grid of 544 pipes of D-27 the camera moved as fast with the solids as with the former symbols, within the spread of the measurements.

## Open items for the next phases

- **Very large models.** With about 2000 pipes the camera moves at about 9 frames per second and a full drawing takes about 0.2 s (D-27); a faster drawing would need a canvas instead of SVG, which P4 rules out.
- **Reservoir connections.** A pipe ends at the elevation of its junction, not at the connection elevation that a reservoir can give each of its pipes.
