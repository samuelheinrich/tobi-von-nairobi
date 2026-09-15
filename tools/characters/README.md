# GLB → Mixamo → GLB

Die Blender-Scripts sind Bestandteil der lokalen Character-Pipeline. **Mixamo bleibt manuell.** Es gibt keinen automatischen Upload und keine automatische Aufnahme ins Spiel.

Kanonische Implementierungen: `glb_to_fbx.py`, `fbx_to_glb.py` und gemeinsame Funktionen in `blender_common.py`. Die ursprünglichen Dateien `scripts/glb-to-fbx.py` und `scripts/fbx-to-glb.py` bleiben als Weiterleitungen erhalten. Getestet mit lokalem Blender **5.2.1 LTS**.

## Arbeitsordner

Alle Befehle vom Repository-Root ausführen:

```text
models/
  source/nina-dancer.glb                 # unverändertes Ausgangsmodell
  work/nina-dancer.fbx                   # Upload-Kopie
  mixamo/nina-dancer-rigged.fbx           # manueller Download With Skin
  work/nina-dancer-rigged.glb            # lokaler Prüfkandidat
  work/nina-dancer-rigged.glb.conversion.json
```

Der komplette `models/`-Ordner bleibt durch `.gitignore` lokal. Bereits vorhandene Downloads müssen nicht verschoben werden: die Scripts akzeptieren beliebige lokale Pfade. Für eine neue Version einen neuen Dateinamen wählen, etwa `nina-dancer-rigged-v2.glb`.

## 1. Offline nach FBX konvertieren

```sh
/Applications/Blender.app/Contents/MacOS/Blender \
  --background \
  --python-exit-code 1 \
  --python tools/characters/glb_to_fbx.py \
  -- \
  models/source/nina-dancer.glb \
  models/work/nina-dancer.fbx
```

`--python-exit-code 1` sorgt dafür, dass Scriptfehler auch als fehlgeschlagener Prozess erkennbar sind. Pfade mit Leerzeichen in Anführungszeichen setzen. Auf Linux/Windows denselben Aufruf mit dem dortigen Blender-Pfad verwenden.

Der Export nimmt Meshes, Armatures und ihre Transform-Hierarchie mit, erzeugt keine Leaf-Bones und behält vorhandene Actions. Mesh-Rotation/Scale werden nicht isoliert gegenüber einem Rig angewendet. Gepackte Bildtexturen werden temporär als PNG vorbereitet und in das FBX eingebettet. Die ursprünglichen Dateien bleiben unverändert.

Die Konvertierung ersetzt **kein Auto-Rigging** und richtet keine verschmolzenen Gliedmassen auf. Ein neutral stehender Mensch mit getrennten Armen/Beinen ist die geeignete Ausgangsbasis. Hat das Modell schon ein gutes Rig wie Tobi, muss es nicht erneut auto-geriggt werden.

## 2. Manueller Mixamo-Schritt

1. Mixamo im Browser öffnen und die neue FBX-Datei hochladen.
2. Falls nötig Auto-Rigging ausführen und die Markierungen am Körper prüfen.
3. Ergebnis in der Vorschau kontrollieren.
4. Geriggtes Modell als **FBX / With Skin** herunterladen und unter `models/mixamo/` ablegen.
5. Für weitere Clips passende Bewegungen auswählen, wo verfügbar In Place verwenden und Downloads eindeutig benennen.

Keine Automatisierung dieser Schritte. Unterstützte Uploadformate und der Rigging-Ablauf sind in [Adobes Anleitung](https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html) beschrieben.

Für diesen Modell-Roundtrip **With Skin** verwenden. Die Scripts erwarten Mesh-Geometrie; ein animation-only FBX ohne Mesh wird zurückgewiesen. Zusätzliche Clips können zunächst ebenfalls With Skin konvertiert und anschliessend über `clipSources` der Humanoid-Runtime retargetet werden.

## 3. Offline zurück nach GLB

```sh
/Applications/Blender.app/Contents/MacOS/Blender \
  --background \
  --python-exit-code 1 \
  --python tools/characters/fbx_to_glb.py \
  -- \
  models/mixamo/nina-dancer-rigged.fbx \
  models/work/nina-dancer-rigged.glb
```

