# Offline-Leveldesign mit Blender – PoC City

Blender ist Authoring-Tool, Babylon/Havok bleiben Runtime. Dieser PoC enthält **keine NPCs,
Character-Assets oder Gameplay-Logik**. Im lokalen Studio repräsentiert eine Capsule den Spieler,
um die vorhandene Spielfigur-Physik zu prüfen. Bestehende Levels bleiben unverändert.

## Dateien

```text
assets/blender/levels/poc-city/
  poc-city.blend               MASTER, direkt im Blender GUI öffnen
  poc-city.recipe.json         deterministische Grundmap und Objektbeschreibungen
  metadata/
    collision.json             aus der aktuellen Szene erzeugt
    gameplay.json              aus der aktuellen Szene erzeugt
    validation.json            PASS/WARNING/ERROR, Objekte und Ursachen
  textures/                    lokale Texturen, aktuell unbenutzt
  references/                  keine privaten Bilder im Repository
  backups/                     lokale Sicherungen, gitignored
assets/game/levels/poc-city/
  poc-city.glb                  nur Render-Geometrie und Materialien
  poc-city.runtime.json         typisierte Marker, Laufwege, begehbare Bounds
  poc-city.collision.json       eigenständige Havok-Collider-Beschreibungen
tools/blender/
  build_level.py               initiale Scene / explizites Recipe-Update
  generate_collision.py        expliziter Collision-Sync nach GUI-Änderungen
  validate_level.py            Geometrie- und Metadaten-Prüfungen
  export_level.py              separater Export, speichert NICHT die Masterdatei
  inspect_level.py             Objektinventar als JSON auf stdout
  common.py                    gemeinsamer Scene-Vertrag und Achsenumrechnung
  check_pipeline.py            kleine lokale Validator-Gegenproben
```

Blender-Version für diesen PoC: **5.2.1 LTS**. Die Recipe pinnt die Version; ein Build mit einer
anderen Version stoppt. Metereinheiten, Seed `12345`, sortierte Exportlisten, keine Zufallsquellen
oder externen Downloads. Die Recipe enthält World-Grösse, Materialien, Road-/Collision-Regeln und
explizite Objektparameter. Die Regeln beschreiben den PoC; `objects` ist die ausführbare Liste.
Noch kein allgemeiner Stadtgenerator und keine Asset-Library. Spätere Library-Builder können
Objekte mit demselben Metadatenvertrag erzeugen.

## Master öffnen und bearbeiten

Im Finder `assets/blender/levels/poc-city/poc-city.blend` doppelklicken, oder vom Repository:

```bash
open -a Blender assets/blender/levels/poc-city/poc-city.blend
```

Die Collections liegen unter `POC_CITY`: `GEO_STATIC`, `GEO_DYNAMIC`, `COLLISION`, `BUILDINGS`,
`INTERIORS`, `PROPS`, `ROADS`, `ROOFS`, `STAIRS`, `RAILINGS`, `GAMEPLAY_MARKERS`, `EXPORT`, `DEBUG`.
Die COLLISION-Objekte sind zunächst im Viewport verborgen; im Outliner einblenden, um ihre
Wireframes zu sehen. `ROOFS` temporär ausblenden, um den Bar-Innenraum zu bearbeiten.

1. Master öffnen, Objekt verschieben oder Mesh in Edit Mode bearbeiten.
2. Änderungen speichern (`Cmd+S`). Nicht durch einen Neuaufbau ersetzen.
3. Modifiers/Constraints auf solider Geometrie vor dem Export anwenden.
4. Collider explizit synchronisieren, falls Geometrie verändert wurde.
5. Validator und Export starten.
6. Level-Studio neu laden. Die GLB-/JSON-Dateien werden direkt aus `assets/game` geladen.

Keine laufende Agentensitzung erforderlich. Die CLI lädt immer die **zuletzt gespeicherte**
Masterdatei. Nach externem Collision-Sync die Datei im GUI neu öffnen, damit eine alte geöffnete
GUI-Sitzung den aktualisierten Stand nicht wieder überschreibt.

