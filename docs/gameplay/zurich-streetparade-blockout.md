# Zürich Street Parade: unabhängiger Blender-Blockout

Stand 22. September 2026. Diese neue Map verwendet **keine Geometrie und kein
Leveldesign der bisherigen Streetparade-Szene**. Der alte Release-Level bleibt
vorerst unverändert. Die neue Welt ist lokal unter
`http://localhost:5173/?level=zurich_street_parade_blockout` verfügbar; in der
Levelauswahl heisst sie **Zürich Street Parade · neuer Blockout**. Start ohne Login.
F1 bietet Teleports zu den Landmarken und eine Collision-Ansicht. Im Browser-Test
wurden Start und Bellevue mit Tobi und Havok geladen; Bellevue war geerdet.

## Master und Massstab

- Master: `assets/blender/levels/zurich-streetparade/zurich-streetparade.blend`
- Recipe: `assets/blender/levels/zurich-streetparade/zurich-streetparade.recipe.json`
- Referenzen: `assets/blender/levels/zurich-streetparade/references/README.md`
- Blender: **1 Unit = 1 Meter**, Z nach oben; Weltachsen X Ost, Y Nord.
- Bellevueplatz: lokaler Ursprung; Anker aus OSM-Koordinaten auf lokale Meter
  projiziert. Der Auftrag verlangt eine plausible Miniatur und keine GIS-Kopie.
- Arbeitsfläche: **3600 × 4600 m** inklusive nicht begehbarer Hintergrund-Zonen.
  Das spielbare Kernnetz reicht von HB/Stadelhofen bis Hafen Enge.

Blender Collection-Hierarchie: `ZURICH_STREETPARADE/GENERATED/{TERRAIN,
WATER,ROADS,RAIL,STATIONS_*,BUILDINGS,LANDMARKS,STREETPARADE_*,COLLISION,
GAMEPLAY_MARKERS,BACKGROUND,...}` plus `ZURICH_STREETPARADE/MANUAL`.
Der Generator aktualisiert nur unveränderte Recipe-Objekte; vorher wird eine
Sicherung unter `backups/` angelegt. Manuell bearbeitete Objekte und alles in
`MANUAL` bleiben erhalten. GLB-Export fasst Render-Meshes **nur im Exportprozess**
nach Material und Sektor zusammen; die Masterdatei behält Einzelobjekte.

## Geometrie und Wege

- Echte ausgesparte See-/Limmat-Flächen zwischen begehbarem West- und Ostufer.
  Das Wasser liegt tiefer als die trockenen Quais. Südlich setzt sich der See bis
  an den Horizont des Blockouts fort; weit entfernte Stadt/Hügel stehen dahinter.
- Quaibrücke und HB-Brücke als begehbare Decks mit Collider/Geländer.
  Bauschänzli ist eine eigene begehbare Insel mit Fussbrücke.
- Street-Parade-Achse: Utoquai → Opernhaus/Opéra Stage → Bellevue → Quaibrücke
  → Bürkliplatz → Westquai → Hafendamm Enge. Weitere Bühnen-Footprints bei
  Bellevue, Bürkliplatz, Bauschänzli und Hafendamm. Die markierte Achse misst
  im Blockout **2003 m**. Noch keine Eventprops/NPCs.
- Bahnhofstrasse verbindet HB und Bürkliplatz. Eine Ost-/West-Verbindung führt
  über Bellevue nach Stadelhofen; Enge ist über Stadt und Hafen angebunden.
- 178 bewusst einfache, kollidierende Stadtblöcke begrenzen Strassenräume.
  48 Fernstadt-Blöcke und 16 Hügel-Silhouetten verdecken den Kartenrand;
  sichtbare Randbebauung/Retaining Walls ist physisch geschlossen.
- HB besitzt 12 oberirdische Gleisachsen mit begehbaren Bahnsteigen sowie vier
  unterirdische **Blockout-Gleisachsen**. Die offene Halle hat 31-m-Durchgänge.
  Stadelhofen hat 3, Enge 2 Gleisachsen mit Bahnsteigen. Züge/Boarding,
  unterirdische Zugänge und ausgebaute Bahnhofsräume kommen nach Abnahme.
- Tramachsen und zusätzliche Bahntunnel sind noch nicht modelliert; die
  `zurich_train_loop`-Markierung ist nur ein späteres Fahrplan-/Streaming-Skelett.

## Bauen und lokal ansehen

