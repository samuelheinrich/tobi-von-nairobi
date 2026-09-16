# Bali: Beach, Market & Escape · Erkundungswelt

Stand: 16. September 2026. Level-ID `bali_adventure` und Galerietitel bleiben erhalten. Die vorherige Polizeiflucht wird durch **36 Flaschen sammeln und mit E bei CASA TOBI abschliessen** ersetzt. `maxWanted: 0`; Chaos, Trinken, Werfen, Pöbeln und Punkte bleiben verfügbar. Content-Version: `prototype-6-bali-world`.

## Welt und Orientierung

Die zusammenhängende Hauptinsel ist ungefähr 330 × 450 Meter gross. Ein unregelmässiger Küstenverlauf, abfallender Meeresboden, Nebel und entfernte Inselkörper ersetzen die alte Bodenplatte. Elf logische Sektoren:

| Sektor              | Inhalt                                                            |
| ------------------- | ----------------------------------------------------------------- |
| beach               | Start, Strandbar, Liegen, Schirme, Volleyball, Palmen, Scooter    |
| town                | CASA TOBI, Shops, Convenience Store, Innenräume und Dachzugänge   |
| market              | Stände, Warung, Marktgassen, Flaschen auf dem Dach                |
| roads               | Asphalt-/Erdstrassen, Abzweigungen, Schilder, Scooter-Sammelpunkt |
| jungle              | bewachsene Hügel, Felsen, Bachsenke und Brücke                    |
| temple              | erhöhte Tempelplattform, Treppe/Rampe, Split Gate, Schreine, Hof  |
| rice_terraces       | vier gestufte Felder, Wasser, schmale Wege und seitlicher Aufgang |
| harbour             | Warung, Verkaufsstelle, Landungssteg und Boot                     |
| island_1            | erreichbare Insel, Strand, Schrein, Hütte und fünf Flaschen       |
| island_2 / island_3 | entfernte Silhouetten für räumliche Tiefe                         |

Beach → Town → Market → Jungle → Temple ist über Strassen verbunden. Terrassen und Hafen bilden Nebenäste. Der Tempel liegt im Norden, das Meer im Westen; Ortsnamen im HUD, Wegweiser und markante Gebäude helfen bei der Orientierung. Ein Boot verbindet die beiden Landungsstege. Zwei weitere Inseln sind Kulisse, keine ausgebauten Ziele.

## Fahrzeuge und Interaktion

- **E:** Scooter/Boot übernehmen bzw. absteigen; in Gebäuden weiterhin Sitzplätze benutzen.
- **W/S bzw. Pfeile:** Gas / rückwärts, **A/D:** lenken, **Shift:** bremsen.
- Bootsausstieg nur langsam an einer definierten Landungszone. Auf offenem Meer bleibt Tobi im Boot.
- Scooter-Ausstieg sucht eine freie, begehbare Stelle neben dem Fahrzeug. Ins Meer gefahrene Scooter werden am Parkplatz geborgen.
- Ohne Fahrzeug wird Tobi nach einem Sturz ins Wasser an den letzten sicheren Landpunkt zurückgesetzt. Es gibt kein Schwimmsystem.

`VehicleBase` kapselt Havok-Body, Eingaben, Fahrer, Geschwindigkeit, Fahrersitz und Ausstiegsvertrag. `ScooterVehicle` ergänzt Bodenanpassung, `BoatVehicle` Wasserhöhe und Dock-Prüfung. Der physische Body bewegt sich über Geschwindigkeit; Tobi folgt dem Sitzanker mit eigener deaktivierter Capsule, solange er fährt. Kamera und Sitzanimation verwenden die bestehende Character-Runtime. Andere Figuren und Weltgeometrie behalten ihre Kollisionen. Fahrzeuge können auch unbesetzt als begehbare Objekte wirken.

## Sammlung und Gebäude

