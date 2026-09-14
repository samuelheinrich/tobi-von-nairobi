# Klang: synthetisierte Foley und der Weg zu echten Samples

Der Prototyp erzeugt jeden Ton zur Laufzeit. Es wird nichts heruntergeladen, nichts eingebettet und nichts lizenziert. Diese Seite beschreibt, wie die Cues gebaut sind, und wie ein Team später echte Aufnahmen einsetzt, ohne Code zu ändern.

## Warum synthetisiert

Für ein Repository ohne Binärassets ist Synthese die günstigste Variante: kein Git LFS, kein Bundle-Wachstum, keine Attributionspflichten und kein Risiko, versehentlich eine unklare Lizenz mitzuliefern. Die Cues sind bewusst keine Platzhalter-Pieptöne, sondern aus Oszillatoren **und gefiltertem weissem Rauschen** zusammengesetzt, weil Aufprall, Glas, Atem und Flüssigkeit ohne Rauschanteil nicht glaubwürdig klingen.

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

1. **Lizenz prüfen.** Für dieses Projekt eignen sich CC0-Quellen ohne Attributionspflicht am besten: [Kenney](https://kenney.nl/assets?q=audio) (CC0), [OpenGameArt](https://opengameart.org/) (gemischt, CC0 filterbar), [Freesound](https://freesound.org/) (pro Datei prüfen, CC0 und CC-BY gemischt) und [Pixabay](https://pixabay.com/sound-effects/). CC-BY ist ebenfalls verwendbar, verlangt aber einen dauerhaften Credit in der Anwendung.
2. **Herkunft dokumentieren.** Quelle, Autor, Lizenz, Datum und erlaubte Änderungen gehören vor dem Commit in [`assets/licenses/README.md`](../../assets/licenses/README.md).
3. **Budget beachten.** `pnpm check:bundle` prüft die komprimierte Gesamtgrösse aller Client-Assets. OGG/Vorbis bei moderater Bitrate ist für kurze Foley die günstigste Wahl.
4. **Grosse Dateien** gehören gemäss [CONTRIBUTING](../../CONTRIBUTING.md) unter Git LFS und brauchen eine Absprache mit dem zuständigen Maintainer.

## Lebenszyklus

Der Kontext startet erst nach einer Nutzergeste, pausiert bei Fokusverlust und Tab-Wechsel und wird beim Verwerfen der Session geschlossen. Stummschaltung setzt den Master sofort auf null und stoppt laufende Stimmen; sie wartet nicht auf das Ende einer Hüllkurve. Der Browsertest misst echte Ausgabeenergie, sofortige Stille beim Stummschalten, Suspend, Resume und Close und stellt sicher, dass genau ein Kontext erzeugt wird.

Offen bleiben räumliches Audio, eine Musikintensitätssteuerung nach Fahndungsgrad, getrennte Regler für Musik und Effekte sowie die Abnahme mit Kopfhörern auf Referenzhardware.
