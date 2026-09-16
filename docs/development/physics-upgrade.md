# Gemeinsame Collision-Pipeline

## Analyse und Umbauplan (15. September 2026)

Ausgangspunkt: `8ec7605`, sauberer Git-Stand. Babylon 9.26 / Havok 1.3.14 bleiben die einzige Physics-Engine.

- `physics/havok-world.ts`: manuell getaktete Havok-Welt und Character-Capsule (1.8 m / Radius .42). Support-Queries bereits vorhanden; Oberflächenbewegung wird bisher ignoriert.
- `levels/scene-kit.ts`: statische Boxen, separate unsichtbare Begrenzungen und rein logische Navigationshindernisse. Level entscheiden selbst, was massiv ist.
- Nana: Stockwerke, Rampen und Theken schon physisch; `builder.prop` erzeugt nur Instanzen. Dächer, Bänke, Hocker, Food-Carts und Verkehr dadurch durchlässig. Verkehr bewegt sich im Render-Takt.
- WG: fast alle Möbel ausdrücklich nur dekorativ. Zug: Sitzbänke massiv, Hocker und Tischplatten teilweise dekorativ.
- NPCs: TransformNode-Fussanker, keine gemeinsame Boden-/Hindernisprüfung. Nana Ambient-Bewegung ignoriert Wände. Sitzhöhen und Root-Offsets vermischt; Übergabe dokumentiert bereits falsche Sitzpositionen.
- Flaschen: separate ballistische Integration und Render-Raycasts, zusätzlich festes `y < .15`. Keine Havok-Bodies; Stockwerke/Verkehr inkonsistent.
- Fahrzeuge: Nana Kulissenverkehr ohne Body; kein gemeinsames Moving-Platform-System.

## Module und Reihenfolge

1. `collision-layers`, `collider-factory`: zentrale Filter, explizite Asset-Metadaten, primitive/compound Collider, gemeinsame Registrierung; `addStatic` bleibt kompatibel.
2. `ground-detection`, Character-Motor: Fuss-/Capsule-Konvertierung, echte Physics-Queries, Support-Geschwindigkeit und Absprungimpuls.
3. Bestehende Level-Builder: massive Props explizit deklarieren, Dekoration bleibt explizite Ausnahme. Keine Namensabfragen im Physics-System.
4. `npc-grounding`: gemeinsame, begrenzte Crowd-Kollision; Fussanker und Sitzanker separat. Fernfiguren ohne vollständige Controller.
5. `moving-platform`: animierte Havok-Bodies mit Zieltransform statt Render-Teleport; Verkehr im festen Simulationstakt.
6. `physics-props`: dynamische Flaschen, Sweeps gegen Durchtunneln und bestehende Treffer-/Sound-Callbacks.
7. `debug-physics`, lokaler Playground, Offline-Collider-Vorschläge. Keine Änderungen an Original-GLBs.
8. Gezielte lokale Physics-/Nana-Prüfungen, ein Abschlussbuild, dokumentierte Grenzen. Keine GitHub-CI.

## Risiken

Neue Möbelkollision kann bisher offene Wege versperren; insbesondere enge Zug-/Flugzeuggänge prüfen. Sitz-Capsules dürfen nicht mit dem eigenen Sitz kämpfen. Bodenabfragen müssen im aktuellen Stockwerk bleiben und dürfen nicht auf die Decke schnappen. Fahrzeug-Wrapping darf keine Geschwindigkeit quer über die Karte erzeugen. Unsichtbar geschaltete Etagen behalten ihre Physik. Modelle mit defekter Ruhepose bleiben von der Besetzung ausgeschlossen; Kollision repariert keine Skinning-Dateien.

## Implementierter Stand

### Gemeinsame Runtime

