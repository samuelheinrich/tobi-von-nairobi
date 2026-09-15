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

## Besetzung der Rollen

`characters/casting.ts` hält, welches Modell welche Rolle spielt. `characters/cast.ts` hält die
Konfigurationen dazu.

| Rolle                                                 | Modell                      | Stand           |
| ----------------------------------------------------- | --------------------------- | --------------- |
| Polizei, Security, Kondukteur, Zellenwärter           | `cop`                       | passend         |
| Bardame                                               | `mia`, `valery`             | passend         |
| Tänzerin                                              | die drei Mixamo-Tänzerinnen | passend         |
| Ladyboy-Tänzerin                                      | `ladyboy`                   | passend         |
| Strandgäste                                           | `fitness`, Quaternius       | passend         |
| Flugbegleiter                                         | `valery`                    | **Platzhalter** |
| Tourist, Expat, Verkäufer, Taxi, WG, Passagiere, Yoga | Quaternius, `fitness`       | **Platzhalter** |
| Tourist (einmalig)                                    | `chris`                     | Porträt         |
| Expat (einmalig)                                      | `sam`                       | Porträt         |

**Einmalige Figuren.** `sam` und `chris` sind Abbilder konkreter Personen. Die `Casting`-Klasse gibt
jede von ihnen **höchstens einmal pro Level** aus und zieht sie danach zurück; die übrigen Modelle
dürfen sich wiederholen. `Casting.reset()` beim Levelwechsel.

### Was aus dem Download nicht ging

- **`captain.glb` hat kein Skelett.** Es war als Flugbegleiter vorgesehen, ist aber ein Standbild.
  Vorläufig spielt `valery` die Rolle.
- **`party/asian_neo_cyberpunk_…`** ebenfalls ohne Skelett, dazu 3'285'344 Dreiecke bei 140 MiB.
- **Die fünf Modelle unter `beach/`** sind technisch in Ordnung (98–104k Dreiecke, 102–140 Gelenke),
  tragen aber die Züge realer, identifizierbarer Personen — vier Darstellerinnen und eine
  Politkommentatorin. CC-BY deckt das Modell des Hochladenden, nicht das Persönlichkeitsrecht der
  abgebildeten Person. Aus demselben Grund flog schon die Jokowi-Figur raus. Sie sind deshalb nicht
  eingebaut.

### Bone-Namen nach dem FBX-Umweg

Modelle, die über Mixamo liefen, kommen mit angehängten Zahlen zurück: `mixamorig:Hips_32`,
`CC_Base_Hip_02`, `Hips_51`. `normaliseBoneName` in `humanoid/schema.ts` schneidet das Suffix weg,
der `SkeletonAdapter` fällt darauf zurück, wenn der exakte Name fehlt, und das Retargeting bekommt
die **aufgelösten** Namen statt der aus der Konfiguration. Ohne diesen letzten Punkt schlägt es mit
«Retarget produced no tracks» fehl, obwohl die Figur selbst lädt.

Neue Aliasse für Character-Creator-Rigs (`CC_Base_*`) stehen in `boneAliases`.

## 18+-Modelle für die kleinen Bars in Nana Plaza

Geprüft wurden alle acht. Drei sind als Figuren im Spiel, zwei taugen als Kulisse, drei nicht.

| Modell                                   | Dreiecke | Gelenke | Pose        | Verwendung                               |
| ---------------------------------------- | -------: | ------: | ----------- | ---------------------------------------- |
| `nude_woman_hip_hop_dancing`             |   24'998 |      66 | tanzend     | **`dancer-hiphop`**, eigener Clip        |
| `naked-dancer` → `dancer-club`           |   25'898 |      65 | tanzend     | bereits im Spiel                         |
| `naked-dancer-with-slip` → `dancer-slip` |   25'553 |      33 | tanzend     | bereits im Spiel                         |
| `girl_sexy`                              |   25'000 |       — | **sitzend** | Kulisse: Frau am Bartisch                |
| `sexy_nurse_002`                         |   24'999 |       — | stehend     | Kulisse, oder riggen                     |
| `sexy_girl_dancing`                      |   25'553 |       — | vorgebeugt  | Quelle von `dancer-slip`, redundant      |
| `female_nude_3d_model_in_t_pose`         |   24'934 |       — | T-Pose      | Quelle von `dancer-club`, redundant      |
| `bdsm_naked_women_milf_t-pose`           |   24'999 |       — | T-Pose      | so unbrauchbar, aber bester Rig-Kandidat |

