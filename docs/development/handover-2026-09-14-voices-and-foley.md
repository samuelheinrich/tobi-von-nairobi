# Übergabe: Stimmen, Sprachausgabe und echte Soundeffekte

Stand: 14. September 2026. Branch `feature/fly-high-and-bali`, Stand `460ce77`, gepusht. Diese Übergabe ergänzt [Fly High und Bali-Küste](handover-2026-09-14-fly-high-and-bali.md) und [die erste Übergabe](handover-2026-09-14.md). Der verbindliche Funktionsstand steht in [implementation-status.md](implementation-status.md).

## ⚠️ Zuerst lesen: `main` kann derzeit nichts aufnehmen

Ein direkter Push auf `main` wird abgelehnt — das ist beabsichtigt und richtig. Aber es gibt darüber hinaus einen **Konfigurationsfehler, der jeden PR dauerhaft blockiert**:

| Seite                                        | Wert       |
| -------------------------------------------- | ---------- |
| Branch Protection fordert Status-Check       | `required` |
| CI (`​.github/workflows/ci.yml`) liefert Job | `quality`  |

Der Kontext `required` wird von **nichts** gemeldet. Damit erfüllt kein Pull Request je die Pflichtprüfung — weder dieser noch die sieben darunter. `enforce_admins` ist aktiv, ein Umgehen also auch für den Eigentümer nicht möglich (und nicht gewünscht).

**Die Behebung ist eine Zeile**, aber sie ändert eine Schutzregel und braucht deshalb eine bewusste Entscheidung des Eigentümers:

```bash
gh api -X PATCH repos/samuelheinrich/tobi-von-nairobi/branches/main/protection/required_status_checks \
  -f 'contexts[]=quality'
```

Alternativ den CI-Job in `quality` → `required` umbenennen. Der Agent hat das **nicht** selbst geändert: Schutzregeln sind eine Sicherheitseinstellung, keine Aufräumarbeit.

Die acht offenen PRs sind **gestapelt** (`#8 → #7 → #6 → … → main`), keiner hat ein Review. `main` enthält bis heute nur den leeren Bootstrap-Commit `110c1d9`. Wer die Arbeit auf `main` bringen will, braucht: den Status-Check-Fix, dann Reviews, dann Merges von unten nach oben.

## Was in dieser Sitzung entstanden ist

Sieben Commits, alle einzeln lauffähig, damit ein Abbruch mitten in der Arbeit nichts Halbes hinterlässt.

| Commit    | Inhalt                                                                 |
| --------- | ---------------------------------------------------------------------- |
| `7d4721e` | [Test-Backlog](test-backlog.md) eingeführt                             |
| `f00820d` | Viel mehr Pöbel-Texte, Menge antwortet                                 |
| `e2811f7` | Echte CC0-Aufnahmen für `smash`, `step`, `land`, `block`               |
| `1f54f7c` | NPCs sprechen ihre Zeilen (Web Speech API)                             |
| `6a56cbe` | **Fix:** deutsche Sätze wurden von einer englischen Stimme gelesen     |
| `08e6983` | Polizei ruft beim Sichten, Jagen, Suchen und Festnehmen                |
| `6e143a9` | NPCs sprechen von sich aus, wenn Tobi ihnen nahe kommt                 |
| `460ce77` | Gruppenrollen verteilen sich über viele Stimmen; Skript auf 286 Zeilen |

### Klang

