# ADR 0007 – Lokale Simulation und serverseitiger Dauerzustand

Datum: 2026-09-13. Status: im Plan gewählt, Umsetzung ausstehend.

**Kontext:** Reaktionsfähiges Browsersingleplayer-Spiel und zuverlässige PostgreSQL-Saves sollen ohne dauernde Serversimulation entstehen. Öffentliche Scores sind bei untrusted Clientereignissen manipulierbar.

**Entscheidung:** Bewegung/AI lokal, dauerhafte Zustände und Rewardtransaktionen serverseitig. Der Server berechnet Scores aus begrenzten plausibilisierten Meldungen. MVP-Ranglisten werden als Community-Ergebnisse gekennzeichnet; keine Behauptung verifizierter Physik. Checkpoints sind logische Projektionen mit Revision, Retry-Epoche und Idempotenz.

**Alternativen:** serverautoritatives Gameplay oder vollständige deterministische Replayvalidierung erhöhen Aufwand und Betriebsanforderungen erheblich. Blindes Übernehmen eines Clientsave mit Geld/Score ist zu fehleranfällig.

**Folgen:** Singleplayer-Fortschritt ist verlässlich gegen Duplikate und fremde Zugriffe geschützt, aber keine vollwertige Anti-Cheat-Lösung. Assist-/Debug-Runs werden unterschieden, Konflikte nicht still überschrieben.

**Verifikation:** Lost-Response-Retry, konkurrierender Abschluss, alte Versuchsepoche, manipulierte Meldung, Fremdzugriff und Reload. Bei Einführung kompetitiver Belohnungen muss diese ADR neu bewertet werden. Details: [Save-/API-Vertrag](../../api/data-and-api.md).