**Die Tänzerin mit eigenem Clip** ist der klare Gewinn: `nude_woman_hip_hop_dancing` bringt einen
4,5-Sekunden-Hip-Hop mit und braucht keinen geliehenen. Sie besetzt jetzt `dancer` und `bargirl`.

**Zwei taugen als Kulisse.** `girl_sexy` sitzt — genau die Haltung, die an einem Bartisch fehlt —
und `sexy_nurse_002` steht entspannt. Beide haben **kein Skelett**, können also keine
`HumanoidCharacter` sein. Als unbewegte Requisite in einer kleinen Bar fällt das kaum auf; dafür
braucht es einen eigenen Kulissen-Lader, den es noch nicht gibt.

**Wer als Nächstes durch Mixamo sollte:** `bdsm_naked_women_milf_t-pose`. Die T-Pose macht sie als
Kulisse unbrauchbar und als Auto-Rigging-Vorlage ideal — genau das, woran Nina gescheitert ist.
`sexy_nurse_002` steht ebenfalls frei genug für Mixamo. `girl_sexy` dagegen sitzt mit anliegenden
Armen und wird dort scheitern; sie bleibt besser eine sitzende Requisite.

## Street Parade: die Gabber

Vier Figuren aus den 90er-Niederlanden, alle CC-BY und alle auf Mixamo-Rigs. Sie sind die
**detaillierten Darsteller nahe der Kamera**; die Route selbst bleibt auf Thin Instances.

| Modell           | Dreiecke | Gelenke | Clip                     |
| ---------------- | -------: | ------: | ------------------------ |
| `gabber-anita`   |   61'036 |     106 | eigener, 10,97 s         |
| `gabber-sjonnie` |   61'925 |     106 | eigener, 8,30 s          |
| `gabber-female`  |   60'403 |     198 | eigener, 8,30 s — dezent |
| `gabber-dutch`   |   50'956 |     132 | geliehen (`dance-club`)  |

`asian_neo_cyberpunk` bleibt aussen vor: kein Skelett, 3'285'344 Dreiecke, 140 MiB.

`gabber-female` bewegt die Hüfte nur schwach (0,02 rad). Ihr Clip ist mit 390 Kanälen doppelt so
dicht wie die anderen und steckt die Bewegung offenbar in Nebenknochen. Sie tanzt, nur ruhiger.

## Nana: Ely mit zwölf Clips

`elybrownomb2` kam mit **zwölf** Mixamo-Animationen zurück, 3,2 bis 27,9 Sekunden. Drei laufen
direkt als `dance`, `celebrate` und `taunt`; zwei weitere sind als `dance-slow` und `dance-club`
herausgelöst und stehen allen Figuren zur Verfügung.

### Extrahierte Clips sind jetzt übertragbar

`extract-animation.mjs` schreibt Gelenknamen in kanonischer Form: aus `mixamorig:Hips_64` wird
`mixamorig:Hips`. Vorher passte ein herausgelöster Clip nur auf genau das Modell, aus dem er kam —
der Retargeter schlägt seine Quellknoten über den Namen nach. Kollidieren zwei Namen nach dem
Kürzen, bleibt alles unverändert und das Script sagt es.

Daran scheiterte `gabber-dutch` zuerst mit «Retarget produced no tracks».
