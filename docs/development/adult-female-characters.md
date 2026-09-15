# Erwachsene Nightlife- und Beach-Figuren

Die bestehende prozedurale Figurenbasis bleibt der Einstieg. Nur `dancer`, `cabaret`, weibliche `club_guest` und weibliche `beach_guest` erhalten die neuen Profile. Normale Passantinnen, Männer, Flugpersonal, Polizei und Security behalten ihre bisherigen Körper. Neue Pool-Presets sind für künftige Levels verfügbar; ein Pool-Level wurde nicht hinzugefügt.

## Modell und Parameter

`runtime/character/modular/female/` enthält die rollenabhängige Garderobe, Körpergeometrie, Haare, Erzeugung und Bewegungen. Die Besetzung ist explizit erwachsen (23–42 Jahre); auch das kleinere `petite` verwendet ein erwachsenes Gesicht und Erwachsenenproportionen.

Fünf Formen: `slim_glamour`, `slim_busty`, `athletic_beach`, `petite`, `glamour_curvy`. Taille, Hüfte, Brustform/-volumen, Bauchflachheit, Beinlänge, Oberschenkel, Wade, Schultern, Arme und Körperhöhe werden unabhängig berechnet. Brust und Bauch liegen in einer durchgehenden Torso-Oberfläche. Kleidung folgt derselben Form. Die Knie-/Hüftpivots passen sich der Beinlänge an.

Es gibt keine importierten Morph Targets: Parameter werden beim Erzeugen in Geometrie umgesetzt. `femaleRanges` begrenzt alle Werte pro Rolle; auch explizite Overrides werden begrenzt und nicht endliche Eingaben verworfen. Körperhöhe ist nur einer von elf Parametern.

## Garderobe und Variation

17 Outfit-IDs mit passenden Rollenpools: Triangel, Bandeau, Sport-Bikini, High-Cut, Badeanzug, Sarong, offene Bluse, Beach-Shorts, Beach-Kleid, BH-Top/Hotpants, Crop/Shorts, Minikleid, Pailletten, Neon, Leder-inspirierte Clubwear, Cabaret und Corsage. Varianten unterscheiden sich über Flächenabdeckung, Träger, Länge, Schichtung, Schnürung und Verzierung. Boots, Heels und Plateaus gehören zu Nightlife; Sandalen, Flip-Flops und barfuss zu Beach/Pool.

Neun erlaubte feminine Frisuren pro Rollenpool, darunter lange Wellen, hoher Pferdeschwanz, seitlich fallendes Haar und Beach-Wellen. Haarfarbe, sieben Gesichtsformen, Haut, Augen, sechs Make-up-Varianten, Schmuck und passende Accessoires werden separat gewählt. Beach nutzt überwiegend natürliche Farben/Make-up; Bühne erhält unter anderem Gloss, Eyeliner, Lidschatten, Choker und gefärbte Haarvarianten. Kleine Haarsträhnen, Schmuck und Augen-Make-up liegen in der Nahdetailgruppe.

`femalePresets` enthält Rollen mit unterschiedlichen Gewichtungen, z.B. mehr athletische Formen am Strand und mehr Glamour im Go-Go-Bereich. Die Gruppenfunktion bevorzugt zunächst noch nicht vertretene Körper, Frisuren, Outfits und Gesichter. Nach Ausschöpfen eines Pools darf ein Merkmal wiederkehren, aber nicht direkt nach demselben Merkmal. Diese Diversitätsregel verändert die Gewichtung kleiner Gruppen bewusst. Sie gilt für die stabile Erzeugungsreihenfolge; herumwandernde NPCs werden bei neuer Nachbarschaft nicht umgestaltet.

## API und Integration

```ts
const look = generateFemaleNPC({ role: 'gogo_dancer', seed: npcId });
const adjusted = generateFemaleNPC({
  role: 'beach_female',
  seed: npcId,
  body: 'athletic_beach',
  morphs: { waistWidth: 0.9 },
});
```

`generateFemalePreset('gogo_busty', npcId)` verwendet eines von zehn benannten Archetypen. `previous` und `used` ermöglichen Anti-Klon-Auswahl für eigene Gruppen. `diversifyFemaleGroup` überträgt dies auf vorhandene Besetzungen. Gleiche IDs und gleiche Gruppenreihenfolge erzeugen wieder dieselben Figuren.

