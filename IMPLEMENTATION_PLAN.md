# Technischer und spielerischer Implementierungsplan

Planungsstand: 13. September 2026. Alle Zahlen zum Balancing, zu Laufzeiten und Performance-Budgets sind Ausgangshypothesen, bis Prototyp und Playtests sie bestätigen. Dieser Plan entstand vor der Implementierung. Die Umsetzung läuft inzwischen; den tatsächlichen Stand beschreibt [implementation-status.md](docs/development/implementation-status.md).

## 1. Projektentscheidung

**Babylon.js ist die gewählte Engine.** Die integrierten Spielefunktionen reduzieren für dieses konkrete Projekt die Integrationsarbeit bei Physik, Character Controller, Assets und Debugging. React verwaltet Menüs und HUD; Babylon besitzt die Simulation und Szene. Die ausführliche Gegenüberstellung mit Three.js steht in [ARCHITECTURE.md](ARCHITECTURE.md).

Das Backend wird ein **modularer NestJS-Monolith mit Fastify-Adapter**, PostgreSQL und Prisma. NestJS gibt einem Team von mindestens fünf Entwicklern verbindliche Modul- und Servicegrenzen. Fastify ist dabei der HTTP-Unterbau. Client und Backend werden unabhängig gebaut und bereitgestellt, aber gemeinsam versioniert.

Ein **pnpm-Workspace mit kurzem, PR-basiertem Trunk-Workflow** bildet die Grundlage. Es gibt `main` und kurzlebige Arbeitsbranches; ein dauerhaftes `develop` ist für dieses Produkt nicht erforderlich. Turborepo wird erst eingeführt, wenn gemessene Buildzeiten den zusätzlichen Task- und Cache-Aufwand rechtfertigen.

## 2. Umfang und verbindliche Annahmen

- Singleplayer; keine Multiplayer-Synchronisation oder dauernde serverseitige Welt-Simulation.
- Desktop mit Tastatur/Maus im MVP; Input-Verträge berücksichtigen Gamepad und Touch bereits.
- WebGL 2 ist der Render-Basispfad. WebGPU folgt als optionale, separat geprüfte Erweiterung.
- Vier Worlds mit insgesamt **16 Kampagnenlevels**: Bali 1–4, Bangkok 5–8, Zürich 9–12, Arlesheim 13–16 einschliesslich Finale.
- Ein Account besitzt im MVP einen aktiven Kampagnen-Slot. Das Datenmodell unterstützt mehrere Slots, deren Oberfläche später folgt.
- Die Simulation läuft lokal. PostgreSQL speichert bestätigten Fortschritt und kompakte Checkpoints. Der Browser meldet Ergebnisse; das Backend prüft sie, kann lokale Physik aber nicht beweisen.
- Das MVP enthält **ein eigenständiges Bali-Testlevel `bali_mvp_escape`**. Es ersetzt nicht das polizeifreie Kampagnen-Tutorial „Welcome to Bali“. In der Kampagne bleibt dieses Testlevel ausgeblendet.
- Originalität entsteht aus Tobis Selbstüberschätzung und banalen Aufgaben, die eskalieren. Die Orte bilden den Hintergrund; lesbare Spielräume und liebevoller Figurenhumor bestimmen die Gestaltung.

## 3. Die drei zentralen Architekturregeln

1. **Ein Besitzer pro Zustand:** Bewegung besitzt der Character Controller, Chaos das Chaos-System, Geld der Server. Andere Module erhalten lesbare Sichten oder senden Befehle.
2. **Verträge vor Implementierung:** gemeinsame Schemas, Events, Ports und Test-Fixtures werden früh festgelegt. Module ändern keine fremden Interna und importieren keine fremden privaten Dateien.
3. **Content ist versionierte Eingabe:** neue Level, Missionen, Dialoge und Balancing entstehen als validierte Daten. Neue Mechanikarten benötigen einen expliziten Handler samt Schema und Tests; JSON führt keinen freien Code aus.

## 4. Vollständigkeitsnachweis der 33 geforderten Bereiche

