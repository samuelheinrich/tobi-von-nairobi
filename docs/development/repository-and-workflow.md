# Repository, Teamworkflow und Entwicklungsumgebung

Dieser Strukturvorschlag beschreibt den Aufbau ab Phase 0. Die Foundation und ein Tutorialprototyp sind inzwischen implementiert; Abweichungen und offene Schritte stehen in [implementation-status.md](implementation-status.md). [Commits und Milestones](milestones.md) · [Arbeitsvereinbarung](../../CONTRIBUTING.md)

## 1. Monorepo und Tooling

pnpm workspaces bilden einen gemeinsamen Dependency-Graphen mit einem eingecheckten Lockfile. Interne Abhängigkeiten verwenden `workspace:*`, explizite Package-Exports und eigene Test-/Build-Scripts. pnpm unterstützt diese lokale Paketbindung über das [Workspace-Protokoll](https://pnpm.io/workspaces). Apps sind private Packages; vorerst gibt es keine Veröffentlichung einzelner Shared Packages auf npm.

**Turborepo zunächst zurückstellen.** pnpm-Scripts und GitHub-Actions-Jobs reichen für zwei Apps und wenige Packages. In Phase 5 messen wir CI-Zeit und Wiederholbuilds. Wenn redundante Builds zum Engpass werden, ergänzt eine ADR einen Taskgraphen mit Cache-Schlüsseln für Lockfile, Toolchain, Contentmanifest und relevante Envwerte. Datenbankmigrationen, serverabhängige Integrationstests und Assetuploads werden nie als vermeintlich reine Tasks gecacht.

Phase 0 fixiert eine unterstützte Node-LTS-/pnpm-/TypeScript-Kombination, kompatible React-/Vite-/Babylon-/Havok-Versionen sowie Nest/Fastify/Prisma/PostgreSQL. Versionsnummern werden vor Installation konkret geprüft, anschliessend im Lockfile, `packageManager`, `engines`, `.node-version` und Container-Tag/Digest fixiert. Kein `latest`-Tag für reproduzierbare Releases.

TS-Basis: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, konsistente Dateinamen, keine impliziten anys. Browser nutzt Bundler-Modulauflösung; Server/portable Packages ein gemeinsam getestetes ESM-/NodeNext-Buildmodell. Konfigurationen teilen Regeln, erzwingen aber keine unpassende identische Laufzeitumgebung. Keine direkten Imports von fremdem `src/`; lokale Watch-Builds aktualisieren Shared Packages vor den Apps.

## 2. Konkrete initiale Zielstruktur

```text
tobivonnairobi/
├── apps/
│   ├── game-client/
│   │   ├── src/
│   │   │   ├── app/                    # React-Shell, Routing, GameHost
│   │   │   ├── ui/
│   │   │   │   ├── auth/
│   │   │   │   ├── hud/
│   │   │   │   ├── menus/
│   │   │   │   ├── results/
│   │   │   │   └── settings/
│   │   │   ├── runtime/
│   │   │   │   ├── composition/       # einzige Verdrahtung, keine Spielregeln
│   │   │   │   ├── session/
│   │   │   │   ├── input/
│   │   │   │   ├── character/
│   │   │   │   ├── camera/
│   │   │   │   ├── physics/
│   │   │   │   ├── items/
│   │   │   │   ├── npc/
│   │   │   │   ├── police/
│   │   │   │   ├── vehicles/          # erst beim Fahrzeug-Spike anlegen
│   │   │   │   ├── levels/
│   │   │   │   ├── audio/
│   │   │   │   └── devtools/
│   │   │   └── persistence/           # SaveCoordinator, IndexedDB-Outbox
│   │   ├── public/                    # kleine statische UI-Dateien
│   │   ├── .env.example
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── game-server/
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── platform/             # Konfiguration, Logging, DB, HTTP-Schutz
│       │   └── modules/
│       │       ├── auth/
│       │       ├── users/
│       │       ├── savegames/
│       │       ├── runs/
│       │       ├── progress/
│       │       ├── inventory/
│       │       ├── achievements/
│       │       ├── highscores/
│       │       ├── settings/
│       │       ├── content/
│       │       └── health/
│       ├── test/integration/
│       ├── .env.example
│       ├── Dockerfile
│       └── package.json
├── packages/
│   ├── contracts/
│   │   └── src/{auth,savegames,runs,content,missions,items,events,settings}/
│   ├── game-core/
│   │   └── src/{clock,character,inventory,items,chaos,wanted,police,npc,missions,combo,score,ports}/
│   ├── game-data/
│   │   ├── worlds/
│   │   ├── levels/
│   │   │   └── bali_mvp_escape/
│   │   │       ├── level.json
│   │   │       ├── entities.json
│   │   │       ├── routes.json
│   │   │       └── missions.json
│   │   ├── items/
│   │   ├── effects/
│   │   ├── achievements/
│   │   ├── npcs/
│   │   ├── dialogue/
│   │   ├── gags/
│   │   ├── balancing/
│   │   ├── locales/de-CH/
│   │   └── manifests/
│   ├── api-client/src/
│   ├── database/
│   │   ├── prisma/schema.prisma
│   │   ├── prisma/migrations/
│   │   ├── seed/
│   │   ├── src/                      # Serverexports, kein Browserzugriff
│   │   └── prisma.config.ts
│   └── config/{typescript,eslint,vitest}/
├── assets/
│   ├── source/
│   │   ├── characters/
│   │   ├── animations/
│   │   ├── audio/
│   │   ├── environments/
│   │   ├── props/
│   │   └── vehicles/
│   ├── recipes/                      # Optimierungsprofile, kleine Textdateien
│   └── licenses/                     # Herkunft, Lizenz, Attribution pro Asset
├── tools/
│   ├── setup/
│   ├── content-pipeline/
│   ├── asset-pipeline/
│   └── create-level/
├── tests/
│   ├── e2e/
│   ├── browser-integration/
│   ├── performance/
│   └── fixtures/                     # nur wirklich übergreifende Fixtures
├── docs/
│   ├── architecture/
│   │   ├── adr/
│   │   └── assets-and-performance.md
│   ├── gameplay/                     # spätere einzelne Level-Briefs/Playtests
│   ├── api/
│   │   ├── data-and-api.md
│   │   └── openapi.json              # generierter Vertragsstand
│   └── development/
│       ├── repository-and-workflow.md
│       ├── milestones.md
│       └── runbooks/                 # spätere Restore-/Release-Anleitungen
├── .github/
│   ├── workflows/{ci,release,content}.yml
│   ├── CODEOWNERS
│   ├── pull_request_template.md
│   └── ISSUE_TEMPLATE/
├── .editorconfig
├── .gitattributes                    # LFS-Regeln für Binärquellen
├── .gitignore
├── .node-version
├── .env.example                      # ausschliesslich Compose-Konfiguration
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
├── eslint.config.js
├── prettier.config.js
├── README.md
├── CONTRIBUTING.md
├── ARCHITECTURE.md
├── GAME_DESIGN.md
└── IMPLEMENTATION_PLAN.md
```

Die Baumdarstellung zeigt Zielzuständigkeiten, keine Aufforderung, sämtliche leeren Ordner in Commit 1 anzulegen. Module kommen mit ihrem ersten sinnvollen Vertrag oder ihrer Implementierung. Unit-Tests liegen direkt neben ihrem Modul. Optimierte grosse Assets liegen als versionierte Buildartefakte unter ignoriertem `.artifacts/assets/` bzw. im Deployment-Storage, nicht doppelt in source und public. Kleine Placeholder können ohne LFS in den regulären Code-Workflow.

Ein Clientfeature kann intern `controller.ts`, `state.ts`, `ports.ts`, `babylon-adapter.ts` und passende Tests besitzen. Ein Serverfeature kann `controller`, `service`, `repository`, `mapper` und Tests besitzen. Die Dateimenge folgt tatsächlicher Komplexität. Ein globales `Game.ts` oder `types.ts` als Sammelstelle wird vermieden.

## 3. Parallele Arbeit für mindestens fünf Personen

| Bereich            | Primär bearbeitete Pfade                                        | Früher Vertrag für andere Teams                      |
| ------------------ | --------------------------------------------------------------- | ---------------------------------------------------- |
| A Runtime/Bewegung | client/runtime/{session,input,character,camera,physics}         | Actions, CharacterMotor, PhysicsQueries, Lifecycle   |
| B Spielregeln      | game-core/{items,inventory,chaos,wanted,missions,combo,score}   | bestätigte Events, Rule-Result-Fixtures              |
| C AI/Navigation    | client/runtime/{npc,police}, core/{police,npc}, Routenwerkzeuge | Perception, NavigationPort, PursuitDirector-Aufträge |
| D Backend          | game-server, database, api-client                               | Auth-/Run-/Save-DTOs, OpenAPI, API-Fixtures          |
| E UI/Content       | client/ui, game-data, assets, Contentwerkzeuge                  | HUD-ViewModels, LevelDefinition, Assetmanifest       |

Jeder Bereich hat mindestens einen Review-Stellvertreter. Contracts werden nach Domäne unterteilt, damit fünf Entwickler nicht dasselbe Interfacefile editieren. Ein neues Event beginnt mit einem kleinen Contract-PR samt Beispiel und Wirkung; abhängige Feature-PRs können mit Fakeadaptern entstehen. Zwei bis drei kurze Integrationsfenster pro Woche prüfen das Spiel zusammen, nicht erst am Ende der Phase.

`CODEOWNERS` routet Reviews, ist keine exklusive Schreibberechtigung. Neue Implementierungen erweitern bevorzugt ihr Featureverzeichnis. Der Composition Root wird selten und kurz geändert; Contentdateien werden pro Level, Dialog und Profil aufgeteilt. Datenbankmigrationen benötigen vor dem Merge Koordination; ein Entwickler reviewed die Reihenfolge, ohne sämtliche Backendarbeit selbst zu übernehmen. Lockfile-Konflikte werden mit der fixierten pnpm-Version reproduziert, nicht händisch zusammengeflickt.

## 4. Branching und Pull Requests

Gewählt: `main` als jederzeit baubarer Integrationsbranch und kurzlebige Branches `feature/*`, `fix/*`, `refactor/*`, `docs/*`, `chore/*`. Ziellebensdauer 1–3 Arbeitstage. Grössere Systeme werden in vertikale, testbare Schritte zerlegt und bei Bedarf hinter Featureflags integriert. Kein dauerhaftes `develop`: eine zusätzliche Integrationslinie würde Rückmerges und spät entdeckte Asset-/Vertragskonflikte fördern, ohne hier getrennte Releasezüge zu bedienen.

Jeder PR enthält Problem/Ergebnis, relevante Screenshots oder kurzen Clip bei UI-/Gameänderungen, konkrete Testresultate und gegebenenfalls Migrations-/Contentfolgen. Mindestens eine unabhängige Zustimmung; Änderungen an gemeinsamem Vertrag zusätzlich vom betroffenen Bereich mitprüfen lassen. Squash-Merge mit Conventional-Commit-Titel hält die Historie lesbar. Releases bekommen Tags; Wartungsbranches werden nur bei tatsächlich mehreren unterstützten Releaseversionen eingeführt.

GitHub-Ruleset für `main`: PR-Pflicht, mindestens ein Review, neue relevante Änderungen entwerten Zustimmung, aufgelöste Diskussionen, erforderliche CI-Gates, keine Force-Pushes/Branchlöschung und keine regulären Admin-Ausnahmen. Ein lokaler Hook ist nur Komfort; der Remote erzwingt die Regeln. GitHub beschreibt die Möglichkeiten unter [geschützte Branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

Phase 0 legt zuerst einen Bootstrap-Branch mit Foundation-Dateien an. Falls der Git-Host für Schutzregeln einen existierenden Defaultbranch benötigt, wird einmalig eine minimale initiale Referenz hergestellt; danach werden Ruleset und Reviewpflicht sofort aktiviert, bevor Teamarbeit beginnt. Dieser technische Bootstrap wird protokolliert. In diesem Planungsschritt werden weder Git initialisiert noch Commits oder Remote-Einstellungen ausgeführt.

## 5. Lokale Entwicklungsumgebung

Zielkommando nach dem Clone: `pnpm install`, einmal `pnpm run setup`, `docker compose up -d --wait`, `pnpm dev`. Setup erzeugt fehlende Envdateien aus Beispielen und erklärt Voraussetzungen. Es überschreibt keine bestehenden Secrets. Compose startet PostgreSQL mit Healthcheck, benanntem Volume und auf localhost beschränktem Port. Client und API laufen im Watchmodus auf dem Host.

Vorgesehene Adressen: Client `http://localhost:5173`, API `http://localhost:3000`, PostgreSQL `localhost:5432`. Vite proxyt `/api` an die API; der Browser nutzt dadurch einen Origin auch lokal. `pnpm dev` führt einen Preflight durch, wartet begrenzt auf eine gesunde DB, generiert Prisma, wendet ausstehende lokale Migrationen an und startet beide Apps. Migrationen werden nicht von jedem gleichzeitig laufenden Serverprozess spontan erstellt. Seeds sind idempotent, laden Contentreferenzen/Testdaten und erzeugen keine öffentlich bekannten Produktionsaccounts.

| Envdatei                | Beispiele                                                                     |
| ----------------------- | ----------------------------------------------------------------------------- |
| root `.env` für Compose | lokale DB-Bezeichnung, User, Passwort, optional Hostport                      |
| server `.env`           | `DATABASE_URL`, `SESSION_SECRET`, `PORT`, `CLIENT_URL`, `NODE_ENV`, Log-Level |
| client `.env`           | `VITE_API_BASE_URL=/api/v1`, öffentliche Asset-Basis, Build-ID                |

Alle Apps prüfen ihre Konfiguration beim Start. `VITE_*` ist grundsätzlich öffentlich; keine DB-URL oder Sessionsecrets dort. `.env*` und lokale Overrides werden ignoriert, ausdrücklich ausgenommen `.env.example`. Das Setup startet keine zufällig offenen Redis-/S3-Dienste. Diese kommen erst mit einem begründeten Bedarf hinzu.

| Script                                                     | Vertrag                                                                       |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm run setup`                                           | lokale Env-/Toolchain-Vorbereitung, nicht destruktiv                          |
| `pnpm dev`                                                 | Shared-Watchbuilds, API, Client, verständliche Fehler bei fehlender DB        |
| `pnpm db:migrate`, `pnpm db:seed`                          | lokale Migrationen/Seed gezielt ausführen                                     |
| `pnpm db:reset`                                            | explizit destruktiver lokaler Reset; nie Teil von dev oder CI gegen fremde DB |
| `pnpm lint`, `pnpm format:check`, `pnpm typecheck`         | gemeinsame Codequalität                                                       |
| `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e` | klar getrennte Prüfungen                                                      |
| `pnpm content:validate`, `pnpm assets:build`               | Content prüfen bzw. reproduzierbar optimieren                                 |
| `pnpm build`                                               | alle Packages und beide Apps in Abhängigkeitsreihenfolge                      |

## 6. Teststrategie

**Unit – Vitest:** reine Regeln ohne Engine, DB oder DOM. Boundaryfälle für Chaos 0/20/40/60/80/100 und Bruchwerte, Hysterese, Quest-Mindestschwellen, Wanted-Caps, Escape-Reset, Stamina, Effektstapeln, Combo-Reihenfolge, Score-Caps, atomare Inventaränderungen und Missiongraph. Fake Clock/seedbarer RNG ersetzen echte Wartezeiten. Besonders wertvoll sind Invarianten: keine negativen Bestände, kein doppeltes Reward, keine mehrfach gezählte Pickup-ID. Branch-Coverage-Ziel 85 % für diese Kernregeln, keine pauschale Prozentquote für generierte Daten oder 3D-Adapter.

**Integration – echte Grenzen:** API mit Fastify-Testinjektion und temporärem PostgreSQL gleicher Hauptversion wie Produktion. DB pro Suite/Test eindeutig isolieren, Migrationen vom leeren Schema und von vorheriger Releaseversion prüfen. Authcookie-/CSRF-/Ownershiptests, zwei konkurrierende Abschlussanfragen, Lost-Response-Retry, Revisionkonflikt, Save-Migration und Restore. Niemals SQLite als vermeintlich gleichwertiger Ersatz für PostgreSQL-Constraints verwenden.

**Browser-Integration:** Babylon/Havok in einer kleinen Testarena. Grounding, Stufen, Wandecken, schnelle Kollision, Kameraclipping, Fokusverlust, Levelunload/Reload und wiederholter Assetwechsel. Node-Unit-Tests allein beweisen diese Integration nicht. Feste Szenen und reproduzierbare Inputs, mit Toleranzen statt bitgenauer Physikvergleiche.

**E2E – Playwright:** Account erstellen → anmelden → Level starten → mit echten Eingabeaktionen fünf Flaschen sammeln → Polizei auslösen → Sichtlinie brechen → Flucht abschliessen → Airbnb → Ergebnis → Speichern bestätigen → Browser neu laden → Fortschritt aus DB wiedersehen. Zusätzlich Netzverlust/erneutes Senden, ausgeloggte Outbox, zweiter Tab und alter Save. Fixtures steuern Seed und Kartenplatzierung; der eigentliche Erfolgsweg darf nicht per „Complete Mission“-Debugcommand abgekürzt werden.

PR-Smoke läuft in Chromium mit vollständigem Kernloop. Nächtlich bzw. vor Release breitere Chromium/Firefox/WebKit-Läufe; echtes Safari auf macOS bleibt ein manueller Pflichtcheck, WebKit-Automation ersetzt es nicht. Software-Rendering in CI ist ein Funktionstest, kein 60-FPS-Beweis. Reale Performance-Messungen folgen einem [festen Benchmark](../architecture/assets-and-performance.md).

**Playtests:** mindestens fünf neue Testpersonen für das MVP, ergänzt um geübte Referenzspieler. Beobachten: verstehen sie Ziel/Entdeckung, nutzen sie beide Routen, ist Fangkontakt fair, wollen sie erneut spielen? Zahlen unterstützen die Designentscheidung, ersetzen sie nicht. Screenshots prüfen UI/Lesbarkeit, keine fragilen pixelgenauen 3D-Goldens über verschiedene GPUs.

## 7. CI und CD

Bei jedem PR:

```text
Checkout und fixierte Toolchain
  → pnpm install --frozen-lockfile
  → Lint / Format / Importgrenzen / Typecheck
  → Contracts- und Contentvalidierung / Unit-Tests
  → PostgreSQL starten / Migrationen / Integrationstests
  → Client und Server bauen
  → Browser-Smoke / E2E auf den gebauten Artefakten
  → zusammenfassendes required CI-Gate
```

Unabhängige Jobs laufen parallel; Abhängigkeiten bleiben explizit. Ein immer laufender Gesamtcheck muss erforderliche fehlgeschlagene oder ausgelassene Prüfungen erkennen. Docs-only-PRs dürfen schwere Appchecks bewusst überspringen, aber Markdown-/Linkprüfung und Policygate bleiben erhalten. Wenn Contracts, Daten oder Engine geändert werden, laufen alle betroffenen Verbraucherchecks. CI speichert Fehlerscreenshots, Traces und Testberichte ohne Secrets.

Actions werden auf überprüfte Revisionen fixiert, Tokenrechte minimiert und untrusted Fork-PRs erhalten keine Deployment-Secrets. pnpm-Store darf gecacht werden; DB-Testergebnisse und Migrationen nicht. Dependencyprüfung, Secret-Scan und Bundle-/Contentbudget laufen ergänzend. Assetjobs ändern nie stillschweigend die Repositoryquellen.

CD-Ziel: statischer Client und contentadressierte Assets über CDN/Object Storage, API als Node-Container, verwaltetes PostgreSQL. Keine Hostinganbieterbindung erforderlich. Merge nach `main` erzeugt reproduzierbare Artefakte und deployt Staging; Produktionsrelease verwendet ein freigegebenes Tag und geschützte Deployment-Umgebung. Die konkrete Releaseverantwortung wird beim ersten Hosting-Setup benannt.

Releasefolge: rückwärtskompatible DB-Erweiterung → API mit alter/neuer Vertragsunterstützung → Assets veröffentlichen → Client/Manifest aktivieren → Smoke → beobachten. Alte Assets bleiben für offene Runs verfügbar. Migration wird einmal pro Releasejob ausgeführt, nicht parallel in jeder Replik. Expand/Contract für Schemaänderungen; destruktive Bereinigung erst nach kompatiblem Übergang.

Rollback verwendet das vorige Client-/API-Artefakt und Manifest, kompatibel mit dem erweiterten Schema. Eine irreversible Migration wird nicht blind heruntergerollt; vorbereitete Forward-Fix-/Restore-Anleitung und geprobte Backups sind Voraussetzung. Source Maps liegen geschützt für Fehleranalyse, nicht zwingend öffentlich im Clientbundle. Logs tragen Build-/Content-/Schema-Version für reproduzierbare Fehlerberichte.

## 8. Dokumentation und Definition of Done

README erklärt Einstieg/Setup/Tests/Build und verlinkt Details. ARCHITECTURE und GAME_DESIGN sind die kanonischen Überblicke, spezialisierte Details werden verlinkt. ADRs begründen langfristige Entscheidungen, API-Schemas erzeugen die OpenAPI-Datei, Level-Briefs dokumentieren Routen und Ziele. Jede grössere Phase liefert ein kurzes Playtest-/Messprotokoll und aktualisiert den Planungsstatus.

Ein Feature ist fertig, wenn sein Verhalten und seine Grenzen beschrieben, relevante Checks grün, Review abgeschlossen, Inhalte validiert und Fehler-/Pause-/Dispose-Pfade geklärt sind. UI-/Gameplayänderungen enthalten sichtbaren Nachweis. Persistenzänderungen enthalten Migration und Konflikt-/Retrytest. Eine neue Mission benötigt keine Änderung am allgemeinen Controller; eine neue Objective-Art benötigt Schema, Handler und Tests. Angewandte Dokumentationsänderungen gehören in denselben PR.
