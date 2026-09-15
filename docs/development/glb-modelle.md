# Fremde 3D-Modelle (GLB) — Prüfung und Proof of Concept

Stand: 15. September 2026. Anlass: die vier Sketchfab-Downloads im lokalen Ordner `models/`, und
die Frage, ob fertige Modelle die prozeduralen Figuren ersetzen können.

## Kurzantwort

**Technisch ja — der POC läuft.** Alle vier Dateien laden, stehen massstäblich richtig im Spiel und
sehen deutlich besser aus als die heutigen Figuren. **Als Ersatz für die NPCs taugen sie trotzdem
nicht**, aus drei Gründen, von denen der erste nicht verhandelbar ist:

1. **Kein Skelett, keine Animation.** Alle vier melden `skins: 0` und `animations: 0`. Es sind
   Standbilder. Das Spiel animiert über prozedurale Gelenke (`NpcRig.root/head/arms/legs`); eine
   starre Netzgeometrie kann nicht gehen, sitzen, tanzen, fliehen oder festgenommen werden.
2. **Grösse.** Zwei der vier sprengen jedes Budget: 749'000 bzw. 1'499'876 Dreiecke, 39 bzw. 66 MiB.
   Eine heutige Spielfigur kostet 31'616 Dreiecke und 0 Byte, weil sie zur Laufzeit entsteht.
3. **Lizenz.** Nur zwei der vier dürften überhaupt ausgeliefert werden.

## Was in den Dateien steckt

Gemessen, nicht geschätzt — jede Datei trägt ihre Herkunft in `asset.extras`:

| Datei                | Titel          | Autor               | Lizenz             | Datei    | Dreiecke  | Skelett | Animation |
| -------------------- | -------------- | ------------------- | ------------------ | -------- | --------- | ------- | --------- |
| `Bailarina_sexy.glb` | Bailarina sexy | SALOMON13           | Sketchfab Standard | 1,9 MiB  | 47'762    | nein    | nein      |
| `kushina_sexy.glb`   | Kushina Sexy   | danigamer495channel | CC-BY-4.0          | 1,8 MiB  | 48'914    | nein    | nein      |
| `sexy_nurse_002.glb` | Sexy Nurse 002 | SinfulBrain         | CC-BY-4.0          | 39,1 MiB | 749'370   | nein    | nein      |
| `girl_sexy.glb`      | Girl sexy      | tr.onurdk1          | CC-BY-4.0          | 65,8 MiB | 1'499'876 | nein    | nein      |
| _heutige Spielfigur_ | prozedural     | —                   | eigen              | 0 MiB    | 31'616    | —       | ja        |

Zur Lizenzlage im Klartext:

- **Bailarina sexy** steht unter der _Sketchfab Standard License_. Das ist keine offene Lizenz. Sie
  erlaubt die Verwendung in einem Projekt, aber nicht die Weitergabe der Datei selbst — und genau
  das wäre ein Commit in ein öffentliches Repository. **Nicht ausliefern.**
- **Kushina Sexy** ist CC-BY-4.0, stellt aber Kushina Uzumaki aus _Naruto_ dar. Der Hochladende kann
  fremde Charakterrechte nicht per CC-Lizenz weitergeben. **Nicht ausliefern.**
- **Sexy Nurse 002** und **Girl sexy** sind CC-BY-4.0 und nutzbar, **mit Namensnennung** des Autors
  im Spiel oder in `assets/licenses/`.

Zwei technische Eigenheiten: `girl_sexy.glb` nutzt `KHR_materials_unlit`, ignoriert also die
Szenenbeleuchtung und wirkt zwischen beleuchteten Objekten flach. `sexy_nurse_002.glb` nutzt
`KHR_materials_specular`. Beide Erweiterungen sind im POC registriert.

## Wie man es sich ansieht

Vite starten (`pnpm --filter @tobi/game-client dev`), dann:

**1. Modell-Studio — Vergleich nebeneinander:** <http://localhost:5173/test/models.html>

Alle vier neben der heutigen Spielfigur, im Beleuchtungssetup der Level. Zeigt Dateigrösse,
Dreiecke, Ladezeit und Lizenz pro Modell; Kamera mit der Maus, einzelne Figur über die Auswahl.

**2. Im laufenden Spiel:** <http://localhost:5173/?glb=bailarina> → Level «Bangkok Nana Plaza»

Die ersten sechs NPCs der Nana-Bevölkerung bekommen das gewählte Modell statt ihres prozeduralen
Körpers. Sie laufen weiter ihre Routen, reden, reagieren auf Flaschen — sie bewegen nur keinen
Muskel dabei. Genau das macht Punkt 1 der Kurzantwort sichtbar.

