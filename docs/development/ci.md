# CI deaktiviert — lokale Prüfungen nach Bedarf

Eigentümerentscheidung vom 14. September 2026: Dieses Freizeitprojekt benötigt keine GitHub-CI. Der Workflow wurde auf GitHub deaktiviert und seine YAML-Datei aus dem Arbeitsstand entfernt. Keine neuen CI-Läufe, Wiederholungen oder Reaktivierungen ohne neuen ausdrücklichen Auftrag.

Verbindliche Regeln: [AGENTS.md](../../AGENTS.md). Vorhandene Testskripte bleiben für gezielte lokale, zeit- und tokensparende Prüfungen verfügbar. Vollständige Testsuiten sind kein Standard und keine Merge-Voraussetzung. Zusätzlicher Prüfbedarf gehört in den [Test-Backlog](test-backlog.md).

Die frühere Sharding-Reparatur und die Anweisung zur Wiederherstellung von Branch Protection sind überholt. `main-branch-protection.json` bleibt als historisches Backup erhalten; seine verpflichtenden CI-Checks sollen nicht automatisch wieder eingerichtet werden.
