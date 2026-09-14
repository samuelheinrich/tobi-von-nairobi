# Übergabe: Fly High, Tutorial und Bali-Küste

Stand: 14. September 2026. Diese Übergabe ergänzt und teilweise ersetzt [die vorherige Übergabe](handover-2026-09-14.md). Der verbindliche Funktionsstand steht in [implementation-status.md](implementation-status.md).

## Auftrag und gelieferter Umfang

Der Benutzer wollte zuerst das Flugzeuglevel **Fly High**, danach die Wurfrichtung korrigieren, eine sichtbar endlose Zugfahrt, ein geführtes Tutorial und die Zusammenführung von Beach Bar, Night Market und Bali Escape. Abschliessend sollen Änderungen committed und dem nächsten Agenten übergeben werden.

Die Galerie enthält jetzt in dieser Reihenfolge:

| ID                          | Anzeige                      | Besonderheit                                                        |
| --------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| `welcome_to_bali_prototype` | Tutorial                     | elf geführte Übungen, fünf Flaschen, Bank und Sichtschutzwand       |
| `bali_adventure`            | Bali: Beach, Market & Escape | zusammenhängende Küste, 18 Flaschen, echte Polizeiflucht            |
| `thailand_railway`          | Thailand Railway             | fünf Wagen, zwölf Flaschen, benutzbare Sitze und bewegte Aussenwelt |
| `zurich_street_parade`      | Zürich Street Parade         | bestehende Karte mit See, Brücken, 30 Flaschen und 240 Tänzern      |
| `arlesheim_hippie_wg`       | Arlesheim Hippie-WG          | bestehendes Haus mit drei Stockwerken und 18 Flaschen               |
| `bangkok_nana_plaza`        | Bangkok Nana Plaza           | bestehende Disco mit 16 Flaschen                                    |
| `fly_high`                  | Fly High                     | Kabinenrätsel auf zwei Decks, keine Polizei oder Flaschenpflicht    |

Insgesamt sieben wählbare Level und 99 Flaschen. Die Ausnüchterungszelle bleibt nur nach einer Festnahme zugänglich. Die drei alten Bali-Definitionen bleiben nicht wählbar in `allLevels`; vorhandene gespeicherte Ergebnisse verlieren ihre Namen nicht. Das neue Küstenlevel besitzt eine eigene ID und eigene Bestwerte. Keine Migration und keine Änderung der bestehenden Datenbankzugänge sind nötig. Der bestehende Contentversionsschutz bleibt aktiv: Vor einem Inhaltsupdate noch nicht abgeschlossene Server-Versuche lassen sich danach nicht erstmals abschliessen. Bereits abgeschlossene Ergebnisse und ihre idempotenten Wiederholungen bleiben erhalten.

## Einstieg für den nächsten Agenten

1. `git status` und aktuellen Branch prüfen. Diese Erweiterung basiert auf `feature/guest-level-gallery`, nicht auf dem bisher fast leeren `main`.
2. Diese Übergabe, `implementation-status.md`, [Fly High](../gameplay/fly-high.md) und [Tutorial/Bali-Küste](../gameplay/tutorial-and-bali-coast.md) lesen.
3. Mit Node 24 und pnpm 10.34.5 starten: `pnpm install`, `pnpm run setup`, `docker compose up -d --wait`, `pnpm dev`. Nur Gastclient: `pnpm dev:client`.
4. Zuerst ohne Login das Tutorial durchspielen. Danach Fly High mit Sitz-/WC-Verstecken und beide Flugzeugtreppen prüfen. Anschliessend Küstenroute und Wurf in vier Richtungen bei unveränderter Kamera testen.
5. Neue Arbeit nach Modul aufteilen. Spielregeln bleiben in `game-core`, Anker/Balancing in `game-data`, Babylon-Geometrie und Eingabeverdrahtung im Client. Weitere Level nicht als zusätzliche Sonderfälle in allgemeine Police-Klassen schreiben.