**Echte Aufnahmen** aus [Kenney Impact Sounds 1.0](https://kenney.nl/assets/impact-sounds) (CC0, Lizenz liegt dem Paket bei, Namensnennung freiwillig) für vier Cues: `smash`, `step`, `land`, `block`. 92 KiB, Bundle 1,50 → 1,61 MiB gzip. Herkunft pro Datei in [`assets/licenses/README.md`](../../assets/licenses/README.md).

Dafür war zweierlei nötig, beides in [audio.md](../gameplay/audio.md) beschrieben:

- `SoundBank` kann **Varianten**: `smash.1.ogg`, `smash.2.ogg` … rotieren. Ein Schritt alle 1,6 Meter als identische Wellenform klingt nach Maschinengewehr.
- Lautstärke **pro Cue**. Pakete sind viel heisser gemastert als die synthetischen Cues; mit pauschalem Gain übertönten Schritte alles.

Trinken, Schluckauf, Sirene, Rufe und alle Ambient-Loops bleiben synthetisiert — für Stimme und Flüssigkeit gibt es in CC0-Foley-Paketen nichts Brauchbares.

### Sprachausgabe

Gewählt: **Web Speech API**. 0 Byte, keine Lizenz, kein API-Schlüssel, kein Netz, läuft offline. Vorgenerierte OGGs wären ~2 MiB und müssten bei jeder Textänderung neu gerendert werden; ein Online-Dienst hiesse Schlüssel im Client und Kosten pro Satz.

**Der gemeldete Fehler und seine drei Ursachen** — lehrreich für alle, die daran weiterarbeiten:

1. Es wurde `utterance.lang = 'de-CH'` als Rückfall gesetzt. macOS hat **keine** de-CH-Stimme, also griff der Browser zu seiner Standardstimme: _Albert (en-US)_. Heute gilt: ohne echte Stimme für die Sprache wird **nicht** gesprochen.
2. macOS listet Scherzstimmen (_Bells_, _Zarvox_, _Boing_, _Albert_, …) ohne unterscheidendes Merkmal neben den echten. _Bells_ las die englischen Zeilen. Sie stehen jetzt auf einer Sperrliste in `voice-profiles.ts`.
3. Alle Sprecher teilten sich eine Tonhöhenformel.

Jetzt trägt die Sprechblase ihr `SpeechTopic` bis zur Sprachausgabe — Sprache **und** Stimmprofil kommen aus einer Quelle und können nicht auseinanderlaufen. Das war die Bruchstelle, die den Fehler überhaupt möglich machte.

Gemessene Besetzung auf macOS: Tobi _Rocko_ (Tonhöhe 0,52, laut, zu schnell), Polizei _Reed/Grandpa/Rocko/Eddy_, Schaffner und Wärter _Grandpa_, Yoga _Shelley_, Bar-Mädchen _Samantha_. Gruppenrollen verteilen sich über ihre ganze Wunschliste — sechs Tänzer bekommen sechs Stimmen —, Einzelfiguren behalten eine.

### Wer wann spricht

- **Tobi** bei **R**: 31 Varianten, eigene Register für Zelle und Flugzeug.
- **Menge** antwortet: der nächste reagierende Tänzer, ab dem dritten Zuruf genervt statt belustigt.
- **Polizei** bei Zustandswechseln: «HALT! STEHEN BLEIBEN!» beim Sichten, laufende Rufe während der Jagd, gemurmelte Suche nach Abriss des Sichtkontakts, eigene Zeile bei der Festnahme. `PoliceRuntime` **gibt nur aus**, gezeichnet wird im Host — so bleibt die Verfolgung ohne Szene testbar.
- **Bei Annäherung** auf 3,6 m: `ProximityGreeter` (in `game-core`, enginefrei). Einmal pro Person, dann 25 s Ruhe, höchstens eine Begrüssung alle 3,5 s, und man muss **ankommen** — Herumstehen löst nichts aus. Stockwerke werden beachtet.

## Fallen, die schon behoben sind

- **Taktung der Polizei.** Die erste Fassung schwieg 4 s nach «HALT!». Auf jeder Route, die den Sichtkontakt schnell bricht, kam die Verfolgungs-Zurufe damit _nie_. Jetzt 2,5 s nach dem Sichten, 3,5 s zwischen Rufen. Wer daran dreht: mit `exerciseEscapeRoute('stand')` prüfen, das hält den Sichtkontakt.
- **`undefined` traf den Default-Parameter.** `SpokenLines` nahm `SpeechSynthesis | undefined` mit Default — ein explizites `undefined` fiel damit auf den Browser zurück, und der Fall «Browser ohne Sprachausgabe» war gar nicht ausdrückbar. Heute `null`.
- **Doppelte Stimmvarianten.** Ein Wunschname kann mehrere installierte Varianten derselben Stimme treffen; ohne Dedupe belegten die zwei Plätze und verdrängten den Rest der Liste.
- **Uhr lief rückwärts (nur im Test).** Die Drossel vergleicht gegen den letzten Sprechzeitpunkt. Eine Harness, die ihre Uhr pro Thema zurücksetzt, unterdrückt alles nach dem ersten Thema. Im Spiel ist `performance.now()` monoton.

## Prüfungen

`pnpm check` grün: 65 Unit-Tests, Lint, Format, Importgrenzen, Typecheck, Inhaltsvalidierung, Builds, Bundle 1,61 MiB gzip. Dazu vier Audio-Browsertests und ein Polizei-Zuruf-Test in der Verfolgungs-Harness.

Die Browsertests prüfen bewusst die **tatsächlich gewählte Stimme**, nicht nur dass gesprochen wird — sonst wäre der gemeldete Fehler durchgerutscht: deutsche Themen bekommen eine de-Stimme, englische eine en-Stimme, Tobi und die Yogalehrerin teilen nie eine Stimme, keine Scherzstimme wird je gewählt.

**Offene Tests stehen in [test-backlog.md](test-backlog.md)** — vier Einträge, jeder mit Aufwand und konkretem Risiko. Der Eigentümer hat ausdrücklich gewünscht, Tests aufzuschieben und auf Anweisung nachzuziehen. Die Regel dort: Invarianten (Platzierungen, Lizenzen, Lösbarkeit) sofort testen, Inhalt (Textvarianten, Klangfarbe) darf warten.

Ein Eintrag ist **kein** Rückstand, sondern ein vorbestehender Fehler: der Audio-Energie-Test flackert (misst nach fester Wartezeit statt auf Energie zu warten), einmal in acht Läufen.

## Sinnvolle nächste Schritte

1. **Den Status-Check-Namen klären** (siehe oben). Ohne das bleibt alles auf den Feature-Branches liegen.
2. **Sprachausgabe am echten Gerät anhören.** Systemstimmen klingen synthetisch — für Tobis Pöbeln komisch, für die Yogagruppe vielleicht nicht. Das ist eine Hörentscheidung, keine technische. Der Schalter sitzt an `SpokenLines.enabled`; eine getrennte Einstellung «Sprachausgabe» neben Stumm wäre der nächste Schritt, falls es nicht trägt.
3. **Windows und Linux prüfen.** Die Wunschstimmen sind macOS-Namen; dort greift der Fallback «irgendeine echte Stimme der Sprache». Ob überhaupt deutsche Stimmen installiert sind und ob die Sperrliste die dortigen Scherzstimmen erfasst, ist ungeprüft. In Headless-CI sind keine Systemstimmen installiert.
4. **Balancing mit echten Spielern**, weiterhin das grösste offene Thema aus der vorherigen Übergabe: Sprinttempo, volle Energie pro Flasche, Fluchtfenster, und jetzt zusätzlich die Häufigkeit der Begrüssungen.
5. Erst danach weitere Cues auf echte Aufnahmen umstellen. `SoundBank` ersetzt derzeit benannte Cues, **keine** Loops aus `AudioFeedback.update()`; Sirene und Ambient bräuchten einen eigenen Loop-Lebenszyklus mit Start, Fade, Pause, Stop.

## Arbeitsweise

Der Eigentümer hat kleine, einzeln lauffähige Commits gewünscht, damit ein anderer Agent nahtlos übernehmen kann, wenn die Tokens ausgehen. Das wurde eingehalten: jeder der sieben Commits ist für sich grün.

Auf diesem Rechner lag die Toolchain unter `/tmp/tobi-toolchain/node_modules/.bin`; falls noch vorhanden, vor `PATH` setzen. Ein früheres Problem mit `root`-Besitz der Repo-Dateien wurde vom Eigentümer behoben. Bestehende `.env`-Dateien und Docker-Volumes erhalten, keine Geheimnisse ausgeben, `tmp/` bleibt lokal.
