# Asset-Pipeline, Performance und Debugging

[Architektur](../../ARCHITECTURE.md) · [Entwicklungsphasen](../development/milestones.md)

## 1. Stil und Asset-Vertrag

Stilisierte Low-/Mid-Poly-Geometrie, klare Silhouetten, kräftige lesbare Farben und übertriebene Animation. Visuelle Prioritäten innerhalb der Gestaltung: Lesbarkeit, Browserbudget, Animation, Humor, zusätzliche Grafikdetails. Tobi muss auch aus 5 m Kameraabstand an Form, Haltung und Gang erkennbar sein. Security, Polizei, Safe Zone und sammelbare Items haben unterscheidbare Silhouetten und Symbole.

Blender-Quelldaten verwenden Meter, festgelegte Exportachsen, angewandte Skalierung, konsistente Pivotpunkte und benannte Animationclips. Das Laufzeitsystem nutzt ein dokumentiertes Y-up-Koordinatensystem; Blender/glTF/Babylon-Achsenkonvertierung geschieht an einer definierten Importgrenze und wird an Referenzwürfel/Fahrzeug geprüft. Collider und Navigationsdaten sind vereinfachte eigene Daten, nicht automatisch das gesamte sichtbare Mesh.

Character-Vertrag: ein gemeinsames Rig, Clip-Namen, neutraler Referenzpose-Export, definierter Root/Pivot und separate Colliderbeschreibung. Clips: Idle, Walk, Run, Sprint, Jump, Stumble, Pickup, UseBottle, UsePowerUp, Throw, Talk, PanicLook, Spotted, Exhausted, Celebrate, VictoryDance. In-place Locomotion ist Standard. Placeholder-Clips dürfen fehlen, wenn der Adapter einen dokumentierten Fallback besitzt. Im MVP müssen mindestens Idle/Run/Sprint/Jump/Pickup/Spotted/Victory lesbar sein.

## 2. Reproduzierbare Pipeline

```text
Source (.blend / Texturen / WAV)
  → Export und Validator
  → Optimierungsrezept mit fixierter Toolversion
  → GLB / KTX2 / Audio / LOD / Collider / Navdaten
  → Hash und Budgetbericht
  → Assetmanifest pro Bundle und Contentrelease
  → lokales Artefakt oder versionierter Storage/CDN
  → Runtime AssetManager
```

Das Manifest enthält `assetId`, Inhalts-Hash, URL, MIME-Typ, Bytezahl, benötigte Decoder, Abhängigkeiten, Bundle, LODs, Bounds und Herkunftsreferenz. IDs bleiben stabil, geänderte Dateien bekommen neue Hash-URLs. Sourcefiles liegen unter assets/source, Rezepte unter assets/recipes, Herkunft/Lizenzen unter assets/licenses. Grosse Quellen verwenden Git LFS; der normale Codebuild benötigt nur kleine Placeholder bzw. bereits veröffentlichte Artefakte.

Der AssetManager lädt notwendige Bundles vor Levelbeginn, dedupliziert laufende Requests und verwaltet Referenzzählung. Gemeinsam verwendete Materialien/Textures werden erst nach dem letzten Nutzer freigegeben. Ladefehler bieten Retry; fehlende dekorative Assets dürfen einen Placeholder erhalten, fehlende Collider-/Missionassets verhindern einen irreführenden Spielstart. Decoder und WASM werden lokal/versioniert gehostet und im Downloadbudget gezählt.

HTTP-Caching nutzt immutable Hash-URLs. Das kleine Release-Manifest hat kurze Cachezeit oder Revalidierung. Service Worker/PWA ist ein späterer Schritt, nachdem Update- und Saveversionierung stabil sind. Kein aggressiver Cache, der nach Deployment inkompatible Missionen und Meshes mischt.

## 3. Kompression und LOD-Entscheidungen

| Verfahren     | Verwendung im Projekt                                                            | Prüfung                                                                                 |
| ------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| GLB/glTF      | Standard für game-ready Meshes, Skelette und Animation                           | Import in festgelegter Engineversion, Bounds und Clipnamen                              |
| Meshopt       | bevorzugtes initiales Geometrie-/Animationskompressionsprofil                    | Decoderzeit, sichtbare Qualität und reale Transfergrösse                                |
| Draco         | Alternative für statische Assets, wenn deutlicher messbarer Vorteil              | nicht zusätzlich dieselbe Geometrie doppelt komprimieren; Decoderkosten berücksichtigen |
| KTX2/Basis    | Texturen mit GPU-tauglichem Transcoding                                          | Gerät unterstützt Zielkompression; Transcoder-/Fallbackpfad testen                      |
| ETC1S / UASTC | ETC1S für einfache Farbflächen, UASTC bei höherem Qualitätsbedarf wie Normalmaps | Artefakte und Speicherverbrauch visuell messen                                          |
| LOD           | zunächst drei diskrete Detailstufen für grössere Props/Umgebung                  | Übergangsdistanzen, Silhouette, Schatten und Animationskosten                           |
| Instancing    | wiederholte starre Props wie Flaschen, Lampen, Marktobjekte                      | gleiche Materialgruppen; Gameplayzustand bleibt pro Entität                             |

