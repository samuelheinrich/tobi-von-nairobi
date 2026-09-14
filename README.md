# TOBI VON NAIROBI – The Game

Repository: [samuelheinrich/tobi-von-nairobi](https://github.com/samuelheinrich/tobi-von-nairobi). Produktionsdomain: **https://tobi-von-nairobi.ch**. Der Client kann als statischer Build ohne Backend betrieben werden; die lokale Entwicklung verwendet localhost.

Kleine Pläne. Grosses Chaos. Ein humorvolles 3D-Third-Person-Arcade-Spiel für den Browser.

**Aktueller Stand: sieben wählbare Level mit 99 Flaschen, plus die Ausnüchterungszelle nach einer Festnahme.** Alle sind über die Levelgalerie mit Vorschaubildern ohne Login erreichbar.

Das erste Level heisst **Tutorial** und führt mit grossen Anleitungen durch Bewegung, Kamera, Sprint, automatisches Trinken, Werfen, Anpöbeln, Deckung und Sitzen. **Bali: Beach, Market & Escape** verbindet die bisherigen drei Bali-Level zu einer Küstenkarte mit Strandbar, Nachtmarkt, Altstadt und Fluchtgassen. **Thailand Railway** fährt durch endlos vorbeiziehende Landschaft; freie Sitze lassen sich benutzen. Neu ist **Fly High**: ein A380-Kabinenrätsel mit zwei Decks, Sitz-/WC-Verstecken und Crew statt Polizei.

Dazu kommen **Zürich Street Parade** mit See, Brücken und 240 Tänzern, die bewohnte **Arlesheim Hippie-WG** und **Bangkok Nana Plaza**. Tobi trägt Trägershirt, Sonnenbrille und qualmende Zigarette. Flaschen werden automatisch getrunken, füllen die Energie auf und bleiben als werfbares Leergut in der Hand. Würfe folgen Tobis Bewegungsrichtung, auch bei feststehender Kamera. Registrierung, Login und abgeschlossene Levelergebnisse in PostgreSQL sind angeschlossen; der statische Gastbetrieb benötigt keine Datenbank.

[Tutorial und Bali-Küste](docs/gameplay/tutorial-and-bali-coast.md) · [Fly High](docs/gameplay/fly-high.md) · [Nana Plaza und Zelle](docs/gameplay/nana-plaza-and-custody.md) · [Klang](docs/gameplay/audio.md).

![Tobi von Nairobi: Levelgalerie mit Tutorial als erstem Level](docs/screenshots/level-gallery.png)

## Lokal starten

Voraussetzungen: **Node.js 24.21.0**, **pnpm 10.34.5**, Git und Docker mit Compose. `.node-version` und `packageManager` halten die Toolchain fest. Falls pnpm fehlt: `npm install --global pnpm@10.34.5`. Grosse spätere Binärquellen benötigen zusätzlich Git LFS; der aktuelle Prototyp verwendet prozedurale Assets.

```bash
pnpm install
pnpm run setup
docker compose up -d --wait
pnpm dev
```

Danach:

- Spiel: **http://localhost:5173**
- API-Liveness: **http://localhost:3000/api/v1/health/live**
- API-/Datenbankbereitschaft: **http://localhost:3000/api/v1/health/ready**

`pnpm run setup` erzeugt fehlende `.env`-Dateien mit zufälligen lokalen Secrets und lässt vorhandene Dateien bestehen. Wichtig: `pnpm setup` ist ein anderer, eingebauter pnpm-Befehl. `pnpm dev` wendet bestehende Migrationen an, baut die Packages und startet Client/API mit Watchprozessen. PostgreSQL muss vorher gesund laufen. Compose bindet den Datenbankport ausschliesslich an localhost.

Als Gast ohne Backend spielen:

```bash
pnpm dev:client
```

Der Client lädt seine validierten Tutorialdaten aus dem gemeinsamen Package und braucht für diesen Prototyp keine Onlineverbindung. Fonts, Havok-WASM und Geometrie kommen aus dem lokalen Build; es gibt keine Laufzeitabhängigkeit von externen Asset-CDNs.

## Level auswählen

Auf der Startseite eine Bildkarte anklicken und den Startknopf beim ausgewählten Level betätigen. Das Tutorial ist standardmässig gewählt. Alle sieben Level sind ohne Anmeldung verfügbar; ein Konto wird nur für gespeicherte Ergebnisse benötigt. Auch eine noch laufende oder fehlgeschlagene Kontoabfrage blockiert den Gaststart nicht. [Details und Vorschau-Pipeline](docs/gameplay/level-selection.md).

## Steuerung

| Eingabe            | Aktion                                                                           |
| ------------------ | -------------------------------------------------------------------------------- |
| WASD / Pfeiltasten | bewegen                                                                          |
| Maus               | Kamera, volle 360° um die Figur; bei fehlender Maussperre gedrückt ziehen        |
| Space              | springen                                                                         |
| Shift              | sprinten; Stamina beachten                                                       |
| E                  | Interaktion: sitzen, aufstehen, im WC verstecken oder Levelziel bestätigen       |
| G                  | leere Flasche in Tobis Blickrichtung werfen; zum Ausrichten bewegen              |
| R                  | Passanten in der Nähe anpöbeln; in Verfolgungslevels +20 Chaos (alle 3 Sekunden) |
| F                  | anflirten: das nächste sichtbare Gegenüber antwortet (Nana Plaza)                |
| ESC                | Pause                                                                            |
| F1                 | Developer-Menü, ausschliesslich im Entwicklungsbuild                             |

Flaschen werden bei Annäherung automatisch aufgenommen, nacheinander getrunken und **füllen dabei die Energie vollständig auf**. Tobis Schwanken steigt nach jedem Schluck. Geworfenes Leergut hält getroffene Guards 2,5 Sekunden auf oder verscheucht Passanten. Die ◈-Schaltfläche reduziert den Farbeffekt der Parade; das HUD bleibt stets unverfärbt. Tutorial, Zugfahrt und Fly High sind polizeifrei. Im Flugzeug schicken Crew-Kontakt oder drei Pöbeleien Tobi auf seinen Platz zurück. In den Verfolgungslevels muss Tobi nach dem Sammeln neun Sekunden ohne Sichtkontakt entkommen, bevor das Ziel zählt. Häuser und Musik-Trucks bieten Deckung; länger andauernder Nahkontakt führt zur Festnahme — und danach wahlweise in die Ausnüchterungszelle. Neustart setzt den lokalen Durchlauf zurück. **Vor dem Start anmelden**, damit der Levelabschluss gespeichert wird. Bei einem Verbindungsabbruch werden abgeschlossene Ergebnisse lokal zwischengespeichert und erneut übertragen. Laufende Positionen werden noch nicht wiederhergestellt. [Regeln, Fluchtweg und Modulgrenzen](docs/gameplay/pursuit.md).

## Checks und Builds

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:unit
pnpm content:validate
pnpm build
```

Datenbankintegration benötigt die migrierte lokale PostgreSQL-Instanz:

```bash
pnpm db:migrate
pnpm test:integration
```

Browsertests benötigen ebenfalls die migrierte PostgreSQL-Instanz. Sie bauen Client und Server, starten eine separate Test-API und prüfen Gameplay, Registrierung, Login und Wiederherstellung nach verlorener Speicherantwort:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm check` fasst Lint, Format, Typprüfung, Unit-Tests, Contentvalidierung und Build zusammen. Integration und E2E bleiben getrennte explizite Prüfungen und laufen ebenfalls in der CI. `pnpm check:bundle` prüft Transferbudget und Ausschluss des Developer-Menüs. Die Browsertests enthalten zusätzlich eine isolierte Havok-/Kameraprüfung. Browser-Traces liegen bei Fehlern in `test-results/`, lokale Screenshots in `.artifacts/screenshots/`.

## Repository

| Pfad                  | Zuständigkeit                                                  |
| --------------------- | -------------------------------------------------------------- |
| `apps/game-client`    | React-UI, Babylon-Runtime, Input, Kamera, Physik, Assets       |
| `apps/game-server`    | NestJS/Fastify, Auth, Run-/Fortschritts-API und Datenbank      |
| `packages/contracts`  | gemeinsame validierbare Schemas, Actions, Events und DTOs      |
| `packages/game-core`  | testbare Clock-, Bewegungs-, Missions- und Sessionregeln       |
| `packages/game-data`  | Balancing und JSON-Leveldefinition                             |
| `packages/database`   | Prisma-Schema, Migrationen, generierter Client, Seed           |
| `packages/api-client` | typisierte, validierte HTTP-Zugriffe                           |
| `tools`               | Setup, Entwicklungsprozesse, Content- und Importgrenzenprüfung |
| `tests`               | Browserprüfungen; Unit-Tests liegen an den Modulen             |
| `.github`             | CI, Codeowners und Reviewvorlage                               |

## Planung und aktueller Status

- [Arlesheim Hippie-WG: drei Stockwerke, 18 Zimmer und Treppenhaus](docs/gameplay/arlesheim-hippie-wg.md)
- [Tobis Figur, Wurfflaschen, Thailand Railway und Zürich Street Parade](docs/gameplay/railway-parade-and-bottles.md)
- [Geführtes Tutorial und zusammengeführte Bali-Küste](docs/gameplay/tutorial-and-bali-coast.md)
- [Fly High: Kabinenrätsel und wiederverwendbare Sitzaktion](docs/gameplay/fly-high.md)
- [Bali Escape: Regeln und Technik](docs/gameplay/pursuit.md)
- [Implementierungsstand und offene Arbeit](docs/development/implementation-status.md)
- [Vollständiger Implementierungsplan](IMPLEMENTATION_PLAN.md)
- [Architektur und Engine-Vergleich](ARCHITECTURE.md)
- [Game Design mit 16 Kampagnenlevels](GAME_DESIGN.md)
- [Implementierte Konto- und Speicher-API](docs/api/auth-and-progress.md)
- [Datenbank-/API-Zielmodell](docs/api/data-and-api.md)
- [Repository-/Teamworkflow](docs/development/repository-and-workflow.md)
- [Milestones und Commit-Reihenfolge](docs/development/milestones.md)
- [Assets und Performance](docs/architecture/assets-and-performance.md)
- [Architecture Decision Records](docs/architecture/adr/README.md)
- [CONTRIBUTING](CONTRIBUTING.md)

Die Planungsdokumente beschreiben die vollständige Zielarchitektur. Sie sind keine Behauptung, alle Phasen seien bereits umgesetzt. Das Projekt wird im oben verlinkten GitHub-Repository über Pull Requests gepflegt. `@samuelheinrich` ist als initialer Codeowner eingetragen; weitere Modulverantwortliche werden beim Teamaufbau ergänzt. Hinweise zur vorgesehenen Domain stehen in [deployment.md](docs/development/deployment.md).
