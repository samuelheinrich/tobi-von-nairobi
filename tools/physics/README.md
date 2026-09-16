# Lokale Collision-Asset-Pipeline

Original-GLBs bleiben unverändert. Havok/Babylon der vorhandenen Runtime ist die einzige Engine.

```sh
node tools/physics/generate-colliders.mjs models/source/table.glb models/work/table-collision.json furniture
```

Der Output muss neu sein; vorhandene Dateien werden nie überschrieben. Kategorien: `prop`, `furniture`, `building`, `character`, `vehicle`. Node-/Primitive-Namen entsprechen Babylons Import-Namen. Doppelte Namen müssen zuerst in einer Asset-Kopie bereinigt werden. Fehlende POSITION-Bounds benötigen lokale Analyse; kein Download, keine Konvertierung am Original. Flache Geometrie erhält für den Vorschlag mindestens 4 cm Dicke. Charaktere erhalten `none`, weil deren animiertes Mesh über den gemeinsamen Character-Collider behandelt wird.

Vorschläge unbedingt im lokalen `/test/collision-studio.html` prüfen. Das Studio exportiert `meshes` nach Runtime-Mesh-Namen. Jeder Mesh braucht eine explizite Entscheidung, auch Dekoration (`none`). Grösse/Position gelten lokal zum Mesh; Rotation in Radiant, Babylon-Y nach oben, Einheiten Meter. Scale wird über die Mesh-Transformation angewandt. Convex/Mesh verwenden die authored Geometrie/Transformation; manuelle Bounds-Felder gelten nur für Box/Capsule. Keine dynamischen Triangle-Mesh-Bodies.

## Anbindung

`runtime/physics/world-asset.ts` lädt World-Assets in die bestehende Havok-Welt:

```ts
const asset = await loadWorldAsset(scene, '/assets/table.glb', config.meshes);
// Später: asset.dispose(); die registrierten Collider werden mit entsorgt.
```

Alternativ glTF-Node-Extras `collision: "box"` und `walkable: true`, oder `collision` als vollständiges Config-Objekt. Der World-Loader lehnt fehlende Metadaten ab, damit neue massive Welt-Assets nicht stillschweigend durchlässig werden. Character-GLBs bleiben im vorhandenen Humanoid-Loader und verwenden die Character-Capsule.

```json
{
  "meshes": {
    "Table": {
      "collision": "box",
      "layer": "WORLD_STATIC",
      "walkable": true,
      "parts": [
        { "size": [2, 0.12, 1], "position": [0, 0.9, 0] },
        { "size": [0.3, 0.9, 0.3], "position": [0, 0.45, 0] }
      ]
    },
    "Flowers": { "collision": "none" }
  }
}
```

Compound-Teile sind Boxen im Koordinatenraum des Assets und teilen einen Body. Ihre Offsets beziehen sich auf den Asset-Ursprung, nicht den Mittelpunkt der Bounding Box. Keine zusätzlichen `size`/`position`/`rotation` auf der Compound-Wurzel; Transform am Mesh bzw. an den einzelnen Teilen setzen. Bei stark nichtuniform skalierten, gedrehten Compound-Teilen die Skalierung zuvor in einer Asset-Kopie anwenden.

Bevorzugte Reihenfolge: primitive Box/Capsule → Compound → Convex → vereinfachtes statisches Mesh. Ein Haus nicht durch eine einzige geschlossene Box ersetzen. Sitzflächen und Dächer brauchen obere Flächen; Geländerhöhen müssen zur Darstellung passen. Kleine Deko ausdrücklich ohne Collider.

Bewegte Assets verwenden `MovingPlatform`: Zieltransforms vor `world.step`, tatsächlichen Transform über `sync()` ins Render-Mesh übernehmen. Primitive Body-Geometrie möglichst um den Asset-Ursprung zentrieren. Keine direkte Render-Positionsanimation neben dem Havok-Body. Beim absichtlichen Route-Wrapping `reset()` verwenden; Player nie an das Fahrzeug parenten.

Details zu Layern, NPC-Budget, Sitzankern, Debug und Grenzen: [Physics-Übergabe](../../docs/development/physics-upgrade.md).