Wählbar: `?glb=bailarina` (Vorgabe), `?glb=kushina`, `?glb=nurse`, `?glb=girl`. Ohne den Parameter
passiert nichts, und es wird auch nichts geladen.

## Wie es eingebaut ist

| Ort                                    | Zweck                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `apps/game-client/vite.config.ts`      | Dev-Middleware, die `models/` unter `/models/…` ausliefert. Nur `apply: 'serve'` |
| `src/runtime/character/glb-preview.ts` | Lädt ein Modell, skaliert es auf 1,78 m und hängt es an bis zu sechs NPC-Rigs    |
| `test/models.html` · `test/models.ts`  | Vergleichsgalerie ausserhalb des Produktions-Einstiegspunkts                     |
| `nana-plaza/npc-population.ts`         | Ein Aufruf im Konstruktor, der ohne `?glb=` sofort zurückkehrt                   |

Zwei Entscheidungen, die für spätere Arbeit wichtig sind:

- **Die GLB-Dateien liegen nicht im Repository.** `models/` ist in `.gitignore`. 108 MiB fremd
  lizenzierter Binärdaten gehören nicht in ein öffentliches Repo, und die Sketchfab-Standard-Datei
  dürfte ohnehin nicht mit.
- **Der glTF-Loader wird dynamisch importiert.** Ohne `?glb=` lädt der Browser ihn nie. Registriert
  sind nur die zwei Erweiterungen, die diese Dateien deklarieren; `registerBuiltInGLTFExtensions()`
  zieht sonst Gaussian Splatting, KHR_interactivity und OpenPBR mit — rund 0,2 MiB extra.

Gemessen: das gebaute Paket wächst von 1,64 auf 1,95 MiB gzip. Der Zuwachs steckt vollständig in
Chunks, die `index.html` nicht vorlädt; ein normaler Spieler holt sie nie.

## Was fehlen würde, um sie wirklich einzusetzen

In der Reihenfolge des Aufwands:

1. **Rigging.** Ein Skelett und Animationen. Mixamo macht das für humanoide Netze kostenlos und
   liefert Gehen/Laufen/Idle/Tanzen gleich mit. Danach muss die Animationsschicht entscheiden: das
   bestehende prozedurale System auf Knochen abbilden, oder für GLB-Figuren einen zweiten Weg
   öffnen. Letzteres ist die grössere Änderung — `dance-system.ts` und `modular/animation.ts` gehen
   heute überall von TransformNode-Gelenken aus.
2. **Reduktion.** `gltf-transform` (Draco oder meshopt, plus `simplify`) bringt 750k Dreiecke
   realistisch auf 15–25k und die Texturen auf WebP. Ohne diesen Schritt ist schon eine einzige
   Figur teurer als die gesamte heutige Nana-Bevölkerung.
3. **Namensnennung.** Für CC-BY gehört der Autor sichtbar ins Spiel; `assets/licenses/README.md`
   führt das Muster bereits.

## Empfehlung

Diese vier Dateien lösen das eigentliche Problem nicht. Sie sind vier weibliche Pin-up-Figuren —
das Spiel braucht Polizisten, einen Kondukteur, WG-Bewohner, Menschenmengen und Tobi selbst. Und
ohne Skelett ist keine davon eine Spielfigur, sondern eine Statue.

Wenn der Weg über fertige Assets gehen soll, dann über Quellen, die **gerigged und animiert**
ausliefern und eine saubere Lizenz haben: Mixamo (kostenlos, humanoid, mit Animationsbibliothek),
oder CC0-Charakterpakete wie Quaternius und Kay Lousberg, die stilisiert und spielfertig sind. Das
passt auch besser zum Look des Spiels als fotorealistische Einzelfiguren, die neben der
Cartoon-Kulisse fremd wirken.

Der POC bleibt nützlich: Loader, Dev-Route, Skalierung und die Anbindung ans Rig stehen, und sind
für ein gerriggtes Modell dieselben. Nur `applyGlbPreview` müsste dann Animationen starten statt
Standbilder zu parken.

## Umgebung

Der pnpm-Store unter `~/Library/pnpm/store/v10` gehört `root`. `pnpm add` scheitert deshalb mit
`ERR_PNPM_EACCES`. `@babylonjs/loaders@9.26.0` steht darum in `apps/game-client/package.json` und im
Lockfile, wurde aber von Hand nach `apps/game-client/node_modules/` entpackt. Wer die
Abhängigkeiten neu installieren will, muss den Store vorher übernehmen:
`sudo chown -R "$(whoami)" ~/Library/pnpm/store`.
