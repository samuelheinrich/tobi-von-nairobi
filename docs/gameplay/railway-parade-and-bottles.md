# Tobi, Wurfflaschen und zwei neue Kapitel

Stand: 14. September 2026. **LEVEL WÄHLEN** bietet sechs direkt startbare Level. Neue Inhalte ergänzen die vier Bali-Level unter eigenen IDs. Vor dem Start anmelden, um Abschlüsse zu speichern; als Gast sind sämtliche Level ebenfalls spielbar.

## Comic-Figur aus den Referenzen

Die prozedurale Spielfigur übernimmt braune Locken mit kurzen Seiten, kantige dunkle Sonnenbrille, kurzen Bart, breites Gesicht, kräftige Schultern, schwarzen Tanktop mit hellem Rand und eigenem Bärenmotiv, schwarze Shorts, blaue Schuhe und Zigarette. Die Geometrie ist eine stilisierte Annäherung; sie verwendet keine Fototexturen. Die gelieferten Originalfotos in `tmp/` bleiben lokal und sind in Git ausgeschlossen.

`runtime/character/tobi-likeness.ts` hält die Details getrennt von Gelenken und Animation in `tobi-visual.ts`. Die Figur bleibt für spätere GLB-Assets austauschbar. Für die visuelle Abnahme gibt es im laufenden Entwicklungsclient die [Figurenwerkstatt](http://localhost:5173/test/character.html), mit Drehung und Trinkpose. Die Werkstatt wird nicht in den Produktionsbuild eingebunden.

![Aktuelle Comic-Figur im 3D-Client](../screenshots/tobi-character.png)

## Aufnehmen → trinken → halten → werfen

Eine erstmals bestätigte Flaschenaufnahme zählt sofort für Mission, Chaos und Punkte. `BottleHands` reiht jede Aufnahme in eine Trinksequenz von **0,85 Sekunden** ein. Erst nach dem Schluck steigen Pegel und Leergutbestand. Die sichtbare Flasche bewegt sich mit dem Arm zum Mund und bleibt danach in der Hand. Mehrere schnelle Pickups werden nacheinander verarbeitet.

**G** wirft eine leere Flasche entlang der Kamerarichtung, sobald die Trinkgeste fertig ist. Ein Wurf verbraucht genau eine Flasche, hat 0,45 Sekunden Cooldown und kann keine weiteren Sammelpunkte erzeugen. Die Darstellung zeigt eine Flasche stellvertretend für den gezählten Leergutbestand. Flugbahnen verwenden Geschwindigkeit und Schwerkraft; pro Tick wird die durchflogene Strecke gegen Geometrie und Figuren geprüft. Eine nähere Wand verhindert einen Treffer dahinter. Maximal acht Flaschen gleichzeitig; Treffer, Boden oder drei Sekunden Flugzeit entfernen sie.

Getroffene aktive Guards bleiben **2,5 Sekunden** stehen und verlieren ihren aktuellen Fangfortschritt. Danach verfolgen sie normal weiter. Ihr Sichtkontakt bleibt während des Taumelns aktiv: Ein Treffer allein löst keine erfolgreiche Flucht aus. Passanten erschrecken, heben die Arme und laufen kurz weg. Auch **R** erschreckt alle erreichbaren Figuren im Umkreis von acht Metern; Hindernisse blockieren die Reaktion. In Verfolgungslevels erzeugen Würfe und Zurufe zusätzlich Chaos.

Handbestand, Flugbahnen, Pegel und Farbzustand sind Runtime-Daten. Pause friert sie ein; Neustart und Levelwechsel setzen sie zurück. PostgreSQL speichert weiterhin bestätigte Levelergebnisse, keine fliegenden Flaschen oder laufenden Trinkgesten.

## Thailand Railway

**Aufgabe:** „Falscher Wagen. Richtige Richtung.“ Tobi startet im hintersten Wagen, sammelt acht Flaschen und erreicht Wagen 1. Dort schliesst **E** die Zugfahrt ab. Keine Polizei; 1'300 Punkte inklusive Abschlussbonus.

Eigenständige Kulisse mit vier offenen Wagen, Sitzreihen, Gepäck, Türen, Übergängen, Gleisen und vorbeiziehenden Schwellen. Die Kamera blickt erhöht in den Innenraum; das Dach verdeckt die Figur nicht. Seitliche Kameradrehung ist begrenzt, damit die Zugrichtung lesbar bleibt. Unsichtbare seitliche Sicherheitswände verhindern das Herausspringen, ohne die Kamera zu blockieren. Die Physik verwendet einen zusammenhängenden Boden; die Fahrbewegung der Umgebung ist visuell.

Der Mittelgang bleibt durchgängig begehbar, Gepäck und Sitzreihen laden zu kleinen Umwegen ein. Wagenbeschriftungen geben die Richtung vor. Eigener rhythmischer Schienen-Sound begleitet die Fahrt. Das Kapitel ist ein kompakter spielbarer Innenraum-Prototyp; Schaffner, Tickets, Fahrplan, Bonusmissionen und endgültige 5–15-Minuten-Dauer sind spätere Erweiterungen.

![Thailand Railway mit offener Innenraumansicht](../screenshots/thailand-railway.png)

## Zürich Street Parade

**Aufgabe:** 20 Flaschen sammeln, Polizei abschütteln und Backstage erreichen. Drei Musik-Trucks, stilisierte Häuser, Tramspuren und **240 einzeln reagierende Tänzer** bilden die Strasse. R pöbelt alle Figuren in Reichweite an; der HUD-Zähler zählt jede erschreckte Figur pro Run höchstens einmal, auch nach einem Flaschentreffer.

**22 Tabletten** liegen neben der Sammelroute. Jede startet oder verlängert den rein visuellen Farbrausch um zehn Sekunden, bis maximal 24 Sekunden Restzeit. Farbton und Sättigung der Spielwelt verändern sich langsam; HUD und Menüs bleiben lesbar. Keine realen Medikamentennamen, Dosierungen oder Wirkungsmodelle. Bewegung, Stamina, Polizei und Score bleiben unverändert. Der Effekt klingt aus, lässt sich über **◈** reduzieren und startet bei `prefers-reduced-motion` reduziert. Diese Option gilt für die laufende App-Sitzung.

Fünf Chaos pro Flasche aktivieren bis zu drei Guards mit 3,8 m/s. Die geprüfte Fluchtroute führt nach der letzten Flasche nördlich um den nordwestlichen Musik-Truck, an dessen Westseite nach Süden und um die südöstliche Ecke. Mehrere Richtungswechsel brechen die Sicht; zwölf Sekunden unentdeckt bleiben, dann Backstage zurückkehren. Ein Run mit einer Flucht ergibt 3'000 Punkte. Geprüft mit echten Collidern, Havok-Bewegung und Sicht-Raycasts, ohne Teleport oder Abschluss-Hook.

Die Menge verwendet sechs Thin-Instance-Batches. Jede Person hat eigenen Reaktions-/Bewegungszustand; sie teilen ihre Rendergeometrie. Darstellungsdaten werden mit 20 Hz aktualisiert, Bewegung läuft im festen Simulationstick. Es gibt keine 240 Physikkörper und keine Crowd-gegen-Crowd-Kollision: Tobi kann durch die Menge navigieren. Flaschen prüfen die individuellen Treffervolumen; Häuser und Trucks bleiben solide Hindernisse. Das ist eine Arcade-Menge, noch keine vollständige Bürger- oder Dialogsimulation.

Eigener synthetisierter Kick/Bass-Rhythmus plus Trink-, Wurf-, Klirr- und Power-up-Cues ergänzen die vorhandenen Sounds. Alle verwenden denselben begrenzten Stimmenpool, Stummschaltung und Pause. Soundgestaltung mit Kopfhörern sowie 60 FPS auf Referenzhardware bleiben manuell abzunehmen.

![Street Parade während des Farbrauschs](../screenshots/zurich-street-parade.png)

## Module und Nachweise

- `contracts/content`: weitere Worlds, Kulissentypen und getrennte, eindeutig identifizierte Power-up-Platzierungen.
- `game-data/levels`: zwei JSON-Missionen mit normalen Collect-/Escape-/Reach-Handlern. Bestehende IDs und Wertungen bleiben kompatibel, keine Datenbankmigration erforderlich.
- `game-core/items`: enginefreie Trinkwarteschlange und begrenzter Farb-Timer; `character/reactive-crowd`: individuelle Reaktionen und Navigation über Ports.
- `runtime/levels`: eigenständige Zug-/Paradeszenen, gemeinsamer Szenenbaukasten, instanziierte Menge.
- `runtime/items`: geteiltes Flaschenmodell, Projektile und Farb-Pickups. `GameHost` verbindet Input, Gameplay, Sound und HUD.
- Unit-Tests prüfen Trinkreihenfolge, Leergutverbrauch, Cooldowns, deduplizierte Tabletten, Ablauf und Crowd-Reaktionen mit Hindernissen.
- Browser prüft Wurf-/Wandkollision, Guard-Taumelei und Erholung, vollständige Parade-Flucht, Zugfahrt inklusive Ziel, echte Trink-/Wurfeingaben, Pöbeln, Tabletten, Filterreduktion und Neustart.
- PostgreSQL-Integration prüft Parade-Fluchtbedingung sowie den gespeicherten Zugabschluss ohne Polizeibedingung. Vorhandene Konto-/Retry-Tests bleiben in der Suite.
