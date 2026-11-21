# Known limitations

These limitations are intentional or not yet addressed in the current release line. They should be reviewed before each stable release.

- WebCode currently models one web project as three editor contents. It does not yet provide a multi-file workspace or project explorer.
- There is no integrated terminal, Git workflow, debugger, language server, package manager, or extension API.
- Projects are saved locally as `.webcode.json` files. There is no cloud backup, synchronization, or collaboration service.
- Recovery drafts are local to the application profile and are not a substitute for saving a project file.
- Preview execution is sandboxed and intentionally smaller than a full browser or development server. Features that require a server, filesystem access, or backend APIs may not behave as they do in production.
- User-authored preview code may make network requests. WebCode itself does not upload projects or send telemetry in the current release line.
- Release installers are currently unsigned. Windows SmartScreen and macOS Gatekeeper may display warnings until signing and notarization are funded and configured.
- Cross-platform artifacts are built automatically, but platform smoke testing still depends on access to representative machines.
- Large-file performance has only a baseline measurement. WebCode is aimed at small web applications, not large repositories.