Das FBX wird vor dem Import in ein temporäres Verzeichnis kopiert. Auch die Extraktion eingebetteter Bilder schreibt so nicht neben den Originaldownload. Ein vorhandener Standard-`.fbm`-Begleitordner wird mitkopiert. Fehlende externe Texturen ausserhalb dieses Ordners müssen separat in einer Arbeitskopie aufgelöst werden; das Script sucht nicht ganze Verzeichnisse ab.

Der Export behält Skinning, Normals, UVs, Materialien, vorhandene Morphs und Animationen soweit im FBX verfügbar. Actions behalten ihre gesamte Dauer statt auf den Blender-Szenenbereich gekürzt zu werden. Bone-Orientierungen werden beim Import nicht automatisch umgebaut. Die Ausgabe ist GLB mit Y-up.

## 4. Analysieren

Mit der Projekt-Node-24-Toolchain:

```sh
node tools/characters/inspect-glb.mjs models/work/nina-dancer-rigged.glb
node tools/characters/validate-humanoid.mjs models/work/nina-dancer-rigged.glb
node tools/characters/list-animations.mjs models/work/nina-dancer-rigged.glb
node tools/characters/generate-bone-map.mjs models/work/nina-dancer-rigged.glb
```

Die Bone-Zuordnung ist ein Vorschlag. Namen können Präfixe erhalten: beim Test etwa `IdleV4.2(maya_head)` → `Armature|Armature|IdleV4.2(maya_head)`. Der interne Action-Name `idle` bleibt unverändert; nur der Clip-Eintrag in der CharacterConfig ändert sich.

## 5. Im Model Studio prüfen

Lokalen Devserver wie bisher starten. Dann:

