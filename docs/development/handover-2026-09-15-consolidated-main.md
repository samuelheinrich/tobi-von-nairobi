# Übergabe: konsolidierter Entwicklungsstand · 15. September 2026

## Repository

Die Entwicklung wurde vom alten Branch `fix/ci-browser-shards` auf `main` zusammengeführt. Die sieben Commits des vorherigen Agenten (`add495f` bis `28031a3`) bleiben unverändert erhalten: Modellgalerie, Katalog/Optimierung und Tobis GLB-Avatar inklusive Betrunken-Animation. Der alte lokale Branch bleibt als Referenz erhalten. Kein Rebase oder Force-Push.

- `8404bcd`: CI-Workflow entfernt, aktuelle Eigentümerentscheidung in AGENTS.md/CLAUDE.md und Entwicklungsdokumenten festgehalten.
- `1cf3523`: zusammenhängender Nana-Ausbau, modulare NPCs, Gesichter, erwachsene Nightlife-/Beach-Varianten und Armkorrektur. Diese Änderungen verwenden gemeinsame Daten, Rig- und Animationsverträge und wurden deshalb als zusammenhängender Stand gesichert.
- Die vorliegende Dokumentationsänderung hält die Konsolidierung und Übergabe fest.

GitHub meldete vor der Veröffentlichung den Workflow als `disabled_manually` und `main` als ungeschützt. Der Workflow ist am neuen Branch-Tip zusätzlich gelöscht. Keine CI starten, reparieren oder Pflichtchecks wiederherstellen. Die gesicherte Branch-Protection-Datei ist nur historisch. Massgeblich ist [AGENTS.md](../../AGENTS.md).

## Technische Orientierung

- Nana: [Spezifikation](../gameplay/nana-plaza-and-custody.md), [Umbauplan](nana-expansion-plan.md), Laufzeitmodule unter `runtime/levels/nana-plaza/`, Inhaltsdaten unter `packages/game-data/src/nana-plaza/`.
- NPCs: [modulare Figuren und Gesichter](modular-characters.md), [erwachsene Nightlife-/Beach-Varianten](adult-female-characters.md), gemeinsame prozedurale Gelenke unter `runtime/character/modular/`.
- Arme: `arm-pose.ts` definiert die gemeinsame nach aussen gerichtete Rotation. Schulterabstand, Animationsvorzeichen und Rig-Begrenzung wurden angepasst. Die Lösung ist eine günstige Pose-Begrenzung, keine vollständige Selbstkollisionssimulation.
- Tobi verwendet den vom vorherigen Agenten integrierten GLB-Avatar; die NPC-Überarbeitung ersetzt diesen nicht.
- Lokale Galerien: `/test/characters.html`, `/test/faces.html`, `/test/female.html` sowie die bestehende Modellgalerie `/test/models.html` im Vite-Devserver.

## Prüfungen und Grenzen

Bei der Git-Bereinigung: Client-Typecheck und `git diff --cached --check` erfolgreich. Keine komplette Testsuite, kein neuer Produktionsbuild, kein Deployment und keine GitHub-CI.

Vor der Bereinigung wurden gezielte lokale Nana-Browserprüfungen, Figurengalerien und die Armkorrektur geprüft; Details und Grenzen stehen in den Figurendokumenten. Diese Nachweise ersetzen keine umfassende Abnahme aller Level. Besonders Referenzhardware/FPS, Safari und das Spielgefühl bleiben offen. Weitere aufwendige Prüfungen nur auf Auftrag, siehe [Test-Backlog](test-backlog.md).

Private Referenzbilder, lokale Modelldownloads und Secrets bleiben ausserhalb von Git. Die bereits versionierten Tobi-GLBs sind Spielassets. Der Website-Upload ist ein separater Schritt und benötigt einen frischen Client-Build.
