# Modelle reduzieren — Anleitung

Heruntergeladene Charaktermodelle sind für einen Browser unbrauchbar gross: der Bestand lag bei
6,9 Millionen Dreiecken und 415 MiB. `tools/models/reduce.mjs` bringt sie auf ein Budget, das das
Spiel tragen kann. Die Pipeline ist die, die in
[nina-dancer-optimierung.md](nina-dancer-optimierung.md) einmal vollständig durchgemessen wurde.

**Originale werden nie überschrieben.** Jedes Ergebnis entsteht neben seiner Quelle als
`<name>-game.glb`.

## Der Normalfall

```bash
node tools/models/reduce.mjs
```

Das nimmt alle `.glb` unter `models/` samt Unterordnern, überspringt, was schon aktuell ist, und
schreibt am Ende den Katalog für den Client neu.

Weitere Aufrufe:

| Befehl                                         | Wirkung                                                 |
| ---------------------------------------------- | ------------------------------------------------------- |
| `node tools/models/reduce.mjs --analyse`       | nur berichten: Bestand, Kosten, was über Budget liegt   |
| `node tools/models/reduce.mjs nina-dancer.glb` | ein Modell (Dateiname genügt, Unterordner wird gesucht) |
| `node tools/models/reduce.mjs --target 18000`  | anderes Dreiecksbudget für diesen Lauf                  |
| `node tools/models/reduce.mjs --force`         | auch neu bauen, wenn das Ergebnis aktuell ist           |

Voraussetzung ist nur Node. Die **gltf-transform-CLI** wird beim ersten Lauf über `npx` geholt und
danach aus dem Cache bedient; wer sie global installiert hat, setzt `GLTF_TRANSFORM=gltf-transform`.

## Ein neues Modell aufnehmen

1. GLB nach `models/` legen (oder in einen Unterordner wie `models/tpose/`).
2. `node tools/models/reduce.mjs` laufen lassen.
3. In `apps/game-client/src/runtime/character/glb-catalogue.ts` eine Rolle eintragen —
   `ROLE_BY_SOURCE`, Schlüssel ist der **Quelldateiname** mitsamt Unterordner.
4. Ansehen: <http://localhost:5173/test/models.html>, oder im Spiel mit
   `?glb=<dateiname-ohne-endung>`.

Ohne Schritt 3 lädt das Modell trotzdem, es steht nur unter «ohne Zuordnung».

`glb-catalogue.json` wird bei jedem Lauf **neu geschrieben — nicht von Hand bearbeiten.** Dort
stehen ausschliesslich gemessene Werte. Von Hand gepflegt sind nur die Rollenzuordnung und die
Vorbehalte in `glb-catalogue.ts`.

## Rollen und Grössenkorrektur

Rollen stehen in `ROLE_BY_SOURCE` in `glb-catalogue.ts`. Eine davon ist besonders:

**`adult` — «18+ · Geheimclub».** Modelle für den versteckten Club in Nana Plaza. Bewusst eine
eigene Rolle, damit sie nicht versehentlich in einer normalen Levelbesetzung landen: wer NPCs
verteilt, greift auf `entriesForRole('dancer')` und ähnliche zu, nie auf «alles». Aktuell sechs
Modelle.

**Grössenkorrektur.** Beide Ansichten skalieren ein Modell so, dass seine Bounding Box 1,78 m hoch
wird. Das stimmt für eine aufrecht stehende Figur und für keine andere Haltung — eine sitzende
Figur wird dann sitzend so gross wie alle anderen stehend. Für solche Fälle gibt es
`SCALE_CORRECTION` in `glb-catalogue.ts`:

```ts
const SCALE_CORRECTION: Record<string, number> = {
  'yoga-girl-naked-sitting.glb': 0.5,
};
```

Der Faktor wirkt **nach** der Normierung. Er gehört bewusst in den Katalog und nicht in die GLB:
`reduce.mjs` baut die `-game.glb` aus dem Original neu, eine eingebackene Skalierung wäre beim
nächsten Lauf weg.

## Was die Pipeline tut

| Schritt                 | Zweck                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| ungenutzte UV-Sätze weg | Sketchfab exportiert oft vier identische; nur die vom Material gesampelten bleiben          |
| `dedup`                 | doppelte Accessors und Materialien zusammenlegen                                            |
| `join`                  | die 16-Bit-Index-Fragmente zu einem Primitive verbinden — **nur bei Modellen ohne Skelett** |
| `weld`                  | Split-Vertices verschmelzen, damit der Simplifier überhaupt greifen kann                    |
| `simplify`              | meshoptimizer, mit Fehlersuche (siehe unten)                                                |
| `resize`                | Texturen auf 1024²                                                                          |
| `webp`                  | Texturen als WebP, Qualität 85                                                              |
| `prune`                 | verwaiste Accessors und Bufferviews entfernen                                               |