- **Layers und Factory:** `runtime/physics/collision-layers.ts` definiert PLAYER, NPC, WORLD_STATIC, WORLD_DYNAMIC, VEHICLE, PROP, PROJECTILE, TRIGGER und DECORATION samt gegenseitigen Filtern. `collider-factory.ts` erstellt Box, Capsule, Compound-Boxen, Convex Hull oder statisches Triangle Mesh. Instanzierte Render-Props erhalten unsichtbare Physics-Proxies; keine zweite Engine. Metadaten, Registrierung und Dispose sind zentral.
- **Player:** bestehende 1.8-m-Capsule, Radius .42, 30-cm-Step und 45°-Steigung bleiben erhalten. Havok-Support/Shape-Casts liefern den Bodenkontakt. Kein fester Boden-Y-Wert. Die Standard-Kontakttoleranz bleibt unverändert; `groundedVisualFeet` setzt ausschliesslich den sichtbaren Fussanker auf die nahe tragende Oberfläche. Kopfkontakt begrenzt weiter die vertikale Bewegung.
- **Moving Platforms:** ANIMATED Bodies erhalten Zieltransforms im festen Simulationstakt. Havok schiebt bei Kontakt; Oberflächengeschwindigkeit einschliesslich Rotation trägt den Player und bleibt beim Absprung erhalten. Kein Parent/Unparent des Players. Nana-Taxis und anderer Verkehr nutzen das System. Das Wrapping an den abgeschlossenen Strassenenden setzt den Body ausdrücklich zurück, ohne eine Geschwindigkeit quer über die Karte zu erzeugen.
- **Babylon-Adapter:** `character-controller.ts` korrigiert die Geschwindigkeit animierter Kontaktflächen. Babylon 9.26 berechnet sie sonst anhand von Render-Frame-IDs; mehrere Simulationstakte pro Render bzw. reine Physics-Probes liefern damit falsche Werte. Der Adapter verwendet lineare und Winkelgeschwindigkeit des Havok-Bodys. Der übrige Solver bleibt unverändert. Bei Babylon-Upgrades gezielt den lokalen Plattformtest ausführen; geschützte API ist versionsabhängig.
- **NPCs:** `npc-grounding.ts` verwaltet maximal 40 nahe Capsules innerhalb 35 m. Stehende Figuren verwenden den gemeinsamen Character-Motor für Bewegung; sitzende Figuren eine kürzere Kontakt-Capsule oberhalb des Sitzes. Füsse und Sitzhöhe sind getrennt. `findGroundedSpawn` sucht bei belegten Standorten eine kleine freie Position auf derselben Ebene. Nana-Ambient-Bewegung prüft über `crowdMove` Möbel, Wände und Abgründe. Entfernte Figuren erhalten keinen vollständigen Havok-Controller. Bestehende KI und Animationen bleiben zuständig für Verhalten und Pose.
- **Flaschen:** Hand-Release und bestehender Animationsmarker bleiben erhalten. Danach dynamischer Capsule-Body mit Gravitation, Rotation und Restitution; zusätzlich Sweep gegen schnelle Durchtritte. Weltkontakt löst den bisherigen Bruch-/Soundeffekt aus. Ziele bleiben über die vorhandenen Stagger-/Frighten-Callbacks angebunden. Maximal acht Geschosse, begrenzte Lebensdauer und vollständiges Dispose.

### Behobene gemeinsame Ursachen und Level-Funde

