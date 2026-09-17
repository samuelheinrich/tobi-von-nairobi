# Implementierungsstand

> 17. September 2026: Thailand Railway öffnet nach dem Halt eine sektorisierte Phuket-Welt mit
>     Town, Nightlife, Night Market, Patong Beach, begehbaren Venues, Crowd-LOD, Scooter und Tuk-Tuks.
>     Das Fly-High-Terminal besitzt eine begehbare Partyhalle mit Scanner-Eingang, DJs sowie Laser- und
>     Bodenlichtshow. Geprüft wurde lokal; GitHub-CI blieb deaktiviert.

> 16. September 2026: [Arlesheimer WG-Quartier](../gameplay/arlesheim-hippie-wg.md): echte Haustür nach draussen, Garten, neun Häuser, Dorfplatz/Dom, Fahnen, Quartierplan, 36 Flaschen und optionaler Scooter. [Übergabe](handover-2026-09-16-arlesheim.md).

> 16. September 2026: [Bali-Erkundungswelt](../gameplay/bali-open-world.md) mit 36 Flaschen, 11 Sektoren, Innenräumen/Dächern, Scooter und Bootsreise zur Insel. [Übergabe und Prüfstand](handover-2026-09-16-bali-world.md). Keine Polizei als Hauptziel, keine GitHub-CI.

> Neu: [Gemeinsame Collision-/Physics-Pipeline](physics-upgrade.md) — 15. September 2026. Massive Möbel/Dächer, fahrende Plattformen, NPC-Fussanker, Havok-Wurfflaschen, F1-Layer-Debug, Physics Playground und GLB-Collision-Studio. Sechs gezielte lokale Physics-Tests sowie bestehende Level-Probes geprüft; keine GitHub-CI. Hardware-/Animationsgrenzen sind dort ausdrücklich dokumentiert.

> Neueste Übergabe: [Charaktermodelle, Besetzung und offene Defekte](handover-2026-09-15-charaktere.md) — 15. September 2026.

**NPCs im Spiel auf GLB umgestellt:** Die vorhandene Besetzung aus `characters/casting.ts` wird jetzt vom gemeinsamen NPC-Erzeuger verwendet – einschliesslich Polizei, Security, Zug, Flugzeug, WG und Bali. Nana-/Parade-Pools wechseln Modelle passend zur Rolle; die Fernmengen verwenden instanzierte GLB-Posen. Fehlende Rollen verwenden die definierten Platzhalter, Ladefehler behalten die prozedurale Darstellung. [Anbindung und Prüfstand](npc-glb-rollout.md).

