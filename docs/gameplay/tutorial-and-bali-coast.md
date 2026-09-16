# Tutorial und zusammenhängende Bali-Küste

## Tutorial

„Welcome to Bali“ heisst jetzt **Tutorial**. Die bestehende ID `welcome_to_bali_prototype` bleibt erhalten, damit alte gespeicherte Ergebnisse weiterhin zugeordnet werden können. Die erste Karte der Galerie bleibt vorausgewählt. Die neue Übungsanlage besitzt eine Sichtschutzwand, Übungspartner, freie Bank und fünf Flaschen auf einem hellen Weg. Sie ist von sichtbaren Gartenmauern und Meer umgeben.

Eine grosse, nicht modale Anleitung zeigt immer die aktuelle Aufgabe. Das Spiel läuft weiter, damit die angezeigte Aktion direkt ausgeführt werden kann. Reihenfolge:

1. Drei Meter gehen (WASD/Pfeile).
2. Kamera bewegen (Maus oder Ziehen bei abgelehntem Mausfang).
3. Tatsächlich springen (Space).
4. Eine Sekunde beim Laufen sprinten (Shift).
5. Fünf Flaschen sammeln; früh gesammelte Flaschen zählen mit.
6. Automatisches Trinken und Leergut erklären.
7. Erfolgreich mit G werfen. Wer seine Flaschen schon verbraucht hat, erhält eine Übungsflasche ohne zusätzliche Punkte.
8. In Reichweite des Übungspartners R drücken.
9. Hinter die grüne Wand gehen; die tatsächliche Sichtprüfung muss Deckung melden.
10. Die Bank mit E benutzen und kurz sitzen.
11. Mit E wieder aufstehen; danach CASA TOBI erreichen und mit E abschliessen.

Die Bank nutzt dieselbe `Seating`-Komponente wie Flugzeug und Zug. Kamera, Pause, Bewegung und Lautstärke bleiben während der Anleitung verfügbar. Die Abschlussbedingung wird erst nach allen Übungen freigegeben.

### Neue Spieleraktionen ergänzen

- In `packages/game-data/src/tutorial.ts` eine Lektion mit stabiler ID, Text, Taste, bestätigtem Messwert und Schwelle hinzufügen.
- Benötigte Gegenstände/Stationen in `runtime/levels/tutorial-scene.ts` und Anker in `tutorialLayout` ergänzen.
- Eine bestätigte Aktion im Session-Schritt als Signal melden. Keine rohen DOM-Tasten im Regelmodul lesen.
- Falls ein neuer Messwert nötig ist, `LessonMetric` und die Signalprojektion ergänzen. Die Reihenfolgelogik selbst benötigt keinen neuen Fall.
- In `tests/helpers/tutorial.ts` den echten Eingabeweg ergänzen. Dieser Helfer wird auch für den angemeldeten Speicher-/Reloadtest benutzt; eine neue Lektion darf keinen Skip- oder Debug-Abschlussweg benötigen.

![Geführtes Tutorial mit grosser Anleitung](../screenshots/tutorial-guide.png)

## Bali: Beach, Market & Escape

Seit 16. September 2026 ist die zusammengeführte Küste zur [Bali-Erkundungswelt](bali-open-world.md) ausgebaut: 36 Flaschen, Town/Market, Jungle, Tempel, Reisterrassen, Scooter, Boot und eine erreichbare Insel. Die frühere Pflicht zur Polizeiflucht entfällt. Die alten einzelnen Bali-Level bleiben für historische Spielstände erhalten, sind aber nicht in der Galerie auswählbar. Die ID `bali_adventure` bleibt bestehen; alte Bestzeiten sind mit der grösseren Route nicht vergleichbar.

## Würfe und Zugfahrt

Würfe benutzen jetzt **Tobis letzte Bewegungsrichtung**, unabhängig von der Kameradrehung. Zuvor lief eine seitwärts gedrehte Figur mit unveränderter Kamera weiterhin in die Kamera-Vorwärtsrichtung werfend herum. `CharacterFacing` hält die Richtung auch im Stillstand fest; die Wurfanimation richtet Tobi vor dem Abwurf aus. Der feste Wurfbogen bleibt in engen Innenräumen lesbar. Ein Browsercheck trifft Ziele in allen vier Himmelsrichtungen bei feststehender Kamera.

Im Zug bewegen sich Gebäude, Palmen, Felder und Schwellen nach hinten. 16 wiederverwendete Landschaftsstreifen werden ausserhalb der nahen Spielfläche umgebrochen; auch nach vielen Minuten kommen neue Landschaften vorbei. Die Wagen und ihre Kollisionskörper bleiben für stabile Bewegung lokal fest. Der Browsercheck prüft Bewegung, begrenzte Objektanzahl und unveränderte Collider über 2000 simulierte Sekunden.

![Die Strandzone der zusammenhängenden Küste](../screenshots/bali-coast.png)
