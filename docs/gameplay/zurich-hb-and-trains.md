# Zürich HB und S16

Stand: 22. September 2026.

## Blender-Streckenabschnitt

Der nördliche S16-Bogen zwischen HB und Stadelhofen liegt jetzt als editierbare Masterdatei
`assets/blender/levels/zurich-rail/zurich-rail.blend` vor. Der Blender-Marker
`MARK_s16_route` definiert die durchgehende Fahrstrecke und beide Haltepunkte; die Runtime
übernimmt diese Punkte aus `zurich-rail.runtime.json`. Gleisbett und Schienen sind durchgehende
Streifen-Meshes, und die seitlichen Begrenzungen haben eigene vereinfachte Collision-Meshes.
HB, Stadelhofen und die Stadt bleiben vorerst in der vorhandenen Runtime-Architektur. Eine
vollständige Migration des Zürich-Levels wurde für diesen ersten Realtest bewusst nicht
vorgenommen.

Der frühere nördliche Stadt-Parapet und die Stadelhofener Abschlusswand schnitten die
Zugstrecke. Sie haben nun eine sichtbare Öffnung; die Blender-Strecke ergänzt dort Boden und
begrenzende Wände. Eine Bank am HB stand vor der mittleren S16-Tür und liegt nun ausserhalb der
Türbereiche am Bahnsteigende. Die Havok-Wagencollider werden direkt an ihrer ersten
Halteposition erzeugt; zuvor standen sie zunächst 100 Meter unter der Karte und lagen während
der Bewegung weit neben dem sichtbaren Zug. Die Dachlandings zweier begehbarer Läden schliessen
nun ohne Spalt an Rampe und Dach an und haben Geländer an den offenen Seiten.
`node tools/levels/audit-zurich-rail.mjs` prüft den gesamten
Wagenkörper aller drei Wagen gegen Bahnhof-, Stadt- und exportierte Strecken-Collider in
0,5-Meter-Schritten. Der Blender-Validator prüft echte koplanare Flächen statt nur gedrehte
Bounding Boxes; der Export des Streckenabschnitts ist derzeit `PASS`.

Recipe und Master lassen sich mit der [Blender-Pipeline](../blender-level-pipeline.md) bearbeiten.
Nach einem gespeicherten GUI-Edit: Validator und Export ausführen, dann den lokalen Level neu
laden. Der Vite-Produktions-Build kopiert GLB und beide JSON-Sidecars nach
`level-assets/zurich-rail/`; der Dev-Server liest dieselben Dateien direkt aus `assets/game`.

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
offene S16-Durchgang mit der echten Player-Capsule begangen. Für Änderungen am Streckenabschnitt
genügen lokal der Blender-Validator, der Wagenkorridor-Check und bei Bedarf Typecheck und der
kleine Zürich-Datentest. Ein Client-Build lädt automatisch auf den Webserver hoch und wird nur
für eine beabsichtigte Veröffentlichung ausgeführt. Eine
vollständige Fahrt mit freiem Umherlaufen, Ein-/Aussteigen bei allen Türphasen sowie längere
Hardware-/Safari-Abnahme bleiben bewusst manuell; daraus ist keine GitHub-CI-Aufgabe abzuleiten.
Der gezielte Geometrie-Validator meldet derzeit keine kritischen oder hohen Zürich-Befunde.
Vier mittlere Hinweise zu offenen Kanten der grossen Stadt-/Hallenbodenplatten bleiben zur
visuellen Prüfung; deren Rechtecke grenzen teils an andere Bodenplatten und sind nicht
automatisch als gefährliche Fallkante zu verstehen. Ein vollständiger Zugumlauf unter realer
Browser-Grafiklast sowie Ein-/Aussteigen an beiden Stationen bleibt manuell abzunehmen.