## CLI

Alle Befehle vom Repository-Root. Auf macOS:

```bash
BLENDER_BIN=/Applications/Blender.app/Contents/MacOS/Blender
```

Initialer Build (bei bestehender Masterdatei absichtlicher Abbruch):

```bash
"$BLENDER_BIN" --background --python-exit-code 1 \
  --python tools/blender/build_level.py -- \
  assets/blender/levels/poc-city/poc-city.recipe.json
```

Explizites Recipe-Update:

```bash
"$BLENDER_BIN" --background --python-exit-code 1 \
  --python tools/blender/build_level.py -- \
  assets/blender/levels/poc-city/poc-city.recipe.json --update
```

Vor dem Update entsteht eine datierte Sicherung in `backups/`. Unveränderte generierte Objekte
können aktualisiert werden. Transform-, Mesh-, Property-, Collection- oder Materialzuweisungs-
Änderungen gegenüber dem gespeicherten Fingerprint werden erhalten; ebenso manuell hinzugefügte
Objekte. Geänderte Materialdefinitionen bleiben erhalten. Aus der Recipe entfernte Objekte werden
nicht automatisch gelöscht. Ein im GUI gelöschtes Recipe-Objekt wird beim nächsten expliziten
Recipe-Update neu erzeugt, solange es noch in `objects` steht: für dauerhafte Löschung auch den
Recipe-Eintrag entfernen. Nach der manuellen Authoring-Phase normalerweise nur validieren/exportieren.

Collider-Sync (erstellt ebenfalls eine Sicherung der Masterdatei):

```bash
"$BLENDER_BIN" --background assets/blender/levels/poc-city/poc-city.blend \
  --python-exit-code 1 --python tools/blender/generate_collision.py
```

Validierung:

```bash
"$BLENDER_BIN" --background assets/blender/levels/poc-city/poc-city.blend \
  --python-exit-code 1 --python tools/blender/validate_level.py
```

Separater Export:

```bash
"$BLENDER_BIN" --background assets/blender/levels/poc-city/poc-city.blend \
  --python-exit-code 1 --python tools/blender/export_level.py
```

Der Export validiert nochmals, stoppt bei `ERROR`, schreibt GLB/JSON und **ruft niemals Save auf der
Masterdatei auf**. `WARNING` wird dokumentiert und erlaubt den Export. `--python-exit-code 1` ist
wichtig: Blender liefert bei Python-Fehlern sonst teilweise trotzdem Exit Code 0.

Inventar / gezielte Validator-Gegenproben:

```bash
"$BLENDER_BIN" --background assets/blender/levels/poc-city/poc-city.blend \
  --python-exit-code 1 --python tools/blender/inspect_level.py
"$BLENDER_BIN" --background assets/blender/levels/poc-city/poc-city.blend \
  --python-exit-code 1 --python tools/blender/check_pipeline.py
```

## Scene-Vertrag

| Element       | Konvention / Properties                                                                       |
| ------------- | --------------------------------------------------------------------------------------------- |
| Render        | `GEO_*`, Mesh; `solid`, `walkable`, `collision_shape`                                         |
| Ausnahme      | `solid=false`, `decoration_reason` erklärt z.B. Fahrbahnmarkierung/Trittstufe                 |
| Collider      | `COL_*`, `render_id` verweist auf Render-ID; `collision`, `walkable`, `layer`                 |
| Shapes        | `box`, `capsule`, `convex`, `mesh`; PoC verwendet ausschliesslich Boxen                       |
| Tür           | `MARK_*`, `type=door`, `width`, `height`, `depth`, `normal`, `building`                       |
| Flasche       | `type=bottle_spawn`, `category`                                                               |
| Fahrzeug      | `type=vehicle_spawn`, `vehicle`; `type=vehicle_route`, `points`                               |
| Dachzugang    | `type=roof_access`, `target` (Dach-ID), `route` (Route-ID)                                    |
| Ziel          | `type=mission_trigger`, `radius`                                                              |
| Start/Laufweg | `type=player_spawn`, `type=navigation_route`, `points`                                        |
| Fallkante     | `safety_edges`: lokale XY-Segmente; `edge_height`: lokale Z-Höhe; Geländer `protects=Dach-ID` |

