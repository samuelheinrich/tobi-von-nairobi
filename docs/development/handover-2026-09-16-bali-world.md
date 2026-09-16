# Übergabe · Bali-Erkundungswelt · 16. September 2026

## Ergebnis

Das bestehende `bali_adventure` wurde zu einer zusammenhängenden Inselregion umgebaut. 36 Flaschen ersetzen die alte 18-Flaschen-/Polizeiflucht. Nach der Erkundung bei CASA TOBI mit E abschliessen. Hauptinsel, drei entfernte Inselkörper (einer spielbar), elf Sektoren, 17 Gebäude, 21 Bewohner, zwei Scooter und ein Boot. Kein Commit oder Push für diese Fortsetzung ausgeführt; der Arbeitsbaum enthält weiterhin auch den vorausgehenden gemeinsamen Physics-Ausbau. Nicht als fremde/unnötige Änderungen zurücksetzen.

[Gameplay, Grenzen, Datenstruktur und Steuerung](../gameplay/bali-open-world.md).
[Physics-Grundlage](physics-upgrade.md).

## Entscheidende Module

- `packages/game-data/src/bali-world/{world,buildings,content}.ts`: Höhenfeld, Sektoren, Strassen, Fahrzeuge/Landungen, Gebäude, Pickups und Bewohner. `bali-adventure.ts` exportiert diese Daten; die öffentliche Level-ID bleibt stabil.
- `runtime/levels/bali-world/`: kleine Szenenmodule für Terrain, Strassen, Landmarken, Atmosphäre und Komposition.
- `runtime/world/buildings.ts`: generische eingeschossige Gebäude, echte Türlücken, Möbel, Dachzugang, Sitzanker und visuelles Dach-Cutaway.
- `runtime/world/sectors.ts`: Sichtbarkeit mit Hysterese und Lazy-Dekoration. Kein vollständiges Asset-Unloading; Collider bleiben bestehen.
- `runtime/vehicles/`: gemeinsame Havok-Fahrzeugbasis, Scooter, Boot, Fahrer-/Interaktionszustand. `GameHost` verbindet bestehende Inputs, Kamera und Sitzanimation.
- `ground-detection.ts`: freie Spawn-/Ausstiegsplätze über echte Capsule-Proximity prüfen. Der vorherige reine AABB-Test blockierte bei einem grossen Terrain-Mesh jede Position.

## Fallstricke

1. Das Terrain ist ein einziges grobes Dreiecksmesh. Bounding-Box-Überlappung allein beweist dort keine Kollision. Ebenso die Dreiecks-Winding beibehalten, sonst ist das Gelände von oben unsichtbar.
2. Beim Fahren ist die Player-Capsule deaktiviert. Sonst bekämpfen sich Fahrzeugbody und an den Fahrersitz gesetzter Character. Beim Ausstieg/Abbruch wieder aktivieren. Visuelles Ground-Snapping darf den aktiven Fahrer nicht vom Sitz auf das Fahrzeugdach setzen.
3. Scooter benötigen tangentiale Steigungsbewegung und geringe Reibung. Reines horizontales Tempo blieb auf befahrbaren Rampen hängen.
4. Dächer brauchen eine zusammenhängende obere Treppenlandung. Eine zu kurze Landung liess den Spieler zwischen Treppe und Dach fallen; Überhang am falschen Ende blockierte den letzten Schritt.
5. Tempelrampe endet an der tatsächlichen Vorderkante des Plinths. Änderungen an Gebäude-/Treppendimensionen gemeinsam prüfen.
6. Docks haben echte Zufahrtsrampen, die Boots-Ausstiegsanker liegen auf dem Deck. Die Wassertiefe an der Küste hängt von den Terrain-Dreiecken ab, nicht nur von der analytischen Höhenfunktion.
7. `requiredVehicle` gehört zu Pickup-Daten. Der Scooter-Punkt wird nur während der Fahrt gesammelt; andere Flaschen bleiben normal zugänglich. Collect-Ziel wird aus der tatsächlichen Pickup-Liste erzeugt.
8. Alte Bestwerte von `bali_adventure` wurden nicht gelöscht. Inhalt geändert, ID erhalten; getrennte Ranglisten/Migration wären eine eigene Folgeaufgabe.

## Lokal geprüft

- Zwei gezielte Bali-Datentests bestanden.
- Sieben vorhandene lokale Physics-/Browsertests bestanden (4,7 s): gemeinsame Bewegung, Playground/Nana/Zelle, Projektile und neuer Bali-Weg.
- Danach nur Bali erneut geprüft (2,2 s), nachdem zusätzlich jede Route durch unsicheres Wasser als Fehler behandelt wird. 36/36 Flaschen, echte Wege durch Innenräume und auf Dächer, Scooterfahrt, Tempel/Terrassen, Boot hin/zurück, Offshore-Ausstieg blockiert, Mission abgeschlossen. Keine Teleport-Abkürzung; Ein-/Aussteigen verwenden die regulären Fahrzeugfunktionen.
- Echter Gaststart per UI, WASD bis zum Scooter, E einsteigen, W fahren, Shift bremsen, E aussteigen. Fahrzeughinweis und Sitzpose sichtbar, Position verändert, keine Browserfehler. Tobi-GLB wurde nachgeladen und dargestellt.
- Neue Galerie-Vorschau aus der tatsächlichen Szene erzeugt. Typecheck, ESLint, Diff-Prüfung und rekursiver Client-Upload-Build erfolgreich. Vite meldet die bestehenden grossen Babylon-Chunks und wirkungslose dynamische Loader-Imports; keine Buildfehler. Tempel, Terrassen und Hafen zusätzlich als gerenderte Ansichten kontrolliert.

Keine GitHub-CI gestartet oder eingerichtet. Keine vollständige Test-Suite, kein Datenbanklauf. Aufwendigere Hardware-/Safari-/Langzeitprüfungen stehen im [Test-Backlog](test-backlog.md).

## Weiterentwicklung

Vorrangig: visuelle Detailrunde für Häuser/Fahrzeuge/Vegetation, zusätzliche Ambient-NPC-Verhalten, Fahrübungen im Tutorial, GPU-Messung auf dem Zielgerät. Aktuell prozedural stilisierte Fahrzeuge, schwimmende Bootsbewegung mit fester Wasserhöhe, keine Schwimmphysik. `BuildingDefinition` enthält vorbereitende Metadaten; mehrere Türen und nicht rechteckige Gebäude werden vom aktuellen Builder noch nicht umgesetzt. Die vollständige Referenzroute beweist Erreichbarkeit, nicht die Qualität aller frei gefahrenen Nebenrouten oder jedes GLB-Sitzposes.

Für lokale Arbeiten den bestehenden Vite-Server `http://localhost:5173/` verwenden. Nur den kleinsten benötigten Test starten, keine CI-Reparatur und kein automatisches Pushen ableiten. Upload ist der Inhalt von `apps/game-client/dist`, kein ZIP notwendig.