Auf diesem Rechner wurde mangels passender System-Node-Version eine lokale Toolchain unter `/tmp/tobi-toolchain/node_modules/.bin` verwendet. Das ist kein Bestandteil des Repositories. Falls noch vorhanden, kann dieser Pfad vor `PATH` gesetzt werden. Bestehende `.env`-Dateien und Docker-Volumes erhalten. Keine Geheimnisse ausgeben oder hochladen. Die Referenzbilder unter dem ignorierten Repo-Ordner `tmp/` bleiben lokal.

## Wichtigste Module und Erweiterungspunkte

### Sitzen und Flugzeug

`game-core/character/seating.ts` speichert Haltung und sicheren Ausgangspunkt. `LevelScene.restSpots` enthält Sitz/WC, ID, Position, Ausgang und Gierwinkel. E steigt ein oder aus; Bewegung allein steht nicht auf. Distanz und Stockwerk werden am Gang-Ausgangspunkt geprüft. `Locomotion.halt()` stoppt Bewegung ohne unbeabsichtigte Energieauffüllung.

`game-core/flight/cabin-puzzle.ts` enthält Crew-Routen, Sichtkegel, Deckvergleich, Sitz-/WC-Reihenfolge und Beschwerden. Die tatsächliche Sichtprüfung wird von `runtime/flight/flight-runtime.ts` injiziert. Jede der ersten beiden Aufgaben verlangt, dass die Crew am belegten Versteck vorbeigeht; kurzes Ein-/Aussteigen reicht nicht. Danach muss Tobi die Lounge-Karte am Ende der Mittelkonsole holen. Drei Pöbeleien oder Entdeckung setzen Rätsel und Tobi auf Platz 42C zurück.

`game-data/aircraft.ts` hält die Kabinenanker und Sitzraster. `aircraft-scene.ts` baut 160 Economy- und 44 Business-Sitze, WC, Küchen, zwei Treppen, vier Triebwerke und bewegte Wolken. Die Sitzdichte und Gangbreite sind spielbar stilisiert, keine exakte Airline-Replik. Das Oberdeck wird unten optisch ausgeblendet, seine Physik bleibt bestehen. Halbes Tempo und deaktivierter Sprung gelten nur in diesem Rätsellevel. Passagiere und Getränkewagen sind feste Hindernisse; die Crew bewegt sich.

### Geführtes Tutorial

`game-core/tutorial/tutorial.ts` ist eine Reihenfolge von bestätigten Messwerten. `game-data/tutorial.ts` definiert Lektionen und Anker. Früh gesammelte Flaschen und erfolgtes Trinken zählen kumulativ, Werfen/Deckung/Sitzen müssen in ihrer jeweiligen Lektion stattfinden. Eine kostenlose Übungsflasche verhindert, dass frühes Wegwerfen das Tutorial blockiert. Sie gibt keine Punkte.

`ui/tutorial-coach.tsx` zeigt die grosse, nicht modale Anleitung und die Richtung/Entfernung zum nächsten Anker. Die Deckungsaufgabe führt um die Wand und verlangt einen echten unterbrochenen Sichtstrahl. Neue Funktionen immer auch hier lehren: Lektion, bestätigtes Signal, physische Station und tatsächlichen Eingabeweg in `tests/helpers/tutorial.ts` ergänzen. Kein Test darf durch Debug-Abschluss oder direkten Zugriff auf Tutorialzustand abkürzen.

### Küste, Zug und Würfe

`game-data/bali-adventure.ts` beschreibt die Vereinigung von fünf Bodenbereichen, Gebäude und Referenzroute. `bali-adventure-scene.ts` erzeugt die sichtbare Küstenkante aus diesem Grundriss. Begehbare Flächen sind kein überdecktes Rechteck. Unsichtbare Navigationshindernisse über Wasser verwenden explizite Metadaten; sie dürfen keine Sichtschutzwände für Polizeistrahlen werden.

`railway-landscape.ts` verschiebt 16 wiederverwendete Landschaftsstreifen. Häuser, Palmen und Felder ziehen mit 14 m/s vorbei; Schwellen bewegen sich ebenfalls. Wagen und ihre Collider bleiben am lokalen Ort. Keine Laufzeit-Spawns ohne Obergrenze einbauen.

