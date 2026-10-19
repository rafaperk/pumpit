# Contributing

## Working in parallel

The code is split into blocks (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)). To avoid conflicts:

- Work inside your block's folder. Prefer adding a file to growing a shared one.
- Junction types, fluids and examples are one file each and register themselves; do not add type-specific branches to generic code. Use the hooks of the junction type contracts instead (`src/core/junctions/registry.js`, `src/ui/junctions/registry.js`).
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
- Engineering data must come from public primary sources (standards, published papers, textbooks), cited in the README.

## Conventions

- **Language:** code, comments, commit messages and documentation in English. Interface texts never go in the code: they are keys in the catalogs of `src/i18n/`, written in every supported language (English is the base; Portuguese, English and Spanish today). If you cannot translate a text, add it to every language in English and flag it in the pull request; `npm test` fails while a key is missing anywhere.
- **Modules:** one IIFE per file, attaching its API to `PumpIt.<module>` (core) or `PumpIt.ui.<module>` (interface). No `import`/`export`, no dependencies, no build step.
- **Units:** SI inside the core. Input quantities are stored as `{ value, unit }`, as typed; conversion happens only at input and output.
- **Style:** 2-space indentation, semicolons, single quotes, arrow functions for short callbacks. Comments explain the *why* or the engineering basis, briefly.
- **Results must not change by accident.** A refactor must keep the test output identical; a change in results needs a reason, a test and a note in the README.