Nana berechnet die Garderoben einmal für die Einwohnerliste, Parade für ihre Crowd-Liste. Nahbereichspools übernehmen sie über `dressAppearance`; die Ferninstanzen erhalten dieselben Kleidungs-/Hautfarben. Der begrenzte Garderoben-Cache berücksichtigt die vollständige feminine Konfiguration. Bali-Beach-Bar und die Strandzone des zusammengeführten Bali-Levels nutzen die neuen weiblichen Beach-Presets. Gameplay-Ziele, Kollision und Social-Reaktionen bleiben bei den vorhandenen Systemen.

## Bewegung und LOD

23 benannte Posen: 13 Nightlife- und 10 Beach-Varianten. Enthalten sind Idle-/Gewichtsverlagerungen, drei Club-Tänze, zwei Pole-Tänze, Bühne/Flirt/Bar, entspannte Geh-/Sitzposen, Haare-/Brillenrichten, Trinken, Sprechen und Selfie. Animationen teilen Schulter-, Hüft-, Knie- und Ellenbogengelenke mit den bisherigen NPCs. Seedabhängige Phase, Tempo, Pose und Ruheintervalle vermeiden Gleichschritt. Automatische Standposen beginnen weder zu laufen noch sich ohne Sitzplatz zu setzen; authored Sitz-/Gehaktionen bleiben führend.

Zeitversetztes Blinzeln läuft im bestehenden zentralen Figurenpass und nur unter 14 m. Keine neuen Observer je NPC. Mittlere Distanz blendet Schmuck, Haarsträhnen, feines Make-up und Blinzeln aus; Grundfrisur, Gesicht und Körper bleiben. Ferne Figuren nutzen weiterhin die vereinfachten Körper bzw. sechs Crowd-Batches. Maximal 32 detaillierte Nana-NPCs bzw. 16 Parade-NPCs bleiben erhalten.

Alle Figuren teilen Materialtypen und Grundgeometrie, Kleidung wird nach Anpassung je Gelenk/Material zusammengefasst. Angepasste Outfit-Geometrie entsteht beim ersten Aufbau bzw. bei einem nicht gecachten Garderobenwechsel; es gibt keinen vollständigen vorab gebackenen Outfit-Atlas. Keine individuellen Texturdownloads, keine Stoffsimulation, keine Gesichts-Mimik ausser Blinzeln.

## Lokale Sichtprüfung

<http://localhost:5173/test/female.html> zeigt je acht Tänzerinnen, Beach-Frauen, Pool-Gäste oder Cabaret-Figuren. Wechselbare Gruppen, Formvergleich, Seitenansicht und alle 23 auswählbaren Posen; vom Character Studio verlinkt. Die Galerie gehört ausschliesslich zur lokalen Authoring-Umgebung.

Durchgeführt: Typecheck, gezielter ESLint, Frontal-/Profil-/Sitzansichten beider Achtergruppen. Ein einmaliger lokaler Browsercheck prüfte 160 Erzeugungen auf Determinismus, Erwachsenenalter, Parametergrenzen und aufeinanderfolgende Klone; alle 23 Posen wurden angewählt, ohne Browserfehler. Die vorhandene Nana-Havok-Probe bestand in 4,6 s (Etagen, Route, Kamera, Flirt/Getränke, Security, Levelabschluss).

Die Gruppen liegen vor kleinen Gloss-/Blinzelvariationen bei rund 203'000 Dreiecken/175 aktiven Meshes (Nightlife) bzw. 192'000/167 (Beach), mit gemeinsam genutzten Materialien. Das ist eine Geometriezählung und kein Hardware-FPS-Benchmark. Noch offen: längere GPU-/Heap-Prüfung bei vielen Garderobenwechseln und vollständige Bewegungszyklen aller Outfit-/Pose-Kombinationen. Vereinfachte Gelenke und Röcke können bei extremen Posen Überschneidungen zeigen.

Keine neue Testsuite, keine GitHub-CI und kein erneuter Produktionsbuild für diese Änderung.