**Tobi-FBX-Clips:** Chicken Dance mit **C** im Stand sowie als automatischer Siegestanz (Steuerungshilfe und Tutorial ergänzt), Fight Dance für R, Aufnahme-Ausschnitt vor dem Trinken und neuer Wurf mit Release nach 0,88 s. Vier schlanke Animations-GLBs, vollständige Schulter-/Fingertracks, acht gezielte lokale Tests und Browserprüfung beider Skins. [Zuordnung und Abnahme](humanoid-animation-pipeline.md#vier-neue-tobi-fbx-clips).

**Blender-/Mixamo-Pipeline:** lokale GLB↔FBX-Konvertierung mit Überschreibschutz, SHA-256-Berichten und direkter Kandidatenansicht im Model Studio. Mixamo bleibt manuell. [Workflow](../../tools/characters/README.md).

**Humanoid-Animationen:** Tobis GLB verwendet einen gemeinsamen Bone-Adapter, In-Place-Posen und Crossfades. Hand-Sockets, zeitgesteuerter Flaschenwurf, Sitz-/Sprungsequenzen, lokales Animation-Studio und wiederverwendbare Analyse-/Retargeting-Tools sind angebunden. [Analyse, Architektur und Anleitung für weitere Modelle](humanoid-animation-pipeline.md).

**15. September 2026 – Git-Konsolidierung:** bisherige Agenten-Commits und offene Nana-/NPC-Änderungen sind auf lokalem `main` zusammengeführt. CI-Workflow entfernt, Agentenregeln versioniert. [Aktuelle Übergabe](handover-2026-09-15-consolidated-main.md).

**Erwachsene Nightlife-/Beach-Figuren:** fünf Körperprofile, neue Kleidungsschnitte, deterministische Gruppenvariation, 23 Posen und nahes Blinzeln. [Details und Achtergruppen-Galerie](adult-female-characters.md).

**Gesichtsüberarbeitung:** sieben modellierte Kopfformen, Augen mit Lidern/Iris/Pupille, Lippen, Nasen-/Ohrstruktur, Alters- und Hautdetails sowie angepasste Haarlinien. [Lokale Galerie und technische Details](modular-characters.md#gesichtssystem--überarbeitung-vom-15-september-2026).

**15. September 2026 – Modulare Figuren:** gerundete Körper und Gesichter, rollenabhängige Kleidung, Polizei-/Security-Ausrüstung, gemeinsame Gelenke mit Händen/Knie/Ellenbogen, drei Distanzstufen und detaillierter Nahbereich für Nana/Parade. [Architektur, Galerie und lokale Prüfungen](modular-characters.md).

> Neueste Übergabe: [Charaktermodelle und offene Defekte](handover-2026-09-15-charaktere.md) (15.09.2026).

## Nana-Ausbau · 14. September 2026

Zusammenhängende BTS/Sukhumvit/Soi/Plaza-Welt mit drei begehbaren Ebenen, zehn Erdgeschossfronten und neun oberen Venues. NPC-Pool/Distanzdarstellung, acht Tanzprofile, Getränkekarte, räumliche Arcade-Audiozonen und separate Eingangssicherheit. Details: [Gameplay-Spezifikation](../gameplay/nana-plaza-and-custody.md), [Umbauplan](nana-expansion-plan.md). Content-Version `prototype-5-nana`. Nur lokale Prüfungen; GitHub-CI bleibt deaktiviert. Kein Deployment; der Ausbau ist inzwischen auf `main` konsolidiert.

**Aktuelle Eigentümerentscheidung:** Freizeitprojekt, keine GitHub-CI und nur gezielte lokale Prüfungen mit geringem Zeit- und Tokenaufwand. [Agentenregeln](../../AGENTS.md) · [CI deaktiviert](ci.md). Frühere Aussagen über verpflichtende CI sind historisch.

Stand: 14. September 2026. Erstveröffentlichung: `feature/tobi-branding`. Flucht-Loop: `feature/bali-escape`. Konto- und Speicherfunktionen: `feature/accounts-and-saves`. Bali-Level und Figuren-/Soundfeedback: `feature/bali-nights-and-tobi-wobble`. Tobi-Referenzfigur, Wurfflaschen, Railway und Parade: `feature/tobi-railway-street-parade`. Mehrstöckige Hippie-WG: `feature/arlesheim-hippie-wg`. Bewohner, Nana Plaza, Zelle, Zürcher Karte und Bewegungs-/Wurf-/Kamera-Überarbeitung: `feature/guest-level-gallery`. Fly High, wiederverwendbares Sitzen, geführtes Tutorial und zusammengeführte Bali-Küste: `feature/fly-high-and-bali`.

## Bereits implementiert

- pnpm-Monorepo mit fixierter Node-24-LTS-Toolchain, TypeScript strict, ESLint, Prettier, EditorConfig und Importgrenzen.
- React-/Vite-Client mit eigenem Startbildschirm, HUD, Pause, Ergebnisansicht und lokal ausgelieferten Fonts.
- Babylon.js/Havok-Testlevel: stilisierte Tobi-Figur, Bewegung, Sprint/Stamina, Sprung, Kollisionen, Maus-/Drag-Kamera, Flaschenaufnahme und Check-in.
- Geräteunabhängige Actions; feste Simulationsschritte mit Lastbegrenzung; Aufräumen bei Neustart, Mount/Unmount und Ladeabbruch.
- Validierte JSON-Leveldaten, erweiterbares Collect-/Reach-Objective-System, eindeutige Pickupwertung und einmaliger Abschlussbonus.
- Entwicklungsmenü mit Teleport, Respawn und Zustands-/FPS-Inspektion; aus dem Produktionsimportgraph entfernt.
- NestJS/Fastify-API für Liveness, Datenbankbereitschaft und Content; PostgreSQL in Compose; Prisma-Schema und initiale Migration für User, Saveslots und Settings.
- Vorhandene Unit-, PostgreSQL-Integrations- und Browsertests bleiben für gezielte lokale Prüfungen erhalten. Der GitHub-CI-Workflow wurde entfernt.
- Verfolgungsregeln mit Chaos, unabhängiger Fahndung, modularer Police-FSM, echtem Sichtkontakt, Bodengitter-Routing, neunsekündiger Flucht, Festnahme und Neustart.
- R als wiederholbare Chaos-Aktion mit Cooldown; datengetriebenes Escape-Objective und Check-in-Gate, +500 Fluchtpunkte, eigene HUD-Anzeigen und Debug-Inspektion.

- Registrierung/Login/Logout mit Argon2id, serverseitigen Sessions, Origin-/CSRF-Prüfung und Rate Limits.
- Angemeldete Levelversuche, atomare Abschlüsse, Bestwerte und Gesamtpunkte in PostgreSQL. Dauerhafte lokale Ergebniswarteschlange mit idempotenter Wiederholung nach Verbindungsabbruch oder Reload. Gastspiel bleibt möglich.

- **Bali: Beach, Market & Escape** führt Beach Bar, Night Market und Bali Escape zu einer zusammenhängenden Erkundungswelt mit jetzt 36 Flaschen, Strandbar, Markt, Tempel, Terrassen und Boot/Scooter zusammen. Meer, Kaimauern und Gebäude begrenzen den verzweigten Grundriss. Die drei alten IDs bleiben für gespeicherte Ergebnisse erhalten und verschwinden aus der Galerie.
- Ansteigender Cartoon-Pegel, artikulierte Tobi-Animation, animierte Guards/Passanten, elf Sound-Cues, Sirenen und Ambient-Cues mit Pause-/Mute-Lebenszyklus. [Details](../gameplay/bali-venues-and-feedback.md).

- Thailand Railway mit fünf physischen Wagen, Barwagen, WC, Gepäck, sitzenden Reisenden, blockierendem Schaffner und funktionierender Notbremse. Gebäude, Palmen, Felder und Schwellen ziehen geschwindigkeitsabhängig am Zug vorbei. Nach einer sicht- und hörbaren Bremssequenz erscheinen Halt und Bahnsteig; erst dann öffnet sich die Seitentür und Tobi kann neben Lokomotive und Wagen treten. Der Phuket-Free-Roam beginnt als nächste Phase. Zürich Street Parade als Ausschnitt des Zürcher Seebeckens: Utoquai, Bellevue, Quaibrücke, Bürkliplatz, Hafendamm Enge, dazu Bahnhofstrasse, Hauptbahnhof, Altstadt, Fraumünster, Grossmünster und Opernhaus. See und Limmat sind echte Hindernisse, die Brücken die einzigen Übergänge; 30 verteilte Flaschen, 24 Tabletten, vier Musik-Trucks und 240 entlang der Route ausgestreute Tänzer.
- Referenzbasierte prozedurale Tobi-Figur mit Locken, Sonnenbrille, Bart, Trägershirt und Zigarette. Automatische Trinkfolge, Leergut in der Hand, Wurfgeschosse mit Hindernisprüfung, kurze Guard-Taumelei und verscheuchbare Passanten. Reduzierbarer Farbrausch und vier zusätzliche Sound-Cues. [Details](../gameplay/railway-parade-and-bottles.md).

- Arlesheim Hippie-WG mit drei realen Stockwerken, je sechs Zimmern, zwei begehbaren Treppen, 18 weiteren Flaschen und Ausgang im Erdgeschoss. Höhenkorrekte Pickups und grafischer Stockwerksausschnitt. [Details](../gameplay/arlesheim-hippie-wg.md).

- Levelgalerie mit sieben echten WebP-Vorschaubildern, Tutorial an erster Stelle und direktem Gaststart unabhängig von der Kontoabfrage. Tastaturbedienung, schmale Fenster und verspätete Sessionantworten sind geprüft. `selectable` hält nicht wählbare Kapitel aus der Galerie heraus. [Details](../gameplay/level-selection.md).

- Bangkok Nana Plaza: dreistöckiger Innenhof mit Neonbändern, pulsender Discofläche, Spiegelkugel, acht Tanzstangen, drei Theken, 16 Flaschen und zwei Guards. **F** flirtet das nächste sichtbare Gegenüber an; die Antwort erscheint als Sprechblase und im HUD. Ausnüchterungszelle als nicht wählbares Kapitel nach einer Festnahme, ohne Flaschen, ohne Punkte und ohne Speicherung. [Details](../gameplay/nana-plaza-and-custody.md).

- Bewohner in der Hippie-WG einschliesslich Yogagruppe und Meditationskreis; Reisende, Barpersonal und Schaffner im Zug. Alle über einen gemeinsamen `LevelNpcs`-Vertrag angebunden, ohne Verbindung zum Verfolgungssystem. Der Schaffner blockiert, gibt aber garantiert nach.

- Bewegungs- und Feedback-Überarbeitung: Gehen 5,8 und Sprint 10,2 m/s bei mitskalierten Verfolgungswerten, volle Energie pro Flasche, in Tobis letzter Bewegungsrichtung geworfene Flaschen unabhängig vom Kamerarig, 360°-Kamera in allen Rigs und qualmende Zigarette.

- Klang vollständig überarbeitet: Oszillatoren plus gefiltertes Rauschen ergeben Glasklirren, Gluck-gluck, Schluckauf, europäische Zweiton-Sirene, Pöbel- und Flirtrufe, Anprall und Jubel; `SoundBank` erlaubt später echte CC0-Samples ohne Codeänderung. [Details](../gameplay/audio.md).

- **Fly High:** zwei physische A380-Decks mit 204 Sitzen, schiebbarer Servicewagen, aufbrechbare Cockpittür, begehbares GLB-Cockpit und unverändertes Lufthansa-A380-Außenmodell. Tobi fliegt selbst, startet mit **L** einen kurzen Landeanflug, evakuiert danach mit den Passagieren über Rollfeld und Terminal und beendet das Level an der Party-Bar. [Ablauf und technische Grenzen](../gameplay/fly-high.md).

- **Geführtes Tutorial:** elf Lektionen mit bestätigten Aktionen, grossen Hinweisen und Richtungs-/Entfernungsanzeige. Eine Übungswand und Bank führen Deckung und Sitzen ein. Lektionen stehen in `game-data/tutorial.ts`; früh gesammelte Flaschen zählen mit, spätere Übungen müssen an ihrer Station ausgeführt werden. Die Tutorial-ID bleibt kompatibel. [Tutorial und Küste](../gameplay/tutorial-and-bali-coast.md).

- NPC-Animationen verwenden explizite Loop-/Root-Motion-Metadaten und behalten abgeschlossene
  Translationszyklen bei. Ein szenenweites Occupancy-System schützt Sitz- und Spawnplätze und
  trennt überlappende Figuren sanft. Ein Geometrie-Audit markiert coplanare Bodenflächen; die
  überlappenden Nana-Galerien wurden geometrisch korrigiert. [Audit und lokale Nachweise](animation-occupancy-rendering-audit-2026-09-17.md).

## Bewusst noch offen

Dieser Stand enthält **sieben wählbare Level mit 99 Flaschen plus die Zelle**, mit Login und gespeicherten Levelabschlüssen. Der komplette angemeldete Tutorialablauf einschliesslich Reload ist im Browser geprüft; die Fluchtphysik und die Speicherung von Fluchtergebnissen sind zusätzlich separat getestet. Ein einziger durchgehender Browser-Abnahmelauf für die angemeldete neue Bali-Küste bleibt offen. Ein Durchlauf dauert auf dem direkten Testweg deutlich unter fünf Minuten. Er dient der Funktionsprüfung, nicht der finalen Leveldauer.

Weitere Power-ups neben dem Farbrausch, Kombos, Risiko-Scoremultiplikatoren, ein allgemeines Inventar und importierte Animationsclips sind noch offen. Speicherung umfasst derzeit einen Saveslot mit abgeschlossenen Levelergebnissen; Checkpoints, Positionswiederherstellung, Achievements, Settings-API und kompetitive Highscores fehlen. Passwortwiederherstellung, Kontolöschung und produktiver Betrieb sind noch nicht umgesetzt. [Implementierter API-Vertrag und Grenzen](../api/auth-and-progress.md).

Die Kamera verwendet fünf Ray-Probes als erste Annäherung an einen Kameraradius; ein echter Shape Sweep und weitere Innenraumformen über offenen Zug und WG hinaus bleiben Arbeitspakete. Die Physik läuft in festen Schritten, visuelle Transforminterpolation ist noch offen. Referenzgeräte-/Safari-Abnahme und ein zehnminütiger manueller Kollisions-Parcours sind nicht durch einen Headless-Chromium-Lauf ersetzt.

Das GitHub-Repository ist [samuelheinrich/tobi-von-nairobi](https://github.com/samuelheinrich/tobi-von-nairobi), mit `@samuelheinrich` als initialem Codeowner. Die Entwicklung ist auf `main` konsolidiert. Branch Protection ist derzeit ausgeschaltet; das historische Backup ist kein Wiederherstellungsauftrag. GitHub-CI bleibt deaktiviert und der Workflow wurde entfernt. Produktionsziel ist **https://tobi-von-nairobi.ch**. Der Benutzer betreibt dort einen statischen Upload; das aktuelle Artefakt muss aus `apps/game-client/dist/` stammen. Ein automatisches Produktionsdeployment und das produktive Backend sind nicht eingerichtet.

## Toolchainentscheidungen während der Implementierung

Node **24.21.0**, pnpm **10.34.5**, TypeScript **5.9.3**, Babylon **9.26.0**, Havok **1.3.14**, React **19.3.0**, Vite **8.3.0**, Nest **12.0.1**, Fastify **5.12.4**, Prisma **7.10.0**, PostgreSQL **17.6**. Prisma 8 war bei der Abfrage ein Release Candidate und wurde nicht ausgewählt. Ein pnpm-Override vereinheitlicht Fastify, damit Nest-Adapter und Plugins dieselbe Runtime-/Typversion verwenden.

Der projektbezogene Setupbefehl lautet **`pnpm run setup`**. `pnpm setup` ist ein eigener pnpm-Befehl zur Shellintegration und führt nicht unser Setupscript aus. Die ursprünglichen Planbeispiele werden entsprechend berichtigt.

## Validierungsnachweise

Die folgenden Angaben dokumentieren frühere Prüfstände, keine erneute Gesamtabnahme des konsolidierten Stands. Die jüngsten gezielten Prüfungen stehen in der aktuellen Übergabe und den Figurendokumenten. Insbesondere ist die historische Bundle-Grösse nach Aufnahme der GLB-Avatare nicht mehr aktuell.

Die Prüfkette umfasst 54 Unit-Tests (Levelvalidierung, feste Uhr, Bewegung, Missions-/Scorewertung, Chaos/Wanted, Police-FSM, Fluchtereignisse, Navigation samt Referenzvergleich des räumlichen Index, Blockierlogik und die Zürcher Platzierungsinvarianten), vierzehn Integrationstests gegen echtes PostgreSQL und 27 Browsertests. Der Browser prüft den kompletten Tutorialdurchlauf, Sprint/Pause und die Havok-Grenzen: Grounding, tatsächliche Sprunghöhe, Landung, Wandkollision, Kamerafreiraum und Freigabe aller Engineinstanzen nach wiederholtem Aufbau.

Zusätzlich prüft der Browser echte Audioausgabe, Stummschaltung/Pause und die Pegelanzeige. Er fährt die gesamten Fluchtwege der Bali-Verfolgungslevels und der neuen verbundenen Küste sowie die komplette Zürcher Paraderoute mit realen Collidern, Havok-Bewegung und Sicht-Raycasts ab und belegt dabei, dass Tobi nie auf dem Wasser steht und das Becken nicht durchqueren kann. E2E deckt Nana Plaza einschliesslich Energie-Auffüllung und beantworteter Annäherung sowie den Weg von der Festnahme über die Zelle zurück ins Menü ab. Die produktive Oberfläche wird von Levelwahl bis Festnahme und Neustart geprüft. [Details und Grenzen](../gameplay/pursuit.md).

Die neuen Browserprüfungen lösen Fly High mit echten Kollisionen und Crew-Sichtlinien, prüfen beide Flugzeugtreppen, die Sitzaktion in Flugzeug/Zug, vier Wurfrichtungen bei fester Kamera und über 2000 simulierte Sekunden wiederverwendete Zuglandschaft. Der Tutorialhelfer führt normale Eingaben aus und überspringt keine Lektionen.

`pnpm check:bundle` prüft zusätzlich das komprimierte Gesamtbudget aller gebauten Client-Assets und stellt sicher, dass das Developer-Menü im Produktionsartefakt fehlt. Der gemessene Gesamtumfang beträgt derzeit unter **1,6 MiB gzip**; das ist ein Transfergrössenvergleich, keine FPS-Messung. Vite weist weiterhin auf den absichtlich verzögert geladenen, grösseren Engine-Chunk hin. Referenzhardware und Safari bleiben separate Abnahmen.

Lokale Browser-Screenshots werden in `.artifacts/screenshots/` erzeugt. Automatische GitHub-Testläufe und deren Artefakt-Uploads finden nicht mehr statt. Der Integrationstest legt nur eindeutig benannte Testdatensätze an und entfernt sie anschliessend; er setzt die Entwicklungsdatenbank nicht zurück.

## Nächste Arbeitspakete

1. Bewegung/Kamera an Treppen, Ecken, Sprüngen und langsamem Rendering weiter prüfen; Controllergefühl mit Nutzern abstimmen.
2. Fluchtgefühl mit Spielern abstimmen; Patrouillen, räumliches Audio, importierte Animationen und grössere Levelrouten ergänzen. Allgemeines Inventar, weitere Power-ups, Combo- und Risiko-Score folgen als eigene Module.
3. Die angemeldete neue Bali-Küste als durchgehenden Browser-Abnahmelauf ergänzen; Checkpoints und Achievements auf die bestehenden atomaren Run-Transaktionen aufbauen.
4. Den Flucht-Blockout zu einem 5–15-Minuten-Level ausbauen und das gesamte Bali-MVP mit Spielern abnehmen.

Die aktuelle Arbeitsanweisung steht in [handover-2026-09-15-consolidated-main.md](handover-2026-09-15-consolidated-main.md). Die [Übergabe vom 14. September](handover-2026-09-14-to-codex.md) dokumentiert den damaligen Stand; ihre CI-Reparaturvorschläge sind durch die Eigentümerentscheidung aufgehoben. Technische Details der Klang- und Stimmenarbeit in [handover-2026-09-14-voices-and-foley.md](handover-2026-09-14-voices-and-foley.md); sie nennt ausserdem, warum die CI auf `main` derzeit in den Timeout läuft, und verweist auf [test-backlog.md](test-backlog.md) für bewusst aufgeschobene Tests. Die [Übergabe davor](handover-2026-09-14-fly-high-and-bali.md) beschreibt Fly High, Tutorial und Bali-Küste. Die [vorherige Übergabe](handover-2026-09-14.md) dokumentiert Nana Plaza, Zelle, Zürich und die frühere Bewegungsüberarbeitung; widersprechende Levelzahlen und Wurfrichtungsregeln sind durch diese Lieferung ersetzt. Die langfristige Spezifikation bleibt in [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md). Dieser Status beschreibt ausschliesslich tatsächlich gelieferte und noch ausstehende Arbeit.
