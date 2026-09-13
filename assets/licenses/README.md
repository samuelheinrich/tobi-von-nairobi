# Asset provenance

The technical prototype uses original procedural geometry from `apps/game-client/src/runtime/levels/`, `character/` and `items/`. It contains no downloaded character models, environment meshes or audio samples. Pickup/victory sounds are synthesized by `AudioFeedback`.

Fonts are self-hosted from `@fontsource/barlow-condensed` and `@fontsource/dm-sans`. Their upstream licenses ship with the packages (SIL Open Font License). No runtime font request is sent to Google.

Babylon.js and the Havok web package retain their upstream notices in installed dependencies and generated artifacts. Future imported assets must include source URL, author, license, attribution requirements and allowed modifications here before use.
