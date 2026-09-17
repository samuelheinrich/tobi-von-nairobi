# Regeln für Coding-Agenten

## Projekt und Aufwand

Tobi von Nairobi ist ein Freizeitprojekt, kein geschäftskritisches System. Spielspass, sichtbarer Fortschritt und ein sparsamer Umgang mit Zeit und Codex-Kontingent haben Vorrang vor aufwendigen Prüfprozessen.

## Verbindliche Test- und CI-Regel

Ausdrückliche Eigentümerentscheidung vom 14. September 2026:

- Keine weiteren GitHub-CI-Läufe. Keine Workflows starten, erneut ausführen, aktivieren oder neu einrichten. Keine automatische Testausführung bei Push oder Pull Request.
- Keine CI-Reparaturen, Sharding-Arbeiten oder Wiederherstellung verpflichtender CI-Checks aus alten Übergaben ableiten. Die gesicherte Branch-Protection-Konfiguration ist nur ein historisches Backup und kein Auftrag zur Wiederherstellung.
- Automatisierte Tests sind nur lokal und mit geringem Zeit- und Tokenaufwand erwünscht. Bei Bedarf den kleinsten passenden vorhandenen Test oder eine kurze gezielte Prüfung ausführen.
- Nicht standardmässig `pnpm check`, die vollständige Playwright-Suite oder wiederholte Builds ausführen. Ein Build ist sinnvoll, wenn er für die eigentliche Aufgabe gebraucht wird, etwa für einen Webserver-Upload.
- Für einfache Text-, Dokumentations-, Optik- und Inhaltsänderungen reichen in der Regel Diff-Prüfung oder kurze Sichtkontrolle. Dafür keine neuen Tests schreiben.
- Vorhandene Tests dürfen erhalten bleiben. Aufwendige oder zusätzliche Prüfungen knapp in `docs/development/test-backlog.md` festhalten und nur auf ausdrücklichen Auftrag abarbeiten.
- Keine minutenlangen Status-Polling-Schleifen, wiederholten Logabfragen oder nahezu identischen Fortschrittsmeldungen. Keine Agentensitzung nur zum Überwachen externer Jobs offen halten.
- Durchgeführte Prüfungen kurz und ehrlich nennen; ausgelassene Tests nicht als bestanden darstellen. Fehlende umfassende Tests sind bei diesem Projekt kein automatischer Arbeitsblocker.

Diese aktuelle Eigentümerentscheidung ersetzt widersprechende Test-/CI-Pflichten in älteren Planungsdokumenten, Übergaben, CONTRIBUTING und Workflow-Beschreibungen. Eine erneute CI-Einrichtung benötigt einen neuen ausdrücklichen Auftrag des Eigentümers.

## Weiterhin gültig

Saubere Modulgrenzen, verständliche Änderungen und bestehende Formatkonventionen beibehalten. Fremde Änderungen erhalten. Keine Secrets, `.env`-Dateien oder private Referenzbilder committen. Keine Nachrichten an Dritte ohne Auftrag.

## Webserver-Deployment

Ausdrückliche Eigentümerentscheidung vom 17. September 2026:

- Jeder erfolgreich erstellte Game-Client-Build wird anschliessend automatisch auf den in der lokalen Root-`.env` konfigurierten FTP-Webserver hochgeladen.
- Der Client-Build ruft dafür `tools/deploy/upload-client.mjs` auf. Das Script ersetzt den vollständigen Inhalt von `FTP_path` mit `apps/game-client/dist` und gibt danach eine eindeutige Erfolgsmeldung aus.
- FTP-Zugangsdaten bleiben ausschliesslich in der ignorierten `.env`. Passwörter niemals in Logs, Dokumentation, Commits oder Antworten ausgeben.
- Das Deploy-Script darf nur das explizit konfigurierte Unterverzeichnis unter `/public_html/` leeren. Root- oder übergeordnete Verzeichnisse sind abzulehnen.
- Wenn auf einem fremden Entwicklungsrechner überhaupt keine FTP-Konfiguration vorhanden ist, darf der lokale Build ohne Upload fertig werden. Eine teilweise vorhandene Konfiguration ist dagegen ein Fehler.
- Nach einem beauftragten Build die Upload-Erfolgsmeldung prüfen. Dafür keine GitHub-CI starten.