```bash
python3 tools/blender/generate_zurich_streetparade_recipe.py
blender --background --python tools/blender/build_level.py -- \
  assets/blender/levels/zurich-streetparade/zurich-streetparade.recipe.json --update
blender --background assets/blender/levels/zurich-streetparade/zurich-streetparade.blend \
  --python tools/blender/validate_zurich_blockout.py
blender --background assets/blender/levels/zurich-streetparade/zurich-streetparade.blend \
  --python tools/blender/export_level.py
pnpm --filter @tobi/game-client dev
```

Die erste Erzeugung lässt `--update` weg. GUI:

```bash
open -a Blender assets/blender/levels/zurich-streetparade/zurich-streetparade.blend
```

Bei GUI-Änderungen kann `tools/blender/mcp_bridge.py` über Blender MCP
`inspect_live()`, `validate_live()`, `sync_colliders_live()` und
`save_master_with_backup()` verwenden. Blender MCP ist optional; Export und
Validierung funktionieren offline über CLI. Der Preview-Renderer liest nur die
`.blend`-Datei und verändert sie nicht:

```bash
blender --background assets/blender/levels/zurich-streetparade/zurich-streetparade.blend \
  --python tools/blender/render_level_preview.py -- \
  apps/game-client/src/assets/level-previews/zurich_street_parade_blockout.png \
  -250 -100 2400
```

## Export und Prüfung

`assets/game/levels/zurich-streetparade/` enthält GLB, Runtime-JSON
(Marker, Sektoren, begehbare Bounds, Atmosphäre) und Collision-JSON
(279 separate Havok-Collider). Das GLB enthält nur sichtbare Geometrie;
Original-Collider, Marker und Blender-Editor-Helfer bleiben im Master/JSON.

Der geometrische Blockout-Validator hat **keine Fehler** gefunden: alle zehn
benannten Zielknoten sind im autorisierten Wegenetz verbunden und auf
begehbarer Fläche; Weg-/Gleis-Abtastungen treffen keine Gebäudefläche;
Bahnhöfe, Brücken-Collider und physische Aussenbegrenzungen sind vorhanden.
Resultat und Grenzen stehen in `metadata/world-validation.json`.
Der allgemeine Validator meldet noch **25 Coplanar-Warnungen** an
zusammenstossenden Ufer-/Wasser-Seiten, Geländer-Nähten, Hallen- und
Randmauerecken.
Die zuvor überlappenden Strassen-Oberseiten wurden als disjunkte Polygone
exportiert; es gibt keine Strasse-gegen-Strasse-Warnung mehr. Die verbliebenen
Nahtstellen werden bei Detailarbeit geprüft.

Zahlen des aktuellen Blocks: **556 einzeln editierbare Render-Objekte**,
**4968 Dreiecke**, **279 Collider**. Im exportierten GLB sind die Visuals auf
**60 Material-/Sektor-Meshes** zusammengefasst; GLB ca. **300 KB**,
Master ca. **495 KB**. Kurze Headless-Chromium-Checks zeigten etwa **2 FPS**
an Bellevue und **7 FPS** beim finalen HB-Start; die PoC-Testmap zeigte im
selben Modus etwa **4 FPS**.
Das ist kein Desktop-GPU-Benchmark. Sektor-Streaming/LOD bleibt wichtig und
ist noch nicht als Runtime-Loading implementiert.

## Bewusste Abweichungen und nächste Freigabe

Strassen-/Uferkurven, Häuser, Stationseingänge und Schienentrassen sind
vereinfacht. Zürich HB liegt als plausibler Verkehrsanker, nicht mit einem
exakten Gleisplan. Die Route/Anker wurden aus realen Karten abgeleitet;
Bauschänzli, Bellevue und das Seebecken sind für Spielwege etwas geräumiger.
Wasser hat im Blockout Farbe, aber noch keine Wellen/Reflexionen; der Himmel ist
vorerst ein warmer Fog-/Clear-Color-Hintergrund. Gleise/Tram sind statische
Blockout-Körper, kein Zug- oder Tramverkehr. Die HB-Untergeschosse sind derzeit
**nicht** begehbar; dazu braucht es in Phase 3 eine echte Aussparung und Treppe.

Vor der Detaillierung soll der Eigentümer in Blender/Spiel Orientierung,
Abstände und Wege prüfen. Erst danach Fassaden, Stationen, Züge, Bühnen,
Wasser-/Lichtstimmung, Eventprops, Innenräume, LOD und Gameplay ergänzen.