| Fund                                                      | Korrektur                                                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nana-Instanz-Props waren nur sichtbar                     | Explizites `builder.massive` mit primitiven Physics-Proxies; Bänke, Hocker, Theken, Food-Carts, Planter, Roller und grössere Aufbauten migriert.             |
| Dächer/Markisen ohne tragende Oberfläche                  | Tatsächliche Box-/Convex-Kollision an passenden Dächern und Überständen; Oberseiten werden vom Character-Support erkannt.                                    |
| Nana-Verkehr nur Render-Animation                         | Fester Physiktakt, ANIMATED Vehicle-Bodies, Mitfahren und Wegschieben.                                                                                       |
| WG-Möbel, Zugtischplatten, Sitzhocker teilweise dekorativ | Gemeinsames `solidBox` bzw. Scene-Kit-Collider; auch ausgewählte Bali-/Parade-Props, Palmenstämme, Strandstühle und Flugzeug-Gepäckfächer/Armlehnen ergänzt. |
| NPCs auf Sitzhöhe statt mit Fussanker platziert           | Zug-/Flugzeug-/Nana-Roots auf jeweilige Bodenebene; `rig.seatHeight` separat und bei skalierter GLB-Figur in lokale Einheiten umgerechnet.                   |
| WG-Sitzfiguren ohne sichtbaren Sitz                       | Passende Sitzflächen ergänzt; Yoga/Meditation verwenden niedrige Sitzhöhe.                                                                                   |
| Neue Möbel fehlten in Sicht-/Navigationshindernissen      | Scene-Dispatcher ergänzt registrierte statische Props; Fahrzeuge werden nicht als dauerhaftes statisches Navigationshindernis eingetragen.                   |
| Nana-Testweg lief mitten durch eine Tanzstange            | Autorisierte Wegpunkte um echte Hindernisse geführt; keine Collider für Tests abgeschaltet. Neun Venue-Eintritte und 16 Flaschen bleiben Pflicht.            |
| Zellenbett nach Massiv-Migration nicht mehr ansprechbar   | Interaktionsradius von 1.5 auf 1.9 m erweitert. Pritsche bleibt massiv; Hinlegen ist von davor möglich.                                                      |
| Kleine Solver-Toleranz änderte Bali-Flucht                | Versuch verworfen, Default wiederhergestellt. Original-Fluchtroute schafft wieder 18 Flaschen, eine Flucht und Abschluss.                                    |

Blätter, Vorhänge, Lichtflächen, kleine Schilder, Kabel, Flaschenregal-Deko und Effekte bleiben bewusst ohne eigene Bodies. Kollisionslose Details verwenden weiterhin den Render-Builder; neue massive Objekte müssen ausdrücklich den Solid-Builder oder Asset-Metadaten verwenden. Es findet keine gefährliche automatische Klassifizierung sämtlicher alter Render-Meshes anhand ihrer Namen statt.

### Werkzeuge

Mit lokalem Vite auf Port 5173:

- `/test/physics-playground.html`: Boden, Wand, Tisch, Stuhl, Dach, Geländer, Decke, Stufen/Rampe und bewegliches Auto. WASD, Space, Shift; G wirft eine Flasche; Auto- und Collider-Schalter.
- **F1 im Spiel → Collider / Bodenabfrage:** Player, NPC, Welt, Fahrzeuge, Props/Geschosse und Trigger nach Layer filterbar. Bodenabfrage und nahe Player-Kontaktpunkte sichtbar; Übersicht naher Bodies mit Typ/Layer/Walkable. Nur im Entwicklungsbuild.
- `/test/collision-studio.html`: lokale GLB laden, Render-Mesh auswählen, none/box/capsule/convex/mesh prüfen, primitive Grösse/Position/Rotation und Walkable bearbeiten, separate JSON-Datei exportieren. Vom Model Studio verlinkt. Originaldatei bleibt unverändert.
- `tools/physics/generate-colliders.mjs`: rein lokaler Bounding-Box-Vorschlag, berücksichtigt Babylon-Node-/Primitive-Namen; neuer Output mit Überschreibschutz. Anleitung: [Physics-Asset-Pipeline](../../tools/physics/README.md).

### Lokale Prüfung

Keine GitHub-CI gestartet oder eingerichtet, keine vollständige E2E-Suite.

