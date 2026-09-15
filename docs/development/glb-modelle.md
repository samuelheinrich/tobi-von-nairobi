# Fremde 3D-Modelle (GLB) — Prüfung, Proof of Concept und Besetzungsliste

Stand: 15. September 2026. Anlass: die Frage, ob fertige Modelle die prozeduralen Figuren ersetzen
können, und der lokale Ordner `models/`.

## Kurzantwort

**Ja, und `sam.glb` zeigt wie.** Die Sketchfab-Downloads taugen nicht — sie sind Standbilder ohne
Skelett. `sam.glb` dagegen bringt ein Skelett mit 52 Gelenken, eine Idle-Animation und kostet mit
21'362 Dreiecken **weniger** als die heutige prozedurale Figur mit 31'616. Das ist das Muster, nach
dem der Rest der Besetzung beschafft werden sollte.

## Bestand in `models/`

| Datei                | Figur          | Lizenz         | Datei    | Dreiecke  | Skelett      | Animation |
| -------------------- | -------------- | -------------- | -------- | --------- | ------------ | --------- |
| `sam.glb`            | Sam            | eigenes Abbild | 3,9 MiB  | 21'362    | ✓ 52 Gelenke | ✓ Idle    |
| `sexy_nurse_002.glb` | Sexy Nurse 002 | CC-BY-4.0      | 39,1 MiB | 749'370   | —            | —         |
| `girl_sexy.glb`      | Girl sexy      | CC-BY-4.0      | 65,8 MiB | 1'499'876 | —            | —         |
| _heutige Spielfigur_ | prozedural     | eigen          | 0 MiB    | 31'616    | prozedural   | ✓         |

`sam.glb` stammt aus Avaturn und ist das Abbild des Eigentümers; die Nutzung im Spiel ist von ihm
freigegeben. Die beiden CC-BY-Dateien sind nutzbar, **brauchen aber Namensnennung** des Autors in
`assets/licenses/` und müssten vor jedem Einsatz stark reduziert werden.

**Gelöscht am 15.09.2026** auf Anweisung des Eigentümers, weil sie nicht verwendet werden dürfen:

- `Bailarina_sexy.glb` (SALOMON13) — _Sketchfab Standard License_, keine offene Lizenz; die
  Weitergabe der Datei ist nicht erlaubt.
- `kushina_sexy.glb` (danigamer495channel) — zwar CC-BY-4.0 ausgezeichnet, stellt aber Kushina
  Uzumaki aus _Naruto_ dar. Fremde Charakterrechte lassen sich nicht per CC weitergeben.

## Fehlende Figuren

Was das Spiel an Rollen braucht, und was davon als Modell vorliegt. «Anzahl» ist die Zahl
gleichzeitig sichtbarer Figuren, nicht die Zahl nötiger Modelle — eine Rolle braucht ein Modell mit
Varianten, keine Figur pro Person.

| Rolle                 | Level                | Anzahl | Vorhanden      | Fehlt                                               |
| --------------------- | -------------------- | -----: | -------------- | --------------------------------------------------- |
| **Tobi**              | alle                 |      1 | prozedural     | Hauptfigur, Wiedererkennung, Flaschenanker in Hand  |
| **Polizei**           | Bali, Parade, Nana   |    2–4 | prozedural     | Uniform, gerigged; Verfolgen und Festnehmen         |
| **Security**          | Nana                 |      2 | prozedural     | dunkles Polo, breitere Statur                       |
| **Tänzerin**          | Nana                 |      2 | _nur starr_    | gerigged; Tanz-/Poleposen                           |
| **Ladyboy-Tänzerin**  | Nana                 |      2 | prozedural     | gerigged, eigene Garderobe                          |
| **Bardame**           | Nana                 |      2 | prozedural     | gerigged; Getränk in der Hand                       |
| **Tourist**           | Nana, Bali, Bahn     |      4 | **Sam**        | zweite Variante, weiblich                           |
| **Expat**             | Nana                 |      4 | **Sam** (nah)  | ältere Variante                                     |
| **Strassenverkäufer** | Nana, Bali           |      2 | prozedural     | Stand-/Wagenpose                                    |
| **Taxifahrer**        | Nana                 |      2 | prozedural     | sitzend, winkend                                    |
| **Kondukteur**        | Thailand Railway     |      1 | prozedural     | Uniform, Billettzange                               |
| **Zellenwärter**      | Gewahrsam            |      1 | prozedural     | Uniform, Gitterpose                                 |
| **Bahnpassagiere**    | Thailand Railway     |   8–12 | prozedural     | sitzend, Gepäck                                     |
| **WG-Bewohner**       | Arlesheim            |   6–10 | prozedural     | Alltagskleidung, drei Stockwerke                    |
| **Yogagruppe**        | Arlesheim, Bali      |    3–5 | prozedural     | Yogaposen, sehr eigene Silhouette                   |
| **Flugbegleiter**     | Fly High             |    2–3 | prozedural     | Uniform, Gangpose                                   |
| **Strandgäste**       | Bali                 |  10–20 | _nur starr_    | Badekleidung, gerigged                              |
| **Parade-Menge**      | Zürich Street Parade |    240 | Thin Instances | bleibt bewusst prozedural — 240 GLB sind nicht drin |

Die drei Zeilen mit «nur starr» sind die zwei CC-BY-Dateien: geeignete Optik, aber ohne Skelett
kein Einsatz.

