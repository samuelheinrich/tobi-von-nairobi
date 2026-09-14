# Klang: synthetisierte Foley und der Weg zu echten Samples

Der Prototyp erzeugt jeden Ton zur Laufzeit. Es wird nichts heruntergeladen, nichts eingebettet und nichts lizenziert. Diese Seite beschreibt, wie die Cues gebaut sind, und wie ein Team später echte Aufnahmen einsetzt, ohne Code zu ändern.

## Warum synthetisiert

Für den Prototyp hält Synthese den Audio-Download klein und benötigt keine externen Audio-Lizenzen. Das Repository enthält bereits binäre Levelvorschaubilder; kleine, optimierte Audiodateien sind deshalb kein grundsätzlicher Architekturbruch. Die Cues sind bewusst keine Platzhalter-Pieptöne, sondern aus Oszillatoren **und gefiltertem weissem Rauschen** zusammengesetzt, weil Aufprall, Glas, Atem und Flüssigkeit ohne Rauschanteil nicht glaubwürdig klingen.

`AudioFeedback` besitzt genau einen `AudioContext`, einen Master-Gain, einen begrenzten Stimmenpool von 32 gleichzeitigen Quellen und zwei Bausteine:

- `tone({ frequency, duration, delay, end, volume, type, filter })` — ein Oszillator mit Hüllkurve und optionalem, mitlaufendem Biquad-Filter.
- `noise({ duration, delay, volume, type, from, to, q })` — eine Sekunde weisses Rauschen als Schleife, durch einen gewobbelten Biquad-Filter.

## Die Cues

| Cue                  | Aufbau                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `smash`              | Glasbruch: Highpass-Knack, gefilterter Körper, langer Splitter-Schweif und vier unharmonische Klingeltöne plus Bums  |
| `drink` / `refill`   | Gluck-gluck: fünf steigende Schlucke über dumpfem Flüssigkeits-Rauschen; `refill` hängt ein aufsteigendes Funkeln an |
| `hiccup`             | Schluckauf: kurzes Bandpass-Rauschen, dann ein aufwärts kippender und ein abfallender Dreieckston                    |
| Sirene (in `update`) | Europäisches Zweiton-Horn: 660/880 Hz im Wechsel durch ein schmales Band, nicht als Glissando                        |
| `provoke`            | Ruf: Sägezahnquelle durch ein wanderndes Formantband, mit Atemrauschen                                               |
| `grumble`            | Dieselbe Stimmform, tiefer und mit fallendem Formant: Schaffner und Wärter                                           |
| `flirt` / `reject`   | Zweitonpfiff aufwärts beziehungsweise fallende kleine Sekunde                                                        |
| `block`              | Dumpfer Anprall aus Tiefton und Lowpass-Rauschen, wenn jemand im Weg steht                                           |
| `cheer`              | Menge: zwei überlagerte Bandpass-Rauschschwellen                                                                     |
| `throw`              | Wischgeräusch als aufsteigendes Bandpass-Rauschen mit fallendem Ton                                                  |
| `step`, `land`       | Ton plus kurzer Rauschtransient statt eines reinen Klicks                                                            |
| `caught`             | Absteigende Terzen und danach eine zufallende Zellentür                                                              |

Dazu kommen kulissenabhängige Ambient-Loops im festen Takt: Kick und Bass für die Parade, Four-on-the-floor plus Hi-Hat für Nana Plaza, Schienenstösse für den Zug, ein Zupfmotiv für die WG sowie Tropfen und eine ferne Tür für die Zelle.

## Echte Aufnahmen einsetzen

`SoundBank` ist der vorbereitete Weg. Sie sammelt über `import.meta.glob` alles unter `apps/game-client/src/assets/audio/` ein, dessen Dateiname einem Cue aus `sound-cues.ts` entspricht, dekodiert die Dateien nach der ersten Nutzergeste und bevorzugt sie ab dann gegenüber der Synthese. Ein fehlender oder defekter Download lässt den jeweiligen Cue synthetisiert.

```text
apps/game-client/src/assets/audio/
  smash.ogg      → ersetzt den synthetischen Glasbruch
  drink.ogg      → ersetzt das Gluck-gluck
  hiccup.ogg     → …
```

Es ist kein Codeeingriff nötig: Datei ablegen, bauen, fertig. Was dazugehört:

