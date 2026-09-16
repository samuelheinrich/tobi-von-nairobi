# Tobis Spielfiguren

Zwei Avaturn-Avatare des Eigentümers, reduziert über `tools/models/reduce.mjs`:

| Datei            | Quelle in `models/`                                 | Dreiecke | Gelenke | Clip                |
| ---------------- | --------------------------------------------------- | -------: | ------: | ------------------- |
| `tobi.glb`       | `tobi-2-traegershirt-game.glb`                      |   20'456 |      52 | `IdleV4.2`          |
| `tobi-drunk.glb` | `tobi-2-traegershirt-drunken-dynamic-face-game.glb` |   20'678 |      54 | `avaturn_animation` |

Sie liegen in `public/`, damit Vite sie unverändert nach `dist/characters/` kopiert: kein Bundling,
kein Hash, in Entwicklung und Build unter demselben Pfad erreichbar. Geladen werden sie erst beim
Start eines Levels, nicht beim Aufruf der Seite.

`tobi-drunk.glb` ist mit 10,5 MiB deutlich schwerer als `tobi.glb` mit 1,9 MiB. Der Unterschied
sind 187 Morph-Targets fürs Gesicht, von denen der Idle-Clip einen Teil bewegt. Wer die Datei
kleiner braucht, müsste die nie ausgeschlagenen Targets entfernen — das ist bisher nicht geschehen.

Herkunft: eigene Abbilder des Eigentümers aus Avaturn, keine fremde Lizenz.

## Tänzerinnen

Drei über Mixamo auto-geriggte Figuren, reduziert über `tools/models/reduce.mjs`:

| Datei              | Quelle                                          | Dreiecke | Gelenke |
| ------------------ | ----------------------------------------------- | -------: | ------: |
| `dancer-beach.glb` | `skellet-rigged/woman-dance1.fbx`               |   25'127 |      33 |
| `dancer-club.glb`  | `skellet-rigged/18+/naked-dancer.fbx`           |   25'898 |      65 |
| `dancer-slip.glb`  | `skellet-rigged/18+/naked-dancer-with-slip.fbx` |   25'553 |      33 |

Alle drei tragen das Standard-`mixamorig:`-Skelett, darum teilen sie sich **eine** Bone-Zuordnung
und **dieselben** Tanzclips. Die liegen geometriefrei unter `animations/` und werden zur Laufzeit
retargetet: `dance-basic`, `dance-belly`, `dance-tut`, `dance-wave`, je 230–310 KiB.

Aus Mixamo kamen nur Tänze. `idle`, `walk` und alles Übrige liefert die gemeinsame Motion-Library.

## Bekleidete Alltagsfiguren und Glanzmann

Joe, Josh und Woman sind die bekleidete Standardbesetzung für Bahnhof, Zug und Flugzeug. Ihre
reduzierten Körperdateien liegen unter `civilians/`; die acht Bewegungsdateien liegen separat unter
`animations/civilians/`. Jede Figur kann dadurch dieselben Walk-, Sit-, Flucht- und Dance-Clips
verwenden, ohne den Körper und seine Texturen in jeder Bewegungsdatei erneut auszuliefern.

| Figur        | Dreiecke | Bones | Verwendung                                   |
| ------------ | -------: | ----: | -------------------------------------------- |
| Joe          |   29'994 |    65 | Alltag, Passagier, Party                     |
| Josh         |   31'191 |    65 | Alltag, Passagier, Party                     |
| Woman        |   31'242 |    65 | Alltag, Passagierin, Crew, Party             |
| Glanzmann V2 |   23'074 |    54 | einmaliger CEO-von-iReparatur-Cameo je Level |

Glanzmann verwendet die V2-Datei mit separaten Gesichts-/Augenmeshes und eigenem Idle-Clip. Das
Casting markiert ihn als `unique`; `GlanzmannNpc` ergänzt die wiederkehrenden iPhone-/iReparatur-
Sprüche. Er wird nie als zufälliges Crowd-Duplikat erzeugt.

## Nana-Bars und die Hexe

Vier neue Figuren für die Bars, jede mit dem Tanz, den sie mitgebracht hat — darum wirken sie wie
verschiedene Personen und nicht wie dieselbe Nummer. Kein geliehener Clip.

| Datei                        | Dreiecke | Gelenke | Clip        |
| ---------------------------- | -------: | ------: | ----------- |
| `nana/bar-dancer-hard.glb`   |   65'862 |     102 | 18,5 s Tanz |
| `nana/bar-dancer-naked.glb`  |   41'881 |     102 | 24,2 s Tanz |
| `nana/bar-dancer-heels.glb`  |   55'470 |     102 | 22,5 s Tanz |
| `nana/bar-walker.glb`        |   59'984 |     102 | 13 s Gehen  |
| `arlesheim/hippie-witch.glb` |  137'627 |     115 | 9,1 s Tanz  |

Alle fünf trugen zusammen 1'399 Morph-Targets pro Figur; ohne sie fielen 281 auf 47 MiB.
Die Hexe bleibt mit 137'627 Dreiecken die schwerste Figur im Spiel — ihr Mesh zerfällt in viele
kleine Schalen, an denen der Simplifier früh stehen bleibt. Sie ist ein Einzelstück in einem Raum.

`zelina_naked_riged_tpose.glb` ist nicht dabei: **CC-BY-NC-SA**. ShareAlike ist viral, jede
Bearbeitung müsste unter dieselbe Lizenz gestellt werden.
