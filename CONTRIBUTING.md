# Contributing to WebCode

Thank you for helping improve WebCode. Contributions are welcome for the Electron app, the web editor, documentation, testing, and release tooling.

## Before you start

1. Search existing issues and pull requests.
2. For a significant feature, open an issue first so the scope can be discussed.
3. Never include passwords, API keys, private files, generated installers, or `node_modules` in a change.

## Development setup

Requirements:

- Git
- Node.js 22 or a compatible current LTS release
- npm

```bash
git clone https://github.com/Louis2324/WebCode.git
cd WebCode
npm ci
npm start
```

For live development:

```bash
npm run dev
```

The application is built with Electron. The renderer lives in `dist/`, the Electron entry point is `main.js`, and the preload bridge is `preload.js`.

## Branches and commits

Use one of these branch prefixes:

- `feature/` for a new capability
- `fix/` for a bug correction
- `docs/` for documentation or repository-process changes

Keep commits focused and use a short, imperative subject, for example `Improve preview error reporting`.

## Pull requests

Please include:

- A clear explanation of the problem and solution.
- Screenshots or a short recording for UI changes.
- The platforms you tested.
- Any packaging, migration, or release implications.

Pull requests run the repository validation workflow. The CI workflow builds an unpacked Electron bundle on pushes to `main`; installer artifacts are produced automatically for version tags.

## Local checks

Run these checks before opening a pull request:

```bash
node --check main.js
node --check preload.js
node --check menu.js
node --check dist/script.js
npm run test --if-present
```

To build a local installer, use `npm run package`. Builds are written to `release/`, which is ignored by Git.

## Code of Conduct

Participation in this project is governed by [Code of Conduct](CODE_OF_CONDUCT.md). For security issues, follow [Security Policy](SECURITY.md) instead of opening a public issue.