Die [glTF-Transform-CLI](https://gltf-transform.dev/cli) bietet Bausteine für Meshopt, Draco, Texturkompression, Vereinfachung und Bereinigung. Welche Kombination unser Export tatsächlich verwendet, legt ein Benchmark fest; kleinere Dateien allein bedeuten nicht automatisch schnelleres Laden. Collider-/Nav-Daten bleiben unabhängig von visuellen LODs. Skinned NPCs lassen sich nicht ohne Prüfung wie starre Props instanzieren.

## 4. Performanceziel und messbares Referenzszenario

**Ziel: 60 FPS auf durchschnittlichem Desktop.** Phase 1 dokumentiert mindestens zwei konkrete Geräte: etwa ein Laptop mit Intel Iris Xe, 16 GB RAM und ein Apple-M1-Gerät mit 8 GB RAM, jeweils mit OS-/Browser-/Treiberstand. Das sind vorgeschlagene Referenzklassen; erst reale Messungen begründen die finale Mindestanforderung.

Benchmark: 1920×1080, Qualitätsstufe Medium, gleicher Seed und 90-s-Route durch ruhigen Platz, dichteste Szene und Chase. Nach Warm-up drei Durchläufe; Messbericht mit p50/p95/p99, CPU-/GPU-Zeiten, Draw Calls, aktiven Bodies und AI-Ticks. Ladezeit und Gameplay werden getrennt gemessen. Ziel auf dem Referenzgerät: p95-Framezeit höchstens etwa 16,7 ms, p99 höchstens 25 ms im vorgesehenen Levelbudget. Ein 60-FPS-Mittelwert allein reicht nicht.

| Budget                                | Initiales Ziel, in Phase 1/4 messen                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| kritischer Download bis Bali spielbar | höchstens 15 MiB komprimiert einschliesslich JS, WASM, Decoder und Startassets              |
| gesamtes Bali-MVP-Bundle              | höchstens 25 MiB Transfer; spätere optionale Assets nachladen                               |
| Kaltstart                             | höchstens 10 s bei definiertem 25-Mbit/s-/50-ms-Testprofil, Startbildschirm früher sichtbar |
| sichtbare Dreiecke                    | circa 300'000 im Medium-MVP                                                                 |
| Draw Calls                            | circa 200 im dichtesten MVP-Blick                                                           |
| Tobi                                  | circa 15'000–25'000 Dreiecke im nahen LOD, reduzierbare Materialzahl                        |
| Texturen                              | gewöhnlich 512–1024 px, 2048 nur begründet für zentrale Assets                              |
| GPU-Texturbudget                      | circa 256 MiB auf Medium, nach Transcoding/Mipmaps berechnen                                |
| JS Heap                               | circa 200 MiB stationär im MVP; Gesamtprozess kann wegen WASM/GPU höher sein                |
| nahe zivile NPCs                      | 20 aktiv im MVP, weitere als vereinfachte Darstellung                                       |
| aktive Polizisten                     | 4 im MVP, später budgetabhängig 8–12; keine Garantie allein aus Zahlen                      |
| CPU-Spielsimulation                   | Ziel etwa 3 ms je Frame, Rendering und GPU separat messen                                   |

Budgets sind Warn-/Abnahmegrenzen für den ersten Content, keine universellen Engine-Limits. Phase 4 darf sie mit dokumentierter Messung anpassen. Spätere dichte Worlds bekommen eigene Profile, ohne das Minimum stillschweigend zu verschieben.

## 5. Massnahmen in sinnvoller Reihenfolge

Zuerst Profiler und Inhalt messen. Einfache Beleuchtung mit gebackenen Umgebungsanteilen, wenige dynamische Schatten, begrenzte Schattenreichweite. Frustum-Culling und sinnvoll zugeschnittene Szenenteile vermeiden unsichtbare Arbeit. Statische wiederholte Props instanzieren; aktive Projektile, Pickup-Effekte und temporäre NPCs begrenzt poolen. Poolgrösse deckeln und vollständig zurücksetzen.

LOD und Aktivierungsradius reduzieren Mesh-, Animations- und AI-Arbeit getrennt. Entfernte NPCs brauchen nicht nur weniger Polygone, sondern weniger Wahrnehmungsabfragen. Navanfragen budgetieren und über Frames verteilen. Occlusion erst nach Messung aktivieren: Abfragekosten können bei kleinen Szenen höher als die Einsparung sein. Für Innenräume können authored Sichtsektoren günstiger sein.

Asset-Bundles pro Level statt gesamte Kampagne laden, gleiche Materialien wiederverwenden, glTF dekodieren/WASM initialisieren während sichtbarer Ladephase. Renderloop vermeidet neue Objekte und Reactupdates pro Entity/Frame. Teure Dialog-/Missionsvalidierung ist Buildarbeit, kein Tickjob.

Qualitätsstufen ändern Renderauflösung/DPR-Cap, Schatten, Partikel, Detail-NPCs und Sichtweite dekorativer Objekte. **Spielregeln, relevante Sichtblocker, Combo-Zeit und aktive Verfolger bleiben gleich**, damit Low Quality kein anderes Spiel wird. Dynamische Auflösung darf als Option Lastspitzen glätten. Der Low-Pfad deaktiviert teure Effekte; ein optionales 30-FPS-Limit hilft schwächeren Geräten, ersetzt aber das 60-FPS-Entwicklungsziel nicht.

## 6. Browsermatrix und Robustheit

Supportziel: aktuelle und vorherige stabile Desktopversion von Chrome/Edge und Firefox sowie aktuelle und vorherige Safari-Hauptversion auf macOS, soweit der geprüfte WebGL-2-/WASM-Pfad funktioniert. Die konkrete Versionsmatrix wird bei jedem Release dokumentiert. Mobile und Gamepad sind spätere Abnahmen, keine implizite MVP-Unterstützung.

Capability-Check vor Leveldownload: WebGL 2, WebAssembly, benötigte Decoder und angemessene Texturlimits. Fehlende Fähigkeit führt zu einer verständlichen Meldung. Pointer Lock und Audio werden durch Benutzeraktion aktiviert. Context-Loss, Tabwechsel, Resize/DPR-Wechsel und fehlgeschlagene Assetrequests werden getestet. Nach nicht behebbarer Grafikunterbrechung führt der Client zum bestätigten Checkpoint zurück; er behauptet keinen gespeicherten Zustand, den die API nicht bestätigt hat.

WebGPU folgt hinter einer Option, mit demselben Inhalt und separaten Grafiktests. Das MVP erhält keinen exklusiven WebGPU-Effekt. Tastatur-/Mauspfad bleibt auch bei angeschlossenem Controller bedienbar, bevor dessen Adapter veröffentlicht wird.

## 7. Developer Tools und Logging

F1 öffnet im Entwicklungsbuild ein lazily geladenes Menü. Enthalten: Teleport zu authored Ankern, Chaos/Sterne setzen, Item geben, Unverwundbarkeit, Polizei spawnen, Mission abschliessen, Level neu laden, FPS/Frametimes, AI-Zustände, Collider, Navrouten und Wahrnehmungskegel. Ergänzend: RNG-Seed, Eventinspektor mit begrenztem Ringbuffer, Pause/Einzelschritt, Safe-Zone-/Objective-Status und Save-Outbox anzeigen.

Babylons [Inspector](https://doc.babylonjs.com/toolsAndResources/inspector) ergänzt das domänenspezifische Menü für Szenenuntersuchung. Tools verwenden öffentliche Commands, damit sie reale Zustandsregeln sichtbar machen. Manipulation setzt eine sticky Run-Markierung `debug_used`; ein solcher Run erzeugt keine öffentlichen Highscores. Produktionsbuilds enthalten keinen aktivierbaren Debugmenüimport; eine versteckte Taste wäre kein Schutz.

Clientlogger ist kategorisiert und im Release begrenzt; kein unkontrolliertes `console.log()`. Fehlerberichte enthalten Build/Contentversion, Browser, Seed, Level, relevanten Zustandsausschnitt und reproduzierbare Schritte, ohne Secrets. Backendlogging und Savebeobachtung stehen im [API-Plan](../api/data-and-api.md). Performance-HUD zeigt CPU/GPU getrennt, soweit verfügbar; fehlende GPU-Messung wird kenntlich gemacht.

## 8. Content-Produktion und Abnahme

Ein neues Level beginnt mit Brief und Routenblockout, dann Pflicht-/Bonusgraph, Spawn-/Nav-/Safe-Zone-Daten, graue Spielprobe, erst danach finale Assets/Audio. `create-level` erzeugt validierte Dateien mit eindeutigen IDs. Die erste Pipeline ist CLI plus Debug-Preview, kein eigener grosser visueller Editor. Phase 5 prüft, ob ein Entwickler ohne Engineänderung ein zweites kleines Level erstellen kann.

Assetabnahme: gültiges GLB, richtige Achsen/Skalierung, vollständige Clips/Manifest-IDs, Budgetbericht, dokumentierte Herkunft, Collider/Nav kompatibel und keine unbeabsichtigte Collision an Dekoration. Levelabnahme: erreichbare Pflichtziele, mindestens zwei Routen, funktionierende Checkpoints, kein Spawn im Sichtfeld, Secret-/Bonus-/Easter-Egg-Vertrag erfüllt und 5–15-minütiger Erstlauf im Playtest.