Türmarker liegt auf dem Boden mittig im Durchgang; lokale X-Achse = Breite, Y = Durchgangstiefe,
Z = Höhe. Route-Punkte sind standardmässig Blender-Weltkoordinaten; `routeSpace=local` bindet sie
an den Marker-Transform. Custom Properties mit `_` sind Pipeline-Interna.

Collider werden auf Wunsch aus den soliden Meshes kopiert, mit einer expliziten einfachen Shape.
Manuell bearbeitete Collider werden vom Sync erhalten. Ein als veraltet gemeldeter individueller
Collider muss bewusst neu synchronisiert werden: Kopie sichern, alten `COL_*` löschen und Sync
ausführen, dann eigene Anpassungen wieder vornehmen. Kein unsichtbares Auto-Reparieren.

## Was im Export liegt

- **GLB:** selektierte `GEO_*`-Meshes, gemeinsame Materialien, Transformationshierarchie. Keine
  Collider, Marker, Kameras, Lichter, Animationen, Debug-Helfer oder Referenzbilder.
- **Runtime JSON:** Version, Koordinatensystem, Render-Manifest, Cutaway-Liste, Türen, Flaschen-/
  Fahrzeug-Spawns, Fahrzeugrouten, Dachzugänge, Mission-Trigger, Player-Spawn, Prüfpfade und
  begehbare Bounds. Reine Daten; nichts spawnt automatisch und keine Mission wird ausgeführt.
- **Collision JSON:** Collider-ID, Render-ID, Shape, Layer, Walkable, Weltposition, Grösse,
  Quaternion; für authored Convex/Mesh optional Welt-Vertices und Dreiecke.

Blender Z-up → glTF Y-up → Babylons vorhandener **Left-Handed/AUTO**-Import. Die resultierende
Umrechnung lautet `Blender(x,y,z) → Runtime(-x,z,-y)`. Sidecars verwenden dieselbe Umrechnung,
inklusive Rotation. Der Importer lehnt eine anders konfigurierte Scene ab. Die Render-/Collider-
Bounds werden im Roundtrip numerisch verglichen; es werden keine Laufzeit-Skalierungs-Hacks benutzt.

## Lokales Level-Studio und Havok

```bash
pnpm --filter @tobi/game-client dev
```

Öffnen: <http://localhost:5173/test/level-studio.html>, auch im vorhandenen Modell-Studio verlinkt.
WASD bewegt die Test-Capsule in Weltachsen, Space springt, Shift sprintet. Kamera mit Maus/Rad.
Buttons für Bar, Treppe, Dach, Collider, Follow-Kamera und Dach-Cutaway. Cutaway ändert nur Sichtbarkeit;
Collision bleibt erhalten. `Laufwege prüfen` fährt die vorhandene Locomotion/Capsule gegen den
exportierten Havok-Aufbau.

Der generische Importer `runtime/levels/authored/import-level.ts` lädt Manifest und Sidecars,
prüft Schema/Koordinaten/IDs, lädt über `loadWorldAsset` und registriert separate Collider über
`HavokWorld.addCollider`. Keine zweite Physics-Engine, kein Name-Parsing für Gameplay. Nur der
Prüfharness kennt die IDs seiner festen Teststrecke.

Die lokalen Dateien werden durch den Vite-Dev-Mount `/level-assets/` ausgeliefert. Sie sind noch
nicht in der Level-Galerie oder dem Produktions-Build. Ein Client-Build würde gemäss Projektregel
automatisch deployen; für diesen Offline-PoC genügt der lokale Vite-Server.

## Validierung und Grenzen

