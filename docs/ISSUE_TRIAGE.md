# Issue triage

Issues are triaged as time allows. The labels below keep the project queue understandable without promising a response time that the project cannot yet guarantee.

## Labels

- `bug`: reproducible behavior that does not match the product contract.
- `enhancement`: a proposed capability or improvement.
- `question`: usage or development support.
- `documentation`: documentation or repository-process work.
- `security`: security-sensitive work; do not include vulnerability details publicly.
- `performance`: measurable startup, preview, memory, or packaging performance work.
- `release-blocker`: prevents a release or damages a core user journey.
- `priority: high`: should be addressed before normal queue work.
- `platform: windows`, `platform: macos`, `platform: linux`: identifies affected targets.
- `triage`: needs reproduction, scope, or maintainer decision.

## Triage rules

1. Remove secrets and private project data from public issues.
2. Reproduce bugs on `main` or the latest release before assigning priority.
3. A release blocker must affect installation, launch, editing, preview, testing, save/load, recovery, or uninstall.
4. Security reports follow `SECURITY.md` and are not discussed in public issue comments.
5. Close duplicates, invalid reports, and issues outside the current product scope with a short explanation and a relevant link.
6. Move feature ideas into the roadmap discussion before implementation work begins.
