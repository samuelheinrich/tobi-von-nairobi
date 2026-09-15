# Übergabe: Charaktermodelle, Besetzung und offene Defekte

Stand: 15. September 2026, Abend. Geschrieben für den nächsten Agenten. Es gilt
[AGENTS.md](../../AGENTS.md): Freizeitprojekt, keine GitHub-CI, nur gezielte lokale Prüfungen.

Verbindlicher Funktionsstand: [implementation-status.md](implementation-status.md).
Werkzeuge und Abläufe: [charaktere-bauen.md](charaktere-bauen.md),
[modell-reduktion.md](modell-reduktion.md), [npc-glb-rollout.md](npc-glb-rollout.md).

## Das Wichtigste in drei Sätzen

Echte GLB-Figuren sind in allen Levels aktiv, ohne URL-Schalter, und Nana lädt sie im laufenden
Spiel fehlerfrei. Fünf Modelle mussten wieder aus der Besetzung, weil ihre Ruhepose flach liegt und
die Laufzeit sie auf 3,4 bis 9 Meter skaliert. Zwei sichtbare Fehler sind offen: Sitzpositionen und
die T-Posen, die daher rühren, dass manche Dateien mehrere Figuren enthalten.

## 1. Was steht

**Werkzeugkette.** `tools/models/reduce.mjs` bringt jedes Modell auf Budget (bisher −92 % Dreiecke
über den ganzen Bestand). `tools/characters/` konvertiert GLB↔FBX für Mixamo, extrahiert Clips
geometriefrei, zerlegt Sammeldateien und setzt Quaternius-Figuren zusammen. Alles dokumentiert,
alles mehrfach gelaufen.

**Besetzung.** `characters/casting.ts` ordnet Modelle den Rollen zu. Sam und Chris kommen **höchstens
einmal pro Level** vor; fünf Unit-Tests sichern diese Invariante.

**Animation.** `idle`, `walk` und alles Übrige liefert die gemeinsame Motion-Library; Tänze kommen
aus Mixamo-Clips, die zur Laufzeit retargetet werden — auch über Skelettgrenzen hinweg. Die
Clip-Bibliothek unter `public/characters/animations/` umfasst inzwischen 24 Dateien.

**Körpergrössen.** Alle 17 besetzten Figuren liegen zwischen 1,70 und 1,88 m und treffen ihre
Sollhöhe auf 9 mm. Tobi stand vorher auf 2,17 m.

## 2. Offene Defekte, nach Nutzen sortiert

### 2.1 Flache Ruheposen — fünf Modelle stillgelegt

Die vier Gabber und die Pole-Tänzerin sind **nicht besetzt**. Ihre Ruhepose liegt entlang Z: Kopf
bei +3,6, Füsse bei −4,0. Aufgerichtet werden sie nur durch ihre Animation.

Die Laufzeit vermisst eine Figur **in Ruhe**, um sie auf `config.height` zu skalieren. Sie liest
dort 0,36 m und multipliziert mit fünf.

Erfolglos versucht: anders splitten, FBX-Rundlauf über `glb_to_fbx.py`/`fbx_to_glb.py`, und das
Backen der Wrapper-Rotation in Armature und Mesh (`flatten-transforms.py`). Alle drei liefern
identische Messwerte — der Defekt steckt in den Downloads.

**Vorgeschlagener Weg:** in Blender einen Frame wählen, in dem die Figur steht, `Pose → Apply Pose
as Rest Pose`, danach die Animation gegen die neue Ruhepose neu keyen. Prüfen über
`window.__studio()` im Animation-Studio: `world` muss `configured` treffen, und `joints` (Kopf zu
tieferem Fuss) muss **positiv** sein und rund 80 % der Gesamthöhe betragen.

### 2.2 Sitzen

Figuren stehen vor dem Sitz statt darauf, und an manchen Stellen sitzen sie ohne Sitzmöbel.
`RestSpot.seatHeight` ist angelegt (`packages/game-core/src/character/seating.ts`), aber noch nicht
durchgezogen. Die Spur: `character-runtime.ts` verrechnet `state.seatHeight ?? 0.42` gegen
`restHipHeight`; die Sitzflächen der Venues stehen in `nana-plaza/venue-interiors.ts`.

