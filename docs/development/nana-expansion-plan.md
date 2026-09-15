# Nana Plaza: technischer Umbauplan

## Befund und Entscheidungen

Die bisherige Szene besteht aus drei massiven Flügeln: obere Etagen sind nicht begehbar. `NanaVenue` hat 23 Figuren ohne LOD, dreht Tänzerinnen synchron und prüft Dialogreichweiten nur in X/Z. `npcPalette` erzeugt trotz Kommentar neue Materialien je Aufruf. `PoliceRuntime` nutzt ein zweidimensionales NavigationGrid; Galerien dürfen dessen Erdgeschoss nicht blockieren. Die WG besitzt bereits Havok-Rampen mit visuellen Stufen. `LevelScene.focus`, `restSpots`, `Seating`, `SpeechBubbles`, `NpcVoices`, AudioFeedback und der bestehende GameHost bleiben die Integrationspunkte. Es gibt kein allgemeines World-Streaming; nur lokale Sichtbarkeitsgruppen und die Thin-Instance-Menge der Parade.

## Phasen und betroffene Dateien

1. Analyse: bestehende Spec, Contracts, SceneKit, NPCs, Kamera, Navigation, Audio und Capture-Tests gelesen.
2. Planung: dieses Dokument; Referenzen und bewusste Massstabsabweichungen in der Gameplay-Spezifikation.
3. Blockout: `game-data/src/nana-plaza/{world,venues}.ts`; Runtime-Unterordner mit `scene`, `builder`, `environment`, `bts`, `plaza`. Alte Einstiegspunkte werden kleine Exporte. Sukhumvit quer, Soi als Abzweig, Plaza mit drei wirklichen Ebenen und rückwärtiger Treppe. Keine Bereichsteleports.
4. Physik: tragende Böden, Rampen und Geländer; explizite Erdgeschoss-Navigation-Metadaten. Kamera bleibt 360° mit vorhandenen Hindernisproben. Lokaler Browser-Bewegungsnachweis, besonders Rampenköpfe und Galerieöffnungen.
5. Venues: datengetriebene Fassaden/kleine/offene Innenräume, zehn Erdgeschossfronten, fünf vollständige Bars auf Ebene 2, vier auf Ebene 3. Gemeinsame Geometrie und Schilderatlas. Sitzplätze über bestehendes Seating. Getränke über optionalen Scene-Interaction-Vertrag.
6. Bevölkerung: `npcs.ts`, wiederverwendbare acht Dance-Profile, zentraler Population-Update, begrenzter Rig-Pool, Distanz-/Sichtklassen, höhenrichtige Interaktionen. Keine NPC-Physikkörper.
7. Atmosphäre: animierter BTS und Verkehr, modulare Fassaden/Props, emissive Lichtfarben, sektorweise Innenraumdetails und räumlich gewichtete Audiozonen über den vorhandenen Audio-Masterbus.
8. Gameplay: dieselben 16 Pickup-IDs, Verteilung 2/4/4/3/3; Security separat mit Warnung/kurzer Verfolgung/Hinausbegleitung; Polizei auf Strassenebene, bestehende Festnahme/Zelle unverändert. Flucht zum BTS.
9. Performance: Mesh-/Materialwiederverwendung, begrenzte NPC-Rigs, keine zusätzlichen dynamischen Lichter, Sichtbarkeit ohne Abschalten der Physik.
10. Nachweise und Dokumentation: bestehende Tests an neue Wege anpassen, keine Assertions entfernen. Lokale fokussierte Tests; GitHub-CI bleibt ausgeschaltet.

## Verträge und Risiken

- `LevelDefinition` und stabile Level-/Pickup-/Objective-IDs bleiben kompatibel. Kein Datenbankumbau.
- Neue Authoring-Typen: Venue (Etage, Lage, Zugangstiefe, Farbthema), Sektor, NPC-Spawn/Rolle/Ambientverhalten, Audioquelle.
- `LevelNpcs` erhält optionale Kontextübergabe für Chaos; alte Besetzungen benötigen keine Änderung.
- `LevelScene` erhält optionale Interaktionen/Ambience; GameHost führt Ergebnisse über bestehende Energie-, HUD- und Audiowege aus.
- Polizei darf durch Geschossdecken weder sehen noch fangen. Keine zweite Polizeiengine und kein vorgetäuschtes 3D-Navmesh.
- Rampen müssen bündig anschliessen; sichtbare Stufen sind Dekoration. Keine erhöhten begehbaren Strassendecks (bekannter Havok-Stolperstein).
- Culling darf Kamera-, Wurf- und Sichtlinienkollisionen nicht deaktivieren. Obere Fassaden bleiben aus dem Hof sichtbar.
- Veraltete Tests erwarten einen geraden Lauf vom alten Hof-Spawn; Wege müssen fachlich aktualisiert werden.
- Leistungsziel ist ein Budget, keine unbelegte FPS-Garantie. Browsermessung und Sichtkontrolle erforderlich.
- E darf nicht gleichzeitig sitzen, kaufen und den Level abschliessen. Eingaben werden genau einmal konsumiert.
- Referenzen dienen Formen und Raumfolge. Fiktive Bar-/Biermarken vermeiden den Eindruck einer Kooperation mit echten Betrieben. Erwachsene, respektvoll gestaltete Figuren; dieselben Dialog-/Reaktionsregeln für alle Performer.
