# Fremde 3D-Modelle (GLB) — Lizenzen, Zuordnung und Proof of Concept

Stand: 15. September 2026. Die Dateien liegen lokal in `models/` und sind **nicht** im Repository:
der Ordner steht in `.gitignore`, der Dev-Server liefert ihn aus.

## Lizenzprüfung: passt

**Alle 17 Sketchfab-Dateien sind CC-BY-4.0.** Die Lizenz erlaubt die Verwendung im Spiel,
kommerziell wie nicht-kommerziell, **mit Namensnennung** des Autors. `sam.glb` stammt aus Avaturn
und ist das freigegebene Abbild des Eigentümers. Es gibt damit keine lizenzrechtliche Sperre mehr.

Zwei Punkte brauchen trotzdem eine Entscheidung, weil eine Lizenz nicht alles abdeckt:

- **`hippie-yoga.glb` («JOKOWI BALANCE DANCE POSE»)** ist das Bildnis von **Joko Widodo**, dem
  ehemaligen Präsidenten Indonesiens. CC-BY deckt die Rechte des Hochladenden am Modell ab — nicht
  das Persönlichkeitsrecht einer realen, identifizierbaren Person. Einen amtierenden oder
  ehemaligen Staatschef als Hippie-NPC einzusetzen, ist dieselbe Art Problem wie die gelöschte
  Naruto-Figur, nur mit einem lebenden Menschen statt einer Comicfigur. **Empfehlung: ersetzen.**
- **Namensnennung ist Pflicht, nicht Kür.** Für jede eingesetzte CC-BY-Datei gehört der Autor
  sichtbar ins Spiel. `assets/licenses/README.md` führt das Muster bereits; Autor und Quell-URL
  stehen zusätzlich in `glb-catalogue.ts`.

Zum Vergleich die beiden am 15.09. gelöschten Dateien: `Bailarina_sexy.glb` stand unter der
_Sketchfab Standard License_ — keine offene Lizenz, Weitergabe der Datei nicht erlaubt.
`kushina_sexy.glb` war zwar CC-BY, stellte aber Kushina Uzumaki aus _Naruto_ dar.

## Zuordnung

