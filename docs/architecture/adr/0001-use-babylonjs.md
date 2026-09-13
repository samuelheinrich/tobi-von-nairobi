# ADR 0001 – Babylon.js als Game Engine

Datum: 2026-09-13. Status: im Plan gewählt, Umsetzung ausstehend.

**Kontext:** Ein browserbasiertes Third-Person-Spiel benötigt Characterbewegung, Physik, Animation, Assetloading und für mehrere Entwickler zugängliches Debugging.

**Entscheidung:** Babylon.js mit Havok-Adapter, zunächst WebGL 2. React besitzt die Benutzeroberfläche, eine imperative Game Runtime die Szene. Reine Regeln bleiben in game-core engineunabhängig.

**Alternative:** Three.js mit zusätzlich integriertem Physik-/Controller-/Tooling-Stack ist geeignet, verlangt für unseren Funktionsumfang aber mehr eigene Zusammensetzung. Die Entscheidung folgt der erwarteten Integrationsarbeit, keiner pauschalen Qualitäts- oder Performancewertung.

**Folgen:** klarer Babylon-/WASM-Lifecycle, separate Physikports, browserbasierte Adaptertests und Downloadbudget. Keine zweite konkurrierende Kollisionswelt für denselben Character. Gameplay-Animation und Steuergefühl müssen wir selbst gestalten.

**Verifikation:** Phase 1 prüft Treppen, Hänge, Kamera-Sweeps, Highspeed, Pause und Safari. Bei unlösbarer Physik-/Browsergrenze zuerst Adapteralternative untersuchen, dann Engineentscheidung neu bewerten. Vergleich und Primärquellen: [ARCHITECTURE.md](../../../ARCHITECTURE.md).
