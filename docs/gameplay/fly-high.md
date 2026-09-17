# Fly High — Kabinenübernahme, Landung und Airport-Party

`Fly High` besteht aus einer zusammenhängenden Kabinenübernahme, einem kurzen Arcade-Flug und dem Weg über den Flughafen zur Terminal-Party.

## Spielablauf

1. Tobi startet auf Platz 42C und steht mit **E** auf.
2. Er läuft durch Haupt- und Oberdeck zum Servicewagen vor dem Cockpit.
3. **E** greift den Wagen. Mit **WASD** schiebt Tobi ihn; **E** lässt ihn los.
4. Nur ein ausreichend schneller Aufprall auf die Cockpittür verursacht Schaden. Der Wagen bleibt dabei ein dynamischer Havok-Körper und kollidiert mit Sitzen, Wänden und Tür.
5. Nach dem Türbruch wird der physische Tür-Collider entfernt und die Tür schwenkt zur Seite.
6. Tobi betritt das Cockpit und übernimmt am linken Pilotensitz mit **E** die Kontrolle.
7. Im Flight Mode steuern **W/S** den Pitch, **A/D** Roll und Kurvenflug, **Shift** erhöht und **Space** reduziert den Schub.
8. **L** startet jederzeit einen 16 Sekunden langen Arcade-Landeanflug. Das Flugzeug richtet sich auf die Landebahn aus, fährt das Fahrwerk aus, sinkt kontrolliert und stoppt nach dem Touchdown.
9. Nach dem Touchdown verlässt Tobi mit **E** den Pilotensitz. Third-Person-Steuerung und Character-Collision werden wieder aktiviert.
10. Vierzehn Crewmitglieder und Reisende evakuieren über eigene Wegpunkte vom Flugzeug zum Terminal.
11. Tobi durchquert Rollfeld und Ankunftshalle. Die grosse Partyhalle im Terminal schliesst das Level ab.

Flaschen, Versteckreihenfolge, Lounge-Karte, Crew-Sichtkegel und Beschwerde-Rücksetzungen gehören nicht mehr zum Levelziel.

## Kabine und Modelle

Die stilisierte A380-Kabine besitzt 160 Sitze im 3–4–3-Hauptdeck und 44 Sitze im 1–2–1-Oberdeck. Dazu kommen zwei Treppen, zwei Gänge, Gepäckfächer, Galleys, Toilette, Crew, Passagiere und bewegte Wolken. Das Cockpit erweitert das Oberdeck nach vorne und enthält zwei Pilotensitze, Instrumententafel, Displays, Sidesticks, Wände und eine physisch blockierende Tür.

Passagiersitze verwenden explizite `SeatAnchor`-Marker. Die sichtbaren Kissen, Lehnen und Armlehnen eines Sitzes teilen sich einen Compound-Collider. Dadurch sank die Flugzeugszene bei gleicher Sitzanzahl von ungefähr 877 auf rund 265 Physikkörper. Der Pilotensitz-Anker ist Kind des Flugzeug-Transforms und bewegt Tobi im Flight Mode mit.

Die Außenansicht verwendet unverändert `airbus_a380-841_lufthansa.glb`, das begehbare Cockpit unverändert `free_plane_cockpit.glb`. Beide Dateien werden nur durch Runtime-Transforms eingepasst. Das Cockpit ist in Flugrichtung orientiert. Unter dem Flugzeug liegt eine leichte Landschaft aus instanzierten Häusern, Feldern, Straßen und der Landebahn. Wolken werden beidseitig am Flugzeug vorbeigeführt und relativ zur Flugposition wiederverwendet.

## Flughafen und Finale

Die Terminal-Bar ist nun eine vollständig begehbare Partyhalle. Der Weg führt aus der Arrival Hall
durch zwei animierte Scanner-Bögen über eine grosse, pulsierende Tanzfläche bis zur DJ-Bühne.
Zwei DJs, Clubgäste, physische Bars, Moving Heads und zwölf emissive Laser bilden das Finale. Die
Lichtshow verwendet überwiegend animierte emissive Geometrie statt vieler dynamischer Lichter und
bleibt dadurch auch im Browser günstig. Das Levelziel liegt im hinteren Teil der Halle; der Spieler
muss sie wirklich betreten und durchqueren.

