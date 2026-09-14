# Asset provenance

The technical prototype uses original procedural geometry from `apps/game-client/src/runtime/levels/`, `character/` and `items/`. It contains no downloaded character models, environment meshes or audio samples. Every sound is synthesized at runtime by `AudioFeedback` from oscillators and filtered white noise.

`SoundBank` is the prepared path for recorded foley: a file dropped into `apps/game-client/src/assets/audio/` and named after a cue in `sound-cues.ts` is preferred over the synthesized version at runtime. That directory is empty today. Before committing any audio file, record its source URL, author, licence, date and permitted modifications in this file — CC0 sources (Kenney, OpenGameArt, Freesound, Pixabay) avoid attribution obligations; CC-BY requires a permanent in-app credit. See [docs/gameplay/audio.md](../../docs/gameplay/audio.md).

The Zurich street-parade level is an original low-poly blockout of the lake basin. It reproduces no map data, aerial imagery or photographic textures; building shapes and proportions are invented. The venue names in the Bangkok level are likewise invented and reproduce no real establishment's branding.

Fonts are self-hosted from `@fontsource/barlow-condensed` and `@fontsource/dm-sans`. Their upstream licenses ship with the packages (SIL Open Font License). No runtime font request is sent to Google.

Babylon.js and the Havok web package retain their upstream notices in installed dependencies and generated artifacts. Future imported assets must include source URL, author, license, attribution requirements and allowed modifications here before use.

Level thumbnails in `apps/game-client/src/assets/level-previews/` are original 640 × 360 WebP captures of those procedural scenes. `tools/assets/capture-level-previews.mjs` regenerates them through the development-only preview entry. They contain no external images or owner-supplied reference photos.
