# Offene Tests

Tests, die zu einer gelieferten Änderung gehören, aber bewusst **noch nicht** geschrieben wurden. Auf Anweisung abarbeiten, nicht ungefragt.

Der Grund für diese Liste: Ab einer gewissen Grösse kostet die vollständige Browser-Prüfkette mehr Zeit, als eine kleine Inhaltsänderung wert ist. Statt die Lücke zu verschweigen, steht sie hier.

**Regel:** Was eine Invariante schützt (Platzierungen, Lösbarkeit, Lizenzen, Sicherheit), wird sofort getestet. Was Inhalt ist (Textvarianten, Klangfarbe, Kulissendetails), darf hier landen.

## Status

| Datum      | Offen | Erledigt |
| ---------- | ----- | -------- |
| 2026-09-14 | 3     | —        |

## Offen

### Tobis Zuruf und die Antwort der Menge im laufenden Spiel

- **Betrifft:** `GameHost.step` (Zuruf-Block), `ParadeCrowd.responder`, `BaliCrowd.responder`
- **Fehlender Test:** E2E, das **R** mehrfach drückt und prüft, dass (a) über Tobi eine Sprechblase erscheint, (b) ihr Text zwischen zwei Zurufen wechselt, (c) bei reagierender Menge eine zweite Blase an der Position eines Tänzers erscheint und (d) ab dem dritten Zuruf die genervte Variante kommt. Die reine Datenebene ist bereits unit-getestet (`npc-speech.test.ts`).
- **Aufwand:** M — braucht ein Level mit Menge (Street Parade) und Warten auf die 3-Sekunden-Abklingzeit.
- **Risiko solange offen:** Eine falsch verdrahtete Ankerposition liesse die Antwortblase im Boden oder hinter der Kamera erscheinen. Die Daten stimmen dann trotzdem.
- **Commit:** folgt in diesem Branch

### Sprachausgabe im laufenden Spiel

- **Betrifft:** `SpokenLines`, `SpeechBubbles.onSay`, `GameHost`
- **Fehlender Test:** E2E, das im Spiel prüft, dass eine erscheinende Sprechblase auch eine Äusserung auslöst und dass der Stumm-Schalter sie abbricht. Die Einheit selbst ist im Browser getestet (`audio.spec.ts`), die Verdrahtung über `onSay` noch nicht.
- **Aufwand:** M — `speechSynthesis.speak` lässt sich in Playwright nur indirekt beobachten, am ehesten über einen Stub auf `window.speechSynthesis` vor dem Laden.
- **Risiko solange offen:** Wäre `onSay` nicht gesetzt, bliebe alles stumm, ohne dass ein Test anschlägt.
- **Commit:** folgt in diesem Branch

### Stimmenwahl auf anderen Betriebssystemen

- **Betrifft:** `voice-profiles.ts`, `SpokenLines.pick`
- **Fehlender Test:** Die Wunschstimmen (Rocko, Grandpa, Samantha …) sind macOS-Namen. Auf Windows und Linux greift der Fallback «irgendeine echte Stimme der Sprache». Ungeprüft ist, ob dort überhaupt deutsche Stimmen vorhanden sind und ob die Sperrliste die dortigen Scherzstimmen erfasst.
- **Aufwand:** M — braucht echte Windows-/Linux-Läufe; in Headless-CI sind keine Systemstimmen installiert.
- **Risiko solange offen:** Auf einem fremden System klingt die Besetzung einheitlich oder bleibt stumm. Beides fällt nicht auf die Spielbarkeit zurück, aber die Profile tragen dort nicht.
- **Commit:** folgt in diesem Branch

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
