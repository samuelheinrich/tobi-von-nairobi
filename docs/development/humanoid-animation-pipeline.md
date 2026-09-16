# Humanoid-Animation-Pipeline · 15. September 2026

Tobis GLB benutzt jetzt dieselbe Humanoid-Runtime, die weitere geriggte menschliche Modelle verwenden können. Der bestehende Havok-Controller bewegt weiterhin die Figur; die Animation erzeugt keine horizontale Root Motion. Der prozedurale Tobi bleibt als Lade-/Fehlerfallback erhalten.

## Analyse der vorhandenen Modelle

| Modell                             | Dreiecke | Meshes / Materialien | Bones | Originalclip                  |
| ---------------------------------- | -------: | -------------------: | ----: | ----------------------------- |
| `public/characters/tobi.glb`       |   20'456 |                4 / 4 |    52 | `IdleV4.2(maya_head)`, 8,00 s |
| `public/characters/tobi-drunk.glb` |   20'678 |               10 / 9 |    54 | `avaturn_animation`, 8,08 s   |

Beide Dateien haben eine Armature, Skinning mit `JOINTS_0`/`WEIGHTS_0` und inverse Bind-Matrizen. Root Bone ist **Hips**, die Szenenwurzel heisst **Armature**. Das normale Modell hat 15'621 gewichtete Vertices, das betrunkene 15'969. Die lokale Prüfung findet keine negativen/nicht endlichen Gewichte, ungültigen Joint-Indizes oder Gewichtssummen ausserhalb der Toleranz von 0,02. Das prüft die Datenkonsistenz, nicht automatisch die künstlerische Qualität aller Deformationen.

Die Grundausrichtung ist glTF-Y-up, Gesicht nach +Z, mit seitlich ausgestreckten Armen in der Bindepose. Die Quelldimension ist ungefähr 1,73 m. Babylon fügt seine glTF-Konvertierungswurzel hinzu; diese wird erhalten. Ein separater Parent passt das Modell auf die bisherigen **2,17 Spielmeter** an und setzt die Sohlen auf den Ursprung. Die Anpassung ist rein zur Laufzeit; weder Geometrie noch Bind-Matrizen werden überschrieben.

### Bone-Zuordnung

| Interner Name                             | Tobi-Bone                           |
| ----------------------------------------- | ----------------------------------- |
| hips                                      | Hips                                |
| spine / chest                             | Spine / Spine2                      |
| neck / head                               | Neck / Head                         |
| leftUpperArm / leftLowerArm / leftHand    | LeftArm / LeftForeArm / LeftHand    |
| rightUpperArm / rightLowerArm / rightHand | RightArm / RightForeArm / RightHand |
| leftUpperLeg / leftLowerLeg / leftFoot    | LeftUpLeg / LeftLeg / LeftFoot      |
| rightUpperLeg / rightLowerLeg / rightFoot | RightUpLeg / RightLeg / RightFoot   |

Weitere Original-Bones bleiben erhalten: `Spine1`, `LeftShoulder`, `RightShoulder`, beide `ToeBase` sowie je drei Gelenke für Thumb, Index, Middle, Ring und Pinky beider Hände. Die betrunkene Variante hat zusätzlich `LeftEye` und `RightEye`. Die 17 internen Gelenke sind der minimale Adapter, kein neu erzeugtes 17-Bone-Skeleton. Zusätzliche Gelenke übernehmen die passenden importierten Tracks, insbesondere Schulter- und Fingerbewegungen. Beim Wechsel zu einer parametrischen Action kehren sie weich zur Bindepose zurück. Vorhandene Morph-Animationen des verwendeten Idle-Clips werden mitgeführt.