Der Touchdown liegt fest auf der sichtbaren Landebahn. Erst nach dem Aussteigen werden das physische Rollfeld, Ground-Service-Fahrzeuge, Passagiertreppe, Hangars, Tower und Terminal aktiviert. Das Terminal besitzt eine breite Ankunftsöffnung, Check-in-Schalter, Wartezonen, Shops und die offene Partyhalle. Böden, Außenwände, Schalter, Sitze, Shops, Fahrzeuge und Perimeter sind feste Collider. Kleine Markierungen, Lampen und Schilder bleiben reine Darstellung.

Die Evakuierung ist ein wiederverwendbarer Wegpunkt-Runtime-Baustein. Figuren werden gestaffelt aktiviert und laufen über das Rollfeld in die Halle. Auf dem Rollfeld, im Terminal und in der Partyhalle übernehmen räumliche Audiozonen schrittweise Verkehr, Stimmen und Musik.

## Modulgrenzen

| Modul                                     | Verantwortung                                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `runtime/interactions/pushable-object.ts` | Greifen, Loslassen, physisches Schieben, Masse, Geschwindigkeit und Kollision für Wagen, Kisten oder Gepäckwagen |
| `runtime/aircraft/aircraft-controller.ts` | Konfigurierter Arcade-Flug und reproduzierbarer Landeanflug                                                      |
| `runtime/aircraft/types.ts`               | Vertrag zwischen Level-Geometrie und Flug-Runtime                                                                |
| `runtime/flight/flight-runtime.ts`        | Servicewagen → Türbruch → Flight Mode → Landung → Flughafen                                                      |
| `runtime/airport/airport-environment.ts`  | Rollfeld, Ground Equipment, Tower, Terminal, Shops, Partyhalle und Evakuierungsrouten                            |
| `runtime/airport/evacuation-runtime.ts`   | Wiederverwendbare gestaffelte NPC-Flucht entlang von Wegpunkten                                                  |
| `runtime/levels/aircraft-scene.ts`        | Kabine, Sitzanker, Modelle, Tür-Collider, Landschaft, Wolken und Zustandsdarstellung                             |
| `game-data/aircraft.ts`                   | Sitzraster, Crew-Routen, Tür-/Trolley-Positionen, Flug- und Airport-Parameter                                    |

Der Flugcontroller bewegt die Flugzeugdarstellung kinematisch. Die begehbare Kabine bleibt während Phase 1 statisch; im Flight Mode wird sie ausgeblendet und das steuerbare Außenmodell aktiviert. Beim Aussteigen wird Tobi an den festen Airport-Ausgangspunkt gesetzt und erhält normale Bewegung und Kollision zurück.

## HUD, Debugging und lokale Prüfung

Das HUD zeigt Türintegrität, Wagenstatus, Airspeed, Höhe, Schub, Pitch, Roll, **L · LANDEN**, Landeprogress und Evakuierungsfortschritt. Das F1-Menü enthält Teleports zu Servicewagen, Cockpittür und Pilotensitz. Der allgemeine Debug-State enthält den Flight-Snapshot.

- Client-Typecheck und gezieltes ESLint laufen lokal.
- Der Physics-Harness schiebt den Wagen mit echter Physik zur Tür, bricht den Collider auf, übernimmt den Pilotensitz, steuert und landet mit **L**.
- Der gleiche Lauf wechselt anschließend in die Airport-Phase und bestätigt Ausstiegspunkt, Airport-Geometrie sowie 14 gestartete Evakuierungsfiguren ohne Browserfehler.
- Die vollständige Szene verwendet im Airport-Zustand rund 320 Collider.
- Beide ausgelieferten GLBs besitzen dieselben SHA-256-Prüfsummen wie die Quelldateien; es fand keine Kompression statt.
- Es wurden keine GitHub-CI-Läufe gestartet.
