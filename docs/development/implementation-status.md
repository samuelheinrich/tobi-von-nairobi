# Implementierungsstand

Stand: 14. September 2026. Erstveröffentlichung: `feature/tobi-branding`. Flucht-Loop: `feature/bali-escape`. Konto- und Speicherfunktionen: `feature/accounts-and-saves`. Bali-Level und Figuren-/Soundfeedback: `feature/bali-nights-and-tobi-wobble`. Tobi-Referenzfigur, Wurfflaschen, Railway und Parade: `feature/tobi-railway-street-parade`.

## Bereits implementiert

- pnpm-Monorepo mit fixierter Node-24-LTS-Toolchain, TypeScript strict, ESLint, Prettier, EditorConfig und Importgrenzen.
- React-/Vite-Client mit eigenem Startbildschirm, HUD, Pause, Ergebnisansicht und lokal ausgelieferten Fonts.
- Babylon.js/Havok-Testlevel: stilisierte Tobi-Figur, Bewegung, Sprint/Stamina, Sprung, Kollisionen, Maus-/Drag-Kamera, Flaschenaufnahme und Check-in.
- Geräteunabhängige Actions; feste Simulationsschritte mit Lastbegrenzung; Aufräumen bei Neustart, Mount/Unmount und Ladeabbruch.
- Validierte JSON-Leveldaten, erweiterbares Collect-/Reach-Objective-System, eindeutige Pickupwertung und einmaliger Abschlussbonus.
- Entwicklungsmenü mit Teleport, Respawn und Zustands-/FPS-Inspektion; aus dem Produktionsimportgraph entfernt.
- NestJS/Fastify-API für Liveness, Datenbankbereitschaft und Content; PostgreSQL in Compose; Prisma-Schema und initiale Migration für User, Saveslots und Settings.
- CI-Workflow sowie Unit-, echte PostgreSQL-Integrations- und Browsertests.
- Separat wählbares Bali-Escape-Level mit Chaos, unabhängiger Fahndung, modularer Police-FSM, echtem Sichtkontakt, Bodengitter-Routing, zwölfsekündiger Flucht, Festnahme und Neustart.
- R als wiederholbare Chaos-Aktion mit Cooldown; datengetriebenes Escape-Objective und Check-in-Gate, +500 Fluchtpunkte, eigene HUD-Anzeigen und Debug-Inspektion.

- Registrierung/Login/Logout mit Argon2id, serverseitigen Sessions, Origin-/CSRF-Prüfung und Rate Limits.
- Angemeldete Levelversuche, atomare Abschlüsse, Bestwerte und Gesamtpunkte in PostgreSQL. Dauerhafte lokale Ergebniswarteschlange mit idempotenter Wiederholung nach Verbindungsabbruch oder Reload. Gastspiel bleibt möglich.

- Beach Bar und Bali Night Market mit zehn beziehungsweise 15 Flaschen, eigenen Kulissen und angepasstem Verfolgungsbalancing. Diese vier Bali-Level sind direkt auswählbar.
- Ansteigender Cartoon-Pegel, artikulierte Tobi-Animation, animierte Guards/Passanten, elf Sound-Cues, Sirenen und Ambient-Cues mit Pause-/Mute-Lebenszyklus. [Details](../gameplay/bali-venues-and-feedback.md).

- Thailand Railway mit vier offenen Wagen und acht Flaschen, angepasster Innenraumkamera und eigenem Zugrhythmus. Zürich Street Parade mit 20 Flaschen, 240 einzeln reagierenden Tänzern, 22 Farb-Tabletten, Musik-Trucks und Backstage-Ziel. Sechs direkt auswählbare Level, insgesamt 63 Flaschen.
- Referenzbasierte prozedurale Tobi-Figur mit Locken, Sonnenbrille, Bart, Trägershirt und Zigarette. Automatische Trinkfolge, Leergut in der Hand, Wurfgeschosse mit Hindernisprüfung, kurze Guard-Taumelei und verscheuchbare Passanten. Reduzierbarer Farbrausch und vier zusätzliche Sound-Cues. [Details](../gameplay/railway-parade-and-bottles.md).

## Bewusst noch offen

Dieser Stand enthält **sechs kompakte Level**, mit Login und gespeicherten Levelabschlüssen. Der komplette angemeldete Tutorialablauf einschliesslich Reload ist im Browser geprüft; die Fluchtphysik und die Speicherung von Fluchtergebnissen sind zusätzlich separat getestet. Ein einziger durchgehender Browser-Abnahmelauf für angemeldetes Bali Escape bleibt offen. Ein Durchlauf dauert auf dem direkten Testweg deutlich unter fünf Minuten. Er dient der Funktionsprüfung, nicht der finalen Leveldauer.

Weitere Power-ups neben dem Farbrausch, Kombos, Risiko-Scoremultiplikatoren, ein allgemeines Inventar und importierte Animationsclips sind noch offen. Speicherung umfasst derzeit einen Saveslot mit abgeschlossenen Levelergebnissen; Checkpoints, Positionswiederherstellung, Achievements, Settings-API und kompetitive Highscores fehlen. Passwortwiederherstellung, Kontolöschung und produktiver Betrieb sind noch nicht umgesetzt. [Implementierter API-Vertrag und Grenzen](../api/auth-and-progress.md).

