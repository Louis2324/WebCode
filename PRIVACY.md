# WebCode privacy and diagnostics

## Current behavior

WebCode is offline-first. The application does not currently collect analytics, telemetry, crash reports, account data, or project contents automatically.

Project files, recovery drafts, and editor contents remain on the user's device unless the user chooses to share them. The application may open an external GitHub link when the user selects a help or project link. User-authored preview code may also make network requests because it runs as web content; those requests are controlled by the user's code, not by WebCode telemetry.

## Local diagnostics

Runtime messages and preview errors are displayed locally in the WebCode output panel and the normal Electron console. They are not uploaded automatically. Users should remove paths, tokens, personal data, and project contents before sharing logs in an issue.

## Future diagnostics policy

Any future crash reporting or analytics must be:

- Opt-in by default for new installations.
- Documented before release.
- Minimised to the data needed for the stated purpose.
- Redacted for project contents, credentials, and personal information.
- Disabled through a clear user-facing setting.
- Covered by an updated privacy notice and retention policy.

Until those requirements are implemented, WebCode will continue using local diagnostics only.
