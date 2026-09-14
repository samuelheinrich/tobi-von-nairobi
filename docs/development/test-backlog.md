# Offene Tests

Tests, die zu einer gelieferten Änderung gehören, aber bewusst **noch nicht** geschrieben wurden. Auf Anweisung abarbeiten, nicht ungefragt.

Der Grund für diese Liste: Ab einer gewissen Grösse kostet die vollständige Browser-Prüfkette mehr Zeit, als eine kleine Inhaltsänderung wert ist. Statt die Lücke zu verschweigen, steht sie hier.

**Regel:** Was eine Invariante schützt (Platzierungen, Lösbarkeit, Lizenzen, Sicherheit), wird sofort getestet. Was Inhalt ist (Textvarianten, Klangfarbe, Kulissendetails), darf hier landen.

## Status

| Datum      | Offen | Erledigt |
| ---------- | ----- | -------- |
| 2026-09-14 | —     | —        |

## Offen

_(noch keine Einträge)_

## Erledigt

_(noch keine Einträge)_

## Format

Jeder Eintrag nennt die Änderung, den fehlenden Test, den Aufwand und das konkrete Risiko, das offen bleibt:

```markdown
### <Kurztitel>

- **Betrifft:** Datei oder Modul
- **Fehlender Test:** was geprüft werden müsste, auf welcher Ebene (Unit / Physics / E2E)
- **Aufwand:** S / M / L
- **Risiko solange offen:** was unbemerkt kaputtgehen kann
- **Commit:** Hash der Änderung
```
