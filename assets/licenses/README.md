# Asset provenance

The technical prototype uses original procedural geometry from `apps/game-client/src/runtime/levels/`, `character/` and `items/`. It contains no downloaded character models, environment meshes or audio samples. Every sound is synthesized at runtime by `AudioFeedback` from oscillators and filtered white noise.

## Audio

### Kenney — Impact Sounds 1.0 (CC0)

| Datei im Repo                  | Quelldatei im Paket          |
| ------------------------------ | ---------------------------- |
| `src/assets/audio/smash.1.ogg` | `impactGlass_heavy_000.ogg`  |
| `src/assets/audio/smash.2.ogg` | `impactGlass_heavy_002.ogg`  |
| `src/assets/audio/smash.3.ogg` | `impactGlass_medium_001.ogg` |
| `src/assets/audio/step.1.ogg`  | `footstep_concrete_000.ogg`  |
| `src/assets/audio/step.2.ogg`  | `footstep_concrete_002.ogg`  |
| `src/assets/audio/step.3.ogg`  | `footstep_concrete_004.ogg`  |
| `src/assets/audio/land.1.ogg`  | `impactSoft_heavy_000.ogg`   |
| `src/assets/audio/land.2.ogg`  | `impactSoft_heavy_001.ogg`   |
| `src/assets/audio/block.1.ogg` | `impactPunch_medium_000.ogg` |
| `src/assets/audio/block.2.ogg` | `impactPunch_medium_001.ogg` |

- **Quelle:** <https://kenney.nl/assets/impact-sounds>, Paket `kenney_impact-sounds.zip`, Version 1.0.
- **Autor:** Kenney (<https://kenney.nl>).
- **Lizenz:** Creative Commons Zero (CC0 1.0), <http://creativecommons.org/publicdomain/zero/1.0/>. Die Lizenz steht als `License.txt` im heruntergeladenen Paket und erlaubt ausdrücklich kommerzielle Nutzung. Eine Namensnennung ist **nicht** verpflichtend; wir nennen Kenney hier trotzdem.
- **Bezogen am:** 14. September 2026.
- **Änderungen:** Nur umbenannt, damit `SoundBank` sie den Cues zuordnet (`<cue>.<variante>.ogg`). Audioinhalt, Format und Abtastrate sind unverändert. Die Abspiellautstärke wird zur Laufzeit pro Cue gesetzt, nicht in der Datei.

Alle weiteren Klänge — Trinken, Schluckauf, Sirene, Rufe, Jubel, Ambient-Loops — sind weiterhin zur Laufzeit synthetisiert und stammen aus keiner externen Quelle.

`SoundBank` is the prepared path for recorded foley: a file dropped into `apps/game-client/src/assets/audio/` and named after a cue in `sound-cues.ts` is preferred over the synthesized version at runtime; `<cue>.<n>.ogg` registers as one of several rotating variants. Before committing any audio file, record its source URL, author, licence, date and permitted modifications in this file — CC0 assets (Kenney, or individually verified files from OpenGameArt and Freesound) avoid attribution obligations; Pixabay uses its own [Content License](https://pixabay.com/service/license-summary/), not a blanket CC0 licence; CC-BY requires a permanent in-app credit. See [docs/gameplay/audio.md](../../docs/gameplay/audio.md).

The Zurich street-parade level is an original low-poly blockout of the lake basin. It reproduces no map data, aerial imagery or photographic textures; building shapes and proportions are invented. The venue names in the Bangkok level are likewise invented and reproduce no real establishment's branding.

Fonts are self-hosted from `@fontsource/barlow-condensed` and `@fontsource/dm-sans`. Their upstream licenses ship with the packages (SIL Open Font License). No runtime font request is sent to Google.

Babylon.js and the Havok web package retain their upstream notices in installed dependencies and generated artifacts. Future imported assets must include source URL, author, license, attribution requirements and allowed modifications here before use.

Level thumbnails in `apps/game-client/src/assets/level-previews/` are original 640 × 360 WebP captures of those procedural scenes. `tools/assets/capture-level-previews.mjs` regenerates them through the development-only preview entry. They contain no external images or owner-supplied reference photos.

Fly High uses original procedural A380-inspired cabin geometry, seat groupings and cloud meshes. No Airbus/airline artwork, logos, seat-map images or 3D assets are distributed. Reference links and the intentional departures in scale and seating capacity are documented in [Fly High](../../docs/gameplay/fly-high.md). Aircraft ambience is synthesized locally.