**Prioritätenordnung, wenn beschafft wird:** Tobi und Polizei zuerst — sie sind in jedem Level
sichtbar und tragen das Spielgefühl. Danach die Nana-Besetzung (Tänzerin, Bardame, Security), weil
dort die meisten Figuren gleichzeitig nah an der Kamera stehen. Menschenmengen zuletzt oder gar
nicht.

## Wie man es sich ansieht

Vite starten (`pnpm --filter @tobi/game-client dev`), dann:

**1. Modell-Studio — Vergleich nebeneinander:** <http://localhost:5173/test/models.html>

Alle Modelle neben der heutigen Spielfigur, im Beleuchtungssetup der Level. Zeigt Dateigrösse,
Dreiecke, Skelett und Ladezeit pro Modell. Sam spielt dabei seine mitgelieferte Idle-Animation.

**2. Im laufenden Spiel:** <http://localhost:5173/?glb=sam> → Level «Bangkok Nana Plaza»

Ersetzt NPCs der Nana-Bevölkerung durch das gewählte Modell. Sam steht animiert unter den
prozeduralen Figuren; die starren Modelle bewegen keinen Muskel, während ihr Rig weiterläuft.

Wählbar: `?glb=sam` (Vorgabe, 1 Figur), `?glb=nurse` (4), `?glb=girl` (2). Ohne den Parameter
passiert nichts, und es wird auch nichts geladen.

## Wie es eingebaut ist

| Ort                                    | Zweck                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `apps/game-client/vite.config.ts`      | Dev-Middleware, die `models/` unter `/models/…` ausliefert. Nur `apply: 'serve'` |
| `src/runtime/character/glb-preview.ts` | Lädt ein Modell, instanziert es je NPC, skaliert und startet mitgelieferte Clips |
| `test/models.html` · `test/models.ts`  | Vergleichsgalerie ausserhalb des Produktions-Einstiegspunkts                     |
| `nana-plaza/npc-population.ts`         | Ein Aufruf im Konstruktor, der ohne `?glb=` sofort zurückkehrt                   |

Drei Entscheidungen, die für spätere Arbeit wichtig sind:

- **Die GLB-Dateien liegen nicht im Repository.** `models/` steht in `.gitignore`. Grosse
  Binärdaten mit fremden Lizenzen gehören nicht in ein öffentliches Repo.
- **Der glTF-Loader wird dynamisch importiert.** Ohne `?glb=` lädt der Browser ihn nie. Registriert
  sind nur die zwei Erweiterungen, die die Dateien deklarieren; `registerBuiltInGLTFExtensions()`
  zieht sonst Gaussian Splatting, KHR_interactivity und OpenPBR mit — rund 0,2 MiB extra.
- **Geladen wird über `LoadAssetContainerAsync` + `instantiateModelsToScene`**, nicht über
  `ImportMeshAsync` mit `clone()`. Nur so bekommt jede Kopie ein eigenes Skelett und eine eigene
  Animationsgruppe; geklonte Skinned Meshes teilen sonst eine Pose.

Gemessen: das gebaute Paket wächst von 1,64 auf 1,95 MiB gzip. Der Zuwachs steckt vollständig in
Chunks, die `index.html` nicht vorlädt; ein normaler Spieler holt sie nie.

## Was noch fehlt, um Modelle produktiv zu nutzen

1. **Animationen über Idle hinaus.** Sam kann stehen. Für das Spiel braucht es Gehen, Rennen,
   Sitzen, Tanzen, Pöbeln, Verfolgen, Festnehmen. Mixamo liefert diese Clips kostenlos für
   humanoide Rigs; das Avaturn-Skelett ist dafür kompatibel. Danach muss die Animationsschicht
   entscheiden: GLB-Clips abspielen oder das prozedurale System auf Knochen abbilden. Heute gehen
   `dance-system.ts` und `modular/animation.ts` überall von TransformNode-Gelenken aus.
2. **Reduktion für die CC-BY-Dateien.** `gltf-transform` (Draco oder meshopt, plus `simplify`)
   bringt 750k Dreiecke realistisch auf 15–25k und die Texturen auf WebP. Sam braucht das nicht.
3. **Namensnennung.** Für CC-BY gehört der Autor sichtbar ins Spiel; `assets/licenses/README.md`
   führt das Muster bereits.
4. **Auslieferungsweg.** Heute kommen die Dateien aus einer Dev-Route. Produktiv müssten sie als
   Asset gebaut und versioniert werden — für Sam unkritisch, für fremde Lizenzen eine eigene
   Entscheidung.

## Empfehlung

Der Weg über Avaturn-Avatare wie `sam.glb` ist tragfähig: gerigged, günstig, saubere Herkunft. Für
die übrigen Rollen entweder weitere Avaturn-Figuren erzeugen, oder CC0-Charakterpakete wie
Quaternius und Kay Lousberg nehmen — stilisiert, spielfertig, und näher am Cartoon-Look der Kulisse
als fotorealistische Einzelfiguren.

Fotorealistische Sketchfab-Downloads sind der schlechteste der drei Wege: teuer, meist ohne
Skelett, lizenzrechtlich heikel und optisch ein Fremdkörper neben der übrigen Kulisse.

## Umgebung

Der pnpm-Store unter `~/Library/pnpm/store/v10` gehört `root`. `pnpm add` scheitert deshalb mit
`ERR_PNPM_EACCES`. `@babylonjs/loaders@9.26.0` steht darum in `apps/game-client/package.json` und im
Lockfile, wurde aber von Hand nach `apps/game-client/node_modules/` entpackt. Wer die
Abhängigkeiten neu installieren will, muss den Store vorher übernehmen:
`sudo chown -R "$(whoami)" ~/Library/pnpm/store`.
