# Contributing

## Working in parallel

The code is split into blocks (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)). To avoid conflicts:

- Work inside your block's folder. Prefer adding a file to growing a shared one.
- Junction types, fluids, examples, pipe catalogues and importers are one file each and register themselves; do not add type- or material-specific branches to generic code. Use the hooks of the contracts instead (`src/core/junctions/registry.js`, `src/ui/junctions/registry.js`, `src/core/data/pipe-library.js`).
- The only file everybody touches is `index.html` (the script list). Add your `<script>` tag inside its block's group, keep one tag per line, and do not reorder other lines.
- Texts live in the message catalogs, one file per block in each language folder (`src/i18n/<language>/<block>.js`). Add the keys of your block in its own file, in every language.
- Keep the stylesheet of a block in `src/ui/styles/<block>.css`. `tokens.css` holds the theme variables; `responsive.css` stays last.
- One branch per feature and small pull requests.

## Before you push

```bash
npm test
```

If you changed the calculation core, also run the validation against the reference models available on your machine:

```bash
node tests/validate-fth.js "<folder with .fth files>"
```

There is no build: open `index.html` and check the screens you changed, in each language (selector at the top right).

## Clean-room rules

This project is a clean-room implementation. These rules are not optional:

- Use only the specification (`Clean Room.md`), the public references of its Annex C and the test cases of its section 10.
- Never use executables, help files, `.dat` databases, screens or texts of the reference software.
- Trademarks of the reference software must not appear in the product, the code or the documentation.
- Reference model files (`.fth`) serve only as an output answer key. Never copy them, or data taken from them, into the repository (`*.fth` is in `.gitignore`). A value inferred from such a comparison must be marked as *inferred* and documented in the README.
- The `.fth` importer (`src/core/import/fth.js`) follows only the format descriptions written by the specification team: Annex A of the specification and the description of 20 October 2026. Do not study files of other programs to extend it: a gap in those descriptions is left blank or assumed, reported to the user and recorded in `docs/fth-import.md`, until the specification team describes it. Its tests write synthetic files in code.
- The `.aro` importer (`src/core/import/aro.js`, with the parts it shares with the `.fth` importer in `src/core/import/shared.js`) follows only the format description written by the specification team (version 1.1 of 20 October 2026), under the same rules: no `.aro` file is studied or copied (`*.aro` is in `.gitignore`), a gap is left blank or assumed, reported to the user and recorded in `docs/aro-import.md`, and its tests write synthetic files in code.
- The time simulation (`src/core/time/`, `src/ui/time/`) follows only its own clean-room specification (*Simulação no tempo*, version 1.0 of 2 November 2026), the public references of its Annex C and the test cases of its section 12. Its reader of the time data of `.fth` files follows its Annex A under the rules above for the `.fth` importer. Neither the name of the reference program nor those of its modules appear anywhere: in the interface the feature is "Time simulation". Decisions and what the specification marks as inferred are recorded in `docs/time-simulation.md`.
- Engineering data must come from public primary sources (standards, published papers, textbooks), cited in the README.

## Conventions

- **Language:** code, comments, commit messages and documentation in English. Interface texts never go in the code: they are keys in the catalogs of `src/i18n/`, written in every supported language (English is the base; Portuguese, English and Spanish today). If you cannot translate a text, add it to every language in English and flag it in the pull request; `npm test` fails while a key is missing anywhere.
- **Modules:** one IIFE per file, attaching its API to `PumpIt.<module>` (core) or `PumpIt.ui.<module>` (interface). No `import`/`export`, no dependencies, no build step. `npm run build` runs the tests and then only copies the files, as they are, into one page to send (`dist/PumpIt.html`); it refuses a script that contains `</script>` or `<!--` and a stylesheet that contains `</style>`. The page must stay offline: the build also refuses a file that names a network API (`fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`…) or gives a web address to a link, a resource or a form, and one that asks for a device or a permission (camera, microphone, location, notifications, reading the clipboard), and the page's Content-Security-Policy blocks every connection and any script that is not one of its files.
- **Units:** SI inside the core. Input quantities are stored as `{ value, unit }`, as typed; conversion happens only at input and output.
- **Style:** 2-space indentation, semicolons, single quotes, arrow functions for short callbacks. Comments explain the *why* or the engineering basis, briefly.
- **Results must not change by accident.** A refactor must keep the test output identical; a change in results needs a reason, a test and a note in the README.
