# WebCode product scope

This document defines the first stable product contract for WebCode. It is intentionally narrower than a full IDE so reliability can be measured before new subsystems are added.

## Product promise

WebCode is an offline-first Electron desktop editor for learning and building small web applications with HTML, CSS, and JavaScript. A user should be able to write code, preview it, run simple checks, save a project, and reopen it later without needing a hosted service.

## In scope for WebCode 1.0

- A focused HTML, CSS, and JavaScript editing workspace.
- Ace-powered editing with keyboard shortcuts.
- Sandboxed live preview in the application.
- Simple JavaScript assertions and visible test output.
- Native project save and load using `.webcode.json` files.
- Local recovery drafts and dirty-state feedback.
- Offline use after installation, except for user-requested external links and network requests made by user-authored preview code.
- Automated installers for Windows, macOS, and Linux on x64 and ARM64 where the release matrix provides an artifact.

## Current workspace direction

The feature branch extends the original three-editor model into a versioned multi-file workspace. The workspace keeps project files in the `.webcode.json` container, uses a configurable HTML entry file, and embeds linked CSS, JavaScript, and SVG content into the sandboxed preview. Legacy version 1 files are migrated on load.

## Explicitly out of scope for the current release line

- Integrated terminal, Git client, debugger, language servers, or package manager.
- Extensions or third-party plugins.
- Cloud sync, accounts, collaboration, or remote storage.
- A production web hosting or deployment service.
- Automatic telemetry or crash-report uploads.

## Release targets

| Platform | Release target | Support policy |
| --- | --- | --- |
| Windows | x64 and ARM64; Windows 10 22H2+ and Windows 11 | Primary test platform; both architectures require smoke testing before a stable release |
| macOS | x64 and Apple Silicon; macOS 12 Monterey+ | Release target; smoke-test one Intel and one Apple Silicon environment when available |
| Linux | x64 and ARM64 AppImage/deb | Ubuntu 22.04 LTS+ is the reference environment; other distributions are best effort |

The minimum macOS version follows the current Electron 45 dependency. If the Electron major version changes, this support statement must be reviewed before the next stable release.

## Stable-release definition

WebCode 1.0 is ready only when the release checklist is complete, the core user journey passes on Windows, no known release-blocking issue remains, and the published artifacts match the version and checksum manifest. Code signing is a deferred funding item and is not part of this preparation pass.
