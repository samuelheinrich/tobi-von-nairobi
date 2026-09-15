# Workflow-Test: `nina-dancer.glb` → `nina-dancer-game.glb`

Stand: 15. September 2026. Einzeltest, ausdrücklich **keine Batch-Verarbeitung**. Kein anderes
Modell wurde angefasst. Das Original `models/nina-dancer.glb` ist unverändert (25'023'648 Byte,
Zeitstempel 11:41).

## Ergebnis in Zahlen

| Kennzahl         | Original                                | Game-Version                                      |
| ---------------- | --------------------------------------- | ------------------------------------------------- |
| Datei            | 23,86 MiB                               | **3,54 MiB** (−85 %)                              |
| Dreiecke         | 465'635                                 | **42'799** (−90,8 %)                              |
| Vertices         | 307'939                                 | 46'515 (21'098 eindeutige Positionen)             |
| Meshes           | 5 Fragmente                             | 1                                                 |
| Materialien      | 1                                       | 1                                                 |
| Texturen         | 2 × 1024² (930 KiB JPEG + 1201 KiB PNG) | 3 × 1024² JPEG (417 + 261 + 206 KiB)              |
| davon Normal Map | **keine**                               | neu gebacken, 261 KiB                             |
| Skelett          | keines                                  | **65 Bones**, Mixamo-Namensschema                 |
| Animationen      | keine                                   | `idle` (49 F), `walk` (33 F), `dance` (41 F)      |
| Attribute        | POSITION, NORMAL, 4 × TEXCOORD          | POSITION, NORMAL, TEXCOORD_0, JOINTS_0, WEIGHTS_0 |

42'799 Dreiecke liegen im Zielband 30'000–50'000. Zum Vergleich: die heutige prozedurale Spielfigur
kostet 31'616.

## 1. Analyse des Originals

**Aufbau.** Fünf Meshes mit je exakt 65'532 Vertices (das vierte 45'811) — die Signatur eines
Sketchfab-Exports, der ein einzelnes Mesh an der 16-Bit-Indexgrenze zersägt. Es sind keine
Körperteile: jedes Fragment spannt fast die volle Körperhöhe. Alle fünf teilen **ein** Material.

**Texturen.** Basisfarbe (1024² JPEG) und Metallic-Roughness (1024² PNG). **Keine Normal Map** —
jedes Oberflächendetail steckt allein in der Geometrie, weshalb Punkt 4 der Aufgabe hier nicht
„vorhandene Normal Maps übernehmen“ heisst, sondern „neu backen“.

**Vier UV-Sätze** (TEXCOORD_0…3), inhaltlich Dubletten. Nur der erste wird gebraucht.

**Topologie.** 26'333 offene Randkanten, 0 non-manifold Kanten im ersten Fragment. Nach Verbinden,
Verschweissen und Reinigen bleiben 902 offene und 1'148 non-manifold Kanten — echte Löcher und
Durchdringungen im Ausgangsmodell.

**Pose — der entscheidende Befund.** Kein T- oder A-Pose, sondern eine ausmodellierte Pin-up-Pose:

- linker Unterarm quer vor dem Bauch, direkt am Körper anliegend
- rechte Hand am Mund, Finger berühren das Gesicht
- Beine in weitem X-Stand, Füsse auswärts
- extreme High Heels: die Füsse stehen fast senkrecht
- langes Haar liegt über Schulter und Brust auf dem Körper auf

**Eignung für humanoides Rigging: schlecht.** Automatische Verfahren — Mixamo wie Blenders
Bone-Heat — setzen voraus, dass Gliedmassen frei vom Rumpf stehen. Hier berühren beide Arme den
Torso und die Hand das Gesicht.

## 2.–4. Reduktion und Normal Map

Kette: `dedup` → `join` (5 → 1 Primitive) → `weld` → `simplify` (meshoptimizer) → Reinigung in
Blender (Doubles, lose Geometrie, Normalen).

Drei Fehlertoleranzen gemessen:

| `--error` | Dreiecke   | Bewertung                        |
| --------- | ---------- | -------------------------------- |
| 0,001     | 53'919     | unter dem Maximum, aber teurer   |
| **0,01**  | **43'259** | **gewählt** — mitten im Zielband |
| 0,05      | 43'207     | kein Gewinn mehr                 |

Ab 0,01 bringt mehr Fehlertoleranz nichts: die Topologie selbst begrenzt die Reduktion.

**Normal Map** aus dem High-Poly auf das reduzierte Mesh gebacken (Blender/Cycles, Metal-GPU,
2048² mit Cage, danach auf 1024² skaliert). Sie fängt einen Teil der verlorenen Feinform auf —
Hautfalten, Stoffkanten, Haarsträhnen.

