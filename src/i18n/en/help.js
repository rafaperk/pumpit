// Help: the help window, the guided tour and the help texts (src/ui/help/). The bodies are HTML with the tokens
// described in src/ui/help/help.js ([[t:key]], [[eq:id]], [[icon:type]], [[go:…]], [[show:…]], [[act:…]]).
PumpIt.i18n.add('en', {
  help: {
    title: 'Pump It help',
    search: 'Search the help…',
    contents: 'Help contents',
    found: '{n} section(s) found',
    noMatch: 'Nothing found. Try another word.',
    prev: 'Previous',
    next: 'Next',
    close: 'Close the help',
    tourButton: 'Guided tour',

    offer: {
      title: 'New here?',
      body: 'Take a one-minute tour of the screen, or open the help whenever you like (F1).',
      tour: 'Take the tour',
      help: 'Open the help',
      later: 'Not now',
    },

    tour: {
      step: 'Step {n} of {total}',
      next: 'Next',
      back: 'Back',
      done: 'Finish',
      close: 'Leave the tour',
      steps: {
        menus: {
          title: 'Menus',
          body: 'In [[t:app.menu.file]] you create, open, download and export models, and find the ready-made examples. [[t:app.menu.edit]] holds undo, copy, paste, delete and the grid. [[t:app.menu.help]] has this tour, the help center and the technical reference.',
        },
        title: {
          title: 'Model title',
          body: 'Click to give the model a name. The name also becomes the file name when you download the model.',
        },
        stamp: {
          title: 'Calculation regime',
          body: 'Shows whether the model is a liquid (incompressible) or a gas (compressible) and, for a gas, the thermal model and the gas. A click opens the window of the system properties, where the regime is changed.',
        },
        scenario: {
          title: 'Scenarios',
          body: 'Pick the scenario on the screen. The <b>+</b> button creates a child of the current scenario (for example, the pump at 90% speed); the others rename and delete. Each scenario stores only what differs from its parent.',
        },
        status: {
          title: 'Calculation status',
          body: 'There is no calculate button: the model is recalculated after every change. This indicator shows whether something is missing (pending items), whether the calculation converged or whether it was refused. Click it to see the checklist and jump to the incomplete object.',
        },
        language: {
          title: 'Language',
          body: 'Switches the whole interface between Portuguese, English and Spanish, at once. The names you typed are not translated.',
        },
        theme: {
          title: 'Light or dark mode',
          body: 'The sun and the moon switch the screen between the light and the dark mode. Without a choice, the app follows the mode of the system; the choice is kept in this browser.',
        },
        tabs: {
          title: 'Tabs',
          body: '[[t:app.tabs.net]] is where you draw. [[t:app.tabs.data]] lists the inputs in tables; [[t:app.tabs.out]] brings flows, pressures and warnings (the number on the tab counts the warnings); [[t:app.tabs.charts]] shows the pump against the system and the profile of the head lines.',
        },
        palette: {
          title: 'Palette',
          body: '[[t:network.palette.select]] (key <kbd>V</kbd>) and [[t:network.palette.pipe]] (key <kbd>P</kbd>) are the tools. Below them come the junction types, in groups. Drag a type onto the drawing, or click it and then the drawing. The arrow on its right edge collapses the palette and gives its room to the drawing; another click brings it back.',
        },
        canvas: {
          title: 'Drawing area',
          body: 'Click to select and drag a junction to move it. Drag the background to move the view and use the mouse wheel to zoom. A right click on an object shows its data and a few actions.',
        },
        views: {
          title: 'Views',
          body: 'Switch between the 2D schematic and the 3D view (keys <kbd>1</kbd> and <kbd>2</kbd>). Both show the same model: the height of each junction is its elevation. The arrow beside 3D opens the options of that view, and another click closes them; in 3D, the cube at the top right chooses the side to look from.',
        },
        overlay: {
          title: 'Results on the drawing',
          body: 'Colour the pipes by flow, velocity, pressure drop, static pressure or hydraulic grade line. A legend with the scale appears in the corner.',
        },
        zoom: {
          title: 'Zoom',
          body: 'Zoom out, fit the whole drawing or zoom in. The mouse wheel and the keys <kbd>+</kbd>, <kbd>−</kbd> and <kbd>Home</kbd> do the same.',
        },
        inspector: {
          title: 'Properties',
          body: 'Shows and edits the selected object. With nothing selected, it sums up the system and has the button that opens the window of the system properties. Whatever an object still needs appears in a red box; the <b>i</b> next to a field shows a note about it when the mouse rests on it.',
        },
        panel: {
          title: 'Collapse the panel',
          body: 'The arrow collapses the properties panel and gives its room to the drawing; another click brings the panel back. The choice is kept in this browser.',
        },
        help: {
          title: 'Help',
          body: 'Come back here whenever you need to. The help center (<kbd>F1</kbd>) explains every part of the app and brings the technical reference of the calculation, with the equations it uses.',
        },
      },
    },

    chapters: {
      start: {
        title: 'Getting started',
        sections: {
          welcome: {
            title: 'Welcome',
            body: `<p><b>Pump It</b> calculates pipe networks in <b>steady state</b>, for liquids (incompressible flow) and gases (the [[go:gas.concept|compressible mode]]). You draw the network — pipes and junctions such as reservoirs, pumps and valves —, fill in the data, and the program finds the flows and pressures everywhere.</p>
<p>There is no calculate button: <b>every change recalculates the model</b>, as long as the data it needs are complete. Results appear in tables, in charts, in the data card of each object (right click) and on the drawing itself.</p>
<h4>How this help is organised</h4>
<ul>
<li><b>Getting started</b>: build a model from scratch and understand the automatic calculation.</li>
<li><b>User guide</b>, chapters 2 to 11: the screen, drawing, each junction type, pipes, the system, scenarios, results, charts, the 3D view and files.</li>
<li><b>Technical reference</b>: the assumptions, the solution method and the equations of every component.</li>
</ul>
<p>Use the search box at the top to find a subject, and the <b>Previous</b> and <b>Next</b> buttons to read in sequence. Dashed buttons, such as [[show:palette|the palette]], light up the part of the screen the text talks about.</p>
<p>[[act:tour|Take the guided tour of the screen]]</p>`,
          },
          firstModel: {
            title: 'Your first model',
            body: `<p>Let us build a pump that lifts water from a low tank to an elevated one. It takes about five minutes.</p>
<ol class="steps">
<li><b>Start from scratch.</b> Open the [[t:app.menu.file]] menu and choose [[t:app.menu.new]]. The current model can be brought back with <kbd>Ctrl</kbd>+<kbd>Z</kbd>.</li>
<li><b>Place the junctions.</b> From the [[show:palette|palette]], drag [[icon:reservoir]] [[t:junctions.reservoir.label]] to the left of the drawing, [[icon:pump]] [[t:junctions.pump.label]] to the middle and another [[t:junctions.reservoir.label]] to the right.</li>
<li><b>Connect the pipes.</b> Choose the [[t:network.palette.pipe]] tool (key <kbd>P</kbd>) and click the first reservoir, then the pump, then the second reservoir. Press <kbd>Esc</kbd> to finish. Each pipe points from the junction clicked first to the second one, and the pump needs one pipe arriving (suction) and another leaving (discharge).</li>
<li><b>Describe the elevated tank.</b> Click the reservoir on the right and, in the [[show:inspector|Properties]] panel, set [[t:junctions.reservoir.elevation]] to 27 m and [[t:junctions.reservoir.form.liquidElev]] to 30 m. The pump already comes with an example curve, and the pipes with 100 m of 4" Sch 40 carbon steel.</li>
<li><b>See the result.</b> When nothing is missing any more, the [[show:status|indicator]] at the top changes to [[t:app.status.calculated]]. Right-click a pipe to see its flow, velocity and head loss, or select the pump to see its head and power in the panel.</li>
<li><b>Explore.</b> In [[show:overlay|Results on the drawing]], choose [[t:network.overlay.V]] to colour the pipes. Open the [[t:app.tabs.out]] tab for the tables and the [[t:app.tabs.charts]] tab to see the pump curve against the system curve.</li>
</ol>
<p class="tip"><b>Tip:</b> when something is missing, the indicator shows how many pending items there are. Click it: the list takes you straight to the incomplete object, and the panel shows in red what still has to be filled in.</p>
<p>Next steps: try a [[go:start.examples|ready-made example]], create a [[go:scenarios.concept|scenario]] with the pump at 90% speed, or look at the network in the [[go:views3d.concept|3D view]].</p>`,
          },
          examples: {
            title: 'Ready-made examples',
            body: `<p>The [[t:app.menu.file]] → [[t:app.menu.examples]] menu opens complete models, ready to explore. Opening an example replaces the model on the screen, but <kbd>Ctrl</kbd>+<kbd>Z</kbd> brings yours back. The buttons below open each one:</p>
<table>
<tr><th>Example</th><th>What it shows</th></tr>
<tr><td>[[act:example:pump]]</td><td>A pump between a suction tank and an elevated tank, with a gate valve on the discharge. The child scenario runs the pump at 90% speed.</td></tr>
<tr><td>[[act:example:exit]]</td><td>Pumping to a delivery point with a residual pressure, modelled with an exit valve.</td></tr>
<tr><td>[[act:example:gravity]]</td><td>Gravity flow from a dam to a tank, through a valve.</td></tr>
<tr><td>[[act:example:threeRes]]</td><td>The classic problem of three reservoirs joined at one node.</td></tr>
<tr><td>[[act:example:loop]]</td><td>A looped distribution network with demands at the nodes and Hazen-Williams friction.</td></tr>
<tr><td>[[act:example:prv]]</td><td>A pressure-reducing valve feeding a demand. In the peak scenario the upstream pressure is not enough and the valve opens fully.</td></tr>
<tr><td>[[act:example:sprinkler]]</td><td>A sprinkler branch line fed at an imposed pressure.</td></tr>
</table>
<p>An example you have not changed yet is rebuilt in the new language when you switch the interface language.</p>`,
          },
          autoCalc: {
            title: 'Automatic calculation',
            body: `<p>Pump It recalculates the current scenario after every change. For that, the model must be complete — which is what the <b>checklist</b> checks.</p>
<h4>The indicator at the top</h4>
<ul>
<li><span class="dot bad"></span> <b>N pending</b>: something is still missing. Click the indicator to see the list; each incomplete object is a link that selects it.</li>
<li><span class="dot ok"></span> [[t:app.status.calculated]]: the calculation converged and the results are up to date.</li>
<li><span class="dot warn"></span> [[t:app.status.notConverged]]: the solver reached its iteration limit. The numbers are only good for diagnosis; see [[go:system.solution|Solution control]].</li>
<li><span class="dot bad"></span> [[t:app.status.refused]]: the data are complete, but the network cannot be solved — for example, a part with no pressure reference. The message appears in the list and in the status line.</li>
</ul>
<h4>What the list checks</h4>
<ul>
<li>[[t:core.checklist.items.solution]]: valid tolerance, iterations and relaxation.</li>
<li>[[t:core.checklist.items.system]]: the fluid is defined.</li>
<li>[[t:core.checklist.items.pipes]] and [[t:core.checklist.items.junctions]]: every object with its data and with the right number of connected pipes.</li>
</ul>
<p>For an incomplete object, the [[show:inspector|Properties]] panel shows the <b>Undefined</b> box with what is missing, and the object gets a dashed red outline on the drawing.</p>
<p>To the right of the tabs, the [[show:statusLine|status line]] tells how many iterations the calculation took and how long it lasted. When you switch scenarios, the new scenario is calculated at once.</p>`,
          },
          saving: {
            title: 'Your work is saved',
            body: `<p>Every change is stored automatically in the browser: when you open Pump It again on the same computer and in the same browser, the last model comes back.</p>
<p class="warn"><b>Note:</b> this automatic copy lives only in this browser, and clearing the browsing data erases it. To really keep your work, use [[t:app.menu.file]] → [[t:app.menu.save]] and keep the <code>.json</code> file.</p>
<ul>
<li><b>Undo and redo:</b> <kbd>Ctrl</kbd>+<kbd>Z</kbd> and <kbd>Ctrl</kbd>+<kbd>Y</kbd>, or the [[t:app.menu.edit]] menu. The app keeps the last 80 changes. Moving the camera of the 3D view does not enter the undo history.</li>
<li><b>Open a file:</b> [[t:app.menu.file]] → [[t:app.menu.open]].</li>
</ul>
<p>More in [[go:files.files|Files]].</p>`,
          },
        },
      },

      screen: {
        title: 'The screen',
        sections: {
          overview: {
            title: 'Overview',
            body: `<p>The screen has five areas. Click the buttons to see each one lit up:</p>
<ol>
<li>[[show:menus|Top bar]]: menus, model title, scenarios, calculation status, language and light or dark mode.</li>
<li>[[show:tabs|Tabs]]: [[t:app.tabs.net]], [[t:app.tabs.data]], [[t:app.tabs.out]] and [[t:app.tabs.charts]].</li>
<li>[[show:palette|Palette]], on the left: the tools and the junction types.</li>
<li>[[show:canvas|Drawing area]], in the middle: the network, the views, the results on the drawing and the zoom.</li>
<li>[[show:inspector|Properties]], on the right: the data of the selected object.</li>
</ol>
<p>The [[show:paletteToggle|arrow]] on the right edge of the palette and the [[show:panel|arrow]] on the left edge of the properties panel collapse them, and the drawing gets their room; another click brings each one back. The choice is kept in this browser.</p>
<p>For a complete walk, with a short explanation of each part, take the [[act:tour|guided tour]].</p>`,
          },
          topbar: {
            title: 'Top bar',
            body: `<ul>
<li><b>Title</b>: click the name next to the logo to rename the model. The name also becomes the name of the downloaded file.</li>
<li>[[t:app.menu.file]]: new model, open, download, copy and paste the model as JSON text, export the pipes to Excel, and the examples.</li>
<li>[[t:app.menu.edit]]: undo, redo, copy, paste, select all, reverse a pipe, delete, fit the drawing to the screen and turn the grid on or off.</li>
<li>[[t:app.menu.help]]: this help center, the guided tour, the technical reference, the keyboard shortcuts and information about the app.</li>
<li>[[t:app.scenario.label]]: the list picks the scenario on the screen; the buttons next to it create a child scenario, rename and delete. See [[go:scenarios.concept|Scenarios]].</li>
<li><b>Calculation indicator</b>: pending items, convergence and errors. Click it to see the checklist.</li>
<li><b>Language</b>: Portuguese, English or Spanish.</li>
<li><b>Sun and moon</b>: switch between the light and the dark mode. Without a choice, the app follows the mode of the system.</li>
</ul>`,
          },
          tabs: {
            title: 'Tabs',
            body: `<ul>
<li>[[t:app.tabs.net]]: drawing and editing the network, with the palette and the properties panel.</li>
<li>[[t:app.tabs.data]]: the inputs of the current scenario in tables of pipes and junctions. See [[go:results.inputs|Model data]].</li>
<li>[[t:app.tabs.out]]: the summary, the tables of pipes, junctions, pumps and valves, and the warnings. The number on the tab counts the warnings and turns red when one is critical.</li>
<li>[[t:app.tabs.charts]]: the pump against the system and the profile of the head lines.</li>
</ul>
<p>To the right of the tabs is the status line of the calculation.</p>`,
          },
          inspector: {
            title: 'Properties panel',
            body: `<p>The panel on the right follows the selection:</p>
<ul>
<li><b>Nothing selected</b>: a summary of the system and the [[t:inspector.system.open]] button, which opens the [[t:inspector.system.title]] window — regime, fluid, environment, solution control and the current scenario. See [[go:system.fluid|System and solution]].</li>
<li><b>A pipe</b>: quick results, name, geometry, friction, fittings and special condition.</li>
<li><b>A junction</b>: quick results, name, [[t:inspector.junction.type]], [[t:inspector.junction.elevation]] and the data of its type.</li>
<li><b>Several objects</b>: the count and the copy, paste and delete actions.</li>
</ul>
<h4>Fields</h4>
<ul>
<li>Type the value and confirm with <kbd>Enter</kbd> or by leaving the field. A comma or a point works as the decimal separator.</li>
<li>Next to each quantity there is a list of units. <b>Changing the unit does not convert the number</b>: the value is read in the new unit. Pick the unit first and type the value in it.</li>
<li>In a child scenario, a coloured dot next to the label marks a value changed in this scenario. Click the dot to inherit the parent's value again.</li>
<li>The red <b>Undefined</b> box lists what the object still needs to enter the calculation.</li>
<li>An <b>i</b> in a circle, next to a field or to the title of a section, holds a note: rest the mouse on it, or reach it with <kbd>Tab</kbd>, to read it.</li>
</ul>
<h4>Collapsing the panel</h4>
<p>The [[show:panel|arrow]] on the left edge of the panel collapses it, and the drawing gets its room; another click brings it back. The choice is kept in this browser. Going to an object from the checklist, the tables or the warnings opens the panel again.</p>`,
          },
          units: {
            title: 'Units',
            body: `<p>Each field keeps its value exactly as typed, with its unit, and the calculation converts everything to SI internally. The default units are flow in m³/h, length and elevation in m, pressure in kgf/cm²(g) and temperature in °C; diameters and roughness in mm.</p>
<h4>Gauge and absolute pressure</h4>
<p>Units with <b>(g)</b> are gauge pressures, relative to the ambient pressure; with <b>(a)</b>, absolute. The conversion uses the model's [[t:inspector.system.patm]]:</p>
[[eq:gauge]]
<p>Pressure differences (pressure drop, set ΔP) carry neither (g) nor (a).</p>
<h4>Units of the results</h4>
<p>In the result tables and charts, every numeric column has its own list of units in the header. There, changing the unit <b>converts</b> the values shown, without recalculating, and the choice is remembered.</p>
<p>Numbers follow the language: decimal comma in Portuguese and Spanish, decimal point in English. When typing, either one is accepted.</p>`,
          },
        },
      },

      draw: {
        title: 'Drawing the network',
        sections: {
          place: {
            title: 'Placing junctions',
            body: `<p>There are two ways to put a junction on the drawing:</p>
<ul>
<li><b>Drag</b> the type from the [[show:palette|palette]] to the desired place; or</li>
<li><b>Click</b> the type and then the drawing. Hold <kbd>Shift</kbd> while clicking to keep placing the same type.</li>
</ul>
<p>With the grid on ([[t:app.menu.edit]] → [[t:app.menu.grid]]), junctions snap to the grid points. The new junction is selected, ready for its data in the panel.</p>
<p>The position on the schematic does <b>not</b> enter the calculation: the data count, such as the [[t:inspector.junction.elevation]] of each junction and the length of each pipe.</p>
<p>To learn each type, see [[go:junctions.overview|Junction types]].</p>`,
          },
          pipes: {
            title: 'Drawing pipes',
            body: `<ol class="steps">
<li>Choose the [[t:network.palette.pipe]] tool on the palette, or press <kbd>P</kbd>.</li>
<li>Click a junction (it is highlighted) and then another one: the pipe is created between them.</li>
<li>Keep clicking to draw a chain: each click connects the last junction to the next one.</li>
<li>Click an empty spot to create a [[icon:branch]] [[t:junctions.branch.label]] there and connect it.</li>
<li>Press <kbd>Esc</kbd> to let go of the last junction; again, to leave the tool.</li>
</ol>
<h4>Data of a new pipe</h4>
<p>A new pipe copies the length, material, section and friction of the selected pipe or, if none is selected, of the last one created. The first pipe of a model starts with 100 m of 4" Sch 40 carbon steel. The drawn length <b>never</b> counts: type the real length in the panel.</p>
<h4>Reference direction</h4>
<p>The pipe points from the junction clicked first to the second one, as the arrow on the drawing shows. Flows in the reference direction are positive; against it, negative. After the calculation, the arrow shows the actual flow direction. See [[go:draw.direction|Direction and signs]].</p>`,
          },
          connect: {
            title: 'Disconnecting and reconnecting pipes',
            body: `<p>A pipe can change junctions without being drawn again: it keeps its length, material, fittings and all its other data.</p>
<ul>
<li><b>Drag an end</b>: select the pipe and a handle appears at each end. Drag a handle onto another junction to connect that end there, or to an empty spot to leave it loose.</li>
<li><b>Right click</b>: on a pipe, <b>Disconnect from J…</b> frees one end (there is one item for each end); on a junction, [[t:network.menu.disconnectPipes]] frees every pipe connected to it, so the junction can be moved, replaced or deleted while its pipes stay.</li>
<li><b>In the panel</b>: under [[t:inspector.pipe.connections]], [[t:inspector.pipe.startJunction]] and [[t:inspector.pipe.endJunction]] choose the junction of each end from a list, and [[t:inspector.pipe.loose]] frees that end.</li>
</ul>
<p>A <b>loose end</b> is drawn as a ring at the tip of the pipe: drag the ring onto a junction to connect it. While a pipe has a loose end it is incomplete: the checklist says so and the calculation waits.</p>
<p>The reference direction does not change: the start end stays the start. The 3D view works the same way, and there <kbd>Shift</kbd> moves the end up and down. <kbd>Esc</kbd> cancels a drag, and <kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes any change.</p>
<p class="tip"><b>Tip:</b> to put a component in the middle of a pipe, place it, drag one end of the pipe onto it, and draw a new pipe from it to the junction that end left.</p>`,
          },
          select: {
            title: 'Selecting, moving and navigating',
            body: `<table>
<tr><th>Action</th><th>How</th></tr>
<tr><td>Select</td><td>Click the object with the [[t:network.palette.select]] tool (key <kbd>V</kbd>).</td></tr>
<tr><td>Add to or remove from the selection</td><td><kbd>Ctrl</kbd>+click or <kbd>Shift</kbd>+click.</td></tr>
<tr><td>Select by area</td><td><kbd>Shift</kbd>+drag on an empty spot: the junctions inside the rectangle and the pipes with both ends inside are selected.</td></tr>
<tr><td>Select all</td><td><kbd>Ctrl</kbd>+<kbd>A</kbd>.</td></tr>
<tr><td>Clear the selection</td><td>Click an empty spot.</td></tr>
<tr><td>Move</td><td>Drag a junction. If it belongs to a selection, the whole group goes with it.</td></tr>
<tr><td>Move the view</td><td>Drag the background, or use the middle mouse button.</td></tr>
<tr><td>Zoom in and out</td><td>Mouse wheel, the <kbd>+</kbd> and <kbd>−</kbd> keys, or the [[show:zoom|zoom]] buttons.</td></tr>
<tr><td>Fit everything</td><td>The <kbd>Home</kbd> key, the [[t:network.zoom.fit]] button or [[t:app.menu.edit]] → [[t:app.menu.fit]].</td></tr>
</table>`,
          },
          edit: {
            title: 'Editing, copying and deleting',
            body: `<ul>
<li><b>Data</b>: select the object and edit it in the [[show:inspector|Properties]] panel.</li>
<li><b>Change the type of a junction</b>: in the panel, change [[t:inspector.junction.type]]. Name, elevation, position and the compatible data — such as the per-pipe losses and the loss model of valves — are kept.</li>
<li><b>Reverse a pipe</b>: the [[t:inspector.pipe.reverse]] button in the panel, the [[t:app.menu.edit]] → [[t:app.menu.reverse]] menu or a right click on the pipe.</li>
<li><b>Copy and paste</b>: <kbd>Ctrl</kbd>+<kbd>C</kbd> copies the selected junctions, the ends of the selected pipes and the pipes between them, with the values of the current scenario; <kbd>Ctrl</kbd>+<kbd>V</kbd> pastes a shifted copy, and each new paste shifts a little further.</li>
<li><b>Delete</b>: <kbd>Del</kbd>. Deleting a junction also deletes the pipes connected to it. To keep them, use [[t:network.menu.disconnectPipes]] first (see [[go:draw.connect|Disconnecting and reconnecting pipes]]).</li>
<li><b>Undo and redo</b>: <kbd>Ctrl</kbd>+<kbd>Z</kbd> and <kbd>Ctrl</kbd>+<kbd>Y</kbd>.</li>
</ul>
<p class="tip"><b>Tip:</b> the shortcuts do nothing while you type in a field. So <kbd>Del</kbd> erases text, not objects.</p>`,
          },
          context: {
            title: 'Data card (right click)',
            body: `<p>Right-click a pipe or a junction to open its data card, with the main numbers of the object in the default units.</p>
<ul>
<li><b>Pipe</b>: length, diameter, elevations, flow, velocity with its velocity band, head loss, stagnation and static pressures, Reynolds number, friction factor, K of the fittings and the flow direction.</li>
<li><b>Junction</b>: elevation, pressures, flow through and the results of its type, such as the head of a pump, the state of a control valve or the equivalent Cv of a valve.</li>
</ul>
<p>At the bottom of the card are the actions: [[t:network.menu.reverse]] and <b>Disconnect from J…</b> (pipes), [[t:network.menu.disconnectPipes]] (junctions), [[t:network.menu.copy]], [[t:network.menu.paste]] and [[t:network.menu.delete]].</p>`,
          },
          direction: {
            title: 'Direction and signs',
            body: `<p>Every pipe has a <b>reference direction</b>, from its start junction to its end junction. It does not force the fluid to flow that way: if the flow comes out negative, it runs against the reference direction, and the arrow on the drawing turns around after the calculation.</p>
<p>Some components depend on the direction:</p>
<ul>
<li>[[icon:pump]] [[t:junctions.pump.label]] and [[icon:control]] [[t:junctions.control.label]] need exactly one pipe arriving and one leaving; the expected flow goes from the arriving pipe to the leaving one.</li>
<li>In the other two-port components — [[t:junctions.valve.label]], [[t:junctions.orifice.label]] and [[t:junctions.generic.label]] —, the K refers to the upstream pipe, according to the actual flow direction.</li>
</ul>
<p>To fix a pipe drawn the wrong way, use [[t:inspector.pipe.reverse]]. Flow against the reference direction in a component raises a caution, because the given K may not hold that way.</p>`,
          },
        },
      },

      junctions: {
        title: 'Junction types',
        sections: {
          overview: {
            title: 'Overview',
            body: `<p>Junctions sit at the ends of pipes. On the palette they are grouped like this:</p>
<table>
<tr><th>Group</th><th>Type</th><th>Pipes</th><th>Role</th></tr>
<tr><td>[[t:junctions.groups.boundary]]</td><td>[[icon:reservoir]] [[t:junctions.reservoir.label]]</td><td>1 to 25</td><td>Known pressure at the liquid surface</td></tr>
<tr><td></td><td>[[icon:pressure]] [[t:junctions.pressure.label]]</td><td>1 to 25</td><td>Known pressure at a point</td></tr>
<tr><td></td><td>[[icon:flow]] [[t:junctions.flow.label]]</td><td>1</td><td>Known flow entering or leaving</td></tr>
<tr><td></td><td>[[icon:spray]] [[t:junctions.spray.label]]</td><td>1 to 4</td><td>Discharge through an effective area to an external pressure</td></tr>
<tr><td>[[t:junctions.groups.connection]]</td><td>[[icon:branch]] [[t:junctions.branch.label]]</td><td>2 to 25</td><td>Where pipes meet, with an optional source or demand</td></tr>
<tr><td>[[t:junctions.groups.equipment]]</td><td>[[icon:pump]] [[t:junctions.pump.label]]</td><td>2</td><td>Adds head following its head × flow curve</td></tr>
<tr><td>[[t:junctions.groups.valves]]</td><td>[[icon:valve]] [[t:junctions.valve.label]]</td><td>2</td><td>Loss by K, Cv or Kv; may be closed</td></tr>
<tr><td></td><td>[[icon:control]] [[t:junctions.control.label]]</td><td>2</td><td>Holds a pressure, a flow or a ΔP</td></tr>
<tr><td></td><td>[[icon:exitvalve]] [[t:junctions.exitvalve.label]]</td><td>1</td><td>Discharge to a residual pressure</td></tr>
<tr><td>[[t:junctions.groups.losses]]</td><td>[[icon:orifice]] [[t:junctions.orifice.label]]</td><td>2</td><td>Orifice plate</td></tr>
<tr><td></td><td>[[icon:generic]] [[t:junctions.generic.label]]</td><td>2</td><td>Loss by K or by a ΔP × flow curve</td></tr>
</table>
<h4>Pressure reference</h4>
<p>Each connected part of the network needs at least one junction that fixes the pressure: [[t:junctions.reservoir.label]], [[t:junctions.pressure.label]], [[t:junctions.spray.label]] or [[t:junctions.exitvalve.label]] (or a pressure control valve while it controls). Without one, the calculation is refused with a message about a part with no pressure reference.</p>
<h4>Elevation and per-pipe losses</h4>
<p>Every junction has an [[t:inspector.junction.elevation]], used in the gravity term of the equations. [[t:junctions.reservoir.label]], [[t:junctions.pressure.label]] and [[t:junctions.branch.label]] also have the [[t:inspector.pipeLosses.title]] table, with a leaving and an arriving K for each connected pipe. See [[go:pipes.ends|Losses at the ends]].</p>`,
          },
          reservoir: {
            title: 'Reservoir',
            body: `<p>[[icon:reservoir]] A tank or lake with a free surface: the liquid level and the pressure on it are known. It is the most common pressure reference.</p>
<h4>Data</h4>
<ul>
<li>[[t:junctions.reservoir.elevation]]: the elevation of the floor of the tank; a pipe without its own elevation or depth in the per-pipe loss table connects there.</li>
<li>[[t:junctions.reservoir.form.liquidElev]]: the elevation of the liquid surface, on the same datum as the bottom (not the height of liquid above the bottom).</li>
<li>[[t:junctions.reservoir.form.surfP]]: 0 kgf/cm²(g) for an open tank; another value for a pressurised vessel.</li>
<li>[[t:inspector.pipeLosses.title]]: the K leaving the tank into each pipe (a sharp-edged entrance, for instance, has 0.5), the K arriving from the pipe into the tank (an exit into the tank, 1.0) and where each pipe connects (blank means the bottom).</li>
<li>[[t:inspector.pipeLosses.connBy]]: as an elevation, a connection stays where it is; as a depth below the liquid surface, it follows the surface when the level changes (in a scenario, for instance). Switching from one to the other keeps every connection where it is.</li>
</ul>
<p>At the top of the data, a drawing of the tank cut through shows these elevations on one scale: the liquid level and the bottom on the left, the surface pressure above, and each pipe on the right wall where it connects, with its elevation, or with its depth as a dimension from the surface. The field being edited, or under the pointer, lights its part of the drawing.</p>
<h4>How it is calculated</h4>
<p>The reservoir is a node whose stagnation pressure equals the surface pressure, at the elevation of the level. Without any K, the stagnation pressure is continuous between the tank and the end of the pipe. A pipe connected above the liquid level discharges in free fall; if it tries to draw liquid from the tank, a warning appears.</p>
<p>In the results, each reservoir appears under [[t:results.boundaries.title]], with the flow that enters or leaves the network through it.</p>`,
          },
          pressure: {
            title: 'Imposed pressure',
            body: `<p>[[icon:pressure]] A point of known pressure, such as the connection to a public network or a header held at constant pressure.</p>
<ul>
<li>[[t:junctions.pressure.form.ptype]]: [[t:junctions.pressure.form.stagnation]] (the total pressure at the node, the usual choice) or [[t:junctions.pressure.form.static]], which applies to the single connected pipe: the static pressure is the stagnation pressure minus ½ρV² of that pipe.</li>
<li>[[t:junctions.pressure.form.P]]: the imposed value.</li>
</ul>
<p>It takes up to 25 pipes (only 1 with the static type) and has the per-pipe loss table. It works as a pressure reference.</p>`,
          },
          flow: {
            title: 'Imposed flow',
            body: `<p>[[icon:flow]] A known flow that <b>leaves</b> the system (a demand) or <b>enters</b> it (a supply), at the end of a single pipe.</p>
<ul>
<li>[[t:junctions.flow.form.Q]]: a positive value, by mass or by volume.</li>
<li>[[t:junctions.flow.form.dir]]: [[t:junctions.flow.form.out]] or [[t:junctions.flow.form.in]].</li>
</ul>
<p>An imposed flow does not fix the pressure: the network needs a pressure reference somewhere else. With zero flow, the junction works as a closed end.</p>`,
          },
          spray: {
            title: 'Nozzle / sprinkler',
            body: `<p>[[icon:spray]] A nozzle, sprinkler or spray head that discharges to an external pressure, usually the atmosphere. Its flow depends on the pressure available at its inlet.</p>
<ul>
<li>[[t:junctions.spray.form.CdA]]: give the [[t:junctions.spray.form.dHole]], the [[t:junctions.spray.form.nHoles]] and the discharge coefficient Cd.</li>
<li>[[t:junctions.spray.form.K]]: the catalogue K factor, with Q = K·√ΔP (in L/min/bar½, gpm/psi½ or m³/h/bar½). It assumes water.</li>
<li>[[t:junctions.spray.form.Pext]]: the pressure it discharges to; 0 kgf/cm²(g) for the atmosphere.</li>
</ul>
<p>It takes 1 to 4 pipes and works as a pressure reference. The equations are in [[go:tech.valves|Valves, orifices and nozzles]].</p>`,
          },
          branch: {
            title: 'Branch',
            body: `<p>[[icon:branch]] Where two or more pipes meet: a tee, a cross, a change of diameter or of material. The stagnation pressure is the same for all the pipes, except for the losses given in the per-pipe loss table.</p>
<ul>
<li>[[t:junctions.branch.form.source]]: positive enters the system; negative leaves it (a concentrated demand). In most cases, zero.</li>
</ul>
<p>The [[t:network.palette.pipe]] tool creates a branch automatically when you click an empty spot.</p>`,
          },
          pump: {
            title: 'Pump',
            body: `<p>[[icon:pump]] Adds energy to the flow following its head × flow curve. It needs one pipe arriving (suction) and another leaving (discharge).</p>
<h4>State and mode</h4>
<ul>
<li>[[t:junctions.pump.form.state]]: [[t:junctions.pump.form.on]], [[t:junctions.pump.form.offClosed]] (zero flow) or [[t:junctions.pump.form.offOpen]] (neither gain nor loss).</li>
<li>[[t:junctions.pump.form.modes.curve]]: the pump works on its curve, at the given speed (in % of the rated speed).</li>
<li>[[t:junctions.pump.form.modes.fixedFlow]]: the pump delivers the given flow and the calculation shows the head it needs. It uses no curve — it is the mode for choosing a pump.</li>
<li>[[t:junctions.pump.form.modes.controlFlow]], [[t:junctions.pump.form.modes.controlDischarge]] and [[t:junctions.pump.form.modes.controlSuction]]: the speed adjusts to hold the set flow or static pressure, and the result shows the speed needed.</li>
<li>[[t:junctions.pump.form.nPumps]]: identical pumps side by side; each carries the total flow divided by N.</li>
</ul>
<h4>Curves</h4>
<p>Give points of the [[t:junctions.pump.curves.head]] and, if you wish, of the efficiency and of the required NPSH. In each table choose the units and the [[t:inspector.curve.fitType]] (polynomial of order 0 to 4 or linear interpolation); the chart beside it shows the points and the fitted curve, and the calculation always uses the fitted curve. Without an efficiency curve, the shaft power equals the hydraulic power.</p>
<h4>Results</h4>
<p>Head, pressure rise, speed, hydraulic and shaft power, efficiency, and available and required NPSH. Warnings point out reverse flow, operation beyond the end of the curve, insufficient NPSH and poorly fitted curves. The [[t:charts.tabs.pump]] chart shows the operating point. The equations are in [[go:tech.pumps|Pumps]].</p>`,
          },
          valve: {
            title: 'Valve',
            body: `<p>[[icon:valve]] A valve, or any in-line component with a known local loss.</p>
<ul>
<li>[[t:junctions.lossModel.label]]: [[t:junctions.lossModel.K]], [[t:junctions.lossModel.Cv]] or [[t:junctions.lossModel.Kv]].</li>
<li>[[t:junctions.valve.form.closed]]: zero flow. In the 3D view, a closed valve is drawn in red.</li>
</ul>
<p>The results bring the pressure drop, the effective K and the equivalent Cv. For losses that travel with the pipe, such as bends and isolation valves that stay open, you can also use the list of [[go:pipes.fittings|pipe fittings]].</p>`,
          },
          control: {
            title: 'Control valve',
            body: `<p>[[icon:control]] A valve that adjusts itself to hold a value. It needs one pipe arriving and another leaving.</p>
<table>
<tr><th>[[t:junctions.control.form.ctype]]</th><th>Holds</th></tr>
<tr><td>[[t:junctions.control.form.types.PRV]]</td><td>the downstream pressure</td></tr>
<tr><td>[[t:junctions.control.form.types.PSV]]</td><td>the upstream pressure</td></tr>
<tr><td>[[t:junctions.control.form.types.FCV]]</td><td>the flow</td></tr>
<tr><td>[[t:junctions.control.form.types.PDCV]]</td><td>the pressure drop across it</td></tr>
</table>
<ul>
<li>[[t:junctions.control.form.basis]] (PRV and PSV): static pressure (the usual one) or stagnation pressure.</li>
<li>[[t:junctions.control.form.alwaysControl]]: when on, the valve holds its setting even when it would have to add pressure, and the result warns, because a real valve cannot do that. When off, it may open fully or close when it cannot control.</li>
<li>[[t:junctions.control.form.kOpen]]: the loss of the fully open valve.</li>
<li>[[t:junctions.control.form.failAction]] (FCV): open fully or close.</li>
<li>[[t:junctions.control.form.special]]: forces the valve closed or fully open, ignoring the setting.</li>
</ul>
<p>The resulting state — controlling, fully open or closed — appears in the panel and in the valves table. Details in [[go:tech.valves|Valves, orifices and nozzles]].</p>`,
          },
          exitvalve: {
            title: 'Exit valve',
            body: `<p>[[icon:exitvalve]] The end of a pipe that discharges, through a valve, to a known residual pressure — the delivery point of a main, for example. It takes a single pipe and works as a pressure reference.</p>
<ul>
<li>[[t:junctions.exitvalve.elevation]]: the elevation of the outlet.</li>
<li>[[t:junctions.exitvalve.form.Pout]]: the pressure after the valve.</li>
<li>[[t:junctions.lossModel.label]]: K, Cv or Kv. With K = 0, the stagnation pressure at the end of the pipe equals the residual pressure.</li>
</ul>
<p>If the residual pressure is higher than the network's, fluid would enter through the outlet, and a warning says so.</p>`,
          },
          orifice: {
            title: 'Orifice',
            body: `<p>[[icon:orifice]] An orifice plate between two pipes, used to measure or to limit the flow.</p>
<ul>
<li>[[t:junctions.orifice.form.sharp]] and [[t:junctions.orifice.form.rounded]]: the K comes from Idelchik's correlations, from the [[t:junctions.orifice.form.dO]] (and the [[t:junctions.orifice.form.rEdge]], for the rounded one) and the areas of the pipes.</li>
<li>[[t:junctions.orifice.form.Cd]]: K = (1 − β⁴)/Cd² on the velocity in the orifice, converted to the upstream pipe.</li>
<li>[[t:junctions.orifice.form.K]]: a direct K, referred to the upstream pipe.</li>
</ul>
<p>The orifice must be smaller than the pipes. The formulas are in [[go:tech.valves|Valves, orifices and nozzles]].</p>`,
          },
          generic: {
            title: 'Generic component',
            body: `<p>[[icon:generic]] Any component whose loss you know: a filter, a heat exchanger, a meter.</p>
<ul>
<li>[[t:junctions.generic.form.K]]: a loss K·ρV²/2, with the velocity of the upstream pipe.</li>
<li>[[t:junctions.generic.form.curve]]: catalogue points of pressure drop × flow (at least 2), with the fit type of your choice.</li>
</ul>`,
          },
        },
      },

      pipes: {
        title: 'Pipes',
        sections: {
          geometry: {
            title: 'Geometry and material',
            body: `<ul>
<li>[[t:inspector.pipe.length]]: the real hydraulic length. The drawing plays no part.</li>
<li>[[t:inspector.pipe.material]]: [[t:inspector.pipe.userDefined]], to type the diameter, or a catalogue, whose standard gives the inner diameter:
<ul>
<li>[[t:inspector.pipe.materials.steel]] (schedules 40, 80, STD and XS) and [[t:inspector.pipe.materials.stainless]] (5S, 10S, 40S and 80S): the nominal size in inches and the schedule;</li>
<li>[[t:inspector.pipe.materials.hdpe]]: the outside diameter in millimetres, the SDR and the compound (PE 100 or PE 80), which sets the nominal pressure PN; the wall is the minimum of the standard;</li>
<li>[[t:inspector.pipe.materials.ductile]]: the DN and the thickness class (K7 or K9); the inner diameter discounts the cement mortar lining.</li>
</ul>
Choosing a catalogue also sets the roughness of its material, which can still be changed.</li>
<li>[[t:inspector.pipe.section]]: [[t:inspector.pipe.sections.circular]], [[t:inspector.pipe.sections.annulus]] (outer and inner diameters), [[t:inspector.pipe.sections.rectangular]] (width and height) or [[t:inspector.pipe.sections.noncircular]] (area and wetted perimeter). The panel shows the [[t:inspector.pipe.hydraulicDiameter]].</li>
<li>[[t:inspector.pipe.idReduction]]: reduces the hydraulic diameter by a percentage, to simulate deposits on the walls.</li>
<li>[[t:inspector.pipe.nParallel]]: N equal pipes side by side; the flow splits equally among them.</li>
<li>[[t:inspector.pipe.special]]: [[t:inspector.pipe.closed]].</li>
</ul>`,
          },
          friction: {
            title: 'Friction',
            body: `<p>Choose the friction [[t:inspector.pipe.model]]:</p>
<ul>
<li>[[t:inspector.pipe.models.roughness]] (default): give ε, or choose a [[t:inspector.pipe.typicalValue]] — commercial steel 0.046 mm, stainless steel 0.015 mm, galvanised iron 0.15 mm, ductile iron lined with cement mortar 0.1 mm (design) or 0.03 mm (new pipe), PVC and HDPE 0.0015 mm and others.</li>
<li>[[t:inspector.pipe.models.relRoughness]]: the value of ε/D directly.</li>
<li>[[t:inspector.pipe.models.smooth]]: ε = 0.</li>
<li>[[t:inspector.pipe.models.explicitF]]: a constant Darcy friction factor.</li>
<li>[[t:inspector.pipe.models.hw]]: the C coefficient, common in water networks; it does not depend on the viscosity.</li>
<li>[[t:inspector.pipe.models.frictionless]]: for testing only; do not use it in design.</li>
</ul>
<p>The equations — Darcy-Weisbach, Colebrook and the laminar-turbulent transition — are in [[go:tech.friction|Pipe friction]].</p>`,
          },
          fittings: {
            title: 'Fittings',
            body: `<p>The [[t:inspector.fittings.title]] section lists the local losses of the pipe: bends, tees, isolation valves, entrances and exits.</p>
<ol class="steps">
<li>In [[t:inspector.fittings.add]], choose an item of the library, or [[t:core.data.fittings.custom]] to type a K.</li>
<li>Adjust the quantity and, if you wish, the value.</li>
</ol>
<p>Items marked <b>·f<sub>T</sub></b> follow the K/f<sub>T</sub> method of Crane TP-410: K = n·f<sub>T</sub>, with f<sub>T</sub> computed for the actual inner diameter of the pipe (the panel shows [[t:inspector.fittings.craneFT]]). The others have a constant K. Their sum, [[t:inspector.fittings.sumK]], acts on the pipe velocity, as a loss spread along the pipe.</p>
<p class="tip"><b>Tip:</b> for a valve you want to open, close or follow in the results, use the [[t:junctions.valve.label]] junction instead.</p>`,
          },
          ends: {
            title: 'Losses at the ends',
            body: `<p>At single-node junctions — [[t:junctions.reservoir.label]], [[t:junctions.pressure.label]] and [[t:junctions.branch.label]] —, the [[t:inspector.pipeLosses.title]] table defines, for each connected pipe:</p>
<ul>
<li>[[t:inspector.pipeLosses.kOut]]: the loss when the fluid leaves the junction and enters the pipe (for example, a sharp-edged entrance, 0.5).</li>
<li>[[t:inspector.pipeLosses.kIn]]: the loss when the fluid arrives from the pipe into the junction (for example, the exit into a tank, 1.0).</li>
<li>[[t:inspector.pipeLosses.elevation]] or [[t:inspector.pipeLosses.depth]] (reservoir only): where that pipe connects, as an elevation or as a depth below the liquid surface ([[t:inspector.pipeLosses.connBy]]); blank means the bottom.</li>
</ul>
<p>Each K uses the area of its own pipe and acts only in the matching flow direction.</p>`,
          },
        },
      },

      system: {
        title: 'System and solution',
        sections: {
          fluid: {
            title: 'Fluid',
            body: `<p>The properties of the system are in the [[t:inspector.system.title]] window. It opens from the [[show:stamp|regime stamp]], next to the title of the model; from the [[t:app.menu.edit]] → [[t:app.menu.system]] menu; from the items of the system in the checklist; or from the [[t:inspector.system.open]] button of the panel, with nothing selected. Each change applies at once, as in the panel. At the top of the window is the [[t:inspector.system.regime]]; with [[t:inspector.system.regimes.incompressible]], the [[t:inspector.system.fluid]] section has:</p>
<ul>
<li>[[t:core.fluids.water.label]]: give the [[t:inspector.system.temperature]] (0 to 150 °C); density, viscosity and vapour pressure come from public correlations.</li>
<li>[[t:inspector.system.userDefined]]: give the density, the dynamic viscosity and, if you want the cavitation warnings, the vapour pressure.</li>
</ul>
<p>The values in use (ρ, μ and Pv) appear just below. In this regime the fluid has a constant density and a single temperature; for gases, see [[go:gas.concept|the compressible mode]]. The correlations are in [[go:tech.fluid|Water properties]].</p>`,
          },
          environment: {
            title: 'Environment and flow',
            body: `<ul>
<li>[[t:inspector.system.patm]]: converts gauge pressures into absolute ones and enters the available NPSH. The default, 1.03323 kgf/cm²(a), is sea level.</li>
<li>[[t:inspector.system.gravity]]: a multiple of the standard gravity, g₀ = 9.80665 m/s².</li>
<li>[[t:inspector.system.reLam]] and [[t:inspector.system.reTurb]]: the limits of the flow regime (2300 and 4000 by default). Between them, the friction factor is interpolated linearly.</li>
<li>[[t:inspector.system.laminarK]]: in laminar flow, the losses of fittings grow. [[t:inspector.system.craneFt]] (default) and [[t:inspector.system.pipeFt]] multiply the K by the ratio of the laminar friction factor to a turbulent reference factor; [[t:inspector.system.noCorrection]] uses the K as given. Details in [[go:tech.minor|Local losses]].</li>
</ul>`,
          },
          solution: {
            title: 'Solution control',
            body: `<ul>
<li>[[t:inspector.system.tolRel]] (default 0.0001): the calculation stops when the relative change of every flow and pressure stays below it in two iterations in a row.</li>
<li>[[t:inspector.system.maxIter]] (default 500): the iteration limit.</li>
<li>[[t:inspector.system.relax]] (default 1): the fraction of the Newton step applied at each iteration, between 0 and 1.</li>
<li>[[t:inspector.system.adaptive]] (on): halves the step when it makes the residuals worse.</li>
<li>[[t:inspector.system.checkMass]] (on): checks mass conservation at every junction and warns when something does not add up.</li>
</ul>
<p class="tip"><b>If the calculation does not converge:</b> check the data (consistent pump curves, control valves with achievable settings), keep the adaptive relaxation on and try a smaller relaxation, such as 0.5. A relaxation close to the tolerance may look converged without being so — the app warns when that happens.</p>
<p>The method is in [[go:tech.newton|Solution method]].</p>`,
          },
        },
      },

      scenarios: {
        title: 'Scenarios',
        sections: {
          concept: {
            title: 'How they work',
            body: `<p>Scenarios let you compare variations of the same system — another speed, a closed valve, a peak demand — without copying the model.</p>
<ul>
<li>The <b>Base</b> scenario defines everything. Each child scenario stores <b>only what differs</b> from its parent; the rest is inherited.</li>
<li>Changing a value in the parent also changes the children that did not override that attribute.</li>
<li>The <b>topology is the same</b> in every scenario: adding or deleting pipes and junctions applies to all of them. To "remove" a part in one scenario, close the pipe or the valve in it.</li>
<li>Each scenario has its own results, calculated when it comes to the screen.</li>
</ul>`,
          },
          working: {
            title: 'Creating and comparing',
            body: `<ol class="steps">
<li>In the [[t:app.scenario.label]] list, pick the scenario that will be the parent and click <b>+</b>. Give the new scenario a name: it becomes the current one.</li>
<li>Change the values that differ. A coloured dot appears next to every changed field; click the dot to inherit the parent's value again.</li>
<li>Switch scenarios in the list to compare the results.</li>
</ol>
<ul>
<li>The [[t:inspector.system.scenario]] section (in the [[t:inspector.system.title]] window) holds the notes of the scenario, the number of changed attributes and the [[t:inspector.system.showDiffs]] button, with the table "in this scenario × in the parent".</li>
<li>In the [[t:app.tabs.data]] tab, the cells that differ from the parent are highlighted.</li>
<li>The buttons next to the list rename and delete the current scenario, together with its children. The Base scenario cannot be deleted.</li>
</ul>`,
          },
        },
      },

      results: {
        title: 'Results',
        sections: {
          overlay: {
            title: 'Results on the drawing',
            body: `<p>The [[show:overlay|Results on the drawing]] list, at the bottom of the drawing area, colours the pipes by a quantity and writes the values next to them:</p>
<ul>
<li>[[t:network.overlay.Q]], [[t:network.overlay.V]] and [[t:network.overlay.dP0]]: the values of each pipe.</li>
<li>[[t:network.overlay.P]] and [[t:network.overlay.HGL]]: the mean of the inlet and the outlet of each pipe; the junctions show their own value.</li>
</ul>
<p>A legend shows the scale. Velocity uses a fixed scale for water, explained in [[go:results.velocity|Velocity scale]]; the other quantities go from the minimum to the maximum of the model.</p>
<p>It also works in the 3D view. There must be results: complete the checklist.</p>`,
          },
          tables: {
            title: 'Results tab',
            body: `<p>The [[t:app.tabs.out]] tab has six parts:</p>
<ul>
<li>[[t:results.tabs.general]]: calculation status, iterations, fluid and environment; [[t:results.boundaries.title]], with what enters and leaves the network at each boundary; and the warnings.</li>
<li>[[t:results.tabs.pipes]]: nominal size, schedule, elevations, flow, velocity, stagnation pressures at the inlet and at the outlet, and K of the fittings.</li>
<li>[[t:results.tabs.junctions]]: stagnation and static pressures, ΔP0, effective K, flow through, HGL and elevation.</li>
<li>[[t:results.tabs.pumps]]: flow, head, ΔP, speed, efficiency, powers and NPSH.</li>
<li>[[t:results.tabs.valves]]: state, flow, ΔP0, inlet static pressure, effective Cv and K.</li>
<li>[[t:results.tabs.warnings]]: the full list of warnings.</li>
</ul>
<p>Click a row, or a warning, to find the object on the drawing. Every numeric column picks its own unit in the header.</p>
<h4>Taking it to Excel</h4>
<p>In [[t:results.tabs.pipes]], [[t:results.exportExcel]] creates an .xlsx file with a formatted header, numbers stored as values and a filter; [[t:results.copyExcel]] copies the table to paste into a spreadsheet. The other tables have the [[t:results.copyTable]] button.</p>`,
          },
          warnings: {
            title: 'Warnings',
            body: `<p>Warnings come in three levels: [[t:results.level.critical]] (the result probably does not represent reality), [[t:results.level.warning]] (something deserves attention) and [[t:results.level.caution]] (a remark). The most common ones:</p>
<table>
<tr><th>Warning</th><th>What to do</th></tr>
<tr><td>The solution did not converge</td><td>Review the data and see [[go:system.solution|Solution control]].</td></tr>
<tr><td>Static pressure below the vapour pressure</td><td>Risk of cavitation or of column separation: raise the pressure (elevations, pump) or reduce the losses.</td></tr>
<tr><td>Available NPSH below the required NPSH</td><td>The pump will cavitate: raise the suction pressure or reduce the losses before it.</td></tr>
<tr><td>Pump beyond the end of its curve, or reverse flow in the pump</td><td>The operating point left the given curve: extend the curve or review the system.</td></tr>
<tr><td>Control valve adding pressure, or not controlling</td><td>The setting cannot be reached with the available pressure: review the setting or the system.</td></tr>
<tr><td>Flow against the reference direction</td><td>Check that the component is connected the right way.</td></tr>
<tr><td>Mass imbalance at a junction</td><td>Continuity did not close: reduce the tolerance.</td></tr>
<tr><td>Part with no pressure reference</td><td>Connect a reservoir, an imposed pressure or a nozzle to that part.</td></tr>
</table>
<p>The number on the [[t:app.tabs.out]] tab counts the warnings and turns red when one is critical. Click a warning to find the object.</p>`,
          },
          velocity: {
            title: 'Velocity scale',
            body: `<p>With [[t:network.overlay.V]], the colour follows a fixed scale for water — not the minimum and maximum of the model —, so that the same colour means the same band in any network:</p>
<table>
<tr><th>Velocity (m/s)</th><th>Band</th></tr>
<tr><td>below 0.6</td><td>[[t:core.data.velocity.belowMin]]: risk of sedimentation</td></tr>
<tr><td>0.6 to 1.0</td><td>[[t:core.data.velocity.low]]: the pipe may be oversized</td></tr>
<tr><td>1.0 to 2.5</td><td>[[t:core.data.velocity.economic]]</td></tr>
<tr><td>2.5 to 3.0</td><td>[[t:core.data.velocity.high]]</td></tr>
<tr><td>3.0 to 5.0</td><td>[[t:core.data.velocity.veryHigh]]</td></tr>
<tr><td>above 5.0</td><td>off the scale (black)</td></tr>
</table>
<p>These are design references, not code limits: the economic velocity of each installation depends on the energy cost, the operating hours and the material. The data card and the pipe panel show the band next to the velocity.</p>`,
          },
          inputs: {
            title: 'Model data',
            body: `<p>The [[t:app.tabs.data]] tab lists the inputs of the current scenario: a table of pipes (connection, length, material, section, friction, fittings, parallel pipes and condition) and one of junctions (type, elevation and main data).</p>
<ul>
<li>Highlighted cells differ from the parent scenario.</li>
<li>Incomplete objects appear as undefined.</li>
<li>Click a row to select the object and edit it in the [[t:app.tabs.net]] tab.</li>
</ul>`,
          },
        },
      },

      charts: {
        title: 'Charts',
        sections: {
          pump: {
            title: 'Pump × system',
            body: `<p>Choose the pump in the list. The chart shows:</p>
<ul>
<li>the <b>pump curve</b> at the current speed, already including the pumps in parallel, if any;</li>
<li>the <b>system curve</b>: the head the rest of the network demands for each flow. It is obtained by running the solver several times with a fixed flow in the pump, with the rest of the model as it is in the current scenario;</li>
<li>the <b>operating point</b>, when the model is calculated.</li>
</ul>
<p>The flow and head units are chosen in the lists above the chart. In the [[t:junctions.pump.form.modes.fixedFlow]] mode only the system curve appears — useful for choosing a pump.</p>`,
          },
          profile: {
            title: 'Profile',
            body: `<p>The profile shows how the quantities change along a path of pipes:</p>
<ol class="steps">
<li>Choose the junctions [[t:charts.profile.from]] and [[t:charts.profile.to]]. The path is the one with the fewest pipes between them, in any direction.</li>
<li>Choose the [[t:charts.profile.quantity]]: [[t:charts.profile.heads]] (HGL, EGL and the pipe elevation) or [[t:charts.profile.pressures]] (with the vapour pressure as a reference).</li>
</ol>
<p>Vertical steps are junctions with a loss or a gain, such as pumps and valves. HGL and EGL use absolute pressure.</p>`,
          },
        },
      },

      views3d: {
        title: '3D view',
        sections: {
          concept: {
            title: 'Schematic and 3D',
            body: `<p>At the top of the drawing area, [[show:views|Schematic · 3D]] (keys <kbd>1</kbd> and <kbd>2</kbd>) switches between two views of the <b>same model</b>:</p>
<ul>
<li>the schematic is the <b>plan</b>: the position of each junction on the schematic is its position on the plane;</li>
<li>the <b>height</b> of each junction is its elevation, multiplied by the [[t:inspector.view3.zScale]];</li>
<li>moving a junction in one view moves it in the other, and raising or lowering a junction in the 3D view <b>changes its elevation</b> and recalculates;</li>
<li>routes, bends and plan positions are drawing only: <b>no length ever comes from the drawing</b>.</li>
</ul>
<p>On the first entry, the app picks a vertical scale that keeps the heights readable. Pipes appear as shaded tubes as thick as their bore, nearer ones over farther ones, and junctions as small 3D objects.</p>
<p>Tubes and objects belong to the scene: zooming in or out makes them larger or smaller together with the network, in the proportions of the schematic, and in perspective nearer ones look larger, until they come so close to the camera that they fade out and are cut away, so that nothing fills the screen. The labels keep their size on the screen.</p>`,
          },
          free: {
            title: '3D view',
            body: `<h4>Navigating</h4>
<p>Drag the background to orbit about what the middle of the screen shows; the right button, the middle button or <kbd>Shift</kbd>+drag move the view; the wheel zooms at the cursor, towards what lies under it; a double click centres on an object. The arrow keys turn the camera by 15°, and <kbd>Shift</kbd>+arrows move the view.</p>
<h4>The view cube</h4>
<p>The cube at the top right turns with the camera and names the sides of the network: the top, the front (the bottom of the schematic), the right and their opposites. Click a face, an edge or a corner to look from that side, with the network framed: a face gives the view straight on, like the plan from the top, an edge the view between two faces, and a corner the isometric. Drag the cube to turn the camera. On a face seen straight on, the arrows around it go to the faces next to it. With the cube focused (<kbd>Tab</kbd>), the arrow keys go to the next view. [[t:app.menu.options]] → [[t:app.menu.viewCube]] hides it.</p>
<h4>Options</h4>
<p>The arrow beside [[t:network.view3.mode.3d]], at the top of the drawing, opens the options of this view, and another click closes them: buttons that turn the view by 15°, [[t:network.view3.center]], [[t:network.view3.grid]], [[t:network.view3.snap]], [[t:network.view3.shadows]], [[t:network.view3.stems]] and the working [[t:network.view3.level]]. The [[t:app.menu.options]] menu, beside [[t:app.menu.file]], holds the density of the grid ([[t:network.view3.density.fine]], [[t:network.view3.density.medium]] or [[t:network.view3.density.coarse]]) and the projection ([[t:network.view3.persp]] or [[t:network.view3.ortho]]).</p>
<h4>Editing</h4>
<ul>
<li><b>Placing</b>: with a type of the palette, click the working plane. The junction goes to the working [[t:network.view3.level]], which <kbd>PageUp</kbd> and <kbd>PageDown</kbd> raise and lower; <kbd>Shift</kbd> keeps the tool.</li>
<li><b>Pipes</b>: the pipe runs across, on the plane of its last point; hold <kbd>Shift</kbd> to go up or down and <kbd>Ctrl</kbd> to keep it on the nearest axis; <kbd>Alt</kbd>+click or <kbd>D</kbd> makes a bend; near a junction, <kbd>←</kbd> and <kbd>→</kbd> choose the route to it; a click on empty space ends the pipe at a new node.</li>
<li><b>Moving</b>: drag a junction across; with <kbd>Shift</kbd>, up and down (its elevation changes).</li>
<li><b>Bends</b>: with a pipe selected, drag a bend, double-click the pipe to insert another, or mark one and press <kbd>Del</kbd>.</li>
<li><b>Ends of pipes</b>: with a pipe selected, drag the handle at an end onto another junction, or away to leave it loose; <kbd>Shift</kbd> moves it up and down. A loose end is a ring: drag it onto a junction. See [[go:draw.connect|Disconnecting and reconnecting pipes]].</li>
</ul>
<p>Seen from the front, the back or a side, the floor is edge on, so placing, drawing and moving use the vertical plane facing the camera.</p>`,
          },
          symbols: {
            title: 'Symbols and the 3D panel',
            body: `<p>In the 3D view each junction is a small solid: an open tank with its liquid, a pump with its motor and an arrow along the flow, a valve with its handwheel, a control valve under its actuator, an orifice between flanges, a nozzle with drops, a ball for a branch, a drum (Q), a sphere (P) and a block (K). They follow the direction of their pipes and turn red when the junction stops the flow, such as a closed valve or a pump off and closed.</p>
<p>With the 3D view open, the panel gains the [[t:inspector.view3.title]] section:</p>
<ul>
<li>with nothing selected: [[t:inspector.view3.zScale]], [[t:inspector.view3.autoScale]] and [[t:inspector.view3.fitAll]];</li>
<li>on a pipe: the drawn length (which does not enter the calculation), the bends, [[t:inspector.view3.snap]], [[t:inspector.view3.fit]], [[t:inspector.view3.nextRoute]] and [[t:inspector.view3.removeBends]];</li>
<li>on a junction: X and Y on the plan and, for the oriented types, [[t:inspector.view3.roll]], which turns the symbol about its pipe, and [[t:inspector.view3.auto]].</li>
</ul>
<p>Every key is in [[act:shortcuts|Keyboard shortcuts]].</p>`,
          },
        },
      },

      files: {
        title: 'Files and language',
        sections: {
          files: {
            title: 'Files',
            body: `<table>
<tr><th>Command in [[t:app.menu.file]]</th><th>What it does</th></tr>
<tr><td>[[t:app.menu.new]]</td><td>Starts an empty model (it can be undone).</td></tr>
<tr><td>[[t:app.menu.open]]</td><td>Opens a model saved as .json, or imports a model in the .fth or .aro formats (below). Dragging the file onto the window does the same.</td></tr>
<tr><td>[[t:app.menu.save]]</td><td>Downloads the model as <code>title.pumpit.json</code>, with all its scenarios and its drawing.</td></tr>
<tr><td>[[t:app.menu.copyJson]] and [[t:app.menu.pasteJson]]</td><td>Copies the model as text, or opens a model pasted as text — handy for sending it in a message.</td></tr>
<tr><td>[[t:app.menu.exportXlsx]]</td><td>Creates the spreadsheet with the results table of the pipes.</td></tr>
<tr><td>[[t:app.menu.examples]]</td><td>Opens the example models.</td></tr>
</table>
<p>The model is also saved automatically in the browser after every change. Models of older versions are converted when opened: junction types that were removed become the closest equivalent, and a message tells what changed.</p>
<h4>Models in the .fth format</h4>
<p>[[t:app.menu.open]] also reads <code>.fth</code> files, a text format of pipe network models. When the file has several scenarios, a window lists them (with their descriptions, marking those with stored results and those without a network, which cannot be chosen): the one you choose comes in, rebuilt from the base scenario. The base scenario may itself be empty, with the network only in the scenarios derived from it. To bring in another one, open the file again.</p>
<p>Pipes, junctions, elevations, units and drawing come in with what the model needs to run:</p>
<ul>
<li>open and closed pipes and valves, control valves with their kind, set point and fixed state, and pumps on or off, with their speed and the curve of the configuration in use;</li>
<li>reservoirs with their liquid level, surface pressure and, for each pipe, its K and its depth below the surface, exit valves with their outlet pressure and nozzles with their K factor;</li>
<li>the fluid of the file and its ambient pressure, the reference of the gauge pressures.</li>
</ul>
<p>A report then shows how the first calculation compares with the results stored in the file, what needs your input (left blank and marked in red in the checklist), what was assumed, what was left out (add-on modules, heat transfer) and what was read. Detailed tee losses come from the stored operating point, and some readings of the format still to be confirmed have a note each. Use the import for your own models.</p>
<h4>Models in the .aro format</h4>
<p>[[t:app.menu.open]] also reads <code>.aro</code> files, the same kind of text format for networks of a gas. The model comes in the compressible mode, with the scenario you choose, as for a .fth file:</p>
<ul>
<li>the gas from the data of the file (its molar mass, k from its specific heat, its viscosity at the temperature of the sources and Z by the Pitzer–Abbott correlation; for a mixture, estimated from its components) and the thermal model: isothermal when every pipe is, adiabatic otherwise;</li>
<li>reservoirs, imposed pressures and flows with the temperature of their gas, valves, exit valves, control valves of flow and of pressure, and compressors with a fixed flow or a curve, turned into the head against the suction flow of Pump It;</li>
<li>flows in mass, in volume at the local conditions or at normal ones; standard volumes become normal ones through the standard conditions of the file.</li>
</ul>
<p>The same report follows, comparing the first calculation with the stored results and listing what needs your input, what was assumed and what was left out (heat transfer, add-on modules).</p>`,
          },
          language: {
            title: 'Language and numbers',
            body: `<p>The selector at the top right switches the whole interface between <b>Português</b>, <b>English</b> and <b>Español</b>, without reloading the page: menus, panels, tables, charts, warnings and this help. The choice is remembered, and on the first visit the app follows the browser's language.</p>
<ul>
<li>Numbers follow the language (decimal comma or point); when typing, both work.</li>
<li>The names you type — title, objects, scenarios — are never translated.</li>
<li>An example not yet changed is rebuilt in the new language.</li>
</ul>`,
          },
          shortcuts: {
            title: 'Keyboard shortcuts',
            body: `<p>The main shortcuts, which work outside text fields:</p>
<table>
<tr><td><kbd>F1</kbd></td><td>Opens this help</td></tr>
<tr><td><kbd>V</kbd> · <kbd>P</kbd></td><td>[[t:network.palette.select]] and [[t:network.palette.pipe]] tools</td></tr>
<tr><td><kbd>1</kbd> · <kbd>2</kbd></td><td>[[t:network.view3.mode.2d]] and [[t:network.view3.mode.3d]] views</td></tr>
<tr><td><kbd>Esc</kbd></td><td>Lets go of the pipe being drawn, then leaves the tool</td></tr>
<tr><td><kbd>Del</kbd></td><td>Deletes the selection</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd> · <kbd>Ctrl</kbd>+<kbd>Y</kbd></td><td>Undo · redo</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>C</kbd> · <kbd>Ctrl</kbd>+<kbd>V</kbd> · <kbd>Ctrl</kbd>+<kbd>A</kbd></td><td>Copy · paste · select all</td></tr>
<tr><td><kbd>Home</kbd> · <kbd>+</kbd> · <kbd>−</kbd></td><td>Fit · zoom in · zoom out</td></tr>
</table>
<p>The complete list, with the keys of the 3D view: [[act:shortcuts|Keyboard shortcuts]].</p>`,
          },
        },
      },

      tech: {
        title: 'Technical reference',
        sections: {
          overview: {
            title: 'Assumptions and quantities',
            body: `<p>Pump It solves the <b>steady-state</b> flow of an <b>incompressible liquid</b> in a network of pipes and components (for gases, the compressible mode has its own [[go:gasTech.properties|technical reference]]), under these assumptions:</p>
<ul>
<li>constant fluid properties, evaluated at a single temperature, with no heat transfer;</li>
<li>one-dimensional, fully developed flow in each pipe, with losses by Darcy-Weisbach (or Hazen-Williams);</li>
<li>components lumped at the junctions, with local losses or characteristics of their own (pump curve, control);</li>
<li>no transients (water hammer), compressibility or two-phase flow — a pressure below the vapour pressure only raises a warning.</li>
</ul>
<h4>Quantities</h4>
<p>Internally everything is in SI and pressures are <b>absolute</b>. The pressure variable at the nodes is the <b>stagnation</b> (total) pressure, where <i>p</i> is the static pressure:</p>
[[eq:stagnation]]
<p>The heads are calculated with the absolute pressure:</p>
[[eq:heads]]
<p>The elevation <i>z</i> of each point is the elevation of its junction, or the connection elevation given. Flows are mass flows <i>ṁ</i>; the volumetric flow is <i>Q</i> = <i>ṁ</i>/<i>ρ</i>.</p>`,
          },
          network: {
            title: 'Network model',
            body: `<p>The model becomes a graph of <b>nodes</b> and <b>links</b>:</p>
<ul>
<li>Single-node junctions (reservoir, imposed pressure, imposed flow, nozzle, branch, exit valve) are one node. The nozzle and the exit valve also get an external node, of fixed pressure, and a discharge link to it.</li>
<li>Two-port components (pump, valves, orifice, generic component) become an inlet node, an outlet node and a link between them.</li>
<li>Each pipe is a link between the nodes of its ends.</li>
</ul>
<p>The unknowns are the mass flow of each link and the stagnation pressure of each node.</p>
<h4>Node equations</h4>
<p>At a free node continuity holds, where ṁ<sub>dem</sub> is the node's demand (an imposed flow or the source of a branch, with its sign):</p>
[[eq:continuity]]
<p>At a fixed-pressure node (reservoir, imposed pressure, external node), the pressure is known — the stagnation pressure, or the static pressure of the connected pipe:</p>
[[eq:fixedNode]]
<h4>Link equations</h4>
<p>On a link with a loss (pipe, valve, orifice, pump, discharge), the energy between the ends <i>a</i> and <i>b</i> is:</p>
[[eq:linkLoss]]
<p>Δp(ṁ) is the loss of the link, with the sign of the flow; in a pump it is negative, a gain. The gravity term exists on pipes, which join different elevations. Depending on its state, a link may have another equation: zero flow (closed), fixed flow (fixed-flow pump, flow control), fixed static pressure downstream or upstream (pressure control) or fixed pressure difference (ΔP control).</p>
<h4>Uniqueness</h4>
<p>Before solving, the app separates the connected parts of the network. Each part needs a pressure reference. A part with no reference and no forced flow is isolated (zero flow, undefined pressure); with a forced flow and no reference, the calculation is refused.</p>`,
          },
          newton: {
            title: 'Solution method',
            body: `<p>The system is solved by the <b>Newton-Raphson method</b> on all the unknowns at once — the same system as the gradient method of Todini and Pilati (1988), which extends Jeppson's formulation (1976) to networks with components:</p>
[[eq:newtonStep]]
<p><i>R</i> is the vector of residuals of the node and link equations, and <i>J</i> is the Jacobian matrix. The derivatives of the losses are numerical, by central differences, with a minimum value that avoids a singular Jacobian at zero flow:</p>
[[eq:jacobian]]
<p>The linear system is solved by Gaussian elimination, with row equilibration and partial pivoting.</p>
<h4>Initial guess</h4>
<p>1 m/s in every pipe, in the reference direction, and, at the nodes, the mean of the fixed pressures. When a device changes state, the previous solution becomes the new guess.</p>
<h4>Relaxation and line search</h4>
<p>The step applied is α·Δx, with α equal to the relaxation. With adaptive relaxation, α is halved (up to 10 times) while the norm of the scaled residuals does not drop enough; near the solution, the full step is always accepted:</p>
[[eq:lineSearch]]
<h4>Convergence</h4>
<p>The criterion uses the full Newton step, not the relaxed one, so that a small step is not mistaken for convergence:</p>
[[eq:convergence]]
<p>ε<sub>i</sub> is an absolute floor for flows and pressures close to zero. The criterion must be met in two iterations in a row.</p>
<h4>Devices with a state</h4>
<p>Control valves have states (controlling, fully open, closed). After each convergence, the app reviews the states; if any changed, it solves again, up to 50 passes. If the states start cycling, the calculation stops with a warning that no unique solution is possible.</p>
<h4>Mass check</h4>
<p>With the check on, mass conservation is verified at every free node: an imbalance larger than the relative tolerance times the flow of the node raises a warning.</p>`,
          },
          friction: {
            title: 'Pipe friction',
            body: `<p>The mean velocity and the Reynolds number of each pipe (N equal pipes in parallel share the flow):</p>
[[eq:velocity]]
<p>The distributed loss follows Darcy-Weisbach:</p>
[[eq:darcy]]
<h4>Friction factor</h4>
<p><b>Laminar</b> (<i>Re</i> &lt; Re<sub>lam</sub>, 2300 by default): Hagen-Poiseuille.</p>
[[eq:laminar]]
<p><b>Turbulent</b> (<i>Re</i> &gt; Re<sub>turb</sub>, 4000 by default): the Colebrook equation in its original form (constants 1.14 and 9.35), solved by iteration to a precision of 10⁻¹³:</p>
[[eq:colebrook]]
<p><b>Transition</b>: linear interpolation in <i>Re</i> between the laminar value at Re<sub>lam</sub> and the Colebrook value at Re<sub>turb</sub>:</p>
[[eq:transition]]
<p>The hydraulically smooth model uses ε = 0; a given factor holds in every regime; without friction, Δp<sub>f</sub> = 0.</p>
<h4>Hazen-Williams</h4>
<p>It depends on neither the viscosity nor the regime. The coefficient <i>k</i> was calibrated against reference results (the classic 0.8492 gives a loss about 0.1% lower):</p>
[[eq:hazen]]
<h4>Non-circular sections</h4>
<p>Every formula uses the hydraulic diameter — for the circular section, the annulus, the rectangle with sides <i>a</i> and <i>b</i>, or the given area and perimeter:</p>
[[eq:hydraulicDiameter]]
<p>Fouling reduces the hydraulic diameter and the area (<i>r</i> is the reduction as a fraction):</p>
[[eq:fouling]]`,
          },
          minor: {
            title: 'Local losses',
            body: `<p>Every local loss uses a coefficient K on the dynamic pressure:</p>
[[eq:minor]]
<ul>
<li><b>Pipe fittings</b>: the K values add up and use the velocity of the pipe itself. The items of Crane TP-410 are given by K/f<sub>T</sub>, with the f<sub>T</sub> of clean commercial steel, fully turbulent, at the actual inner diameter:</li>
</ul>
[[eq:fittingsSum]]
[[eq:craneFT]]
<ul>
<li><b>Losses at the ends</b> (per-pipe loss table): the K leaving the junction or arriving at it, each with the velocity of its own pipe and only in the matching direction.</li>
<li><b>Two-port components</b>: the K refers to the upstream pipe, according to the flow direction.</li>
</ul>
<h4>Laminar correction of the K values</h4>
<p>Catalogue K values hold for turbulent flow. Below Re<sub>turb</sub>, the correction ([[t:inspector.system.craneFt]] by default) raises the K in proportion to the laminar friction factor:</p>
[[eq:laminarK]]
[[eq:laminarKTransition]]
<p>f<sub>ref</sub> is the Crane f<sub>T</sub> at the pipe diameter ([[t:inspector.system.craneFt]]) or the fully turbulent friction factor of the pipe itself, from its roughness ([[t:inspector.system.pipeFt]]). The interpolation keeps the loss continuous at Re<sub>lam</sub> and at Re<sub>turb</sub>. With the [[t:inspector.system.noCorrection]] option, the K is used as given.</p>`,
          },
          pumps: {
            title: 'Pumps',
            body: `<h4>Curve</h4>
<p>The points given are fitted by least squares (polynomial of order 0 to 4) or joined by linear interpolation, with linear extrapolation at the ends. The calculation always uses the fitted curve:</p>
[[eq:polyfit]]
<p>The curve given holds for 100% speed and one pump. For the relative speed <i>s</i> and N equal pumps in parallel, the affinity laws apply:</p>
[[eq:pumpCurve]]
<p>In the network, the pump is a link whose "loss" is the head gain, with a negative sign:</p>
[[eq:pumpLink]]
<h4>Modes</h4>
<p>With a fixed flow, the link equation becomes ṁ = value, and the head needed comes out of the calculation. Flow control works the same, with the set flow; in the pressure controls, the static pressure at the discharge (or at the suction) is fixed. In the control modes, the speed needed is found by bisection:</p>
[[eq:pumpSpeed]]
<h4>Power and NPSH</h4>
[[eq:pumpPower]]
<p>The efficiency η comes from the efficiency curve, read at the equivalent flow per pump at 100% (Q/(N·s)); without it, η = 1. The available NPSH uses the absolute stagnation pressure at the suction:</p>
[[eq:npsh]]
<h4>System curve</h4>
<p>The Pump × system chart runs the solver with the pump at a fixed flow, from zero to 125% of the maximum flow of the curve (scaled by the speed and the number of pumps), and records the head demanded at each point.</p>`,
          },
          valves: {
            title: 'Valves, orifices and nozzles',
            body: `<h4>Valve</h4>
<p>With K, the loss uses the velocity in the upstream pipe:</p>
[[eq:valveK]]
<p>With Cv (US, specific gravity relative to water at 60 °F, 999.0 kg/m³) or Kv (metric, relative to 1000 kg/m³):</p>
[[eq:cv]]
<p>The results bring the Cv equivalent to the calculated flow and drop:</p>
[[eq:cvEquivalent]]
<h4>Control valve</h4>
<p>While controlling, the link has no loss and imposes instead the downstream pressure (PRV) or the upstream pressure (PSV), static or stagnation, the flow (FCV) or the pressure drop (PDCV). Fully open, the loss with the open-valve K applies; closed, ṁ = 0. After each convergence the states are reviewed:</p>
<ul>
<li>a controlling PRV or PSV becomes <b>closed</b> if its flow turns negative, and <b>fully open</b> if the drop it needs is smaller than the loss of the open valve (except with [[t:junctions.control.form.alwaysControl]]);</li>
<li>fully open, it controls again when the downstream pressure exceeds the setting (PRV), when the upstream pressure falls below it (PSV) or when the flow exceeds the setting (FCV);</li>
<li>an FCV that cannot control follows the choice [[t:junctions.control.form.failAction]].</li>
</ul>
<h4>Exit valve</h4>
[[eq:exitValve]]
<p>The valve loss uses K (on the pipe velocity), Cv or Kv.</p>
<h4>Orifice</h4>
<p>By Idelchik's correlations, with A<sub>1</sub> the upstream area, A<sub>2</sub> the downstream area and A<sub>o</sub> the area of the orifice. Sharp-edged:</p>
[[eq:orificeSharp]]
<p>Rounded edge, of radius <i>r</i>, between pipes of equal area (with different areas the formula gains the expansion terms):</p>
[[eq:orificeRounded]]
<p>By discharge coefficient, already referred to the upstream pipe:</p>
[[eq:orificeCd]]
<h4>Nozzle / sprinkler</h4>
[[eq:spray]]
[[eq:sprayArea]]
<p>The catalogue K factor assumes water; for another fluid, give Cd and the area.</p>
<h4>Generic component</h4>
<p>With K, it works as the valve. With a curve, the drop comes from the curve fitted to the ΔP × flow points:</p>
[[eq:genericCurve]]`,
          },
          boundaries: {
            title: 'Boundaries',
            body: `<ul>
<li><b>Reservoir</b>: a fixed-pressure node equal to the surface pressure, at the elevation of the liquid level. Each pipe connects at the bottom elevation or at its own connection, given as an elevation or as a depth below the level (elevation = level − depth); if the connection is above the level, the pipe discharges in free fall, and the boundary pressure applies at the end of the pipe.</li>
<li><b>Imposed pressure</b>: a node of fixed stagnation pressure; with the static type, p = P<sub>0</sub> − ½ρV² of the single pipe is fixed.</li>
<li><b>Imposed flow</b> and the <b>source of a branch</b>: they enter continuity as a demand (positive leaves, negative enters).</li>
<li><b>Nozzle</b> and <b>exit valve</b>: an external node of fixed pressure (the external or the residual pressure), joined by a discharge link.</li>
</ul>
<p>The net flow of each boundary appears in [[t:app.tabs.out]] → [[t:results.tabs.general]] → [[t:results.boundaries.title]], positive when it enters the network.</p>`,
          },
          fluid: {
            title: 'Water properties',
            body: `<p>For water, the properties come from public correlations, valid from 0 to 150 °C (outside that range, a warning appears). Density, by Kell (1975), with <i>t</i> in °C and ρ in kg/m³:</p>
[[eq:kell]]
<p>Dynamic viscosity, by the Vogel equation, with <i>T</i> in K:</p>
[[eq:vogel]]
<p>Vapour pressure, by the saturation equation of IAPWS-IF97, region 4, with <i>T</i> in K, n<sub>1</sub>…n<sub>10</sub> the coefficients of the standard, A = θ² + n<sub>1</sub>θ + n<sub>2</sub>, B = n<sub>3</sub>θ² + n<sub>4</sub>θ + n<sub>5</sub> and C = n<sub>6</sub>θ² + n<sub>7</sub>θ + n<sub>8</sub>:</p>
[[eq:iapws]]
<p>With a user-defined fluid, ρ, μ and Pv are the values given. The vapour pressure only enters the warnings (static pressure below it in a pipe) and the available NPSH.</p>`,
          },
          outputs: {
            title: 'Derived results',
            body: `<ul>
<li><b>Pressures in pipes</b>: P<sub>0</sub> at the inlet and at the outlet already account for the end losses; the static pressure is P<sub>0</sub> − ½ρV².</li>
<li><b>Head loss</b> h<sub>L</sub>: the losses by friction, fittings and ends, as a head.</li>
<li><b>Total pressure drop</b>: ΔP<sub>0</sub> = P<sub>0</sub> at the inlet − P<sub>0</sub> at the outlet, including gravity.</li>
<li><b>Regime</b>: laminar below Re<sub>lam</sub>, turbulent above Re<sub>turb</sub> and transition between them.</li>
<li><b>Effective K</b> of a two-port component: the stagnation drop divided by the dynamic pressure at the inlet.</li>
</ul>
[[eq:effectiveK]]
<ul>
<li><b>Pumps</b>: ΔH, powers, efficiency and NPSH, as in [[go:tech.pumps|Pumps]].</li>
<li><b>K in the pipes table</b>: the sum of the fitting K values, on the pipe area, without the laminar correction.</li>
</ul>
<p>Warnings also come out for cavitation (static pressure below the vapour pressure), for a pipe shorter than the height difference it climbs, for a pipe above the level drawing liquid from a reservoir and for flow against the reference direction in a component, besides the warnings of pumps, valves and convergence.</p>`,
          },
          references: {
            title: 'Validation and references',
            body: `<h4>Validation</h4>
<p>Automatic tests check the calculation against independent solutions: a single pipe (Colebrook solved analytically), Hazen-Williams, a pump operating point by bisection (also at 80% speed), the system curve, three reservoirs and a looped network (continuity and energy), a pressure-reducing valve holding its setting and opening at the peak, flow control, an exit valve with an analytical solution, a fixed-flow pump, sprinklers and every example. Compared with reference results of verification cases, the largest deviations were 5·10⁻⁵ for Darcy-Weisbach and 2.5·10⁻⁵ for Hazen-Williams.</p>
<h4>Out of scope</h4>
<p>Transients (water hammer), heat transfer, non-Newtonian fluids, two-phase flow and costs.</p>
<h4>References</h4>
<ul>
<li>Todini, E.; Pilati, S. (1988). A gradient algorithm for the analysis of pipe networks.</li>
<li>Jeppson, R. W. (1976). <i>Analysis of Flow in Pipe Networks</i>.</li>
<li>Colebrook, C. F. (1939). Turbulent flow in pipes, with particular reference to the transition region between the smooth and rough pipe laws.</li>
<li>Moody, L. F. (1944). Friction factors for pipe flow.</li>
<li>White, F. M. <i>Fluid Mechanics</i>, table 6.1 (typical roughness).</li>
<li>Crane Co. <i>Flow of Fluids Through Valves, Fittings and Pipe</i>, Technical Paper 410 (K/f<sub>T</sub> method).</li>
<li>Idelchik, I. E. <i>Handbook of Hydraulic Resistance</i> (orifices).</li>
<li>Kell, G. S. (1975). Density, thermal expansivity and compressibility of liquid water from 0 to 150 °C.</li>
<li>Vogel, H. (1921). Temperature equation for the viscosity of liquids.</li>
<li>IAPWS-IF97, region 4 (saturation pressure of water).</li>
<li>ASME B36.10M (steel pipe dimensions).</li>
<li>ASME B36.19M-2018 (stainless steel pipe dimensions), as tabulated by the Hydraulic Institute.</li>
<li>ISO 4427-2 and ABNT NBR 15561 (HDPE pipe dimensions); ISO 4065 (universal wall thickness table).</li>
<li>ISO 2531 and ABNT NBR 7675 (ductile iron pipe dimensions and cement mortar lining).</li>
<li>Hydraulic Institute. <i>Engineering Data Book</i> (roughness of stainless steel).</li>
<li>Saint-Gobain PAM, technical data on cement mortar linings (roughness of lined ductile iron).</li>
</ul>`,
          },
        },
      },

      gas: {
        title: 'Gas (compressible mode)',
        sections: {
          concept: {
            title: 'The compressible mode',
            body: `<p>Pump It calculates networks of <b>liquid</b> and of <b>gas</b>. The choice is the <b>regime</b> of the model, at the top of the [[t:inspector.system.title]] window: [[t:inspector.system.regimes.incompressible]] or [[t:inspector.system.regimes.compressible]]. The stamp next to the title of the model [[show:stamp|always shows the regime in use]]; a click on it opens that window.</p>
<h4>When a gas is compressible</h4>
<p>In the compressible mode the density changes with pressure and temperature along every pipe, the gas speeds up as it expands, and it may reach the speed of sound. Use it when:</p>
<ul>
<li>the Mach number goes past 0.3 in some pipe; or</li>
<li>the pressure drop goes past 10% of the absolute inlet pressure, even at a low Mach number.</li>
</ul>
<p>Below that, the incompressible mode with the density of the gas makes a small error. The app helps both ways: in the incompressible mode, a fluid as light as a gas that goes past those limits brings a warning that suggests the compressible mode; in the compressible mode, when everything stays below Mach 0.1 and a 2% drop, a note says that the incompressible mode would give practically the same.</p>
<h4>Nothing is lost when you switch</h4>
<p>Each regime keeps its own fluid: the liquid on one side, the gas on the other. Switching the regime recalculates at once and erases nothing. You can compare both, even with a [[go:scenarios.concept|scenario]] that changes only the regime or the thermal model. The drawing, the junctions, the pipes and the views are the same.</p>
<p class="tip">To start, open [[act:example:air]], a compressed air line that loses 42% and 50% of its absolute pressure on the way to its two consumers, or [[act:example:airPlant]], with a compressor, a reducing valve and a blow-off nozzle.</p>`,
          },
          setup: {
            title: 'Gas, temperature and thermal model',
            body: `<p>In the compressible regime, the system window shows the [[t:inspector.system.gas]] section:</p>
<ul>
<li>[[t:inspector.system.gasMode]]: <b>[[t:inspector.system.gasModes.isothermal]]</b> keeps the temperature constant in the whole network (long lines that exchange heat with the surroundings); <b>[[t:inspector.system.gasModes.adiabatic]]</b> exchanges no heat: the stagnation temperature is kept along every pipe and the gas cools as it speeds up (short or insulated lines).</li>
<li>[[t:inspector.system.gasKind]]: air, nitrogen, oxygen, methane, natural gas (approximate), CO₂ and hydrogen, with molar mass and k from public values and viscosity by Sutherland’s law; or [[t:inspector.system.customGas]], with the molar mass, k and viscosity you give. When you go from a library gas to a custom one, its values become the starting point.</li>
<li>[[t:inspector.system.Z]]: 1 for an ideal gas; for a real gas, the value at the operating conditions, constant in the model.</li>
<li>Temperature: in the isothermal model, that of the gas in the whole network; in the adiabatic model, the stagnation temperature of the sources. Each source may have its own, as in [[go:gas.components]].</li>
</ul>
<p>Below them come the gas constant R, the speed of sound at the given temperature and the normal density.</p>
<h4>Design limits</h4>
<p>[[t:inspector.system.machLimit]] (0.7 by default) and [[t:inspector.system.velLimit]] (30 m/s by default) bring warnings when a pipe goes past them. Sonic choking is always reported.</p>
<h4>Pressures and flows</h4>
<p>Each pressure is gauge or absolute by its unit, as for a liquid: a unit with (g) is relative to the [[t:inspector.system.patm]], which is added to it, since a gas is always calculated in <b>absolute</b> pressure. The results show gauge pressures by default, and the unit selector of each column also offers the absolute ones. A pressure at or below vacuum (zero absolute) means nothing for a gas: it stays pending in the [[go:start.autoCalc|checklist]]. Flows may be given as a mass (kg/s, kg/h, t/h…), as a volume at the conditions of the point (m³/h, L/s…) or as a <b>normal</b> volume (Nm³/h, at 0 °C and 101.325 kPa).</p>`,
          },
          components: {
            title: 'Boundaries and components with a gas',
            body: `<p>The junctions are those of the incompressible mode. With a gas:</p>
<ul>
<li>[[icon:reservoir]] <b>Reservoir</b>: a vessel of gas at rest. The pressure given is a stagnation pressure and applies at the reference elevation; the column of gas down to each pipe is part of the calculation.</li>
<li>[[icon:pressure]] <b>Imposed pressure</b>: static or stagnation, as you choose.</li>
<li>[[icon:flow]] <b>Imposed flow</b> and [[icon:branch]] <b>node</b>: a mass flow, a volume at the conditions of the node or a normal volume.</li>
<li>In the adiabatic model, the reservoir, the imposed pressure, an entering flow and the source of a node have the [[t:junctions.gasT.label]] field; empty, the temperature of the sources applies.</li>
<li>[[icon:valve]] <b>Valve</b>, [[icon:generic]] <b>generic component</b> and [[icon:orifice]] <b>orifice</b>: local losses count as an equivalent length of friction. Cv and Kv become the equivalent K at the area of the inlet pipe. The orifice also caps the flow at the critical flow of its hole: a restriction orifice chokes long before the pipe does.</li>
<li>[[icon:control]] <b>Control valve</b>: reducing, sustaining, flow and ΔP, with the states of the liquid.</li>
<li>[[icon:spray]] <b>Nozzle</b>: isentropic flow through the effective area, which chokes when the outside pressure falls below the critical ratio (about 0.53 of the upstream pressure, for air).</li>
<li>[[icon:exitvalve]] <b>Exit valve</b>: the loss of the valve down to the outside pressure, where the static pressure of the jet is the residual one.</li>
<li>[[icon:pump]] <b>Pump</b>: with a gas, a compressor or a blower, as in [[go:gas.compressor]].</li>
</ul>
<p>The Hazen-Williams model has no meaning for a gas: such pipes are calculated with Darcy and the roughness stored in the pipe, and a warning lists them.</p>`,
          },
          compressor: {
            title: 'Compressors and blowers',
            body: `<p>In the compressible mode, the [[icon:pump]] pump is a compressor or a blower. In [[t:junctions.pump.form.mode]]:</p>
<ul>
<li>[[t:junctions.pump.form.modes.ratio]]: the outlet stagnation pressure is the inlet one times the ratio.</li>
<li>[[t:junctions.pump.form.modes.curve]]: the head curve reads as the <b>isentropic head</b> of the gas against the volume flow at the suction, with the affinity laws (speed and machines in parallel). For small heads, as in a blower, this is ΔP = ρgH, the curve of a pump.</li>
<li>[[t:junctions.pump.form.modes.fixedFlow]]: the flow is imposed and the calculation shows the ratio needed.</li>
<li>The variable-speed modes control the flow, the static pressure at the discharge or at the suction, and the app shows the speed the curve asks for.</li>
</ul>
<p>The [[t:junctions.pump.form.etaGas]] (or the efficiency curve, when given) says how much the gas heats up. In the adiabatic model the gas leaves hotter and carries that temperature into the network; in the isothermal model an aftercooler is assumed to bring it back to the temperature of the network, and the discharge temperature is only reported. The results show the ratio, the isentropic head, the discharge temperature and the power given to the gas. The equations are in [[go:gasTech.machines]].</p>`,
          },
          results: {
            title: 'Results with a gas',
            body: `<p>The results of a gas show, beside those of a liquid:</p>
<ul>
<li>The <b>mass flow</b>, the same along the pipe; the volume flow at the inlet, at the local conditions; and the normal flow.</li>
<li>At each end of the pipe: velocity, <b>Mach number</b>, <b>static</b> and <b>stagnation</b> pressures, temperature and density. "In" and "out" follow the reference direction of the pipe.</li>
<li>The <b>choking</b> mark: the gas reached the speed of sound at the outlet of the pipe (Mach 1/√k isothermal, 1 adiabatic). The flow stays at the critical one however low the downstream pressure falls; the result shows the state at the outlet of the pipe, before the expansion down to the pressure of the node.</li>
</ul>
<p>[[show:overlay|Results on the drawing]] add the mass flow and the Mach number; the hydraulic grade line, a height of liquid, goes away. The velocity of a gas is coloured over the range of the model itself, since the fixed scale is that of water. The profile chart draws the static and stagnation pressures point by point inside each pipe, since the pressure of a gas does not fall in a straight line.</p>
<h4>Warnings</h4>
<ul>
<li><b>Critical</b>: a choked pipe; a calculation that did not converge.</li>
<li><b>Warning</b>: a choked junction (valve, orifice, nozzle); Mach above the design limit.</li>
<li><b>Caution</b>: velocity above the limit; Hazen-Williams taken as Darcy.</li>
<li><b>Information</b>: the incompressible mode would give practically the same result.</li>
</ul>`,
          },
        },
      },

      gasTech: {
        title: 'Technical reference for gases',
        sections: {
          properties: {
            title: 'Gas properties',
            body: `<p>The gas is ideal, with a constant compressibility factor <i>Z</i>. With the molar mass MW, the density and the gas constant are:</p>
[[eq:gasLaw]]
<p>The speed of sound, the mass flux <i>G</i> (mass flow per area, constant in a pipe of constant area) and the Mach number:</p>
[[eq:machGas]]
<p>The stagnation quantities, those of the gas slowed down to rest without losses, come from the isentropic relations:</p>
[[eq:stagnationGas]]
<p>For library gases the viscosity follows Sutherland’s law, with μ₀ and S from public values; it is evaluated at the temperature of the gas and stays constant in the network:</p>
[[eq:sutherland]]
<p>Normal flows use the density at 0 °C and 101.325 kPa, as an ideal gas:</p>
[[eq:normalFlow]]`,
          },
          pipe: {
            title: 'The pipe: closed form, Fanno and march',
            body: `<p>In a pipe of constant area, in steady state, continuity (ρV = G), momentum and energy hold. The friction factor <i>f</i> is Darcy’s, by the correlation of the liquid, with Re = G·D<sub>h</sub>/μ, constant along the pipe since G and μ are.</p>
<h4>Isothermal: closed form</h4>
<p>In a horizontal isothermal pipe, the integration gives the exact relation between the static pressures of the ends; the logarithm is the acceleration of the expanding gas:</p>
[[eq:isoClosed]]
<h4>Adiabatic: Fanno</h4>
<p>With no heat exchange, the stagnation temperature is kept and the Mach number grows towards 1. The relations referred to the sonic point (*):</p>
[[eq:fannoRel]]
[[eq:fannoLength]]
<h4>March</h4>
<p>The general method divides the pipe into 100 volumes and solves, in each one, momentum and energy for the new state by Newton (ρ̄ and V̄ are the averages of the volume):</p>
[[eq:marchMomentum]]
[[eq:marchEnergy]]
<p>The march calculates the pipes of the adiabatic model and the pipes of the isothermal model that have a difference of elevation, where gravity comes in through ρ̄gΔz. A horizontal isothermal pipe uses the closed form, which the march reproduces. Near choking the step shrinks: each volume changes the Mach number by at most 0.005 and by at most 5% of what is left to the limit. The error against exact Fanno is 10⁻⁶ at an outlet Mach number of 0.4, about 2·10⁻⁴ at 0.77 and 10⁻³ at 0.94.</p>
<h4>Local losses</h4>
<p>The sum of the K values of the pipe, with the entrance and exit losses of the junctions, counts as an equivalent length of friction: added to f·L/D in the closed form and spread along the march. Valves, orifices and generic components are pieces of zero length with f·L/D = K, by the isothermal closed form or by Fanno. The laminar correction of the K values is that of the liquid.</p>
[[eq:equivalentF]]`,
          },
          choking: {
            title: 'Sonic choking',
            body: `<p>The flow of a pipe has a maximum, reached when the gas gets to the limiting Mach number at the outlet:</p>
[[eq:chokeLimits]]
<p>If the downstream pressure asks for more flow than that, the pipe is <b>choked</b>: the flow is the critical one, the largest that does not choke before the end of the pipe; the downstream pressure no longer changes it, and the expansion down to the pressure of the node happens outside the pipe. The app finds the critical flow from the relation of the pipe itself.</p>
<h4>Entrance from a vessel</h4>
<p>Leaving a stagnation node, such as a reservoir, the gas speeds up from rest to the velocity of the pipe isentropically. In the adiabatic model:</p>
[[eq:entranceGas]]
<p>In the isothermal model the same relation holds with the exponent −k/(k−1) and the temperature of the gas.</p>
<h4>Nozzles and orifices</h4>
<p>A nozzle discharges isentropically through its effective area and chokes below the critical pressure ratio:</p>
[[eq:nozzleGas]]
<p>An orifice is a K element whose flow also stays below the critical flow of its vena contracta, of area C<sub>c</sub>·A<sub>o</sub>: C<sub>c</sub> = C<sub>d</sub> in the C<sub>d</sub> model, 0.61 for a sharp edge, and from 0.61 to 1 for a rounded edge.</p>
[[eq:criticalFlux]]`,
          },
          network: {
            title: 'The gas network',
            body: `<p>The topology is that of the liquid. The unknowns are the pressures of the free nodes; each ordinary link (pipe, valve, orifice, nozzle) gives its mass flow from the pressures of its two nodes by solving its own relation, capped at the critical flow. Every free node closes its mass balance:</p>
[[eq:continuity]]
<p>Control valves, compressors and links without a loss have their flow as an unknown and an equation of their own: the set pressure, the pressure ratio, the pressure difference or the imposed flow.</p>
<h4>Which pressure each node carries</h4>
<p>In the isothermal model the junctions carry the <b>static pressure</b>, the classic method of gas networks, which neglects the kinetic energy at the junction; in the adiabatic model, the <b>stagnation pressure</b>. Boundaries keep their nature: a reservoir is a stagnation pressure, an imposed pressure is static or stagnation as chosen, and the outside pressure of a nozzle or an exit valve is static. Each pipe converts at its ends.</p>
<h4>Solution</h4>
<p>Newton-Raphson on the pressures, with the Jacobian built from the derivatives of each link, Gaussian elimination, a line search and pressures kept positive. The first pressures come from the linear theory of gas networks on P². The calculation converges when every node closes its balance within 10⁻⁸ of the flow through it. Control valves change state as with a liquid, with new calculations until the states settle.</p>
<h4>Temperature in the adiabatic model</h4>
<p>An outer loop updates the temperatures: with the flows, the stagnation temperature of each node is the mass-weighted mix of what reaches it. Sources keep their own, and a compressor raises that of the gas it carries. The loop repeats until the temperatures change by less than 10⁻⁶. The adiabatic calculation starts from the isothermal solution of the same network.</p>
[[eq:gasMixing]]`,
          },
          machines: {
            title: 'Compressors and valves',
            body: `<p>With a fixed ratio:</p>
[[eq:compRatio]]
<p>With the curve, the head <i>H</i> read at the volume flow of the suction, with the affinity laws, is the isentropic head of the gas:</p>
[[eq:compHead]]
<p>The discharge temperature, with the polytropic efficiency η, and the power given to the gas:</p>
[[eq:compHeat]]
<p>With an imposed flow or a pressure control the ratio comes out of the calculation, and the speed the curve asks for is found by bisection, as for a liquid pump. Valves given by Cv or Kv become an equivalent K at the area of the inlet pipe, the same loss as for a liquid:</p>
[[eq:gasValveK]]`,
          },
          validation: {
            title: 'Validation and limits',
            body: `<h4>Validation</h4>
<p>Automatic tests check the physics and the network calculation: the properties of air; the isothermal closed form both ways; the march against the closed form and against Fanno, including the conservation of the stagnation temperature; choking in both models; the incompressible limit (with a small drop, the Darcy loss); networks in series and branched, with their mass balance; the compressed air example against an independent calculation; the critical flow against the closed form and against Fanno; the mixing of temperatures; choked nozzles and orifices; control valves; and the compressor.</p>
<h4>Out of scope</h4>
<ul>
<li>gas mixtures and changes of composition;</li>
<li>heat exchange with the surroundings (the model is isothermal or adiabatic);</li>
<li>transients, shock waves and supersonic flow (the calculation goes up to choking);</li>
<li>condensation and two-phase flow;</li>
<li>real gas by an equation of state (a constant Z is used);</li>
<li>the critical pressure ratio of a valve trim (a valve is a K element).</li>
</ul>
<h4>References</h4>
<ul>
<li>Shapiro, A. H. (1953). <i>The Dynamics and Thermodynamics of Compressible Fluid Flow</i>.</li>
<li>Anderson, J. D. <i>Modern Compressible Flow</i>.</li>
<li>White, F. M. <i>Viscous Fluid Flow</i> (Sutherland’s law).</li>
</ul>`,
          },
        },
      },

      about: {
        title: 'About',
        sections: {
          about: {
            title: 'About Pump It',
            body: `<p><b>Pump It</b> is a steady-state pipe network simulator for liquids (incompressible flow) and gases (compressible flow) that runs in the browser, with no installation and no server.</p>
<p class="credit">Conceived by <b>Rafael Perktold</b>.</p>
<ul>
<li>Written from scratch, in a <i>clean room</i>, from public methods and data (see [[go:tech.references|Validation and references]]). It uses no trademarks, names, icons, texts or screens of commercial software.</li>
<li>Interface in Portuguese, English and Spanish.</li>
<li>Your models stay on your computer: the app sends them to no server.</li>
</ul>
<p>The results are an engineering tool: check the assumptions, the input data and the warnings before using them in a design.</p>`,
          },
        },
      },
    },
  },
});
