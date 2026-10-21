# Ends of pipes

A pipe can leave a junction and connect to another one without being drawn again: it keeps its length, material, fittings and all its other data. An end that is connected to no junction is **loose**. The core is `src/core/model/connections.js` (`PumpIt.model`: `connectEnd`, `loosenEnd`, `spotNear`, `swapEnds`, `normalizeEnds`). The commands are in `src/ui/app/editing.js` (`app.connectEnd`, `app.disconnectEnd`, `app.moveLooseEnd`, `app.disconnectJunction`). The schematic is in `src/ui/network/canvas.js` and `drawing.js`, the 3D view in `src/ui/view3d/edit-free.js` and `scene.js`, and the panel in `src/ui/inspector/pipe-panel.js`. The checks are in `tests/pipe-ends.test.cjs`.

| Where | How |
| --- | --- |
| Schematic and 3D view | Select a pipe, then drag the handle at one of its ends. Dropped on another junction, the end connects there; dropped on an empty spot, it stays loose there. A loose end shows as a ring, which can be dragged onto a junction. In the 3D view, Shift moves the end up and down. Esc cancels the drag. |
| Right click | On a pipe, *Disconnect from J…* for each connected end. On a junction, *Disconnect pipes* for all its pipes. |
| Pipe panel | *Connections* sets the start junction and the end junction, each chosen from a list, or *Loose (no junction)*. |

## Decisions

**E-01. Why loose ends (user request, 20 October 2026).** A pipe connected to the wrong junction could only be fixed by deleting it, or the junction with its pipes, and drawing again. Now a pipe end can be loose:

- the pipe stays in the model, drawn up to a ring where the end lies;
- it is incomplete until that end connects to a junction, and the checklist says so with its existing text (*connect to two junctions*);
- the calculation waits, as for any incomplete object.

If the solver is run on such a model anyway, it reports *Pipe P… must be connected to two junctions* in both regimes; before, it failed while reading the elevation of the missing junction. The behaviour is this project's own, written from general knowledge of diagram editors; no other program was looked at.

**E-02. Data.** `pipe.up` or `pipe.down` is `null` at a loose end. Where the end lies is drawing data, `pipe.loose = { up, down }`. Each entry is `{ x, y, z }`: the place on the schematic and the elevation in metres at which the 3D view draws the end. `loose` is one of the `LAYOUT_KEYS`, so:

- the solver never sees it;
- moving a loose end does not recalculate;
- connecting or freeing an end does recalculate, since it changes the network.

The connections are the same in every scenario.

**E-03. Where a freed end goes.** An end freed from the menu or the panel moves from its junction towards the other end of the pipe. It moves 40 units (two grid cells), or half the way when the pipe is shorter, and keeps the elevation the junction has in the current scenario. When the other end sits on top of the junction (a riser), it moves 40 units to the right. A dragged end stays where it is dropped (on a grid point when the grid is on), at the height of the drag.

**E-04. What an end can join.** An end can join any junction except the one at the other end of the same pipe. A drop there is refused with a message, and the panel restores its previous choice. Joining a junction does not check the number of pipes its type allows; the checklist does, as it does for drawn pipes.

**E-05. Deleting.** Deleting a junction still deletes the pipes connected to it. To keep them, use *Disconnect pipes* first. A pipe with loose ends is deleted like any other.

**E-06. Copy, paste, reverse and the area selection.**

- **Copy and paste:** a selected pipe with a loose end is copied with its spot, and the paste shifts the spot as it shifts the junctions.
- **Reverse:** reversing a pipe swaps its loose spots along with its ends.
- **Area selection:** it takes a pipe whose two ends are inside the area; a loose end counts by its spot.
- **Moving a group:** the loose ends of the selected pipes move with it.

**E-07. Loaded models.** On loading:

- an end tied to a junction that is not in the file becomes loose, 60 units to the right of the other end;
- a loose end without a valid spot gets one in the same place;
- the spot of a connected end is dropped.

Models without loose ends open unchanged. The `.fth` importer still leaves out a pipe tied to a missing junction and adds its note ([fth-import.md](fth-import.md)).