**Sichtbare Verluste.** Auf Spieldistanz praktisch keine: Silhouette, Gesicht, Haaransatz und
Dessous bleiben erhalten. Im Detail:

- Rüschen am Strumpfgürtel und die Schleifen am Bikini-Oberteil facettieren sichtbar
- die Reduktion verteilt das Budget **stark ungleich**: rund 77 % der Vertices landen im Bereich
  Brust/Arme/Kleidung, die Beine behalten stellenweise unter 40 Vertices pro Höhenprozent. Der
  Simplifier folgt der Krümmung, und glatte Beine sind ihm billig. Für die Optik geht das auf,
  fürs Rigging nicht: Knie- und Schienbeinbereiche haben kaum noch Stützpunkte.

## 5.–6. Rigging

**Skelett:** 65 Bones, Mixamo-Namensschema (`mixamorig:Hips`, `Spine`…`Spine2`, `Neck`, `Head`,
`HeadTop_End`, Schulter/Arm/Unterarm/Hand je Seite, 5 × 4 Fingerglieder je Hand, Bein/Unterschenkel/
Fuss/Zehen je Seite). Damit im geforderten Band 50–70 und retargeting-kompatibel.

Gelenkpositionen: Beine, Becken, Wirbelsäule, Hals und Kopf aus den gemessenen Schwerpunkten je
Höhenband; Arme nach der Pose aus den Referenzansichten, weil sie geometrisch nicht vom Rumpf zu
trennen sind.

### Probleme beim Rigging

**Bone-Heat schlägt vollständig fehl.** Blender meldet `failed to find solution for one or more
bones` und gewichtet **0 von 21'098** Vertices. Ursache sind die 1'148 non-manifold Kanten und die
Selbstdurchdringungen der Pose — der Heat-Solver braucht eine saubere geschlossene Fläche.

**Fallback:** eigene Gewichtung über inverse Distanz zu den Bone-Segmenten, 4 Einflüsse pro Vertex,
normalisiert. Das ist, was ein naiver Auto-Skinner tut, und erzeugt eine funktionierende, aber
erkennbar unsaubere Bindung:

| Bone              | dominante Vertices |
| ----------------- | -----------------: |
| `Spine2`          |             26,9 % |
| `RightArm`        |             19,0 % |
| `LeftShoulder`    |             12,1 % |
| `RightShoulder`   |              8,9 % |
| `Head`            |              6,3 % |
| `LeftLeg` (Knie)  |              0,3 % |
| `RightLeg` (Knie) |              0,2 % |
| `RightHand`       |              0,3 % |

Die Verteilung ist die Diagnose: **`Spine2` reisst ein Viertel des Körpers an sich**, weil die
angelegten Arme näher an der Brustwirbelsäule liegen als an ihren eigenen Armknochen. Die
Knieknochen bekommen fast nichts, weil die Reduktion die Schienbeine leergeräumt hat. Die Hände
sind mit dem Gesicht bzw. dem Bauch verschmolzen und daher kaum trennbar. Die 40 Fingerknochen
tragen **keine** Deformation; sie existieren nur, damit Retargeting die erwarteten Namen findet.

### Geprüfte Gelenke

| Gelenk               | Befund                                                            |
| -------------------- | ----------------------------------------------------------------- |
| Hüfte                | sauber, folgt dem Becken                                          |
| Spine (3 Glieder)    | funktioniert, aber `Spine2` überreicht in die Arme                |
| Hals / Kopf          | sauber, klar getrennt                                             |
| Arme                 | **unbrauchbar** — Gewichte im Rumpf, Arm lässt sich nicht bewegen |
| Hände / Finger       | **unbrauchbar** — mit Gesicht und Bauch verschmolzen              |
| Beine (Oberschenkel) | brauchbar                                                         |
| Knie                 | schwach — zu wenig Geometrie nach der Reduktion                   |
| Füsse                | geometrisch sauber, aber in Zehenstellung fixiert (High Heels)    |

Gemessener Vertexversatz gegen die Ruhelage: `idle` max 2,7 cm, `walk` max 46,9 cm, `dance` max
15,4 cm. Dass **100 % der Vertices** sich um mehr als 1 mm bewegen, ist selbst schon ein Mangel: die
Distanzgewichtung streut über den ganzen Körper, statt sauber an Gelenken zu trennen.

Sichtbare Deformationsfehler in den Testbildern: der Strumpfgürtel **reisst an der Hüfte auf**, und
die Bikini-Schalen verschmieren beim Rumpfdrehen. Schultern und Knie bleiben unauffällig — dort
passiert schlicht zu wenig.

## 7. Animationen

