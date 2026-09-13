# ADR 0002 – PostgreSQL und Persistenzgrenzen

Datum: 2026-09-13. Status: im Plan gewählt, Umsetzung ausstehend.

**Kontext:** Account, Spielslot, Inventar, Fortschritt und Belohnungen müssen konsistent und dauerhaft gespeichert werden. Der Browserzustand ist gross und kurzlebig.

**Entscheidung:** PostgreSQL für relationale Dauerzustände, Sessions, Runergebnisse und versionierte kompakte Checkpoints. Keine Position-/AI-Synchronisation pro Tick. Geld und Fortschritt ändern sich durch serverseitige Anwendungsfälle in Transaktionen.

**Alternativen:** Browserstorage allein erfüllt Account-/Gerätewechsel und Datenbankvorgabe nicht; ein einzelnes grosses JSON-Save erschwert atomare Rewards und Nebenläufigkeit. Redis ist im MVP nicht notwendig.

**Folgen:** Schema-/Backupverantwortung, Restoretests und explizite Konfliktbehandlung. JSONB nur für validierte Snapshot-/Settings-/Eventstrukturen, nicht als Ersatz für alle Beziehungen.

**Verifikation:** gleichzeitiger Abschluss, verlorene Response, fremder Slot, Restore und Migration. Vollständiges Modell: [Daten und API](../../api/data-and-api.md).
