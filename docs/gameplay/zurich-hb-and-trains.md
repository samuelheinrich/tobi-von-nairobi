# Zürich HB und S16

Stand: 16. September 2026.

## Spielwelt

Das Streetparade-Level besteht nun aus sechs Distanzsektoren: Seebecken/Street Parade, Altstadt,
Bahnhofstrasse, Zürich HB, nördlicher Bahntunnel und Stadelhofen. Die bestehende Route am See
bleibt erhalten. Ihre nördliche Begrenzung wurde geöffnet und durch eine durchgehende
Bahnhofstrasse mit Tramgleisen, Fahrleitung, Zürcher Fassaden und drei datengetriebenen Gebäuden
ersetzt. Kiosk und Café besitzen echte Türöffnungen, Innenräume, Möbel-Collider und erreichbare
Dächer.

Der HB ist kein Fassadenblock mehr. Er besitzt eine offene Halle, Bahnhofsuhr, hoch montierte
Abfahrtstafeln, Kioske, Bänke, Signale, zwölf getrennte oberirdische Gleise mit sechs breiten
Inselbahnsteigen sowie vier S-Bahn-Gleise fünf Meter tiefer. Die Oberflächengleise haben sechs
Meter Achsabstand; Gleis 12 und der S16-Zug verwenden dieselbe Achse. Eine kontinuierliche Rampe am
westlichen Hallenrand verbindet die Ebenen, ohne den Hauptlaufweg aufzuschneiden. Der Collider der
Rampe bleibt glatt; sichtbare Tritte, schräge Geländer und geschlossene Schachtwände liefern das
Detail, ohne die Character Capsule an jeder Stufe anzuhalten oder den Level-Untergrund freizulegen.

Stadelhofen ist als kleinere Gegenstation mit drei Gleisen, Bahnsteigen, Ausgang, Shop und
Sitzbereich umgesetzt. Zwölf zusätzliche Flaschen verteilen sich auf Bahnhofstrasse, Halle,
oberirdische Bahnsteige, S-Bahn und Stadelhofen. Das Level umfasst damit 42 Flaschen und zwingt zur
Erkundung der erweiterten Stadt.

## Generisches Train-System

`runtime/trains` ist nicht an Zürich gekoppelt:

- `TrainRoute` sampelt eine aus Punkten bestehende Route in Metern.
- `TrainVehicle` implementiert `STOPPED → BOARDING → DEPARTING → APPROACHING → ARRIVING` und
  kehrt an der Endstation die Fahrtrichtung um.
- `TrainCar` baut Wagen aus einem gemeinsamen Schema. Boden, Stirnwände, Seiten und Türen sind
  grobe Havok-Moving-Platform-Collider; Fenster, Sitze, Stangen und Verkleidung bleiben Renderteile.
- Türen durchlaufen `CLOSED → OPENING → OPEN → CLOSING`; zwei echte Schiebepaneele fahren mit
  ihren Collidern aus einem gut zwei Meter breiten Durchgang. Eine mitbewegte Schwelle überbrückt
  den Höhenunterschied zwischen Bahnsteig und Wagenboden.
- Sitzanker und Ausstiegspunkte werden mit jedem Wagen-Pose-Update mitgeführt. Das bestehende
  Sitzen-System kann deshalb auch in einem fahrenden Zug verwendet werden.
- `TrainSystem` besitzt beliebig viele Routen und liefert einen kompakten Debug-Snapshot mit State,
  Geschwindigkeit, aktueller/nächster Station, Türzustand und Fahrgastzahl.
- `train-station.ts` enthält wiederverwendbare Gleise, Bahnsteige, Rampen, Mobiliar, Uhren,
  statische Züge und Kurvensegmente.

Die S16 besteht zunächst aus drei stilisierten SBB-Wagen. Sie fährt auf einer endlichen, visuell
eingefassten Route HB → Tunnelbogen → Stadelhofen und zurück. Es gibt keine sichtbare
Teleportation. Im Zug überträgt Havok die Plattformgeschwindigkeit an Tobis Capsule; Tobi kann im
Wagen stehen, gehen, sitzen und an offenen Türen aussteigen.

## Fahrgäste und Performance

Zwanzig Bahnhof-NPCs verwenden feste semantische Ziele wie Bahnsteig, Zugtür, Ausgang, Treppe,
Shop und Wartebereich. Nur die als Fahrgäste markierten Figuren laufen bei offenen Türen zum Zug;
beim nächsten Halt erscheinen Aussteiger an der Tür und gehen zum Ausgang. Sie verwenden die
vorhandenen Character-LODs und den begrenzten NPC-Physics-Pool. Entfernte Figuren werden
deaktiviert.

Struktur-Collider bleiben geladen, während wiederholte Dekoration über `WorldSectors` ausgeblendet
wird. Gleise, Dächer, Fassaden, Bahnsteige und Wagen nutzen primitive bzw. zusammengesetzte
Collider. Es gibt keine Triangle-Mesh-Collider für die Zugdetails.

Räumliche Audiozonen mischen Paradebass, Bahnhof/Züge, Stadelhofen und Verkehr über die vorhandene
Synthese. Das F1-Panel zeigt unter `level.trains` Route, State, Geschwindigkeit, Stationen, Türen
und Fahrgastzahl; die allgemeine Physikansicht zeigt zusätzlich Train- und Platform-Collider.

## Offene Abnahme

Der lokale Smoke-Test lädt das Level und die HB-Vorschau ohne Browserfehler. Zusätzlich wurden der
Hallenweg, der vollständige Rampenabstieg, der abgewinkelte Weg ins S-Bahn-Untergeschoss und der
offene S16-Durchgang mit der echten Player-Capsule begangen. Typecheck, der kleine Zürich-Datentest
und ein Client-Build sind die vorgesehenen automatisierten Prüfungen. Eine
vollständige Fahrt mit freiem Umherlaufen, Ein-/Aussteigen bei allen Türphasen sowie längere
Hardware-/Safari-Abnahme bleiben bewusst manuell; daraus ist keine GitHub-CI-Aufgabe abzuleiten.