**Die Fehlersuche beim Simplify** ist die Lehre aus dem Nina-Test: `--ratio` allein erreicht das
Ziel nicht. Split-Vertices und offene Ränder stoppen den Simplifier vorzeitig, solange die
Fehlertoleranz zu eng ist — und ab einem gewissen Punkt bringt weiteres Lockern nichts mehr. Das
Skript probiert darum 0,001 → 0,005 → 0,01 → 0,03 → 0,08 und nimmt das erste Ergebnis im Ziel.

## Grenzen und Fallstricke

**WebP ist Pflicht, nicht Kür.** Die reduzierten Dateien tragen `EXT_texture_webp` unter
`extensionsRequired`. Ein Loader, der die Erweiterung nicht registriert, verweigert sie
**vollständig** — nicht etwa mit fehlenden Texturen, sondern gar nicht.
`runtime/character/glb-preview.ts` und `test/models.ts` registrieren sie. Wer die Dateien anderswo
lädt, muss das auch tun.

**Skelette bleiben, aber es entsteht keines.** Das Skript reduziert Geometrie und Texturen. Ein
Modell ohne Skelett bleibt ein Standbild. Rigging ist ein eigenes Thema und laut Nina-Test bei
posierten Sculpts nicht automatisierbar — siehe dort Abschnitt 9.

**Von Hand nachbearbeitete Ergebnisse sind geschützt.** Hat die `-game.glb` mehr Gelenke oder Clips
als ihre Quelle, überspringt das Skript sie und sagt das — auch mit `--force`. So überlebt
`nina-dancer-game.glb` mit seinem Rig jeden künftigen Batch. Wer wirklich neu bauen will, löscht
die Datei vorher.

**NoDerivatives wird abgelehnt.** Reduzieren und neu exportieren _ist_ eine Bearbeitung. Modelle
unter CC-BY-ND lässt das Skript liegen und nennt sie am Ende. Betrifft aktuell
`tpose/okta_costume_rig_t-_pose.glb`.

**Kaputte Dateien blockieren nichts.** Was sich nicht als GLB lesen lässt, wird gemeldet und
übersprungen. `tobi-2-traegershirt-drunken.glb` ist zum Beispiel ein JPEG mit falscher Endung.

**Morph-Targets bleiben teuer.** `tobi-2-traegershirt-drunken-dynamic-face.glb` kommt trotz nur
20 678 Dreiecken auf 10,5 MiB, weil die Gesichts-Blendshapes den Löwenanteil ausmachen. Die
Pipeline rührt sie nicht an — sie wegzulassen hiesse, das Gesicht zu verlieren.

**Namensnennung ist Pflicht.** Alle Sketchfab-Modelle sind CC-BY-4.0. Autor und Lizenz stehen pro
Datei in `glb-catalogue.json`; für jede eingesetzte Figur gehört der Autor sichtbar ins Spiel.

## Normal Maps (optional)

Reduktion kostet Oberflächendetail. Bringt ein Modell keine Normal Map mit — was bei
Sketchfab-Sculpts die Regel ist — lässt sich ein Teil davon zurückbacken. Dafür braucht es Blender:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
  -P tools/models/bake-normals.py -- \
  models/nina-dancer.glb models/nina-dancer-game.glb /tmp/nina-normal.png 2048
```

Das Skript liefert die PNG. Sie ins Material zu hängen ist Handarbeit in Blender — automatisch
wieder zu exportieren würde die WebP-Texturen und die Attributbereinigung der Pipeline zunichte
machen. Für die meisten Figuren lohnt der Schritt nicht; für Nahaufnahmen schon.

## Ergebnis des ersten vollen Laufs

|                               | vorher                         | nachher                                    |
| ----------------------------- | ------------------------------ | ------------------------------------------ |
| 20 Modelle (erste Runde)      | 6'919'486 Dreiecke · 414,8 MiB | 523'970 · 43,3 MiB (**−92,4 % / −89,6 %**) |
| 14 Modelle (T-Pose-Nachschub) | 2'622'855 Dreiecke · 135,2 MiB | 370'703 · 21,6 MiB (**−85,9 % / −84,0 %**) |

Typische Einzelwerte: `sexy_nurse_002` 749'370 → 24'999 (−96,7 %), `yoga-girl-naked-sitting`
831'198 → 25'000 (−97,0 %), `female-sporty1` 1'970'634 → 25'000. Modelle, die schon im Budget
liegen, behalten ihre Geometrie und gewinnen nur über die Texturen — `sam.glb` etwa −52,6 % bei
unveränderten 21'362 Dreiecken.