`game-core/character/facing.ts` hält Tobis Bewegungsrichtung auch nach dem Anhalten. `GameHost` übergibt diesen Winkel beim Werfen an `ThrownBottles`; Kameragier ist keine Wurfrichtung mehr. Der Wurfbogen bleibt fest. Den alten `throwElevation`-Helfer gibt es noch als optionales Geschoss-API mit Regressionstest; der Spielerwurf verwendet ihn nicht. Ein eventuell später wieder eingeführtes Zielen braucht eine bewusste Bedienungsentscheidung und entsprechende Tutorialtexte.

## Fallen, die bereits behoben wurden

- Eine Flugzeug-Treppenlandung, die vor dem Rampenende begann, stoppte den Havok-Controller. Landungen beginnen nun bei z = ±46. Nicht optisch hübscher über die Rampenoberkante ziehen, ohne beide Treppen physisch zu testen.
- Die zweite Gasse hinter CASA TOBI benötigt genug Abstand zum Nachbarhaus. Das Haus bei x = 14 lässt den Laufweg x = 9,5 frei. Alte Testpunkte durch die Casa oder entlang einer Gebäudekante sind keine Fluchtrouten.
- Neue Bodentiles würden vom bisherigen Navigationsextraktor als Hindernisse gelesen, wenn sie beliebig benannt würden. Die Küstenböden benutzen `island-ground`; Wasser besitzt eigene `navigationObstacle`/`sightObstacle`-Metadaten. Die gemeinsamen Filter wurden so erweitert, dass Legacy-Karten unverändert funktionieren.
- Marktstände dürfen den Flaschenweg nicht schliessen. Die Marktspalte x = 40 bleibt als Laufgasse frei.
- Der direkte Weg von der Deckungsstelle zur Bank führte zunächst durch die Wand. `seatRoute` führt nun am nördlichen Wandende vorbei und von der Gangseite an die Bank. Nicht auf einen einzelnen Zielpunkt zurückkürzen.
- `MouseEvent` übernimmt `movementX` nicht aus dem üblichen Constructor-Init. Der Tutorialtest definiert die Eigenschaft ausdrücklich und führt sie durch den tatsächlichen Inputadapter. Der zweite Gegenimpuls stellt die Kameragier für die anschliessenden, sichtbaren Kompassrichtungen wieder her.
- Vite-HMR kann eine laufende Dev-Spielrunde komplett neu starten. Während einer gesteuerten Runde auf 5173/5174 weder App-Quellen verändern noch gemeinsame Packages neu bauen. Produktions-E2E laufen auf 4173; Physiktests benutzen Dev-Port 5174.
- Die bisherige Abschluss-DTO verlangte mindestens eine Flasche und blockierte damit Fly High. `completionSchema` erlaubt nun eine leere Liste; der Server prüft weiterhin die exakte Pickupmenge des jeweiligen Levels. Die PostgreSQL-Integration prüft den Flugzeugabschluss ausdrücklich.
- Beim Tutorial-Test kann jede einzelne Playwright-Tastenoperation mit Trace-Aufnahme mehrere Spielframes benötigen. Die kurze Wegsteuerung läuft deshalb als DOM-/Keyboard-Feedbackschleife im Browser; sie liest nur sichtbare Wegweisung und verändert keinen Spielzustand direkt.
- Eine volle Energieanzeige im Sprint war nicht zwingend ein Fehler: Flaschen füllen Stamina auf. Der Erschöpfungstest sprintet deshalb seitwärts ausserhalb des Flaschenwegs.

## Prüfungen und ihre Grenzen

Die Abschlussprüfung umfasst `pnpm check`, vierzehn echte PostgreSQL-Integrationstests und 27 Playwright-Tests. `pnpm check` enthält 54 Unit-Tests, Lint, Format, Importgrenzen, Typecheck, Inhaltsvalidierung, Builds und Bundlebudget. Der Gesamtlauf bestand 25 Fälle; zwei alte Festnahmefälle wurden auf den offenen Nana-Innenhof angepasst und gezielt erneut geprüft. Fly-High- und Zugsitzfälle wurden nach dem letzten Richtungsabgleich ebenfalls wiederholt. Die Browserfälle verwenden Chromium und Software-WebGL; FPS auf einem Zielgerät und Safari sind damit nicht abgenommen.

