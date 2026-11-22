# Contributing to FocusFlow

Thanks for helping build a calmer browsing experience.

## Before starting

1. Browse existing issues and pull requests to avoid duplicates.
2. For substantial behavior changes, open an issue describing the use case.
3. Keep changes narrowly scoped and avoid unnecessary permission additions.
4. Never add screenshots containing private browsing history or personal notes.

## Local development

- Clone the repository and load `extension/` with Chrome's **Load unpacked**.
- JavaScript tools: Node.js 18+; install backend dependencies using `npm ci` if testing the optional backend.
- Run `npm run check:extension` for static manifest and JavaScript checks.
- Run `npm test` for the existing optional backend tests.
- Follow [the manual smoke checklist](docs/RELEASE_CHECKLIST.md) before labeling browser behavior tested.

## Pull requests

State what changed and why, include testing evidence, and note affected permissions, storage keys and migration behavior. For UI work, include **real** before-and-after screenshots with sensitive data removed. Maintain existing local-data behavior unless explicitly approved.

## Code of conduct

Be constructive and respectful. Report security issues privately using [SECURITY.md](SECURITY.md) rather than public issues.