**Ergebnis:** Ein erneutes Rigging ist für diese beiden Modelle nicht nötig. Die lokalen Modelle Sam/Chris enthalten ebenfalls überwiegend Idle-Clips. Ninas lokal erzeugter Walk ist laut [Optimierungsbericht](nina-dancer-optimierung.md#7-animationen) an eine problematische Pin-up-Ruhelage gebunden und kein geeignetes Standard-Walk-Asset. Walk/Run verwenden deshalb weiterhin die generischen Bewegungsprofile. Die vier neu bereitgestellten FBX-Dateien ersetzen inzwischen Pickup, Throw und Taunt und ergänzen den Siegestanz; siehe unten.

## Runtime und Daten

Dateien unter `apps/game-client/src/runtime/character/`:

- `humanoid/schema.ts`: 15 standardisierte Actions, Bone-Aliase, CharacterConfig, PropAttachmentPreset und ClipSource.
- `humanoid/skeleton-adapter.ts`: löst GLB-Bones auf verlinkte TransformNodes auf, liest die Bindepose und rechnet Rotationen in deren lokale Achsen um. Die Neutralstellung der Arme wird aus der tatsächlichen Ober-/Unterarmrichtung ermittelt.
- `humanoid/motion-library.ts`: gemeinsame zeitabhängige In-Place-Posen für Walk, Run, Jump Start/Air/Land, Sit Down/Idle/Stand Up, Throw, Taunt, Drink, Pickup und Hit Reaction sowie Idle-Fallback.
- `humanoid/animation-controller.ts`: Zustandswechsel, begrenzte geschwindigkeitsabhängige Schrittfrequenz, One-Shots, explizite Simulationszeit und benannte Timeline-Marker.
- `humanoid/character-runtime.ts`: Laden, Skalierung, Pose-Anwendung und Quaternion-Crossfades. Nur ein Pose-Schreiber kontrolliert das Skeleton. Eine vertikale Fusskontaktkorrektur reduziert Schweben bei generischer Locomotion; sie ist kein vollständiger IK-Solver.
- `humanoid/clip-sampler.ts`: vorhandene/retargetete Clips werden am selben expliziten Animationszeitpunkt gelesen; kein parallel laufender AnimationGroup-Timer. Horizontale Translationen werden nicht an den Gameplay-Root weitergegeben.
- `humanoid/retarget-import.ts`: optionaler Import fremder GLB-Clips mittels Babylons `AnimatorAvatar`, vor dem Spielbetrieb und nicht pro Frame.
- `humanoid/attachments.ts`: echte Hand-Sockets, lokale Prop-Offsets, optionales Ausrichten der Flaschenspitze zum Mund und Ablösen unter Erhalt des Welttransforms.
- `characters/tobi.ts`: beide Modellpfade, Bone-/Clip-Mapping, Zielhöhe, Mundpunkt, Armabstand, Schrittfrequenzen, Crossfade und Prop-Presets.

`TobiAvatar` verwaltet nur die beiden Skins. Ihre Posen folgen demselben Controller in `TobiVisual`; die 30-Sekunden-Umschaltung nach Flaschen bleibt erhalten. Die alten prozeduralen Körperbewegungen werden nicht zusätzlich auf das GLB angewendet.

Die Fallback-Bibliothek besteht aus wiederverwendbaren parametrischen Animationen. Die vier lokalen FBX-Clips ersetzen einzelne Actions über dieselbe Runtime. `motionDurations` definiert die Spieldauer, `clipRanges` optional den normalisierten Ausschnitt der vollständigen Quelldatei. Crossfades dauern bei Tobi 160 ms. Sitzen verwendet den bestehenden `RestSpot` mit Position, Yaw und dem neuen optionalen `seatHeight` (Sitzfläche relativ zum visuellen Figurenursprung, Standard 0,42 m). Ein kleiner proportionaler Beckenabstand liegt oberhalb der Sitzfläche. E bewegt die Figur weiterhin über die vorhandenen Seat-/Exit-Anker. Pöbeln oder Trinken im Sitzen behält die angewinkelten Beine.

## Flasche und Gameplay

1. Das bestehende `BottleHands` reserviert beim akzeptierten G-Druck ein Leergut.
2. Die sichtbare Flasche bleibt während des Ausholens unter `RightHand`.
3. Der Controller meldet bei **0,40 der 2,20-s-Wurfanimation**, also nach 0,88 s einmal den Marker `release`.
4. Das tatsächliche Prop wird von der Hand gelöst, inklusive Weltposition, Rotation und Skalierung.
5. `ThrownBottles.launchProp` übernimmt dieses Objekt. Richtung ist Tobis aktuelle Blick-/Bewegungsrichtung beim Release; Schwerkraft und bestehende Swept-Collision-Prüfung bleiben erhalten.
6. Ein neues, bei leerer Hand unsichtbares Hand-Prop steht für das nächste Item bereit.

Sound und Polizei-Störung erfolgen am Release. Weitere Würfe sind bis zum Ende des Wurfs gesperrt. Pause übergibt Delta 0 und löst keinen Marker aus. `R` verbindet die vorhandene Pöbelaktion mit `taunt`; automatische Flaschen-/Bar-Drinks steuern `drink`. Die Aufnahme startet `pickup → drink` als abbrechbare Sequenz. `hit_reaction` bleibt zusätzlich im gemeinsamen Set und im Studio verfügbar. Chicken Dance läuft bei Levelabschluss als `celebrate`. Nicht jeder NPC wurde auf diese GLB-Runtime migriert.

Ein anderes Prop braucht einen eigenen Preset und kann dieselben Attach-/Detach- und Marker-Funktionen verwenden. Bottle, Phone und Cigarette haben Beispiel-Presets. Einzelne Finger werden noch nicht um Objekte geschlossen.

## Lokale Tools

**GLB → FBX → manuelles Mixamo → GLB:** Konvertierungsbefehle, Schutzregeln und Studio-Prüfung stehen in [tools/characters/README.md](../../tools/characters/README.md). Originaldateien und bestehende Outputs werden nie überschrieben.

Node 24, keine Blender-/Cloud-Anmeldung für die Analyse erforderlich:

```sh
node tools/characters/inspect-glb.mjs apps/game-client/public/characters/tobi.glb
node tools/characters/validate-humanoid.mjs apps/game-client/public/characters/tobi.glb
node tools/characters/list-animations.mjs apps/game-client/public/characters/tobi.glb
node tools/characters/generate-bone-map.mjs apps/game-client/public/characters/tobi.glb
```

Die Tools lesen nur. `inspect-glb` zeigt unter anderem Dreiecke, Meshes, Materialien, Bones, Wurzeln, Bounds, Skinning und Clip-Dauern. `validate-humanoid` setzt einen Fehler-Exitcode bei fehlenden Kern-Bones oder ungültigen Gewichten. `generate-bone-map` erkennt unter anderem Avaturn-/Mixamo-Namen sowie `hand.R`-/`upperarm_l`-Aliase und liefert einen **Vorschlag**, keine automatische Rig-Reparatur.

Die binäre Gewichtsprüfung unterstützt reguläre unkomprimierte Accessors einschliesslich Stride und normalisierter Integer-Gewichte. Sparse-/komprimierte Accessors müssen zuvor in eine **neue** Arbeitsdatei dekodiert werden. Das Tool soll bei solchen Eingaben scheitern, statt eine ungeprüfte Freigabe auszugeben.

## Debug und kurze Prüfungen

Bei laufendem lokalem Vite-Server: **http://localhost:5173/test/animation.html**

- Tobi normal/betrunken oder das lokale zweite Modell Sam auswählen.
- Actions abspielen, Walk/Run/Idle wechseln, Tempo einstellen, Jump- und Sit-Sequenzen auslösen.
- Skeleton-Linien und Handflasche anzeigen.
- Position, Rotation und Skalierung des Hand-Offsets live anpassen; die aktuellen Werte stehen unter der Szene.
- Flasche werfen und Release-Zähler beobachten.

Sam bleibt unter `models/` und wird nicht veröffentlicht. Seine Studio-Konfiguration verwendet zusätzlich einen von Tobi importierten Idle-Clip; die generischen Bewegungsprofile bleiben dieselben. Das Studio und seine Prüf-Probes sind eigenständige Dev-Seiten, nicht Teil des Produktions-Entrypoints.

Explizite lokale Prüfungen:

```sh
pnpm exec vitest run --config tools/characters/vitest.config.ts
node tools/characters/smoke.mjs
# Optional, wenn models/sam-game.glb vorhanden ist:
node tools/characters/smoke.mjs --with-sam
```

Der Smoke-Check setzt einen bereits laufenden Devserver voraus. Er prüft beide Skins, Hand-Anbindung, Marker/Pause und einen kurzen Ablauf im echten Zuglevel. Screenshots bleiben unter dem ignorierten `.artifacts/characters/`. Keine GitHub-CI, keine automatische Ausführung bei Push.

## Nächstes menschliches GLB

1. Original unverändert ablegen; Analyse und Bone-Vorschlag ausführen.
2. Kontrollieren: menschliche Proportionen, vollständig gewichtetes Skeleton, glTF-Y-up und Gesicht +Z. Für ungeeignete/statische Modelle in Blender an einer Kopie getrennte Gliedmassen, humanoide Armature und geprüfte Weights erstellen; in A-/T-Pose exportieren. Namen allein können fehlendes Skinning nicht ersetzen.
3. Neue `CharacterConfig` mit Pfad, Zuordnung und Zielhöhe anlegen. Für kompatible A-/T-Pose-Avatare reichen diese Daten für die gemeinsame Bewegungsbibliothek; Armabstand, Mundpunkt, Schritte und Prop-Offsets im Studio kontrollieren.
4. Native Clips über `animations` zuordnen: etwa `walk: 'mixamo.com|Walking'`.
5. Fremde Clips über `clipSources` angeben: `model`, Quell-`bones` und Zuordnung `animations`. Der Import erzeugt getrennte retargetete AnimationGroups, ordnet sie dem Ziel zu und entsorgt die Quellen. Originaldateien werden nicht geschrieben.
6. Sitzhöhe, Lauf-/Sprungposen, Handgriff und Release im Studio und einem echten Level prüfen. Bei ungewöhnlicher Bindepose/Bone-Roll oder fest modellierter Pin-up-Pose ist zusätzliche Normalisierung nötig; Bone Mapping allein garantiert keine gute Animation.
7. Nur geprüfte Spielassets unter `public/characters/` aufnehmen. Ein gemeinsamer Source-Clip kann mehrere Figuren versorgen; die Runtime erzeugt je Ziel die passenden Pose-Daten.

Die Engine-Anbindung verwendet [Babylons dokumentiertes Animation-Retargeting](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/animation/animationRetargeting.md). Es wurde mit den hier installierten Babylon-Typen abgeglichen.

## Grenzen

- Die neuen Bewegungen sind ein erster funktionaler Arcade-Satz. Es gibt noch keinen Motion-Capture-Walk/Run, keine Finger-Griff-IK, kein Terrain-Fuss-IK und keine allgemeine Upper-Body-Layer-Maske.
- Hohe Spielgeschwindigkeiten werden durch Schrittfrequenz angenähert. Perfekt haftende Sohlen bei Richtungswechseln oder Full-Body-Taunts in Bewegung sind nicht garantiert.
- Die vorhandenen Sitz-/Exit-Teleports bleiben bestehen. Das Aufstehen ist animiert, der Ortswechsel zum Gang wurde nicht in ein neues Sitz-Gameplay-System umgebaut.
- Die grossen Facial-Morph-Daten der betrunkenen Originaldatei bleiben erhalten; daraus wurde kein neuer Crowd-Asset-Standard abgeleitet.
- Das zweite Testmodell belegt Wiederverwendung innerhalb kompatibler humanoider Rigs. Es ist keine universelle Qualitätsfreigabe für beliebige heruntergeladene GLBs.

## Prüfstand der ursprünglichen Grundpipeline (vor den vier FBX-Clips)

Client-Typecheck und Produktionsbuild erfolgreich; fünf gezielte Controller-/Mapping-Tests und ESLint für die betroffenen Module erfolgreich. Der lokale Smoke-Check mit `--with-sam` ist nach Abwarten tatsächlicher Lade-/Trinkzustände erfolgreich: beide Tobi-Skins, Sam inklusive Retarget-Import, Hand-Abstand, Marker/Pause und echter Zugablauf mit Weltprojektil. Zusätzlich wurden Absprung/Landung und Bewegung im Tutorial über normale Eingaben geprüft. Sitz-, Trink-, Lauf- und Taunt-Screenshots wurden visuell kontrolliert. Keine umfassende Level-Suite oder GitHub-CI.

Die Original-GLBs wurden abschliessend byteweise mit Git verglichen und sind unverändert. Der neue Produktionsstand liegt in `apps/game-client/dist/`; das Upload-ZIP wurde daraus neu erzeugt. Vite meldet weiterhin grosse Engine-Chunks sowie gemeinsam statisch/dynamisch verwendete glTF-Imports; der Build ist erfolgreich. Diese Hinweise sind kein durchgeführter Performance-Benchmark.

## Vier neue Tobi-FBX-Clips

Die vier Dateien unter `models/tobi/` wurden mit dem lokalen Blender-Script in **neue** GLB-Arbeitsdateien unter `models/work/tobi-clips/` konvertiert. Jede enthält ein vollständiges, kompatibles 52-Bone-Rig und zwei Clips: den bisherigen 8-s-Idle und `Armature|mixamo.com|Layer0`. Deshalb erfolgt die Auswahl explizit nach Clipname, nicht nach der ersten Animation im Container. Die Gewichtsprüfung findet jeweils 15'637 gewichtete Vertices und keine ungültigen Gewichte oder Joint-Indizes.

| Lokales FBX              | Interne Action | Volle Quelldauer | Im Spiel                                                          |
| ------------------------ | -------------- | ---------------: | ----------------------------------------------------------------- |
| `Chicken Dance.fbx`      | `celebrate`    |           4,77 s | Siegestanz, wiederholt                                            |
| `fight-dance.fbx`        | `taunt`        |           3,30 s | R, einmalige Pöbelgeste                                           |
| `Taking Item bottle.fbx` | `pickup`       |           4,70 s | Abschnitt 20–40 %, beschleunigt auf 0,35 s; danach 0,50 s Trinken |
| `Throw-bottle.fbx`       | `throw_bottle` |           2,20 s | G; Release bei 40 % / 0,88 s                                      |

Die Aufnahme-Datei hat einen längeren neutralen Vorlauf und anschliessendes Halten des Gegenstands. Der Ausschnitt erhält das Greifen/Hochnehmen und passt mit dem bestehenden parametrischen Drink zur 0,85-s-Verbrauchszeit von `BottleHands`. Inventar, Energie und Sammelwertung bleiben beim bisherigen System. Weitere Aufnahmen während dieser Sequenz starten sie nicht ständig neu. Eine explizite andere Aktion oder ein Sprung/Sitzwechsel kann die wartende Trinkanimation abbrechen; ein laufender Wurf bleibt geschützt.

Der Release wurde anhand der tatsächlichen Handpositionen und Seitenansichten kalibriert: bei 40 % ist der rechte Arm nach vorne gestreckt, beim alten Marker 58 % bereits wieder unten. Der Marker läuft auf Simulationszeit und wird nicht aus der Framerate abgeleitet. Babylon kann beim Import einen führenden Sample ergänzen; das Sampling normiert den tatsächlich geladenen Clip auf die konfigurierte Dauer.

`extract-animation.mjs` erzeugt vier kleine GLBs unter `public/characters/animations/`: zusammen rund **478 KiB**, statt viermal Tobis Körpertexturen auszuliefern. Sie enthalten den vollständigen ausgewählten Clip, das Bind-Skeleton und ein winziges skinned Proxy-Dreieck, damit der GLB-Importer die Armature erhält. Die Proxy-Geometrie wird nie zur Spielszene hinzugefügt. Die konvertierten vollständigen Arbeitsmodelle und alle Originale bleiben lokal unverändert.

Die Figur ist während des Clip-Imports unsichtbar, bis Skalierung, Pose und Shader bereit sind; der vorhandene Fallback bleibt bis dahin sichtbar. Importierte Pöbel-/Wurfposen verwenden im Sitzen weiterhin die Sitzhaltung für Becken und Beine. Eine allgemeine Maske für Oberkörper-Aktionen beim Laufen ist weiterhin nicht implementiert.

### Lokale Abnahme der vier Clips

Acht kleine Controller-/Mapping-Tests, Client-Typecheck und gezieltes ESLint erfolgreich. Der Browser-Check lädt beide Tobi-Skins und prüft explizit, dass die vier Actions importierte Clips verwenden, statt still auf parametrische Posen zurückzufallen. Hand-Sockets, endliche Gelenkrotationen, Marker/Pause sowie Sitzen, Sammeln/Trinken, Pöbeln und Werfen im echten Zuglevel sind lokal geprüft. Stichproben von Pickup, Dance, Taunt und Wurf wurden in der Studio-Ansicht kontrolliert. Die Rohclips lassen sich vollständig im Model Studio ansehen, z. B. `http://localhost:5173/test/models.html?file=work/tobi-clips/pickup-bottle.glb`.

Kein neuer Produktionsbuild/Upload-ZIP für diese Clip-Prüfung, keine GitHub-CI. Die Build-Aussage im vorherigen Abschnitt gilt für den älteren Grundpipeline-Stand. Feinabnahme aller Übergänge auf echter Desktop-GPU bleibt im Test-Backlog.

### Celebrate im Spiel

**C** startet im Stand einen Chicken-Dance-Durchlauf. Bewegung, Springen oder eine neue Aktion beenden den manuellen Tanz; ein laufender Flaschenwurf wird nicht unterbrochen. Beim Levelabschluss bleibt der Tanz eine Schleife. Die Taste läuft über `InputActions.celebratePressed`, steht in der Steuerungshilfe und wird als letzte Tutorial-Lektion erklärt. Die drei anderen FBX-Aktionen bleiben über automatisches Aufnehmen, **G** und **R** angebunden.

## Gemeinsame Bewegungen für Joe, Josh und Woman

Die FBX-Dateien aus `models/skellet-rigged/normal-ppl/` wurden mit der lokalen Blender-Pipeline in
neue Arbeits-GLBs konvertiert; die Originale blieben unverändert. Je ein Körper wurde auf ungefähr
30'000 Dreiecke reduziert. Aus den Bewegungsdateien erzeugt `extract-animation.mjs` kleine,
geometriefreie Runtime-Clips für `walk`, zwei Walk-Varianten, Rückwärtsgehen, `run_away`, Sitzen und
zwei Tanzstufen. `characters/civilians.ts` weist allen drei Körpern dieselbe Clip-Bibliothek zu und
legt nur die bevorzugte Variante pro Figur fest.

Der generische Ablauf lautet weiterhin: Körper-GLB analysieren, Bone-Map konfigurieren, getrennte
Clipquellen eintragen und über dieselbe Humanoid-Runtime retargeten. Zug-, Bahnhofs- und
Flugpassagiere verwenden ausschliesslich diese bekleideten Körper. Glanzmann nutzt dieselbe Runtime,
aber eine eigene V2-Config und die Casting-Rolle `special`, die höchstens einmal pro Level vergeben
wird. Seine Level-Interaktion bleibt vom Modell getrennt.

Die Clipquellen werden pro Körper parallel geladen. Neben den 17 Gameplay-Knochen ordnet der
Retargeter kompatible Schulter-, Zehen- und Fingerknochen anhand ihrer normalisierten Namen zu;
unterschiedliche Mixamo-Namespaces wie `mixamorig:`, `mixamorig2:` und `mixamorig7:` sind damit
kein eigenes Modell-Sonderverhalten. Bis eine Figur bereit ist, bleibt der leichte prozedurale
Platzhalter sichtbar.

Im Animation Studio stehen die vier neuen Figuren direkt zur Auswahl. Der gezielte lokale Check ist:

```sh
node tools/characters/smoke.mjs --with-civilians
```