`idle` (49 Frames), `walk` (33), `dance` (41), je 195 Kanäle, als eigene NLA-Tracks exportiert und
nach dem Reimport der GLB als drei getrennte Clips bestätigt.

**Wichtige Einschränkung: das sind keine retargeteten Mixamo-Clips, sondern von Hand gesetzte
Keyframes gegen diese Ruhelage.** Retargeting war nicht möglich, und das ist kein Werkzeugproblem:
Standardclips sind gegen eine T-Pose als Ruhelage authored. Diese Figur hat die Pin-up-Pose als
Ruhelage. Ein normaler Walk-Clip würde die Arme durch den Torso falten. Die Figur müsste zuerst
gerigged, in T-Pose gestellt und diese als neue Ruhelage angewendet werden — wobei die Haut dort
reisst, wo Arm und Rumpf sich heute berühren.

`walk` sieht entsprechend falsch aus: die Beine schwingen aus einem weiten X-Stand, die Füsse
bleiben auf Zehenspitzen, die Arme bleiben verschränkt.

## 8. Export

`models/nina-dancer-game.glb`, 3,54 MiB. Ein Mesh, ein Material, drei 1024²-JPEG-Texturen,
65 Joints, drei Clips. Reimport in Blender bestätigt: 42'799 Dreiecke, 65 Bones, 65 Vertexgruppen,
ein UV-Satz, alle drei Clips vorhanden.

## 9. Eignung des Workflows für die übrigen NPC-Modelle

**Die Reduktionshälfte: ja, uneingeschränkt.** `dedup → join → weld → simplify → resize → JPEG`
lieferte −90,8 % Dreiecke und −85 % Dateigrösse bei auf Spieldistanz kaum sichtbarem Verlust. Das
ist sofort auf `sexy_nurse_002`, `girl_sexy`, `female-sporty1`, `realistic_girl_in_dress`,
`kayla-dancer`, `locker_room_glamour-dancer` und `pink_halter_dress_portrait-bar-girl` anwendbar.
Das Normal-Map-Backing lohnt sich überall dort, wo das Original keine mitbringt.

**Die Rigging-Hälfte: nein, nicht in dieser Form.** Der Blocker ist nicht das Werkzeug, sondern das
Ausgangsmaterial: eine ausmodellierte Pose mit anliegenden Armen ist nicht automatisch riggbar.
Bone-Heat scheitert, und jede Distanzgewichtung verschmilzt, was sich berührt. Dieselbe Diagnose
trifft alle statischen Sketchfab-Figuren im Bestand — `bargirl-sitting` (sitzend),
`yoga-girl-naked-sitting` (Schneidersitz) und `hippie-yoga` (Balancepose) sind noch deutlich
schlechtere Fälle als Nina.

**Was ich stattdessen empfehle:**

1. **Reduktion vom Rigging trennen.** Die Reduktion als Batch über alle Modelle laufen lassen — das
   ist erprobt und risikoarm. Das bringt den gesamten Bestand in ein tragbares Budget.
2. **Statische Modelle statisch einsetzen.** Eine Figur an der Bar, eine sitzende Gestalt in der
   Ecke, eine Yogapose auf der Matte: als Kulisse funktionieren sie ohne jedes Rigging und sehen
   dort besser aus als alles Prozedurale.
3. **Für alles, was sich bewegen muss, gerigged einkaufen.** `sam.glb` (Avaturn, 52 Gelenke) und
   `security_guard.glb` (66 Gelenke, Idle) zeigen den Weg: Modelle, die bereits in T-Pose mit
   Skelett und Clip ankommen, brauchen genau null von der schwierigen Hälfte dieses Workflows.
4. **Nina selbst** ist mit diesem Ergebnis als **stehende oder leicht wiegende Figur** brauchbar —
   der `dance`-Clip trägt auf Distanz. Als laufender, interagierender NPC nicht.

**Aufwand zur Einordnung:** Analyse bis Export dauerte mit Blender 5.2 und gltf-transform rund
50 Minuten, davon etwa 10 Minuten Rechenzeit (Bake und Simplify) und der Rest Diagnose der
Rigging-Fehlschläge. Eine reine Reduktion ohne Rigging liegt bei zwei bis drei Minuten pro Modell
und ist skriptbar.

## Werkzeuge

Neu installiert: **Blender 5.2.1 LTS** (`brew install --cask blender`) und **gltf-transform 4.5.0**
(über `npx`, nicht global installiert). Die Skripte liegen im Scratchpad dieser Sitzung und sind
nicht im Repository — sie sind Einweg-Werkzeuge für diesen Test, kein Pipeline-Code. Wenn die
Reduktion zum Batch werden soll, gehört sie als eigenes Skript nach `tools/`.
