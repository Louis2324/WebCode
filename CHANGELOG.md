# Changelog

All notable WebCode changes are documented here. Release candidates are marked explicitly until the stable release criteria are met.

## [Unreleased]

### Planned

- Complete the stable-release QA cycle.
- Discuss the workspace architecture and feedback process before documenting them as policy.

### Added on feature branch

- Version 2 workspace projects with migration from the original three-editor format.
- Multi-file explorer, file tabs, file operations, configurable entry file, and recovery snapshots.
- Linked CSS/JavaScript and SVG asset embedding in the sandboxed preview.
- Search/replace, formatting, command palette, recent projects, preview presets, and test result reporting.

## [1.0.2-rc.3] - 2026-11-18

### Added

- Automated CI validation and cross-platform release packaging.
- Windows x64 and ARM64, macOS x64 and ARM64, and Linux x64 and ARM64 release targets.
- Project save/load validation, recovery drafts, preview diagnostics, and basic editor tests.
- Repository contribution, security, support, privacy, scope, and release documentation.

### Changed

- Release artifacts are limited to packaged installers, archives, manifests, and checksums.
- Electron windows use isolated, sandboxed renderer contexts with a restricted preload bridge.

### Known limitations

- Release installers are unsigned.
- WebCode is currently a focused single-project web editor, not a full IDE.

## [1.0.1] - 2025-10-23

- Existing baseline release.