- Client-Typecheck und gezieltes ESLint erfolgreich.
- Sechs gezielte lokale Browser-/Havok-Tests erfolgreich (ca. 3 s): bestehender Character-/Kamera-Test, zwei bestehende Wurftests, Playground, Nana-Physics und Zellenbett-Interaktion.
- Playground prüft echtes Anspringen des Tischs und Autos, Dachlandung, Deckenstopp, Treppen, Mitfahrt, Absprunggeschwindigkeit, Wegschieben sowie Anheben/Rotation derselben Plattform. Collider-Kontaktabstand und sichtbarer Fusskontakt werden getrennt geprüft.
- Nana-Physics prüft tragende Ebenen 0 / 4.8 / 9.6 m, Tisch/Dach/Theke, alle authored Stand-Spawns ohne ungelöste Position, eine gerenderte NPC-Capsule auf Ebene 3, Flaschenaufprall auf oberem Boden und Mitfahrt auf einem tatsächlich instanzierten Taxi.
- Bestehende lokale Weg-Probes: Nana (20 Kontrollpunkte, neun Venues/Flirts, 16 Flaschen, Security-Eskalation und Abschluss), WG (drei Stockwerke, 18 Flaschen, Rückweg und Abschluss), Flugzeug (beide Treppen, 204 Sitze, Mission bereit), Zuglandschaft (16 wiederverwendete Streifen, konstante Mesh-/Collider-Anzahl) und Bali (18 Flaschen, Flucht, Abschluss) erfolgreich.
- Collision Studio mit lokalem Test-GLB: alle fünf Formen, Vorschau und JSON-Export geprüft. Compound-Body mit zwei Säulen lässt die mittlere Türöffnung frei. Offline-Tool erzeugt neue Config.
- Browser-Sichtkontrolle des Playgrounds, Collision Studios sowie Nana/F1-Debug. Das ersetzt keine ausgiebige Spielrunde auf echter Desktop-GPU.

Lokaler kleiner Testsatz (bestehenden Vite-Server verwenden):

```sh
pnpm exec playwright test --config playwright.physics-local.config.ts --reporter=line
```

### Grenzen / nächste gezielte Abnahme

- Keine garantierte 60-FPS-Zusage. Zusätzliche statische Bodies (Nana ca. 607 vor naher Crowd) und bis zu 40 NPC-Capsules sollten auf Zielhardware geprüft werden. Die Collider werden einmal aufgebaut und sind unabhängig vom Sichtbarkeits-/Sector-System.
- NPC-KI erhält hier keine neue mehrstöckige Navmesh-Pfadplanung. Nahe Physik verhindert Durchlaufen, Nana-Ambient-Bewegung prüft lokale Schritte; komplizierte Umwege bleiben Sache der vorhandenen Routensysteme. Fernstufen verwenden vereinfachtes Verhalten.
- Fussanker und Sitzhöhe korrigieren keine fehlerhaften GLB-Skinning-Dateien. Yoga, sehr tiefe Sitzposen und alle Kleidungs-/Animationskombinationen brauchen weiterhin gezielte Sichtprüfung; keine Hand-/Bein-Ragdoll-Kollision.
- `walkable` steuert die Boden-/Spawn-Probes; ein physisch solider Body verschwindet durch `walkable: false` nicht und bleibt im Havok-Kontaktsolver massiv. NPCs werden dort zusätzlich durch die Layer aus den Bodenprobes ausgeschlossen.
- Einzelne sehr kleine Dekorationen bleiben ohne Physik. Kein Anspruch auf manuelle Prüfung jedes einzelnen Props aller Levels.
- Festnahme-/Drunk-Tank-Transition unverändert. Der neue lokale Test prüft die reale Zelle und das erreichbare Bett; die vollständige UI-Kette Festnahme → Zelle → Ergebnis wurde nicht erneut automatisiert durchgespielt.
- Neue Gebäude-GLBs benötigen bewusst vereinfachte Compound-Teile/Collision-Meshes. Eine automatische Bounding Box um ein ganzes Haus würde auch Türen schliessen und ist deshalb nur ein Vorschlag.

### Upload-Build

`pnpm --filter @tobi/game-client... -r build` erfolgreich. Upload-Verzeichnis: `apps/game-client/dist/`; dessen kompletten Inhalt inklusive `assets/` und Model-Dateien hochladen. Kein ZIP erstellt, keine Originalmodelle verändert. Vite meldet weiterhin grosse Chunks und gleichzeitig statische/dynamische glTF-Imports; das sind Warnungen, keine Build-Fehler.

Technische Referenzen: [Babylon Character Controller](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/physics/v2/characterController.md), [Babylon Rigid Bodies](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/physics/v2/rigidBodies.md). Entscheidend für den Adapter ist der lokal installierte Babylon-9.26-Quelltext, nicht eine neuere Online-Version.
