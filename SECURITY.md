# Security Policy

## Supported versions

WebCode is an early-stage project. Security fixes are applied to the latest release and the active `main` branch.

| Version | Supported |
| --- | --- |
| Latest release | Yes |
| `main` | Yes |
| Older releases | No guarantee |

## Reporting a vulnerability

Please do not open a public issue for a security vulnerability.

Use [GitHub private vulnerability reporting](https://github.com/Louis2324/WebCode/security/advisories/new) when available. Include:

- A clear description of the vulnerability.
- The affected version or commit.
- Reproduction steps or a proof of concept.
- The potential impact.
- Any suggested mitigation.

If private vulnerability reporting is unavailable, contact the maintainer through the [project owner’s GitHub profile](https://github.com/Louis2324) and request a private security channel. Do not include secrets or sensitive personal data in a public issue.

## Response targets

We aim to acknowledge reports within five business days, confirm the impact and affected versions as soon as practical, and coordinate a fix and disclosure timeline with the reporter.

## Scope and release security

The policy covers the Electron application, its preload/main-process bridge, the preview execution model, the build workflows, and published installers. Release artifacts are currently unsigned; code signing and notarization should be configured before a production distribution.
