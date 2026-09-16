# Arlesheim Hippie-WG und Nachbarschaft

Stand: 16. September 2026. Die drei begehbaren Stockwerke mit je sechs Zimmern bleiben erhalten. Neu führt die Haustür ohne Teleport in einen Gemeinschaftsgarten und ein zusammenhängendes Arlesheimer Quartier. Direkt als Gast über **Arlesheim Hippie-WG → REIN IN DIE WG** spielbar.

## Aufgabe

Start in Tobis Zimmer im zweiten Obergeschoss. **36 Flaschen sammeln:** die bisherigen 18 in den Zimmern plus 18 im Garten, in Nachbarhäusern, im Lädeli, Café, auf dessen Dach, auf dem Dorfplatz und am Waldweg. Anschliessend vor der WG mit **E** abschliessen. Grundwert ohne weitere Aktionen: 4'100 Punkte. Keine Polizei-Pflicht; Trinken, Werfen, Pöbeln und Bewohnerreaktionen bleiben erhalten.

Die Haustür ist jetzt eine echte Öffnung, kein Abschluss vor einer verschlossenen Wand. Tobi kann das Haus beliebig verlassen und wieder betreten. Die ursprünglichen Treppen, Yoga-/Meditationsgruppen und Zimmeraufteilungen bleiben bestehen:

| Etage                | Zimmer                                                                      |
| -------------------- | --------------------------------------------------------------------------- |
| Zweites Obergeschoss | Tobis Zimmer, Meditation, Nähstube, Traumzimmer, Gästezimmer, Dachlounge    |
| Erstes Obergeschoss  | Atelier, Yoga, Bibliothek, Musikzimmer, Teestube, Gemeinschaftsbad          |
| Erdgeschoss          | Küche, Esszimmer, Plattenzimmer, Pflanzenzimmer, Velo-Werkstatt, Wohnzimmer |

## Umgebung

- **WG-Garten:** Hochbeete, Gewächshausgerüst, Kompost, Grill, Tisch, benutzbare Gartenbank, Wäscheleine und Peace-Fahne.
- **Wohnquartier:** neun zusätzliche Gebäude mit geneigten Ziegeldächern bzw. Café-Dachterrasse, Fensterläden, Blumenkästen, Briefkästen und Vorgärten. Mehrere echte Innenräume, darunter Nachbarhäuser, Quartierladen und Atelier.
- **Strasse:** Gehwege, gelber Fussgängerstreifen, Tempo-30-Schild, Laternen und geparkte Autos mit Collision. Ein mit E fahrbarer WG-Scooter nutzt dieselbe Fahrzeugbasis wie Bali; er ist optional.
- **Dorfplatz:** Brunnen, Café, Kulturhaus und ein vereinfachter Dom mit zwei Türmen. Der Dom ist eine solide Landmarke, kein begehbarer Kircheninnenraum.
- **Waldweg:** Laubbäume und Juralandschaft im Hintergrund. Sichtbare Hecken begrenzen das Quartier; der Boden setzt sich dahinter fort.
- **Orientierung:** Ortsnamen im HUD, Wegweiser und ein gezeichneter Quartierplan vor der WG. Der Plan zeigt die Spielwelt, keine amtliche Karte.
- **Fahnen:** Schweizerkreuz, Peace und stilisierter roter Baselstab als regionales Baselland-Motiv. Kleine lokal erzeugte Texturen werden geteilt. Es handelt sich beim Baselstab ausdrücklich nicht um das Arlesheimer Gemeindewappen.

Die Gestaltung orientiert sich lose an [Ortskern und Domplatz laut Gemeinde Arlesheim](https://www.arlesheim.ch/de/portrait/das_dorf/sehenswuerdigkeiten.php). Das [Arlesheimer Gemeindewappen verwendet einen Flügel](https://www.arlesheim.ch/de/portrait/das_dorf/geschichte.php). Gebäude, Strassenverlauf und Namen im Spiel sind eine stilisierte Interpretation; keine massstabsgetreue Rekonstruktion oder Behauptung über konkrete Privatwohnungen.

## Gemeinsame Technik

- `packages/game-data/src/arlesheim/world.ts`: Gebäude, Sektoren, Nachbarn, Fahrzeug, zusätzliche Flaschen und Referenzroute. Die ursprünglichen Haus-Pickup-IDs und Level-ID bleiben bestehen. Neue Content-Version `prototype-7-arlesheim`.
- `runtime/levels/hippie-house-scene.ts`: Stockwerke, Treppen, offene Haustür, sichtbares Dach und Übergang zwischen Innen- und Aussenansicht.
- `runtime/levels/arlesheim/`: Strassen/Landschaft, Hausgestaltung, Garten, Dorfdetails und Szenenkomposition.
- `runtime/world/scene-builder.ts`: aus Bali extrahierte gemeinsame Instanz-/Material-/Collider-Erzeugung. Bali verwendet denselben Builder weiter.
- `runtime/world/buildings.ts`, `sectors.ts`, `flags.ts`: Gebäude mit Türlücken und Dachzugang, Distanzsichtbarkeit, wiederverwendbare Fahnen.
- `NpcGroup`: komponiert bestehende WG-Bewohner und elf zusätzliche Nachbarn ohne Änderungen an den Gameplay-Verträgen.

Böden, Wände, Möbel, Dachflächen, Hecken, Baumstämme und Autos nutzen die bestehende Havok-Pipeline. Dächer erhalten ihre Collider erst nach der endgültigen Rotation. Blätter, Fahnen, Wäsche und Kleindetails bleiben explizit dekorativ. Hausdächer werden beim Betreten optisch ausgeblendet; Collision bleibt erhalten.

Innerhalb der WG bleibt der grafische Stockwerksschnitt aktiv. Draussen wird er aufgehoben, sonst würden Bäume, Häuser und Dom auf Kopfhöhe abgeschnitten. `LevelScene.cameraMode()` und `ThirdPersonCamera.setMode()` ermöglichen den wiederverwendbaren Wechsel Innen/Aussen bei gleicher freier Kameradrehung. Die Stockwerksanzeige erscheint nur in der WG. Rückkehr ins Haus aktiviert die bisherige Innenansicht wieder.

## Lokal geprüft und Grenzen

Der bestehende kurze Havok-Routentest wurde erweitert: 18 Zimmer, beide Treppen, Rückweg nach oben, echte Haustür, Garten, Nachbar-Innenräume, Café-Dach, Dorf-/Waldweg, alle 36 Flaschen und Levelabschluss. Er prüft zusätzlich das Ein-/Ausschalten des grafischen Schnitts beim Verlassen und erneuten Betreten. Der Bali-Routentest lief als gezielte Regression nach der Builder-Extraktion ebenfalls erfolgreich. Keine Teleport-Abkürzung im Routentest. Kein GitHub-CI-Lauf.

Der vorhandene UI-Test wurde an die neue Flaschenzahl angepasst, aber keine vollständige E2E-/Datenbank-Suite ausgeführt. Separate visuelle Prüfungen setzen die Figur gezielt an Ansichtspunkte; diese ersetzen keinen manuellen Komplettdurchlauf.

Das Quartier ist prozedural stilisiert. Häuser sind überwiegend eingeschossig, Dom und einige Wohnhäuser sind Fassaden. Kein fahrender Strassenverkehr; der Scooter ist das einzige steuerbare Fahrzeug. Keine Hardware-/Safari-/Langzeitabnahme, kein vollständiges Asset-Unloading. Historische WG-Bestwerte bleiben erhalten und sind wegen der grösseren Route nicht direkt vergleichbar.