| Nr. | Bereich         | Festlegung und Detaildokument                                                                                                   |
| --- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Engine          | Babylon.js + Havok, begründeter Three.js-Vergleich in [Architektur](ARCHITECTURE.md)                                            |
| 2   | Frontend        | React-Shell, imperative Runtime, zustandsbasierter HUD-Adapter; [Architektur](ARCHITECTURE.md)                                  |
| 3   | Backend         | NestJS/Fastify, fachliche Module, keine Microservices; [Architektur](ARCHITECTURE.md)                                           |
| 4   | Monorepo        | pnpm, explizite Exports, ein Lockfile; [Repository](docs/development/repository-and-workflow.md)                                |
| 5   | Git-Workflow    | kleine PRs, geschütztes `main`, Reviews; [CONTRIBUTING](CONTRIBUTING.md)                                                        |
| 6   | Branching       | trunk-basiert, kurzlebige `feature/*`, `fix/*`, `refactor/*`, `docs/*`; [Workflow](docs/development/repository-and-workflow.md) |
| 7   | Modulgrenzen    | Ownership-Tabelle, Ports, Abhängigkeitsregeln; [Architektur](ARCHITECTURE.md)                                                   |
| 8   | Shared Packages | contracts, game-core, game-data, api-client, database, config; [Architektur](ARCHITECTURE.md)                                   |
| 9   | Datenbank       | normalisierte Account-/Slot-/Run-Entitäten, Constraints; [Datenmodell](docs/api/data-and-api.md)                                |
| 10  | API             | REST `/api/v1`, Vertragsvalidierung, Idempotenz; [API](docs/api/data-and-api.md)                                                |
| 11  | Character       | Kapsel, kontrollierte Geschwindigkeit, Stamina, Animation; [Architektur](ARCHITECTURE.md) und [Design](GAME_DESIGN.md)          |
| 12  | Input           | Geräteadapter → Actions → Commands, Kontexte; [Architektur](ARCHITECTURE.md)                                                    |
| 13  | Camera          | Orbit, Sweeps, Hinderniskorrektur, zugängliche Einstellungen; [Architektur](ARCHITECTURE.md)                                    |
| 14  | Missionen       | Objective-Graph, Plugin-Handler, stabile IDs und Snapshots; [Design](GAME_DESIGN.md)                                            |
| 15  | Items           | Definitionen, Effektdauer, Stapelregeln, Throw-Handler; [Design](GAME_DESIGN.md)                                                |
| 16  | Inventory       | Run-/Account-Inventar, Transaktionen, Limits; [Design](GAME_DESIGN.md) und [API](docs/api/data-and-api.md)                      |
| 17  | Chaos           | 0–100, Hysterese, Abbau und Score-Anreiz; [Design](GAME_DESIGN.md)                                                              |
| 18  | Wanted          | eigenständiger bestätigter Fahndungszustand mit Level-Caps; [Design](GAME_DESIGN.md)                                            |
| 19  | Police AI       | modulare FSM, Wahrnehmung, Navigation, Einsatzleiter; [Design](GAME_DESIGN.md)                                                  |
| 20  | NPC AI          | Ambient-FSM, Dialog, Reaktionen und Aktivierungsradien; [Design](GAME_DESIGN.md)                                                |
| 21  | Score           | Ereigniswertung, Combo, versionierte Formel, Missbrauchsgrenzen; [Design](GAME_DESIGN.md)                                       |
| 22  | Savegame        | Checkpoint-Projektion, Retry-Outbox, Revisionen, Migration; [API](docs/api/data-and-api.md)                                     |
| 23  | Levels          | Lifecycle, Komponentenmetadaten, Unlock-Graph, Replay-Vertrag; [Design](GAME_DESIGN.md)                                         |
| 24  | Assets          | GLB, Meshopt/Draco-Abwägung, KTX2, LOD, Manifest; [Pipeline](docs/architecture/assets-and-performance.md)                       |
| 25  | Tests           | Unit, Browser-Integration, DB-Integration und E2E; [Entwicklung](docs/development/repository-and-workflow.md)                   |
| 26  | CI/CD           | PR-Gates, Artefakte, Migration, Staging, Rollback; [Entwicklung](docs/development/repository-and-workflow.md)                   |
| 27  | Lokal           | Compose-PostgreSQL, Setup und gemeinsame Commands; [Entwicklung](docs/development/repository-and-workflow.md)                   |
| 28  | Security        | Sessions, Argon2id, CSRF, Owner-Checks, Plausibilität; [API](docs/api/data-and-api.md)                                          |
| 29  | Performance     | 60-FPS-Ziel mit festem Benchmark, Budgets und Quality-Stufen; [Performance](docs/architecture/assets-and-performance.md)        |
| 30  | Debugging       | F1, Zustände, Repro-Seeds, Logs und Profiling; [Performance](docs/architecture/assets-and-performance.md)                       |
| 31  | Dokumentation   | Einstieg, Architektur, Design, API, ADRs und Runbooks; [README](README.md)                                                      |
| 32  | Milestones      | Phasen 0–8 mit Eintritt, Ergebnis und Abnahme; [Milestones](docs/development/milestones.md)                                     |
| 33  | MVP             | alle 14 geforderten Schritte, Scope und Abnahmeszenario; [Milestones](docs/development/milestones.md)                           |

