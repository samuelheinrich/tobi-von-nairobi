# ADR 0006 – Geteilte Schemas und datengetriebener Content

Datum: 2026-09-13. Status: im Plan gewählt, Umsetzung ausstehend.

**Kontext:** JSON-Missionen und HTTP-Payloads sind zur Laufzeit untypisiert. Fünf Entwickler sollen neue Inhalte und Handler ohne grosse gemeinsame Dateien ergänzen können.

**Entscheidung:** contracts enthält validierbare Schemas mit abgeleiteten TypeScript-Typen, game-data kleine versionierte Contentdateien, game-core portable Handler. Neue Missionsarten ergänzen einen registrierten Handler samt Schema/Tests. Content definiert keine freien Scripts.

**Alternativen:** reine TS-Interfaces reichen nicht zur Eingabeprüfung; fest verdrahtete Missionen verursachen Levelabfragen in allgemeinen Systemen. Ein universeller visueller Scriptingeditor wäre für das MVP zu aufwendig.

**Folgen:** Content-/Snapshot-/Scoreversionen sind explizit, stabile IDs werden validiert, Zyklen und fehlende Referenzen blockieren Builds. Eine zentrale Registry bleibt kleine Verdrahtung; Definitionen liegen dezentral pro Domäne.

**Verifikation:** ein zweites Level allein durch validierte Daten, ein neuer Objective-Typ ohne Änderung bestehender Handler und Migration einer älteren Snapshot-Fixture. Details: [Game Design](../../../GAME_DESIGN.md).