Bereits implementiert: offene/non-manifold Meshes, 2-m-Raster für Löcher in der Grundfläche,
doppelte Floor-Tops unter 1 mm Abstand, mögliche koplanare Flächen, fehlende/verwaiste/veraltete
Collider, blockierte oder zu enge Türen, Marker/Routen ausserhalb der Welt, fehlende Dachzugangs-
Marker, ungeschützte **deklarierte** Fallkanten, doppelte Export-IDs/Blender-Namenssuffixe,
ungültige Shape-Daten sowie nicht angewendete Modifier/Constraints und gescherte/negative
Collider-Transformationen.

Grenzen bewusst sichtbar im JSON-Report:

- AABB-Prüfungen für koplanare Flächen/Türen sind bei gedrehter komplexer Geometrie konservativ.
- Kleine Löcher zwischen Rasterpunkten werden nicht garantiert erkannt.
- Der Geländercheck prüft deklarierte Kanten; noch keine automatische Extraktion aller Fallkanten
  aus beliebigen Meshes.
- Ein Roof-Access-Marker beweist keinen Laufweg. Dafür gibt es den tatsächlichen Havok-Probe.
- PoC testet Boxen und geneigte Boxen. Capsule/Convex/Mesh werden durchgereicht, benötigen vor einer
  echten Level-Migration eigene Referenzobjekte und Tests.
- Keine Navmesh-, Streaming-, Vehicle-, Mission- oder NPC-Erzeugung in Blender.
- GLB und Sidecars bilden einen zusammengehörigen Exportstand und müssen gemeinsam aktualisiert werden.

## Git und spätere Library

Master (unter 1 MB), Recipe, Scripts, JSON und GLB werden versioniert. `*.blend1`, `*.blend2`,
Backups, Python-Cache und lokale Arbeitsordner werden ignoriert. Keine LFS-Pflicht für diesen PoC.
Falls Master/Textures wachsen: vor der ersten grossen Datei `git lfs install` und
`git lfs track 'assets/blender/**/*.blend'` ausführen, `.gitattributes` committen; bestehende History
nicht ungefragt migrieren. Spätere lokale Library: `assets/blender/library/{buildings,bars,roads,props,railings,stairs,vegetation}`.

## Ergebnis des PoC-Roundtrips (17. September 2026)

- Master: ca. 163 KB, GLB: ca. 106 KB; 91 Render-Meshes, 55 Collider, 10 Marker.
- Validator: PASS; zwölf gezielte fehlerhafte Gegenproben erkannt
  ([Report](development/blender-poc-validator-checks.json)).
- Export verändert die Masterdatei nicht (SHA-256 vor/nach identisch); wiederholter Export liefert
  identische GLB-/JSON-Dateien. Frischer Recipe-Aufbau hat dieselben Objekt-Fingerprints.
- Auf einer temporären Master-Kopie eine Mauer wie im GUI verschoben: Recipe-Update erhält die
  Bearbeitung, synchronisiert den Collider und erstellt vorher ein Backup
  ([Report](development/blender-poc-roundtrip.json)). Die Bearbeitung wurde über Blender Python
  simuliert; kein manueller GUI-Test wird behauptet.
- Lokaler Chromium/Havok-Test: freier Eingang, Innenraum, Treppenaufstieg, Dach, Balkon-/Dachgeländer,
  Tischkollision und Landung auf dem Tisch bestanden. Render-/Collider-Bounds unterscheiden sich
  maximal um ca. 0.00000013 m ([Report](development/blender-poc-havok-check.json)).
- Screenshot-Sichtkontrolle in Babylon mit Dach und Cutaway; keine offensichtlichen doppelt
  gezeichneten Böden. Das ersetzt keine Prüfung auf allen Grafikkarten.
- Client-Typecheck und gezieltes ESLint bestanden. Lokales Node war 26.8.2 und damit ausserhalb
  der im Projekt vorgesehenen 24.x-Version; die Tools meldeten dafür eine Versionswarnung.

Phase 8 ist erreicht. Keine bestehenden Levels migriert, kein Produktions-Build, kein Upload
und keine GitHub-CI ausgelöst. Nächster Schritt ist der visuelle Test der Masterdatei und des
Level-Studios durch den Eigentümer, bevor echte Levels auf diese Pipeline umgestellt werden.
