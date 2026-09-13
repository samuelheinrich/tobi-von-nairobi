# Zusammenarbeit

Diese Vereinbarung gilt für die Implementierung. Tooling und lokale Prüfungen sind eingerichtet. Das GitHub-Repository verwendet Pull Requests; `@samuelheinrich` ist der initiale Codeowner. Den tatsächlichen Stand dokumentiert [implementation-status.md](docs/development/implementation-status.md). [Vollständiger Workflow](docs/development/repository-and-workflow.md)

## Arbeitsweise

Vor einem Feature dessen Modulbesitz und öffentlichen Vertrag prüfen. Kleine Änderungen von `main` in einen kurzlebigen Branch abzweigen. Bevorzugte Namen: `feature/player-controller`, `feature/police-ai`, `feature/bali-level`, `feature/savegame-api`, ausserdem `fix/*`, `refactor/*`, `docs/*`, `chore/*`.

Gemeinsame Verträge zuerst in einem kleinen PR stabilisieren, dann mit Fakeadaptern parallel implementieren. Keine fremden privaten Modulimporte und keine levelbezogenen Sonderfälle in allgemeiner AI. Bei Datenbankmigrationen und Binärassets früh den zuständigen Maintainer einbeziehen, um nicht zusammenführbare Änderungen zu vermeiden. Hauptverantwortung und Reviewvertretung werden in CODEOWNERS abgebildet.

## Commits und Reviews

Conventional Commits, zum Beispiel:

```text
feat(player): add sprint stamina
feat(police): implement chase state
fix(camera): prevent clipping through walls
refactor(missions): extract objective handlers
docs(api): document savegame endpoint
```

Ein PR erklärt das konkrete Problem, das resultierende Verhalten und die tatsächlich ausgeführten Prüfungen. UI-/Gameänderungen zeigen Screenshot oder Clip. Schema-/Contentänderungen erklären Migration und Kompatibilität. Mindestens ein anderer Entwickler reviewed; offene Diskussionen und erforderliche CI-Prüfungen sind vor Merge abgeschlossen. Squash-Titel folgt Conventional Commits. `main` erhält nach dem dokumentierten Bootstrap ausschliesslich geprüfte PR-Merges.

## Coding Standards

TypeScript strict, ESLint, Prettier und EditorConfig sind verbindlich. `unknown` plus Validierung an externen Grenzen. `any` nur lokal mit nachvollziehbarer Begründung und gegebenenfalls Upstream-Issue; keine pauschale Abschaltung einer Regel. Öffentliche Services, Ports und nicht offensichtliche Zustandsübergänge erklären Verantwortung, Einheiten, Fehlerverhalten und Ownership.

Code-Identifier und Commit-Titel sind englisch, Spieltexte zunächst de-CH über Lokalisierungsschlüssel. Einheitensuffixe wie `durationMs`, `speedMetersPerSecond` und `chaosPerSecond` vermeiden Missverständnisse. Kein gemischtes Sekunden-/Millisekundenformat. Magische Balancewerte gehören in versionierte Daten.

Keine unkontrollierten Produktions-`console.log()`-Aufrufe; den Logger mit Kategorie und Level nutzen. Secrets, personenbezogene Authpayloads und lokale `.env`-Dateien niemals committen. Generated Code und optimierte Assets werden nicht von Hand geändert. Kleine fachliche Dateien bevorzugen; allgemeine Hilfspakete erst bei belegtem Bedarf einführen.

## Prüfungen vor einem PR

Die in [README](README.md) aufgeführten Scripts bilden die gemeinsame Oberfläche. Relevante Unit-/Integrations-/E2E-Prüfungen ausführen und Ergebnisse ehrlich dokumentieren. Keine Tests hinzufügen, die nur eine triviale Implementierung nacherzählen. Spielregeln prüfen Invarianten, 3D-Adapter laufen im Browser, Datenbankregeln gegen PostgreSQL. Bei Änderungen an Verträgen auch die Verbraucher prüfen.

## Assets und Inhalte

Pro Level getrennte Textdateien und stabile IDs. Grosse Quellen unter Git LFS mit abgestimmtem Bearbeiter; generierte GLBs über Pipeline. Herkunft und Nutzungslizenz jedes Assets dokumentieren. Geänderte Missionen, Navlinks, Collider und Safe Zones validieren und im Level ablaufen. Humor bleibt auf die liebevoll überzeichnete Figur und die eskalierende Situation ausgerichtet.

## Architekturänderungen

Eine ADR ist nötig bei Engine-/Physikwechsel, Änderung der Zustandsautorität, neuem Persistenz-/Authmodell, neuen Packagegrenzen oder Infrastrukturplattformen. Eine normale Balancingkorrektur oder ein zusätzlicher Handler braucht keine neue Grundsatzentscheidung. ADRs nennen Kontext, Entscheidung, Alternativen, Folgen und einen überprüfbaren Anlass zur Neubewertung.
