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

| Datei                | Quelle                              | Dreiecke | Gelenke |
| -------------------- | ----------------------------------- | -------: | ------: |
| `dancer-beach.glb`   | `skellet-rigged/woman-dance1.fbx`   |   25'127 |      33 |
| `dancer-club.glb`    | `skellet-rigged/18+/naked-dancer.fbx` | 25'898 |      65 |
| `dancer-slip.glb`    | `skellet-rigged/18+/naked-dancer-with-slip.fbx` | 25'553 | 33 |

Alle drei tragen das Standard-`mixamorig:`-Skelett, darum teilen sie sich **eine** Bone-Zuordnung
und **dieselben** Tanzclips. Die liegen geometriefrei unter `animations/` und werden zur Laufzeit
retargetet: `dance-basic`, `dance-belly`, `dance-tut`, `dance-wave`, je 230–310 KiB.

Aus Mixamo kamen nur Tänze. `idle`, `walk` und alles Übrige liefert die gemeinsame Motion-Library.