Die Kamera verwendet fünf Ray-Probes als erste Annäherung an einen Kameraradius; ein echter Shape Sweep und weitere Innenraumformen über den offenen Zug hinaus bleiben Arbeitspakete. Die Physik läuft in festen Schritten, visuelle Transforminterpolation ist noch offen. Referenzgeräte-/Safari-Abnahme und ein zehnminütiger manueller Kollisions-Parcours sind nicht durch einen Headless-Chromium-Lauf ersetzt.

Das GitHub-Repository ist [samuelheinrich/tobi-von-nairobi](https://github.com/samuelheinrich/tobi-von-nairobi), mit `@samuelheinrich` als initialem Codeowner. Die Erstveröffentlichung erfolgt nach einem leeren Bootstrap-Commit auf `main` als Pull Request. `main` ist geschützt: mindestens ein unabhängiges Review, erfolgreicher `required`-CI-Check und geklärte Diskussionen sind vor dem Merge nötig; der Schutz gilt auch für Administratoren. Force-Push und Löschen sind deaktiviert. Der aktuelle Review- und CI-Status ist im Pull Request sichtbar. Produktionsziel ist **https://tobi-von-nairobi.ch**; DNS, Hosting und Deployment sind noch nicht eingerichtet.

## Toolchainentscheidungen während der Implementierung

Node **24.21.0**, pnpm **10.34.5**, TypeScript **5.9.3**, Babylon **9.26.0**, Havok **1.3.14**, React **19.3.0**, Vite **8.3.0**, Nest **12.0.1**, Fastify **5.12.4**, Prisma **7.10.0**, PostgreSQL **17.6**. Prisma 8 war bei der Abfrage ein Release Candidate und wurde nicht ausgewählt. Ein pnpm-Override vereinheitlicht Fastify, damit Nest-Adapter und Plugins dieselbe Runtime-/Typversion verwenden.

Der projektbezogene Setupbefehl lautet **`pnpm run setup`**. `pnpm setup` ist ein eigener pnpm-Befehl zur Shellintegration und führt nicht unser Setupscript aus. Die ursprünglichen Planbeispiele werden entsprechend berichtigt.

## Validierungsnachweise

Die Prüfkette umfasst 29 Unit-Tests (Levelvalidierung, feste Uhr, Bewegung, Missions-/Scorewertung, Chaos/Wanted, Police-FSM, Fluchtereignisse und Navigation), zwölf Integrationstests gegen echtes PostgreSQL und vierzehn Browsertests. Der Browser prüft den kompletten Tutorialdurchlauf, Sprint/Pause und die Havok-Grenzen: Grounding, tatsächliche Sprunghöhe, Landung, Wandkollision, Kamerafreiraum und Freigabe aller Engineinstanzen nach wiederholtem Aufbau.

Zusätzlich prüft der Browser echte Audioausgabe, Stummschaltung/Pause und die Pegelanzeige. Er fährt die gesamten Fluchtwege aller vier Verfolgungslevels mit realen Collidern, Havok-Bewegung und Sicht-Raycasts ab. Die produktive Oberfläche wird von Levelwahl bis Festnahme und Neustart geprüft. [Details und Grenzen](../gameplay/pursuit.md).

`pnpm check:bundle` prüft zusätzlich das komprimierte Gesamtbudget aller gebauten Client-Assets und stellt sicher, dass das Developer-Menü im Produktionsartefakt fehlt. Der gemessene Gesamtumfang beträgt derzeit unter **1,5 MiB gzip**; das ist ein Transfergrössenvergleich, keine FPS-Messung. Vite weist weiterhin auf den absichtlich verzögert geladenen, grösseren Engine-Chunk hin. Referenzhardware und Safari bleiben separate Abnahmen.

Lokale Browser-Screenshots werden in `.artifacts/screenshots/` erzeugt. Fehlgeschlagene CI-Browsertests laden ihre Traces/Screenshots als kurzlebiges Artefakt hoch. Der Integrationstest legt nur eindeutig benannte Testdatensätze an und entfernt sie anschliessend; er setzt die Entwicklungsdatenbank nicht zurück.

## Nächste Arbeitspakete

1. Bewegung/Kamera an Treppen, Ecken, Sprüngen und langsamem Rendering weiter prüfen; Controllergefühl mit Nutzern abstimmen.
2. Fluchtgefühl mit Spielern abstimmen; Patrouillen, räumliches Audio, importierte Animationen und grössere Levelrouten ergänzen. Allgemeines Inventar, weitere Power-ups, Combo- und Risiko-Score folgen als eigene Module.
3. Angemeldetes Bali Escape als durchgehenden Browser-Abnahmelauf ergänzen; Checkpoints und Achievements auf die bestehenden atomaren Run-Transaktionen aufbauen.
4. Den Flucht-Blockout zu einem 5–15-Minuten-Level ausbauen und das gesamte Bali-MVP mit Spielern abnehmen.

Die langfristige Spezifikation bleibt in [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md). Dieser Status beschreibt ausschliesslich tatsächlich gelieferte und noch ausstehende Arbeit.
