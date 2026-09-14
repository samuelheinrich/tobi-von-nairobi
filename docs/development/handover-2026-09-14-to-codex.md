# Übergabe an Codex: Stand von `main`, Branch Protection und CI

Stand: 14. September 2026, Abend. Geschrieben für den nächsten Codex-Durchgang. Ergänzt deine [Fly-High-Übergabe](handover-2026-09-14-fly-high-and-bali.md) und die [Stimmen-Übergabe](handover-2026-09-14-voices-and-foley.md). Der verbindliche Funktionsstand steht in [implementation-status.md](implementation-status.md).

## Das Wichtigste in drei Sätzen

`main` enthält jetzt den kompletten Projektstand (`c9a6ebe`, 28 Commits) statt nur des leeren Bootstrap-Commits. **Branch Protection ist abgeschaltet** — auf ausdrückliche Anweisung des Eigentümers, nachdem ein regulärer Merge unmöglich war. Die CI auf `main` ist **rot**, weil die E2E-Suite nicht mehr in ihr 20-Minuten-Zeitfenster passt; das ist der nächste sinnvolle Arbeitsschritt.

## 1. Was mit `main` und den Pull Requests passiert ist

### Ausgangslage, die du hinterlassen hattest

Acht gestapelte PRs (`#8 → #7 → #6 → … → #1 → main`), keiner mit Review, `main` bei `110c1d9` («chore(repo): establish protected main branch»). Deine Übergabe wies zu Recht darauf hin, den Schutz nicht zu umgehen.

### Warum nichts mergen konnte

Ein direkter Push scheiterte erwartungsgemäss:

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: - Changes must be made through a pull request.
remote: - Required status check "required" is expected.
```

Die zweite Zeile wurde zunächst **falsch gedeutet** — als hiesse der CI-Job anders als der geforderte Kontext. Das stimmt nicht: `ci.yml` enthält ab Zeile 50 sehr wohl einen Job `required`, der korrekt auf `needs.quality.result == success` prüft. Wer den Workflow nur bis Zeile 20 liest, übersieht ihn.

Die echte Ursache steht im Log des Laufs:

```
Running 31 tests using 1 worker
##[error]The operation was canceled.      ← nach timeout-minutes: 20
```

`quality` erledigt Lint, Format, Typecheck, Unit, Integration, Content-Validierung und Bundlecheck ohne Probleme und bleibt dann in `pnpm test:e2e` hängen: 31 Playwright-Fälle, **ein** Worker, Software-WebGL, kein GPU. Nach zwanzig Minuten bricht GitHub den Job ab, `required` meldet folgerichtig `failure`. **Es hat also nie ein PR die Pflichtprüfung bestanden** — nicht wegen einer Fehlkonfiguration, sondern weil die Prüfung schlicht nicht fertig wurde.

### Was daraufhin getan wurde

Der Eigentümer wurde auf die Sperre und die Konsequenzen hingewiesen und hat die Anweisung danach ausdrücklich wiederholt: Schutz aus, pushen, alles nach `main`. Ausgeführt in dieser Reihenfolge:

1. Schutzkonfiguration gesichert (siehe unten).
2. `gh api -X DELETE …/branches/main/protection`.
3. `git push origin HEAD:main` — `110c1d9..32bc659`, 26 Commits auf einmal, da `feature/fly-high-and-bali` den gesamten Stapel enthält.
4. PR #1 schloss GitHub automatisch als **merged**. #2–#8 liessen sich **nicht** auf `main` umhängen: `There are no new commits between base branch 'main' and head branch '…'` — genau die Bestätigung, dass ihr Inhalt vollständig angekommen ist. Sie wurden deshalb mit einer erklärenden Notiz **geschlossen**, nicht gemergt.

Dass #2–#8 als _closed_ statt _merged_ dastehen, ist kosmetisch: die Commits sind in `main`, die Historie ist vollständig, nichts ging verloren.

### Branch Protection wiederherstellen

Die ursprüngliche Konfiguration liegt jetzt versioniert im Repo unter [`main-branch-protection.json`](main-branch-protection.json), damit sie nicht an einem `/tmp`-Verzeichnis hängt:

```bash
gh api -X PUT repos/samuelheinrich/tobi-von-nairobi/branches/main/protection \
  --input docs/development/main-branch-protection.json
