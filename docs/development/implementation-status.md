# Implementierungsstand

Stand: 13. September 2026. Initialer Veröffentlichungsbranch: `feature/tobi-branding`.

## Bereits implementiert

- pnpm-Monorepo mit fixierter Node-24-LTS-Toolchain, TypeScript strict, ESLint, Prettier, EditorConfig und Importgrenzen.
- React-/Vite-Client mit eigenem Startbildschirm, HUD, Pause, Ergebnisansicht und lokal ausgelieferten Fonts.
- Babylon.js/Havok-Testlevel: stilisierte Tobi-Figur, Bewegung, Sprint/Stamina, Sprung, Kollisionen, Maus-/Drag-Kamera, Flaschenaufnahme und Check-in.
- Geräteunabhängige Actions; feste Simulationsschritte mit Lastbegrenzung; Aufräumen bei Neustart, Mount/Unmount und Ladeabbruch.
- Validierte JSON-Leveldaten, erweiterbares Collect-/Reach-Objective-System, eindeutige Pickupwertung und einmaliger Abschlussbonus.
- Entwicklungsmenü mit Teleport, Respawn und Zustands-/FPS-Inspektion; aus dem Produktionsimportgraph entfernt.
- NestJS/Fastify-API für Liveness, Datenbankbereitschaft und Content; PostgreSQL in Compose; Prisma-Schema und initiale Migration für User, Saveslots und Settings.
- CI-Workflow sowie Unit-, echte PostgreSQL-Integrations- und Browsertests.

## Bewusst noch offen

Dieser Stand ist ein **technischer Tutorialprototyp**, kein vollständiges Bali-MVP. Ein Durchlauf dauert auf dem direkten Testweg deutlich unter fünf Minuten. Er dient der Funktionsprüfung, nicht der finalen Leveldauer.

Polizei/Chaos/Wanted, Power-ups, Flaschenwerfen, umfangreiche Animationen, Login, Savegame-API und dauerhafte Speicherung des Spielverlaufs sind noch nicht angeschlossen. Das vorhandene Datenbankschema ist eine Foundation, nicht das vollständige Datenmodell aus dem Plan. Es werden keine Accounts oder Saves über ungeschützte Endpunkte angelegt.

Die Kamera verwendet fünf Ray-Probes als erste Annäherung an einen Kameraradius; ein echter Shape Sweep und engere Innenräume bleiben Phase-1-Arbeit. Die Physik läuft in festen Schritten, visuelle Transforminterpolation ist noch offen. Referenzgeräte-/Safari-Abnahme und ein zehnminütiger manueller Kollisions-Parcours sind nicht durch einen Headless-Chromium-Lauf ersetzt.

Das GitHub-Repository ist [samuelheinrich/tobi-von-nairobi](https://github.com/samuelheinrich/tobi-von-nairobi), mit `@samuelheinrich` als initialem Codeowner. Die Erstveröffentlichung erfolgt nach einem leeren Bootstrap-Commit auf `main` als Pull Request. `main` ist geschützt: mindestens ein unabhängiges Review, erfolgreicher `required`-CI-Check und geklärte Diskussionen sind vor dem Merge nötig; der Schutz gilt auch für Administratoren. Force-Push und Löschen sind deaktiviert. Der aktuelle Review- und CI-Status ist im Pull Request sichtbar. Produktionsziel ist **https://tobi-von-nairobi.ch**; DNS, Hosting und Deployment sind noch nicht eingerichtet.

## Toolchainentscheidungen während der Implementierung

Node **24.21.0**, pnpm **10.34.5**, TypeScript **5.9.3**, Babylon **9.26.0**, Havok **1.3.14**, React **19.3.0**, Vite **8.3.0**, Nest **12.0.1**, Fastify **5.12.4**, Prisma **7.10.0**, PostgreSQL **17.6**. Prisma 8 war bei der Abfrage ein Release Candidate und wurde nicht ausgewählt. Ein pnpm-Override vereinheitlicht Fastify, damit Nest-Adapter und Plugins dieselbe Runtime-/Typversion verwenden.

Der projektbezogene Setupbefehl lautet **`pnpm run setup`**. `pnpm setup` ist ein eigener pnpm-Befehl zur Shellintegration und führt nicht unser Setupscript aus. Die ursprünglichen Planbeispiele werden entsprechend berichtigt.

## Validierungsnachweise

Die Prüfkette umfasst zwölf Unit-Tests (Levelvalidierung, feste Uhr, Bewegung und eindeutige Missions-/Scorewertung), drei Integrationstests gegen echtes PostgreSQL und drei Browsertests. Der Browser prüft den kompletten Tutorialdurchlauf, Sprint/Pause und die Havok-Grenzen: Grounding, tatsächliche Sprunghöhe, Landung, Wandkollision, Kamerafreiraum und Freigabe aller Engineinstanzen nach wiederholtem Aufbau.

`pnpm check:bundle` prüft zusätzlich das komprimierte Gesamtbudget aller gebauten Client-Assets und stellt sicher, dass das Developer-Menü im Produktionsartefakt fehlt. Der gemessene Gesamtumfang beträgt derzeit rund **1,31 MiB gzip**; das ist ein Transfergrössenvergleich, keine FPS-Messung. Vite weist weiterhin auf den absichtlich verzögert geladenen, grösseren Engine-Chunk hin. Referenzhardware und Safari bleiben separate Abnahmen.

Lokale Browser-Screenshots werden in `.artifacts/screenshots/` erzeugt. Fehlgeschlagene CI-Browsertests laden ihre Traces/Screenshots als kurzlebiges Artefakt hoch. Der Integrationstest legt nur eindeutig benannte Testdatensätze an und entfernt sie anschliessend; er setzt die Entwicklungsdatenbank nicht zurück.

## Nächste Arbeitspakete

1. Bewegung/Kamera an Treppen, Ecken, Sprüngen und langsamem Rendering weiter prüfen; Controllergefühl mit Nutzern abstimmen.
2. Chaos, Wanted, Police-Director und modulare FSM aufbauen und das separate `bali_mvp_escape`-Level anschliessen.
3. Run-/Saveverträge und DB-Modell erweitern, Auth und atomare Belohnungen integrieren.
4. Erst dann den vollständigen MVP-Abnahmelauf einschliesslich Reload aus PostgreSQL durchführen.

Die langfristige Spezifikation bleibt in [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md). Dieser Status beschreibt ausschliesslich tatsächlich gelieferte und noch ausstehende Arbeit.
