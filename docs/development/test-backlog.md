# Offene Tests

Tests, die zu einer gelieferten Änderung gehören, aber bewusst **noch nicht** geschrieben wurden. Auf Anweisung abarbeiten, nicht ungefragt.

Der Grund für diese Liste: Ab einer gewissen Grösse kostet die vollständige Browser-Prüfkette mehr Zeit, als eine kleine Inhaltsänderung wert ist. Statt die Lücke zu verschweigen, steht sie hier.

**Aktuelle Regel:** [AGENTS.md](../../AGENTS.md) hat Vorrang. Keine GitHub-CI. Auch bei Invarianten nur eine gezielte lokale Prüfung, sofern sie kurz und tokenarm bleibt. Aufwendige Prüfungen hier festhalten und nur auf ausdrücklichen Auftrag ausführen.

## Status

| Datum      | Offen | Erledigt |
| ---------- | ----- | -------- |
| 2026-09-14 | 4     | —        |

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

### Flackernder Audiographen-Test

- **Betrifft:** `tests/browser-integration/audio.spec.ts`, erster Fall («real audio graph emits cues …»)
- **Beobachtung:** Fiel bei einem von acht Läufen ohne Codebezug durch. Er misst echte Ausgabeenergie nach festen `setTimeout`-Wartezeiten; unter Last reicht das Fenster gelegentlich nicht.
- **Fehlender Test:** Nicht ein fehlender Test, sondern ein zu strammer. Sinnvoller wäre, auf Energie **zu warten** (Polling mit Frist) statt einmalig nach fester Zeit zu messen.
- **Aufwand:** S
- **Risiko solange offen:** Rote CI ohne echten Fehler; im schlimmsten Fall gewöhnt man sich an rote Läufe.
- **Commit:** vorbestehend, nicht durch diese Arbeit verursacht

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

### Modulare Figuren: Spielgefühl und Hardwarebudget

- **Betrifft:** `runtime/character/modular`, Nana-/Parade-Nahbereich, Bahn-/Flugzeug-Sitzfiguren.
- **Fehlender Test:** längere manuelle Runde auf durchschnittlicher Desktop-GPU; Framezeit/Heap beim mehrfachen Wechsel zwischen dicht besetzten Bereichen; Nahprüfung von Rock/Schuhen bei allen Sitz- und Yogaposen. Breite E2E-Wiederholung wurde bewusst nicht ausgeführt.
- **Aufwand:** M, lokal und nur bei konkretem Bedarf.
- **Risiko solange offen:** Spitzen bei erstmaligem Garderobenaufbau, sichtbare LOD-Wechsel oder Überschneidungen einzelner Outfit-/Pose-Kombinationen. Keine garantierte 60-FPS-Aussage.
- **Commit:** Arbeitsstand 15.09.2026, noch nicht committed.

### Nightlife-/Beach-Garderoben

- **Betrifft:** `runtime/character/modular/female`, Nahbereichspools.
- **Fehlender Test:** längere Hardware-/Heap-Prüfung und vollständige Bewegungszyklen aller Outfit-/Pose-Kombinationen. Frontal-/Profil-/Sitzansichten, Auswahl aller 23 Posen sowie eine kleine Datenprüfung wurden lokal durchgeführt.
- **Aufwand:** M, bei konkretem Bedarf lokal.
- **Risiko solange offen:** Garderobenaufbau kann Framezeitspitzen verursachen; extreme Bewegungen können vereinfachte Röcke/Schuhe überschneiden.
- **Commit:** Arbeitsstand, noch nicht committed.

### GLB-Vorschau: Regression und Hardwarebudget

