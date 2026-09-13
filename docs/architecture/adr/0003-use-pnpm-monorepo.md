# ADR 0003 – pnpm-Monorepo und kurzer Trunk-Workflow

Datum: 2026-09-13. Status: im Plan gewählt, Umsetzung ausstehend.

**Kontext:** Mindestens fünf Entwickler bearbeiten Runtime, Spielregeln, AI, Backend und Content/UI mit gemeinsamen Verträgen.

**Entscheidung:** private pnpm-Workspaces, ein Lockfile, explizite Subpath-Exports, Importgrenzen und nach Domänen getrennte Packages. `main` wird über kurze PR-Branches integriert und am Remote geschützt. Turborepo ist vorerst zurückgestellt.

**Alternativen:** mehrere Repositories erschweren atomare Vertragsänderungen. Ein dauerhaftes `develop` erzeugt eine zusätzliche Integrationslinie ohne derzeitigen Releasebedarf. Ein Taskcache vor messbarem Buildengpass erhöht Konfigurationsaufwand.

**Folgen:** koordinierte Lockfile-/Vertragsänderungen, kleine Feature-PRs, CODEOWNERS mit Vertretung. Source-Binärassets brauchen eine LFS-/Artefaktstrategie.

**Verifikation:** unabhängige Arbeiten in fünf Bereichen und reproduzierbarer Clean-Clone-Build. Bei hohen CI-Zeiten Taskcache anhand einer Messung neu bewerten. Details: [Repository und Workflow](../../development/repository-and-workflow.md).