## 5. Lieferung und Teammodell

Die erste Lieferung ist ein reproduzierbarer technischer Prototyp. Die zweite zeigt, ob Flucht und Chaos Spass machen. Erst danach wird der Loop mit Accounts und dauerhaftem Fortschritt zum Bali-MVP verbunden. Content-Produktion beginnt nach einem belastbaren Level- und Asset-Vertrag.

Fünf parallele Arbeitsbereiche: **Runtime/Bewegung**, **Spielsysteme/Missionen**, **AI/Navigation**, **Backend/Persistenz**, **UI/Content/Assets**. Pro Bereich gibt es einen primären Maintainer und einen Stellvertreter. Der Content-/UI-Bereich wird bei sechs bis sieben Personen geteilt; insbesondere Animation und Levelgestaltung benötigen eigene Kapazität. Gemeinsame Verträge werden in kleinen vorgelagerten PRs abgestimmt, anschliessend entwickeln Teams mit denselben Fixtures und Adaptern unabhängig weiter.

## 6. Grösste Projektrisiken und Entscheidungstore

| Risiko                                    | Früher Nachweis                                            | Konsequenz bei Fehlschlag                                                      |
| ----------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Bewegung wirkt schwerfällig               | Phase 1: Treppen, Ecken, Sprünge, Kamera mit Placeholder   | Controller/Physikadapter verbessern, bevor mehr Content entsteht               |
| Verfolgung wirkt unfair                   | Phase 2: drei Fluchtrouten mit neuen Testspielern          | Wahrnehmung, Reaktionszeit und Routen ändern; keine reine Gegnervermehrung     |
| Vier Worlds überfordern Content-Team      | Bali-Level messen: Bauzeit, Animation, Sound, QA           | pro World erst ein vertikales Beispiel, dann Varianten produzieren             |
| Browserbudget reicht nicht                | frühe integrierte GPU und Safari als Pflichtgeräte         | weniger aktive AI, einfachere Beleuchtung und Szenen, vor neuen Grafikeffekten |
| Speichern verdoppelt Belohnungen          | parallele Requests, verlorene Antworten, Wiederherstellung | Run-/Transaktionsmodell korrigieren, kein MVP-Release ohne Nachweis            |
| Öffentliche Highscores werden manipuliert | gefälschte Events als Sicherheitstest                      | im MVP als ungeprüfte Community-Werte behandeln; Ranked-Modus separat planen   |
| Fahrzeuge verschlechtern Laufgefühl       | Scooter-Micro-Spike nach stabilem Fuss-Controller          | arcadeartige Steuerung vereinfachen, Fahrzeuginhalt erst danach skalieren      |

Budget und konkretes Release-Datum sind nicht vorgegeben. Aufwandsspannen und Abhängigkeiten stehen in [Milestones](docs/development/milestones.md); sie sind eine Planungsgrundlage, keine Termin- oder FPS-Garantie.