Der zweite Teil ist Leveldaten, nicht Code: `nanaResidents` mit `action: 'sit'` stehen an Orten
ohne Sitzmöbel.

### 2.3 T-Posen in Sammeldateien

Deine Beobachtung war richtig: mehrere Downloads enthalten **zwei bis fünfzehn Figuren**, von denen
nur eine animiert ist. Die übrigen stehen in Bindepose.

`tools/characters/split-characters.py` zerlegt solche Dateien. Vor dem Ausliefern immer prüfen:

```sh
node -e "const{readFileSync}=require('fs');const b=readFileSync(process.argv[1]);
const j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
console.log('skins',(j.skins??[]).length,'anims',(j.animations??[]).length)" datei.glb
```

`skins > 1` bei `anims = 1` heisst: T-Pose-Zwilling im Spiel.

### 2.4 Repository-Grösse

`apps/game-client/public/characters/` liegt bei **77 MiB**, `.git` bei 60 MiB. Das JS-Bundle bleibt
bei 1,97 MiB gzip — die Figuren kommen obendrauf und werden erst beim Levelstart geholt. Git behält
jede Version. Wenn das korrigiert werden soll, dann besser jetzt als bei 300 MiB: Git LFS oder ein
Static-Host.

## 3. Nicht verwendbar, und warum

| Modell                           | Grund                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `captain.glb`                    | kein Skelett — war als Flugbegleiter vorgesehen, Valery steht ein                            |
| `party/asian_neo_cyberpunk_…`    | kein Skelett, 3'285'344 Dreiecke, 140 MiB                                                    |
| `beach/*` (fünf Dateien)         | Züge realer identifizierbarer Personen; CC-BY deckt das Mesh, nicht das Persönlichkeitsrecht |
| `tpose/okta_costume_rig_t-_pose` | CC-BY-**ND** — Bearbeitung untersagt, `reduce.mjs` lehnt sie ab                              |
| `bdsm_naked_women_milf_t-pose`   | T-Pose, als Kulisse unbrauchbar — aber der beste Mixamo-Kandidat                             |

Die gelöschte Jokowi-Figur und die beiden früh entfernten (Sketchfab-Standard, Naruto) sind in
[glb-modelle.md](glb-modelle.md) begründet.

## 4. Wie geprüft wird

```sh
# Animation-Studio: Modell wählen, Aktion wählen, "Abspielen" drücken
http://localhost:5173/test/animation.html

# window.__studio() liefert: id, clips, action, gemessene Welthöhe, konfigurierte Höhe,
# und die Kopf-zu-Fuss-Distanz. Genau das hat die flachen Ruheposen aufgedeckt.
```

Volle Kette, wie sie zuletzt grün lief:

```sh
npx tsc --noEmit                              # im apps/game-client
npx eslint apps/game-client/src packages
npx vitest run packages tools/characters      # 69 Tests
node tools/check-boundaries.mjs
node tools/models/reduce.mjs --analyse
```

Keine GitHub-CI. Playwright-Vollsuite bewusst nicht.

## 5. Arbeitsweise, die sich bewährt hat

**Messen statt den Konfigurationszahlen glauben.** Tobis 2,17 m und die 9-Meter-Gabber standen
beide in einer Konfiguration, die plausibel aussah. Erst die Messung im laufenden Browser hat es
gezeigt.

**Vor dem Ausliefern immer `skins` und `anims` zählen.** Das hätte die T-Posen sofort gefunden.

**Reduktion und Rigging trennen.** Die Reduktion ist erprobt und skriptbar. Rigging posierter
Sculpts ist es nicht — siehe [nina-dancer-optimierung.md](nina-dancer-optimierung.md).

## 6. Umgebung

Node 24 / pnpm 10.34.5, Toolchain unter `/tmp/tobi-toolchain/node_modules/.bin` vor `PATH` setzen.
Blender 5.2.1 LTS unter `/Applications/Blender.app`. gltf-transform 4.5.0 über `npx`, nicht global.

Der pnpm-Store gehört `root`; `pnpm add` scheitert mit `ERR_PNPM_EACCES`. Vor einer Neuinstallation:
`sudo chown -R "$(whoami)" ~/Library/pnpm/store`.

`models/` bleibt lokal und ignoriert. Keine Secrets, keine `.env` committen.