- **Betrifft:** `runtime/character/glb-preview.ts`, `vite.config.ts` (Dev-Route `/models`), `test/models.html`, ein Aufruf in `nana-plaza/npc-population.ts`.
- **Fehlender Test:** automatisierte Prüfung, dass das Spiel **ohne** `?glb=` unverändert läuft und kein glTF-Chunk geladen wird; Framezeit auf echter GPU mit den schweren Figuren (`?glb=girl`, 1,5 Mio Dreiecke pro Kopie); Verhalten beim Slot-Recycling über längere Zeit, wenn die prozeduralen Körper dauerhaft unsichtbar gehalten werden; ob Sams Animationsgruppe bei mehreren Kopien sauber getrennt bleibt.
- **Aufwand:** S für den Ohne-Flag-Fall, M für die Hardwaremessung.
- **Risiko solange offen:** Die Vorschau hängt einen Konstruktoraufruf in die Nana-Bevölkerung. Er kehrt ohne Parameter sofort zurück, aber ein Fehler dort träfe ein Produktionslevel. Die Dauer-Unsichtbarkeit der prozeduralen Körper läuft über einen `onBeforeRenderObservable` und ist nur für die Vorschau gedacht.
- **Geprüft wurde:** Typecheck, ESLint, Prettier, lokaler Build mit Bundle-Messung (1,64 → 1,95 MiB gzip, kein Preload der glTF-Chunks), Laden aller Dateien im Modell-Studio inklusive Sams Idle-Animation, sowie ersetzte NPCs im laufenden Nana-Level unter Software-WebGL.
- **Commit:** siehe Commit dieser Änderung.

### Nina-Game-Version: Engine- und Hardwareprüfung

- **Betrifft:** `models/nina-dancer-game.glb` aus dem [Workflow-Test](nina-dancer-optimierung.md).
- **Fehlender Test:** Laden und Abspielen der drei Clips in Babylon statt nur in Blender; Framezeit auf echter GPU mit mehreren Kopien; Prüfung, ob die Distanzgewichtung beim Blenden zwischen Clips sichtbar zuckt.
- **Aufwand:** S, sobald die Datei über `?glb=nina-dancer-game` im Spiel landet.
- **Risiko solange offen:** Die Gewichte stammen aus einem Fallback, nicht aus Bone-Heat. Sichtbare Deformationsfehler (Strumpfgürtel an der Hüfte, Bikini beim Rumpfdrehen) sind dokumentiert, aber nicht in Bewegung im Spiel beurteilt.
- **Geprüft wurde:** Reimport der exportierten GLB in Blender (42'799 Dreiecke, 65 Bones, 65 Vertexgruppen, drei Clips), gemessener Vertexversatz je Clip, Sichtkontrolle in zwölf gerenderten Posen.
- **Commit:** siehe Commit dieser Änderung.

## Humanoid-Animationen · 15. September 2026

Nur auf ausdrücklichen Auftrag: manuelle Safari-/Referenzhardware-Abnahme, längerer Parcours über weitere Sitztypen und Treppen, Fusskontakt bei abrupten Richtungswechseln sowie Retargeting eines anders aufgebauten Rigs. Der lokale Smoke-Check deckt beide Tobi-Skins, den kompatiblen Sam-Avatar und einen kurzen Zugablauf ab; keine allgemeine GLB-/IK-Qualitätsgarantie. Keine GitHub-CI einrichten.

### Celebrate-Taste C

Die neue Tutorial-Lektion und der vorhandene E2E-Helfer sind angepasst. Ein vollständiger Tutorial-Durchlauf wurde für diese kleine Erweiterung nicht erneut ausgeführt; bei der nächsten manuellen Tutorial-Runde C nach dem Aufstehen mitprüfen. Controller-Verhalten und Tastendruck werden gezielt lokal geprüft, keine CI.

### GLB-NPCs in allen Levels

Gezielt geprüft: alle 17 Rollen über den echten NPC-Erzeuger, Ferninstanzen, Slot-Wechsel und Dispose sowie Zugpassagiere. Noch offen: längere Hardware-/Speichermessung, komplette Runden mit Verfolgung/Festnahme, alle Sitz-/Yoga-/Telefon-Gesten und sämtliche Stockwerkswechsel. Die Fernstufe verwendet statische instanzierte Modellposen; keine allgemeine 60-FPS-Zusage. Nur lokal auf ausdrücklichen Folgeauftrag, keine CI.
