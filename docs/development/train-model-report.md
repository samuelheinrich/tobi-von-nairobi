# Lokaler Report der Train-GLBs

Erzeugt mit:

```bash
node tools/trains/analyse-trains.mjs models/objects/trains
```

Das Script liest GLB-Metadaten und transformierte Bounding Boxes. Es verändert keine Quelldatei.

| Datei                                                  |  MiB |  Dreiecke | Meshes | Materialien | Texturen | Abmessungen m (B×H×L) | Animation |
| ------------------------------------------------------ | ---: | --------: | -----: | ----------: | -------: | --------------------- | --------- |
| `bombardier_s_stock_london_underground.glb`            | 25,2 |   579’544 |    143 |          28 |        4 | 2,97×3,61×17,92       | 1         |
| `bombardier_s_train_carriage_-_london_underground.glb` | 16,0 |   380’940 |     94 |          23 |        2 | 2,95×3,61×16,15       | 1         |
| `train_-_british_rail_class_89_-_flying_badger.glb`    | 37,7 | 1’001’478 |    110 |          31 |        4 | 2,95×4,88×19,78       | –         |
| `train_-_british_rail_class_91_power_car.glb`          | 30,6 |   661’151 |    142 |          36 |        3 | 3,03×5,03×20,46       | –         |
| `train_-_intercity_125_executive_with_buffers.glb`     | 28,3 |   624’090 |    149 |          28 |        1 | 3,03×4,17×18,53       | –         |
| `train_-_mark_3_carriage_std_open_rail_blue (1).glb`   | 14,5 |   342’444 |     86 |          22 |        2 | 2,92×4,12×23,51       | –         |
| `train_-_mark_3_carriage_std_open_rail_blue.glb`       | 14,5 |   342’444 |     86 |          22 |        2 | 2,92×4,12×23,51       | –         |

Alle Dateien sind CC-BY-4.0-Modelle desselben Sketchfab-Autors. Keines besitzt ein Skeleton. Die
beiden Bombardier-Dateien enthalten je einen Node-/Objektclip; das ist kein Humanoid-Rig.

Keines der Modelle wird direkt ausgeliefert. Der leichteste Wagen hat 342’444 Dreiecke und 86
separate Meshes; bereits drei Wagen wären teurer als die komplette gewünschte Bahnhofsszene. Die
Modelle zeigen zudem London Underground bzw. britische Fernzüge und liefern für Zürich keine
passende Silhouette. Sie bleiben als lokale Dimensions- und Detailreferenz erhalten. Das Level
verwendet stattdessen modulare SBB-inspirierte Wagen mit geteilten Materialien und wenigen
Primitiven. Falls später ein Modell genutzt wird, entsteht zuerst eine neue optimierte Kopie unter
einem neuen Dateinamen; das Original bleibt unverändert.