Neue Prüfungen umfassen:

- Vier erfolgreiche Wurfrichtungen mit feststehender Kamera; Stillstand erhält die Richtung, Wände stoppen Geschosse.
- Zuglandschaft bewegt sich, bleibt über 2000 simulierte Sekunden begrenzt und verändert keine Collider.
- Ganze Küstenroute: 18 Flaschen, bestätigter Polizeikontakt, mindestens eine Flucht, Abschluss und kein Betreten von Wasser.
- Fly High komplett mit echter Havok-Bewegung, Crew-Sichtprüfung und regulären Sitz/WC-Interaktionen; zusätzlich beide Treppenrichtungen. Keine Teleports zur Abkürzung des Rätselweges. Der separate Treppenprobe darf sich nach erfolgreichem Leveldurchlauf an den jeweiligen Probeanfang versetzen.
- Oberfläche: Sitzstart, Aufstehen, Wiederhinsetzen, dritte Beschwerde, echte Entdeckung durch die Crew und Sitzen im Zug.
- Alle elf Tutoriallektionen mit normaler Eingabe, einschliesslich angemeldetem Abschluss, verlorener Speicherantwort, idempotenter Wiederholung und Reload.

Der bekannte Fly-High-Lösungsweg benötigt rund 112 simulierte Sekunden. Die automatisierte Küstenflucht umrundet die Gebäude mehrfach. Das belegt Lösbarkeit, nicht einen unterhaltsamen Schwierigkeitsgrad oder die angestrebten 5–15 Minuten für Erstspieler. Menschliches Balancing bleibt das nächste sinnvolle Arbeitspaket.

## Sinnvolle nächste Aufgaben

1. Tutorial mit einem neuen Spieler beobachten: Verständlichkeit der Deckungsroute und Erkennbarkeit der Bank prüfen. Bei neuen Actions die Datenlektion und Station im selben PR liefern.
2. Fly High mit ungeübten Spielern abstimmen: Crew-Wartefenster, Blickkegel und die Reihenfolge der beiden Verstecke. Anschliessend optional Wegpunkte statt Text-/Kompasshinweisen, zusätzliche Kabinenvarianten und animiertes Zurückbegleiten.
3. Die neue Küstenflucht auf echtem Desktop prüfen. Polizei soll riskant sein, aber kein minutenlanges Kreisen verlangen. Werte anhand beobachteter Läufe ändern und den Physikweg erhalten.
4. Den angemeldeten Küstenabschluss in einem durchgehenden UI-Test ergänzen. Bislang sind seine echte Fluchtphysik und das generelle Speichersystem separat belegt.
5. Die bestehende Session-Verdrahtung ist mit den neuen Systemen gewachsen. Bei weiterer Erweiterung Tutorialprojektion und Sitzinteraktionen in Runtime-Adapter auslagern; nicht weitere Regeln im `GameHost.step` ansammeln.
6. Erst danach weitere Power-ups, Combo/Inventar und importierte Animationen. Echte Audio-Samples sind weiterhin optional; die vorhandenen Klänge sind prozedural. Lizenznachweise pro eingebautem Sample ergänzen.

## Git und statischer Upload

`main` ist geschützt und verlangt mindestens ein unabhängiges Review und erfolgreiche CI. Vorhandene PRs bilden eine gestapelte Reihe; diese Lieferung baut darauf auf. Kein Force-Push, kein Umgehen des Schutzes und kein Zusammenkopieren auf das leere `main`. Review-/Merge-Status im GitHub-PR prüfen.

Für den Webserver nur den **Inhalt** von `apps/game-client/dist/` hochladen: die gebaute `index.html` und `assets/`. Das zusätzliche ZIP unter `dist/tobi-von-nairobi-web-upload.zip` enthält genau diesen Stand. Keine Root- oder Source-`index.html` mit `/src/main.tsx` hochladen; das verursacht die zuvor gemeldete leere Seite. Nach jeder Änderung erneut bauen und den gesamten Asset-Satz übertragen. Gastlevel funktionieren ohne Backend; dauerhafte Kontospeicherung braucht die API und PostgreSQL. Es wurde kein Produktionsdeployment durch den Agenten vorgenommen.