[Model Studio – lokaler Kandidat](http://localhost:5173/test/models.html?file=work/nina-dancer-rigged.glb)

`file` ist relativ zu `models/`. Es werden keine Dateien ins Internet hochgeladen. Der Kandidat wird ohne automatische Höhenskalierung angezeigt; die gemessene Höhe steht im Status. Der Clip-Selektor spielt nur eine Animation ab oder zeigt die Bindepose. Die reguläre Katalogansicht ohne `?file=` bleibt erhalten.

Prüfen:

- Körper vollständig, korrekt ausgerichtet und plausibel gross?
- Texturen und Materialien vorhanden?
- Hände, Schultern, Hüfte und Knie bei Bewegung sauber gewichtet?
- Clipnamen und Dauern plausibel, keine parallel laufenden Clips?
- Keine überraschenden Root-Translationen?

Erst danach CharacterConfig/Bone Mapping anlegen und im [Animation-Studio](http://localhost:5173/test/animation.html) sowie im Spiel testen. Die [Humanoid-Anleitung](../../docs/development/humanoid-animation-pipeline.md) beschreibt die Runtime-Integration. Das Script registriert keine Modelle, überschreibt Tobi nicht und erstellt keinen Produktionsbuild.

## Schutz und nachvollziehbare Outputs

- Input muss existieren und die richtige Endung haben; Tippfehler werden nicht still umbenannt.
- Existierende Outputs, Symlinks und vorhandene Konvertierungsberichte werden abgelehnt.
- Keine `--force`-Option. Weder Originale noch ältere Ergebnisse werden ersetzt.
- Der Export entsteht temporär auf dem Zielvolume. Erst ein erfolgreicher, nicht leerer Export wird mit einer exklusiven Dateiverknüpfung veröffentlicht. Auch bei paralleler Belegung des Zielnamens wird nichts überschrieben.
- Das Ziel-Dateisystem muss Hardlinks unterstützen; andernfalls scheitert die Veröffentlichung sicher. Dann einen lokalen APFS-/NTFS-/ext4-Arbeitsordner wählen und das Ergebnis anschliessend kopieren.
- Jede Ausgabe erhält einen neuen `.conversion.json`-Bericht mit Blender-Version, Quell-/Zielpfad, SHA-256-Prüfsummen und Scene-/Bone-/Action-Zahlen.
- Blender startet mit einer leeren Factory-Szene. Es wird keine `.blend` gespeichert.
- Dateien und Texturen bleiben lokal. Der manuelle Mixamo-Upload ist die einzige Online-Stufe.

FBX und glTF haben unterschiedliche Material- und Animationsmöglichkeiten. Ein Formatwechsel ist daher keine bitgenaue Qualitätsgarantie; PBR-Materialdetails, Sampler oder Morph-Daten können sich ändern. Hintergründe: [Blender FBX-Handbuch](https://docs.blender.org/manual/en/5.0/addons/import_export/scene_fbx.html).

## Geprüfter Stand

Ein lokaler Tobi-Test unter Blender 5.2.1 hat GLB → FBX → GLB durchlaufen. Das neue GLB enthält 20'456 Dreiecke, 52 Bones und einen 8-s-Idle-Clip. Die Skinning-Validierung besteht. Durch den Export entstanden 15'637 statt 15'621 Vertices; Topologie-/Attributaufteilung ist nicht bytegleich. Texturen und Clip wurden im Model Studio geladen und visuell geprüft, ohne Browserfehler.

Blender meldete eine Material-Sampler-Warnung: mehrere Image-Nodes verwenden einen Textur-Sampler; der erste wird übernommen. Deshalb bleibt die Materialkontrolle Teil der Abnahme. Der Test ist **kein** Mixamo-Auto-Rigging-Test und keine Freigabe von Nina.

Fünf kleine lokale Schutztests prüfen neue Pfade, existierende Outputs, Symlinks, Exportabbruch und gleichzeitige Zielbelegung:

```sh
python3 -m unittest discover -s tools/characters/tests -p 'test_conversion_paths.py'
```

Keine GitHub-CI und keine vollständige Spielsuite für diese Tool-Änderung.

## Einzelne FBX-Animation fürs Spiel aufbereiten

Die vier Tobi-Downloads liegen unter `models/tobi/`. Beispiel für den Wurf:

```sh
/Applications/Blender.app/Contents/MacOS/Blender \
  --background --python-exit-code 1 \
  --python tools/characters/fbx_to_glb.py -- \
  models/tobi/Throw-bottle.fbx models/work/tobi-clips/throw-bottle.glb

node tools/characters/list-animations.mjs models/work/tobi-clips/throw-bottle.glb

node tools/characters/extract-animation.mjs \
  models/work/tobi-clips/throw-bottle.glb \
  models/work/tobi-clips/throw-bottle-animation.glb \
  'Armature|mixamo.com|Layer0' throw_bottle
```

Die Ausgabe enthält nur den gewählten vollständigen Clip, das Skeleton und ein minimales skinned Proxy-Dreieck. Körpergeometrie, Bilder und Materialien werden entfernt; dadurch werden sie nicht für jeden Clip erneut geladen. **Nur für Animation-Import**, kein sichtbares Character-Modell. Es wird genau eine Skin erwartet; sparse/strided Animationsdaten werden mit einer Fehlermeldung abgelehnt. Bereits existierende Outputs werden nicht ersetzt. Für erneute Versuche einen neuen Dateinamen verwenden.

Den vollständigen Arbeits-GLB zuerst über `/test/models.html?file=work/tobi-clips/throw-bottle.glb` prüfen. Nach Kontrolle die schlanke Ausgabe unter `apps/game-client/public/characters/animations/` übernehmen und in `characters/tobi.ts` als `clipSources` zuordnen. Spieldauer und optionale Ausschnitte über `motionDurations`/`clipRanges` konfigurieren. Ein Wurfclip braucht einen anhand seiner Handbewegung geprüften `throwReleaseTime`.

Die vier bereits eingebundenen Animationen und ihre Spielzuordnung sind in der [Humanoid-Dokumentation](../../docs/development/humanoid-animation-pipeline.md#vier-neue-tobi-fbx-clips) beschrieben. Mixamo bleibt manuell; Konvertierung, Extraktion und Prüfung laufen lokal.
