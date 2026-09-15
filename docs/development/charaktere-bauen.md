# Charaktere bauen und ins Spiel bringen

Stand: 15. September 2026. Ergänzt die [Humanoid-Pipeline](humanoid-animation-pipeline.md) und die
[Modell-Reduktion](modell-reduktion.md).

Es gibt zwei Wege zu einer spielbaren Figur, und sie unterscheiden sich vor allem darin, woher das
Skelett kommt.

## Weg A — Mixamo: vorhandenes Modell riggen

Für Modelle, die als Standbild ankommen. Der manuelle Mixamo-Schritt ist in
[`tools/characters/README.md`](../../tools/characters/README.md) beschrieben; hier nur, was danach
passiert.

```sh
# 1. Mixamo-Download zurück nach GLB
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 \
  --python tools/characters/fbx_to_glb.py -- \
  "models/skellet-rigged/woman-dance1.fbx" models/work/rigged/woman-dance1.glb

# 2. Auf Spielbudget reduzieren (Skelett und Clip bleiben erhalten)
node tools/models/reduce.mjs woman-dance1.glb

# 3. Den Clip geometriefrei herauslösen, damit ihn alle teilen können
node tools/characters/extract-animation.mjs \
  models/work/rigged/woman-dance1-game.glb \
  apps/game-client/public/characters/animations/dance-basic.glb \
  "Armature|mixamo.com|Layer0" dance
```

Ergebnis des ersten Durchgangs: sechs Dateien, 1'964'227 → 151'959 Dreiecke (−92,3 %),
85,8 → 10,3 MiB. Drei davon sind als `dancer-beach`, `dancer-club` und `dancer-slip` im Spiel.

**Warum die Clips getrennt liegen.** Alle drei kamen auf dem Standard-`mixamorig:`-Skelett zurück.
Damit teilen sie sich eine Bone-Zuordnung _und_ dieselben Tänze. Vier Clips à 230–310 KiB bedienen
drei Körper — statt zwölf grosser Dateien mit eingebackenen Animationen.

## Weg B — Quaternius: Figur zusammensetzen

Das Kit [Universal Base Characters](https://quaternius.com) (**CC0**) liefert zwei Basiskörper und
acht Kopfteile auf einem gemeinsamen 65-Gelenk-Skelett. Jede Frisur passt auf jeden Körper.

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
  -P tools/characters/build-quaternius.py -- \
  --pack "models/Universal Base Characters[Standard]" \
  --body female --skin light --hair Hair_Long --brows none \
  --out models/work/quaternius/woman-long-light.glb
```

| Schalter  | Werte                                                                                     |
| --------- | ----------------------------------------------------------------------------------------- |
| `--body`  | `female`, `male`                                                                          |
| `--skin`  | `light`, `dark`                                                                           |
| `--hair`  | `Hair_Long`, `Hair_Buns`, `Hair_Buzzed`, `Hair_BuzzedFemale`, `Hair_SimpleParted`, `none` |
| `--brows` | `Eyebrows_Female`, `Eyebrows_Regular`, `none` — der weibliche Körper bringt eigene mit    |
| `--beard` | ohne Wert, ergänzt `Hair_Beard`                                                           |

Danach wie gehabt durch `tools/models/reduce.mjs` (bringt hier ~52 % Dateigrösse über WebP; die
Geometrie liegt mit 16–18k Dreiecken schon im Budget).

Das Script repariert nebenbei die Texturverweise: die mitgelieferten `.gltf` zeigen auf Dateien mit
`_png`-Suffix, die es im Pack nicht gibt.

### Grenzen des Gratis-Pakets

- **Zwei Körper**, nicht mehr. Die bezahlte SOURCE-Fassung hat weitere.
- **Keine Kleidung.** Es sind Basiskörper in Unterwäsche. Für Strand, Pool und den Club taugen sie;
  für Tourist, Polizist, Kondukteur oder Verkäufer braucht es bekleidete Modelle.
- **Keine Animationen.** Die kommen aus der Motion-Library und aus den Mixamo-Clips.

Realistisch unterscheidbar sind damit rund zwei Dutzend Figuren: 2 Körper × 2 Hauttöne × 6
Frisuren, plus Bart.

## Bewegung: woher welche Animation kommt

| Aktion                                   | Quelle                                                         |
| ---------------------------------------- | -------------------------------------------------------------- |
| `idle`, `walk`, `run`, `jump_*`, `sit_*` | `humanoid/motion-library.ts`, gegen Humanoid-Bones geschrieben |
| `dance`, `celebrate`                     | Mixamo-Clips über `clipSources`, zur Laufzeit retargetet       |
| `throw_bottle`, `pickup`                 | Tobis eigene Mixamo-Clips                                      |

**Retargeting geht über Skelettgrenzen.** Die Quaternius-Figuren tragen ein Unreal-Skelett
(`pelvis`, `spine_01`, `upperarm_l`), die Tänzerinnen ein Mixamo-Skelett (`mixamorig:Hips`). Beide
werden über ihre `BoneMap` auf dieselbe Humanoid-Sprache abgebildet, darum tanzen die
Quaternius-Figuren die Mixamo-Clips. Gemessen im Studio: Hüftrotation 0,12–0,31 rad zwischen zwei
Messpunkten.

`dance` ist seit diesem Stand eine eigene Aktion. Figuren ohne Tanzclip bekommen eine prozedurale
Ersatzbewegung, statt stillzustehen.

## Eine neue Figur aufnehmen

1. Modell bauen (Weg A oder B), reduzieren, nach `apps/game-client/public/characters/` legen.
2. Bone-Zuordnung erzeugen: `node tools/characters/generate-bone-map.mjs <datei.glb>`.
   Fehlt ein Eintrag, gehört der Name als Alias in `humanoid/schema.ts`.
3. `CharacterConfig` schreiben — siehe `characters/dancers.ts` und `characters/townsfolk.ts`.
4. In `test/animation.html` in die Auswahl aufnehmen und prüfen:
   <http://localhost:5173/test/animation.html>. Aktion wählen, **Abspielen** drücken.

## Was noch fehlt

Bekleidete Figuren für Tourist, Expat, Polizei, Security, Kondukteur, Zellenwärter,
Bahnpassagiere, Taxifahrer, Strassenverkäufer und Flugbegleiter. Weder Mixamo noch das
Quaternius-Gratispaket lösen das: Mixamo riggt nur, was schon angezogen ist, und das Gratispaket
hat keine Kleidung. Entweder bekleidete CC0-Modelle beschaffen, oder die bezahlte
Quaternius-SOURCE-Fassung, oder weiter Avaturn-Avatare wie bei Tobi und Sam.