1. **Lizenz prüfen.** Für dieses Projekt eignen sich CC0-Quellen ohne Attributionspflicht am besten: [Kenney](https://kenney.nl/assets?q=audio) (CC0), [OpenGameArt](https://opengameart.org/) (gemischt, CC0 filterbar), [Freesound](https://freesound.org/) (pro Datei prüfen, CC0 und CC-BY gemischt). [Pixabay](https://pixabay.com/service/license-summary/) verwendet eine eigene Content License und ist keine pauschale CC0-Quelle. CC-BY ist ebenfalls verwendbar, verlangt aber einen dauerhaften Credit in der Anwendung.
2. **Herkunft dokumentieren.** Quelle, Autor, Lizenz, Datum und erlaubte Änderungen gehören vor dem Commit in [`assets/licenses/README.md`](../../assets/licenses/README.md).
3. **Budget beachten.** `pnpm check:bundle` prüft die komprimierte Gesamtgrösse aller Client-Assets. OGG/Vorbis bei moderater Bitrate ist für kurze Foley die günstigste Wahl.
4. **Grosse Dateien** gehören gemäss [CONTRIBUTING](../../CONTRIBUTING.md) unter Git LFS und brauchen eine Absprache mit dem zuständigen Maintainer.

## Lebenszyklus

Der Kontext startet erst nach einer Nutzergeste, pausiert bei Fokusverlust und Tab-Wechsel und wird beim Verwerfen der Session geschlossen. Stummschaltung setzt den Master sofort auf null und stoppt laufende Stimmen; sie wartet nicht auf das Ende einer Hüllkurve. Der Browsertest misst echte Ausgabeenergie, sofortige Stille beim Stummschalten, Suspend, Resume und Close und stellt sicher, dass genau ein Kontext erzeugt wird.

Offen bleiben räumliches Audio, eine Musikintensitätssteuerung nach Fahndungsgrad, getrennte Regler für Musik und Effekte sowie die Abnahme mit Kopfhörern auf Referenzhardware.

## Eingebaute Aufnahmen — 14. September 2026

Vier Cues laufen jetzt über echte Aufnahmen aus **[Kenney Impact Sounds 1.0](https://kenney.nl/assets/impact-sounds)** (CC0, Lizenz liegt dem Paket bei, keine Namensnennungspflicht):

| Cue     | Takes | Herkunft           | Warum diese                                                 |
| ------- | ----- | ------------------ | ----------------------------------------------------------- |
| `smash` | 3     | Glas schwer/mittel | Der Flaschenwurf ist der auffälligste Klang im Spiel        |
| `step`  | 3     | Beton              | Läuft dauernd; echte Schritte tragen den Eindruck von Tempo |
| `land`  | 2     | weicher Aufprall   | Zusammen mit `step` wird die Fortbewegung körperlich        |
| `block` | 2     | Schlag mittel      | Wenn der Schaffner Tobi zurückschiebt                       |

Zusammen 92 KiB. Alles andere — Trinken, Schluckauf, Sirene, Rufe, Jubel und sämtliche Ambient-Loops — bleibt synthetisiert. Für Stimme und Flüssigkeit gibt es in CC0-Foley-Paketen schlicht nichts Passendes; dafür braucht es entweder eigene Aufnahmen oder Sprachsynthese.

`SoundBank` wählt pro Cue reihum eine andere Aufnahme, damit ein oft wiederholter Klang nicht als identische Wellenform hämmert. `AudioFeedback` setzt die Abspiellautstärke **pro Cue**: Pakete sind deutlich heisser gemastert als die synthetischen Cues, und ein Schritt alle 1,6 Meter muss klar unter einer zerspringenden Flasche liegen. Ein Browsertest prüft, dass die Dateien tatsächlich dekodieren, als Varianten registriert sind und rotieren — sonst fiele ein Tippfehler im Dateinamen nur auf die Synthese zurück und bliebe unbemerkt.

## NPCs sprechen ihre Zeilen — Web Speech API

Die Figuren lesen ihre Sprechblasen jetzt vor. Dafür wurde die **Web Speech API** des Browsers gewählt, nicht vorgenerierte Audiodateien und kein Online-Dienst.

### Warum diese Variante

| Ansatz                                             | Kosten                               | Bewertung                                                                                                        |
| -------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Web Speech API** (gewählt)                       | 0 Byte, keine Lizenz, kein Schlüssel | In jedem aktuellen Browser vorhanden, läuft offline auf dem Gerät des Spielers. Stimmenqualität hängt vom OS ab. |
| Vorgeneriert mit Piper/Coqui und als OGG committen | grob 130 Zeilen × ~15 KiB ≈ 2 MiB    | Gleichbleibende Qualität, aber jede Textänderung erzwingt einen neuen Renderlauf und eine neue Lizenzprüfung.    |
| Online-TTS (ElevenLabs, Google, Azure)             | API-Schlüssel, Kosten, Netz pro Satz | Für ein Gastspiel ohne Backend unpassend: Schlüssel im Client, Latenz, Datenschutz und laufende Kosten.          |

Bei 180 verfügbaren Stimmen im Testbrowser — darunter mehrere de-DE und en-US — ist der eingebaute Weg deutlich das beste Verhältnis. Ein Messlauf ist in `spoken-lines` dokumentiert.

### Verhalten

- **Sprache steht in den Daten.** `speechLanguage(topic)` liefert `de` oder `en`; nur die Bar-Mädchen sprechen Englisch. So liest keine deutsche Stimme «Handsome man!» vor.
- **Stimme pro Figur.** Ein stabiler Index über die verfügbaren Stimmen plus eine Tonhöhe pro Sprecher lassen zwei benachbarte NPCs unterschiedlich klingen, und dieselbe Figur über einen Durchlauf hinweg gleich.
- **Kein Rückstau.** Eine neue Zeile bricht die laufende ab, und zwei Zeilen innerhalb einer Drittelsekunde ergeben nur eine gesprochene: in einer Menge liefe die Sprachausgabe sonst Sekunden hinter den Sprechblasen her.
- **Stumm und Pause schalten sie ab.** Die Sprachsynthese läuft **nicht** über den `AudioContext`, deshalb würde der Master-Gain sie nicht erreichen; sie wird getrennt gestoppt.
- **Reine Verbesserung.** Kein Sprachausgabe-Support, keine passende Stimme, ein verweigernder Browser oder ein Fehler enden damit, dass die Zeile eben nicht gesprochen wird. Die Sprechblase trägt den Text ohnehin.

Ein Browsertest prüft Stimmenwahl, Sprache, Drosselung, Stummschaltung und ausdrücklich den Fall ganz ohne Sprachsynthese.

### Offen

Die Stimmen sind Systemstimmen und klingen entsprechend synthetisch — für Tobis Rufe ist das komisch, für die Yogagruppe eher nicht. Ob das Ergebnis insgesamt trägt, ist eine Hörentscheidung am echten Gerät; Linux-Installationen ohne installierte Stimmen bleiben stumm. Falls es nicht überzeugt: Der Schalter sitzt in `GameHost.setMuted` beziehungsweise an `SpokenLines.enabled`, und eine getrennte Einstellung «Sprachausgabe» wäre der nächste Schritt.

### Noch nicht eingebaut

Freesound verlangt für die geprüften Kandidaten (Glasbruch von avrahamy, Cartoon-Schluckauf von NicknameLarry, beide CC0) einen Login zum Download; seine [Lizenzübersicht](https://freesound.org/help/faq/#licenses) unterscheidet CC0, CC-BY und CC-BY-NC, eine Suchtreffer-Erwähnung ist kein Lizenznachweis für den Treffer selbst.

### Zusätzliche Effekte, nach Nutzen priorisiert

1. **Tobis Stimme:** drei bis fünf kurze Varianten von «He, Platz da!», «Karl regelt das!» und «Ich bin gleich in Abu Dhabi!». Mehrere Schluckauf-Varianten mit zufälligen Pausen; Dialoge haben Vorrang vor Schluckauf. Keine dauerhaft wiederholten Rufe.
2. **Materialabhängige Schritte:** Holz im Zug und der WG, Asphalt in Zürich, Fliesen in der Zelle. Stolpern erhält einen Schuhschleifer, Sprint dezentes Schnaufen.
3. **Räumliche Verfolgung:** Sirenen und Polizeifunk werden mit Entfernung leiser und links/rechts ortbar. Eine kurze musikalische Auflösung bestätigt die erfolgreiche Flucht.
4. **WG:** Dielenknarzen, Geschirrklappern in der Küche, gelegentliche Klangschale im Yogaraum und ein genervtes «Pssst!». Aus anderen Stockwerken gedämpft hören.
5. **Zug:** vorhandene Schienenstösse um Wagenrasseln, eine kurze Türzischfolge, Gläser an der Bar und «Billette bitte!» ergänzen. Lautstärke an Übergängen weich überblenden.
6. **Street Parade/Nana Plaza:** Musik an Trucks beziehungsweise Tanzfläche verorten; zum See hin ausblenden. Menge reagiert kurz auf Pöbeln. Verständliche NPC-Antworten mit Untertiteln statt ausschliesslicher Pfiffe.
7. **Zelle:** Schlüsselbund beim Wärter, Riegel beim Türkontakt, knarrendes Bett und sparsame Raumhall-Antwort auf Tobis Rufe. Stille zwischen Ereignissen erhält den Kontrast zur Parade.

### Integrationsgrenzen

- `SoundBank` ersetzt derzeit einzelne benannte Cues, aber keine Sirenen- oder Ambient-Loops aus `AudioFeedback.update()`. Für diese braucht es einen eigenen Loop-Lebenszyklus mit Start, Fade, Pause und Stop.
- Pro Cue wird derzeit ein Buffer geladen. Mehrere Aufnahmevarianten erfordern eine Erweiterung der Bank mit Variantenwahl und Vermeidung unmittelbarer Wiederholung.
- Als erste Sample-Passage drei bis fünf kurze Mono-Effekte und ein zusätzliches Transferbudget von höchstens 250 KiB anstreben. Führende Stille abschneiden, Pegel angleichen und Clipping prüfen. Browser-Decodierung einschliesslich Safari testen; die Synthese bleibt der Fallback.
- Vor mehr gleichzeitigem Klang getrennte Regler für Musik, Effekte und Sprache einführen. Sprachpriorität, begrenzte Wiederholraten und Distanzdämpfung verhindern, dass die Menge Tobi übertönt.
