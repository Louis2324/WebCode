# Release and manual QA checklist

Use this checklist for every release candidate and stable release. Check items on a clean machine where possible and record failures as issues before publishing.

## Before tagging

- [ ] `package.json` and `package-lock.json` contain the intended version.
- [ ] `CHANGELOG.md` has an entry for the version.
- [ ] `docs/KNOWN_LIMITATIONS.md` reflects the current product.
- [ ] `npm ci` completes successfully.
- [ ] `npm audit --omit=dev --audit-level=high` passes.
- [ ] `npm test` passes.
- [ ] `npm run perf:baseline -- --check` passes.
- [ ] JavaScript syntax checks pass.
- [ ] The working tree is clean.
- [ ] The release decision and known limitations are documented in the release notes.

## Windows acceptance test

Record the operating system, architecture, installer filename, and result for each run.

- [ ] Fresh install completes without a setup error.
- [ ] WebCode launches from the Start menu and its shortcut, if created.
- [ ] The application closes and relaunches cleanly.
- [ ] HTML, CSS, and JavaScript can be edited.
- [ ] Preview renders the current project.
- [ ] Preview console messages and runtime errors appear in output.
- [ ] Passing and failing test assertions are reported correctly.
- [ ] Save creates a `.webcode.json` file.
- [ ] Open restores a saved project exactly.
- [ ] Dirty state changes after editing and clears after saving.
- [ ] An interrupted session can recover its local draft.
- [ ] Invalid or corrupted project files produce a useful error.
- [ ] The installer can upgrade an existing WebCode installation.
- [ ] Uninstall removes the application and its Start menu entry.
- [ ] The unsigned build warning is documented and expected for prereleases.

## macOS and Linux smoke test

- [ ] The application launches from the packaged artifact.
- [ ] Editors, preview, tests, save, and load work.
- [ ] The application closes without a visible crash.
- [ ] The expected installer or package opens on the target architecture.
- [ ] The release notes identify any platform-specific limitation.

## Publish and verify

- [ ] Create an annotated tag matching the package version, for example `v1.0.2-rc.3`.
- [ ] Push the tag to GitHub.
- [ ] Confirm the tag/version check passes.
- [ ] Confirm Windows x64 and ARM64 builds pass.
- [ ] Confirm macOS x64 and ARM64 builds pass.
- [ ] Confirm Linux x64 and ARM64 builds pass.
- [ ] Confirm the publish job passes.
- [ ] Confirm the release is marked prerelease or latest intentionally.
- [ ] Confirm only expected installers, archives, manifests, and `SHA256SUMS.txt` are attached.
- [ ] Download at least one artifact and verify its checksum.
- [ ] Update the release notes with known limitations and test coverage.

## Commands

```bash
npm ci
npm test
npm run perf:baseline -- --check
node --check main.js
node --check preload.js
node --check menu.js
node --check dist/script.js
```