```

Sie entsprach: Pflicht-Check `required` (strict), ein Review, `enforce_admins: true`, kein Force-Push, keine Löschung, Diskussionen müssen aufgelöst sein.

**Reihenfolge beachten.** Wird der Schutz zurückgesetzt, solange die CI in den Timeout läuft, ist sofort wieder _jeder_ PR blockiert — dieselbe Sackgasse wie vorher. Also: erst CI reparieren, dann Schutz zurück.

## 2. CI reparieren — der nächste Arbeitsschritt

Drei Wege, aufsteigend nach Gründlichkeit:

| Weg                                                   | Aufwand | Wirkung                                                     |
| ----------------------------------------------------- | ------- | ----------------------------------------------------------- |
| `timeout-minutes` im Job `quality` anheben (z. B. 45) | S       | Verschiebt die Grenze nur; bei weiteren Tests erneut fällig |
| E2E in einen **eigenen Job** ziehen                   | M       | Lint/Unit/Integration melden schnell und unabhängig grün    |
| Playwright shardem (`--shard=i/n` in einer Matrix)    | L       | Echte Parallelisierung, deutlich kürzere Wanduhrzeit        |

Vor dem Shardem prüfen: `playwright.config.ts` steht bewusst auf `workers: 1`, und die Konfiguration startet **drei** Webserver (API 3001, Preview 4173, Dev 5174). Mehrere Shards brauchen entweder getrennte Ports pro Shard oder `reuseExistingServer`.

Zur Einordnung: Lokal auf Apple-Hardware läuft die volle Suite in rund vier Minuten. Die CI-Zahlen sind damit nicht vergleichbar, weil dort ohne GPU gerendert wird — die bestehenden Tests tragen dem mit eigenen `process.env.CI`-Zeitlimits bereits Rechnung.

## 3. Was inhaltlich dazugekommen ist

Seit deinem Stand `5c84c64` sind es zehn Commits. Fachlich in zwei Blöcken, ausführlich in der [Stimmen-Übergabe](handover-2026-09-14-voices-and-foley.md):

**Echte Soundeffekte.** Vier Cues (`smash`, `step`, `land`, `block`) laufen über Aufnahmen aus [Kenney Impact Sounds 1.0](https://kenney.nl/assets/impact-sounds) (CC0, Lizenz liegt dem Paket bei). 92 KiB, Bundle 1,50 → 1,61 MiB gzip, Herkunft pro Datei in `assets/licenses/README.md`. `SoundBank` kann jetzt **Varianten** (`smash.1.ogg`, `smash.2.ogg` …) und rotiert sie; `AudioFeedback` setzt die Lautstärke **pro Cue**, weil Pakete viel heisser gemastert sind als die synthetischen Cues. Trinken, Schluckauf, Sirene und Ambient bleiben synthetisiert — in CC0-Foley-Paketen gibt es für Stimme und Flüssigkeit nichts Brauchbares.

**Sprachausgabe.** NPCs lesen ihre Sprechblasen über die **Web Speech API** vor: 0 Byte, keine Lizenz, kein Schlüssel, kein Netz. Die Sprechblase trägt ihr `SpeechTopic` bis zur Ausgabe, daraus kommen Sprache _und_ Stimmprofil. Polizei ruft bei Zustandswechseln («HALT! STEHEN BLEIBEN!», Verfolgung, Suche, Festnahme); NPCs begrüssen Tobi von sich aus auf 3,6 m; Gruppenrollen verteilen sich über viele Stimmen, Einzelfiguren behalten eine. Skript: 286 Zeilen in 22 Themen.

Neue portable Module in `game-core`, engine- und DOM-frei wie die bestehenden: `proximity-greeter.ts` (Begrüssungsregeln), erweitertes `npc-speech.ts` (Texte, Sprache, Themen). Clientseitig: `audio/voice-profiles.ts`, `audio/spoken-lines.ts`, `audio/sound-bank.ts`.

**Wichtig für deine Arbeitsweise:** `PoliceRuntime` **gibt Zuruf-Zeilen nur aus** (`takeCallout()`), gezeichnet wird im `GameHost`. So bleibt die Verfolgungslogik ohne Szene testbar — bitte nicht umdrehen und Sprechblasen in die Police-Klassen hängen.

## 4. Tests

`pnpm check` ist lokal grün: 65 Unit-Tests, Lint, Format, Importgrenzen, Typecheck, Content, Builds, Bundle. Dazu vier Audio-Browsertests und ein Polizei-Zuruf-Test in der Verfolgungs-Harness.

Neu eingeführt: [`test-backlog.md`](test-backlog.md). Der Eigentümer hat ausdrücklich gewünscht, ausgiebige Tests wegzulassen und stattdessen offene Tests zu führen und **auf Anweisung** nachzuziehen. Die Regel dort: Invarianten (Platzierungen, Lizenzen, Lösbarkeit) sofort testen, Inhalt (Textvarianten, Klangfarbe, Kulissendetails) darf warten. Derzeit vier Einträge, jeder mit Aufwand und konkretem Risiko.

Einer davon ist **kein** Rückstand aus dieser Arbeit, sondern eine Beobachtung: der Audio-Energie-Test flackert (einmal in acht Läufen), weil er nach fester Wartezeit misst statt auf Energie zu warten.

## 5. Offene Punkte, nach Nutzen sortiert

1. **CI reparieren**, dann Branch Protection zurücksetzen (Abschnitte 1 und 2).
2. **Sprachausgabe am echten Gerät anhören.** Systemstimmen klingen synthetisch — für Tobis Pöbeln komisch, für die Yogagruppe eher nicht. Eine Hörentscheidung, keine technische. Schalter sitzt an `SpokenLines.enabled`; eine getrennte Einstellung «Sprachausgabe» neben Stumm wäre der nächste Schritt, falls es nicht trägt.
3. **Windows und Linux prüfen.** Die Wunschstimmen in `voice-profiles.ts` sind macOS-Namen (Rocko, Grandpa, Samantha …); anderswo greift der Fallback «irgendeine echte Stimme der Sprache». Ob dort überhaupt deutsche Stimmen installiert sind und ob die Sperrliste die dortigen Scherzstimmen erfasst, ist ungeprüft — in Headless-CI gibt es keine Systemstimmen.
4. **Balancing mit echten Spielern.** Weiterhin das grösste offene Thema aus deiner Übergabe: Sprinttempo, volle Energie pro Flasche, Fluchtfenster — und jetzt zusätzlich die Häufigkeit der Begrüssungen und die Taktung der Polizei-Zurufe.
5. Erst danach weitere Cues auf Aufnahmen umstellen. `SoundBank` ersetzt **benannte Cues**, keine Loops aus `AudioFeedback.update()`; Sirene und Ambient bräuchten einen eigenen Loop-Lebenszyklus mit Start, Fade, Pause, Stop.

## 6. Umgebung

Node 24 / pnpm 10.34.5. Auf dem Rechner des Eigentümers lag die Toolchain unter `/tmp/tobi-toolchain/node_modules/.bin`; falls vorhanden, vor `PATH` setzen. Ein früheres Problem mit `root`-Besitz der Repo-Dateien ist behoben. Bestehende `.env`-Dateien und Docker-Volumes erhalten, keine Geheimnisse ausgeben, `tmp/` bleibt lokal und ignoriert.

Für den Webserver weiterhin nur den **Inhalt** von `apps/game-client/dist/` hochladen, nicht die Quell-`index.html`. Ein Produktionsdeployment wurde nicht vorgenommen.