> Die Tabelle unten ist der Stand vom 15.09. vormittags. Seither sind die T-Pose-Sammlung und die
> Tobi-Avatare dazugekommen, und alle Modelle laufen über
> [`tools/models/reduce.mjs`](modell-reduktion.md). **Aktuell ist immer das Modell-Studio**
> (<http://localhost:5173/test/models.html>), das seine Zahlen aus `glb-catalogue.json` zieht.

Gemessen aus den Dateien selbst (Accessor-Zahlen, Skin-Gelenke, Animationsnamen); der Katalog steht
maschinenlesbar in `src/runtime/character/glb-catalogue.ts`.

| Rolle im Spiel    | Datei                                     | Autor                | Datei     | Dreiecke  | Skelett             |
| ----------------- | ----------------------------------------- | -------------------- | --------- | --------- | ------------------- |
| **Polizei**       | `police.glb`                              | Tech developers      | 0,5 MiB   | 7'814     | —                   |
| **Polizei**       | `female_police_v2.glb`                    | Michael Constantine  | 1,3 MiB   | 34'252    | —                   |
| **Security**      | `security_guard.glb`                      | Q.SARDOR             | 1,7 MiB   | 13'235    | **✓ 66 · idle**     |
| **Tänzerin**      | `kayla-dancer.glb`                        | Zizian1987           | 10,1 MiB  | 187'707   | —                   |
| **Tänzerin**      | `locker_room_glamour-dancer.glb`          | Zizian1987           | 16,5 MiB  | 294'270   | —                   |
| **Tänzerin**      | `nina-dancer.glb`                         | Zizian1987           | 23,9 MiB  | 465'635   | —                   |
| **Bardame**       | `redhead_party_dress_girl.glb`            | Toni García Vilche   | 6,2 MiB   | 44'886    | ✓ 153 · kein Clip   |
| **Bardame**       | `bargirl-sitting.glb`                     | Fadly.W              | 6,4 MiB   | 99'999    | —                   |
| **Bardame**       | `pink_halter_dress_portrait-bar-girl.glb` | Zizian1987           | 14,2 MiB  | 262'468   | —                   |
| **Bardame**       | `realistic_girl_in_dress.glb`             | 120320               | 25,1 MiB  | 511'796   | —                   |
| **Tourist/Expat** | `sam.glb`                                 | Avaturn · Eigentümer | 3,9 MiB   | 21'362    | **✓ 52 · IdleV4.2** |
| **WG-Bewohner**   | `hippie_zombie.glb`                       | maicollgdalpiaz      | 3,8 MiB   | 9'964     | —                   |
| **WG-Bewohner**   | `hippie_female.glb`                       | huvava9992           | 8,8 MiB   | 9'991     | —                   |
| **Yogagruppe**    | `hippie-yoga.glb` ⚠                       | Yud347               | 34,6 MiB  | 311'275   | —                   |
| **Yogagruppe**    | `yoga-girl-naked-sitting.glb`             | XRProfXR             | 51,8 MiB  | 831'198   | —                   |
| **Strandgäste**   | `female-sporty1.glb`                      | SYMXY_               | 103,8 MiB | 1'970'634 | —                   |
| _ohne Zuordnung_  | `sexy_nurse_002.glb`                      | SinfulBrain          | 39,1 MiB  | 749'370   | —                   |
| _ohne Zuordnung_  | `girl_sexy.glb`                           | tr.onurdk1           | 65,8 MiB  | 1'499'876 | —                   |
| _Referenz_        | heutige prozedurale Figur                 | eigen                | 0 MiB     | 31'616    | prozedural          |

### Was die Zuordnung aussagt — und was nicht

**Drei von achtzehn haben ein Skelett.** Nur `sam.glb` und `security_guard.glb` bringen auch einen
Clip mit; `redhead_party_dress_girl.glb` hat 153 Gelenke, aber keine Animation. Alle übrigen sind
Standbilder und können im Spiel nicht gehen, tanzen, sitzen oder fliehen. Die Rollenzuordnung sagt
also, **wofür eine Datei gedacht war**, nicht dass sie einsatzbereit ist.

**Das Budget stimmt bei den wenigsten.** Die heutige Figur kostet 31'616 Dreiecke. Die drei
Tänzerinnen zusammen kosten 947'612 — für drei Figuren, die in Nana gleichzeitig sichtbar wären.
`female-sporty1.glb` allein kostet 1'970'634 Dreiecke bei 103,8 MiB. Brauchbar sind ohne Reduktion
nur `police.glb`, `security_guard.glb`, `hippie_zombie.glb`, `hippie_female.glb`, `sam.glb` und
`female_police_v2.glb` — also genau die sechs unter 50'000 Dreiecken.

**Noch immer ohne jedes Modell:** Tobi, Ladyboy-Tänzerin, Kondukteur, Zellenwärter,
Bahnpassagiere, Taxifahrer, Strassenverkäufer, Flugbegleiter. Die Parade-Menge (240 Personen)
bleibt bewusst prozedural; 240 GLB-Figuren sind kein realistischer Weg.

## Wie man es sich ansieht

Vite starten (`pnpm --filter @tobi/game-client dev`), dann:

**1. Modell-Studio:** <http://localhost:5173/test/models.html>

Die vollständige Tabelle steht sofort — sie kommt aus dem Katalog, nicht aus den Dateien, damit
nichts geladen werden muss. Die 3D-Ansicht lädt **eine Rolle auf einmal**, ganz links immer die
heutige Figur zum Vergleich. Gerigte Modelle spielen ihren mitgelieferten Clip.

**2. Im laufenden Spiel:** <http://localhost:5173/?glb=sam> → Level «Bangkok Nana Plaza»

Der Parameter ist der Dateiname ohne Endung: `?glb=police`, `?glb=security_guard`,
`?glb=kayla-dancer`, `?glb=hippie_zombie` und so weiter. Wie viele NPCs ersetzt werden, richtet
sich nach dem Gewicht: über 250'000 Dreiecke eine Figur, über 80'000 zwei, sonst vier. Ohne den
Parameter passiert nichts, und es wird auch nichts geladen.

## Wie es eingebaut ist

| Ort                                      | Zweck                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `src/runtime/character/glb-catalogue.ts` | Datei, Rolle, Autor, Lizenz, Kosten und Vorbehalte — eine Quelle für beide Wege  |
| `src/runtime/character/glb-preview.ts`   | Lädt ein Modell, instanziert es je NPC, skaliert und startet mitgelieferte Clips |
| `apps/game-client/vite.config.ts`        | Dev-Middleware, die `models/` unter `/models/…` ausliefert. Nur `apply: 'serve'` |
| `test/models.html` · `test/models.ts`    | Katalogtabelle und 3D-Ansicht je Rolle, ausserhalb des Produktionseinstiegs      |
| `nana-plaza/npc-population.ts`           | Ein Aufruf im Konstruktor, der ohne `?glb=` sofort zurückkehrt                   |

Drei Entscheidungen, die für spätere Arbeit wichtig sind:

- **Der glTF-Loader wird dynamisch importiert.** Ohne `?glb=` lädt der Browser ihn nie. Registriert
  sind nur die drei Erweiterungen, die die Dateien deklarieren — `KHR_materials_unlit`,
  `KHR_materials_specular` und `KHR_materials_pbrSpecularGlossiness`. Die letzte ist in
  `female_police_v2.glb` und `locker_room_glamour-dancer.glb` als **`extensionsRequired`**
  eingetragen: ohne sie verweigern beide Dateien den Ladevorgang komplett.
  `registerBuiltInGLTFExtensions()` würde alles abdecken, zieht aber Gaussian Splatting,
  KHR_interactivity und OpenPBR mit — rund 0,2 MiB zusätzlich.
- **Geladen wird über `LoadAssetContainerAsync` + `instantiateModelsToScene`**, nicht über
  `ImportMeshAsync` mit `clone()`. Nur so bekommt jede Kopie ein eigenes Skelett und eine eigene
  Animationsgruppe; geklonte Skinned Meshes teilen sonst eine Pose.
- **Die Dateien bleiben lokal.** Rund 480 MiB fremde Binärdaten gehören nicht in ein öffentliches
  Repository, auch nicht unter CC-BY.

Gemessen: das gebaute Paket wächst von 1,64 auf 1,95 MiB gzip. Der Zuwachs steckt vollständig in
Chunks, die `index.html` nicht vorlädt; ein normaler Spieler holt sie nie.

## Was fehlt, um produktiv zu werden

1. **Animationen.** Sam kann stehen, der Security Guard auch. Für das Spiel braucht es Gehen,
   Rennen, Sitzen, Tanzen, Pöbeln, Verfolgen, Festnehmen. Mixamo liefert diese Clips kostenlos für
   humanoide Rigs; sowohl das Avaturn-Skelett als auch das 66-Gelenk-Rig des Security Guard sind
   kompatibel. Danach muss die Animationsschicht entscheiden: GLB-Clips abspielen oder das
   prozedurale System auf Knochen abbilden. Heute gehen `dance-system.ts` und `modular/animation.ts`
   überall von TransformNode-Gelenken aus.
2. **Rigging für die Standbilder.** Zwölf Dateien haben kein Skelett. Mixamo riggt humanoide Netze
   automatisch — bei extremen Posen (`bargirl-sitting`, `yoga-girl-naked-sitting`,
   `hippie-yoga`) funktioniert das aber schlecht bis gar nicht. Diese drei sind eher Kulisse als
   Figur.
3. **Reduktion.** `gltf-transform` (Draco oder meshopt, plus `simplify`) bringt 500k–2 Mio Dreiecke
   realistisch auf 15–25k und die Texturen auf WebP. Zwölf der achtzehn Dateien brauchen das.
4. **Namensnennung** für jede eingesetzte CC-BY-Datei.
5. **Auslieferungsweg.** Heute kommen die Dateien aus einer Dev-Route. Produktiv müssten die
   ausgewählten als Asset gebaut und versioniert werden.

## Empfehlung

Die Reihenfolge, die am schnellsten sichtbaren Fortschritt bringt:

1. **`security_guard.glb` als erste echte Figur einsetzen** — gerigged, animiert, 13'235 Dreiecke,
   also günstiger als die heutige Figur. Der beste Kandidat im ganzen Bestand.
2. **`police.glb` und `hippie_zombie.glb`/`hippie_female.glb` riggen lassen** — unter 10'000
   Dreiecke, einfache Posen, gute Mixamo-Kandidaten.
3. **Tänzerinnen und Bardamen zurückstellen.** Optisch die auffälligsten, technisch die teuersten:
   viermal so viele Dreiecke wie das gesamte restliche Nana-Ensemble, und keine einzige animierbar
   ohne Rigging.
4. **Für Tobi und die fehlenden Rollen Avaturn nehmen.** `sam.glb` zeigt, dass der Weg funktioniert:
   gerigged, günstig, saubere Herkunft, Kleidung wählbar.

Fotorealistische Einzelfiguren bleiben ausserdem ein Stilbruch neben der Cartoon-Kulisse — das ist
im Studio bei jeder Rolle direkt nebeneinander zu sehen.

## Umgebung

Der pnpm-Store unter `~/Library/pnpm/store/v10` gehört `root`. `pnpm add` scheitert deshalb mit
`ERR_PNPM_EACCES`. `@babylonjs/loaders@9.26.0` steht darum in `apps/game-client/package.json` und im
Lockfile, wurde aber von Hand nach `apps/game-client/node_modules/` entpackt. Wer die
Abhängigkeiten neu installieren will, muss den Store vorher übernehmen:
`sudo chown -R "$(whoami)" ~/Library/pnpm/store`.