36 Flaschen liegen an Strand, Markt, in Innenräumen, auf Dächern, an Strassen, im Tempel, auf Terrassen und auf der Insel. Ein beschilderter Strassen-Pickup benötigt einen gefahrenen Scooter (`requiredVehicle`). Fünf Inselflaschen erfordern die Bootsreise. Die lokale Referenzroute erreicht alle Flaschen mit tatsächlicher Bewegung und Kollision.

17 Gebäude verwenden gemeinsame Metadaten: `facade_only`, `shallow_interior`, `fully_enterable`, Türöffnung, Dachzugang, Innenraumtyp und Sitz-/Spawnanker. Wände, Möbel und Dächer besitzen vereinfachte Compound-/Box-Collider. Betritt Tobi ein Gebäude, wird das Dach optisch ausgeblendet; die physische Decke bleibt bestehen. Dachzugänge verwenden Rampen mit sichtbaren Stufen. Das aktuelle Gebäudemodul baut rechteckige eingeschossige Gebäude mit vorderer Tür; beliebige Grundrisse und mehrere Türen sind noch nicht implementiert.

## Technik und Performance

- `packages/contracts/src/world.ts`: gemeinsame Fahrzeug-, Gebäude- und Sektorverträge.
- `packages/game-data/src/bali-world/`: Welt/Höhenfeld, Gebäude, Flaschen, NPC-Positionen und Fahrzeugdaten.
- `runtime/levels/bali-world/`: Gelände, Strassen, Landmarks, Vegetation, Atmosphäre und Komposition.
- `runtime/world/`: wiederverwendbare Gebäudekonstruktion und Sichtbarkeitssektoren.
- `runtime/vehicles/`: gemeinsame Fahrzeugbasis, Scooter, Boot, E-Interaktionen.
- Bestehende Havok-Collider-Factory, Layer, NPC-Grounding, Sitzsystem, Missionen und räumliche Audiomischung werden weiterverwendet.

Ein grobes Dreiecks-Höhenfeld trägt Gelände und Küste. Gebäude und grössere Props verwenden einfache Collider; Blätter, Markierungen und Kleindetails sind ausdrücklich Dekoration. Primitive Geometrie und Materialien werden geteilt; Vegetation verwendet Instanzen. Die Sektoren schalten entfernte Renderobjekte ab und erzeugen Dekoration erst bei Annäherung. Statische Strukturen und einmal erzeugte Collider bleiben geladen: **kein vollständiges Asset-/Physics-Unloading**. Babylon übernimmt Frustum-Culling; die Bali-Bewohner werden in der Ferne deaktiviert. Wasser besteht aus animierten Schaumstreifen, ohne Fluidsimulation. Surf, Natur und Stimmen nutzen synthetische lokale Audioquellen mit räumlichem Übergang.

## Prüfstand und Grenzen

Lokal bestanden: Datenprüfung, vollständige Havok-Route mit 36/36 Flaschen, Innenräumen/Dächern, Scooter, Tempel, Terrassen, Bootsreise hin/zurück, blockiertem Offshore-Ausstieg und Missionsabschluss. Die Route aktiviert die Sektoren und deren tatsächliche Dekorations-Collider; eine Prüfung verhindert unbemerkte Wege durch unsicheres Wasser. Gemeinsame Physics-/Projektile-/Nana-/Zellenprüfungen bleiben grün. Keine GitHub-CI.

Das ist ein spielbarer prozeduraler Ausbau. Vegetation, Fahrzeuge und Architektur sind stilisiert und brauchen noch eine künstlerische Detailrunde. Kein gemessener 60-FPS-Nachweis, kein Safari-/Langzeittest. Ein Teil der weiter entfernten Welt bleibt bewusst einfach. Neue Fahrlektionen im geführten Tutorial fehlen noch; im Bali-Level erklären Interaktionshinweise die Steuerung. Alte Bali-Bestwerte bleiben unter derselben Level-ID gespeichert und sind nicht unmittelbar mit der neuen längeren Route vergleichbar; es wurde keine Datenbankmigration oder Löschung ausgeführt.
