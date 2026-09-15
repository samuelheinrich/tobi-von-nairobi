# Modulare Charaktere

## Analyse und Umbau

Die bestehenden NPCs verwenden prozedurale TransformNode-Gelenke, kein GLB-Skeleton. `NpcRig.root/head/arms/legs` bildet den gemeinsamen Animationsvertrag; PoliceRuntime, BaliCrowd und Thin-Instance-Mengen hatten separate Quaderkörper. Tobi besitzt bereits eine eigene rundere Figur samt Wiedererkennungsmerkmalen und Flaschenanker.

Vorschlag und Umsetzung: `runtime/character/modular/` trennt deterministische Presets, gemeinsam genutzte Geometrie/Materialien, Gesicht/Frisur, Körper/Kleidung, Rig und LOD. `npc-kit.ts` bleibt kompatibler Einstieg. Schulter-/Hüftpivots bleiben erhalten; Ellenbogen und Knie ergänzen die Hierarchie. Visuelle Änderungen verändern keine Navigation, Trefferreichweiten oder Missionslogik.

Zuerst fünf Beispiele (Mann, Frau, Tänzerin, Security, Polizei) in einer lokalen Galerie. Danach Integration in Nana, Bahn, WG, Flugzeug, Polizei und Menschenmengen. Seed und Kategorie wählen passende Teile; Uniformrollen haben eigene erlaubte Kombinationen. Ein Szenen-Cache teilt Materialien und Grundgeometrie. Kleine Teile werden je Gelenk und Material zusammengefasst. Ein zentraler LOD-Pass blendet Gesichter/Accessoires nach Entfernung aus; entfernte Menschenmengen behalten Instanzgruppen.

Keine GitHub-CI. Gezielter lokaler Typecheck und visuelle Browserprüfung; vorhandene Nana-Havok-Probe prüft die Kompatibilität der Interaktionen.

## Implementierte Bausteine

| Datei unter `runtime/character/modular/` | Aufgabe                                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `presets.ts`                             | 14 Rollen, acht Körperprofile, sechs Gesichtsformen, acht Frisuren, Haut-/Augen-/Haarfarben, Bart/Alter und erlaubte Garderoben    |
| `geometry.ts`                            | Runde Grundformen, frei geformte Ringprofile, Vertex-Farben, Zusammenfassen je Gelenk/Material                                     |
| `head.ts`                                | Kopf, Kiefer, Ohren, Augen/Brauen, Nase/Mund, Haare, Bart, Brille, Make-up und Kopfbedeckung                                       |
| `body.ts`                                | Unabhängige Schulter-/Brust-/Taillen-/Hüftmasse, Kleidungsschnitte, Rock, Kragen, Muster und Berufsausrüstung                      |
| `limbs.ts`                               | Schulter/Ellenbogen, Hüfte/Knie, Handfläche/Daumen/Finger, sechs Schuharten, Hand-Requisiten                                       |
| `rig.ts`                                 | Kompatibler Animationsvertrag, Szenen-LOD, Lebenszyklus und begrenzter Garderoben-Cache                                            |
| `distant.ts`                             | Zusammengefasste Ferndarstellung für Einzelpersonen ausserhalb der Crowd-Batches                                                   |
| `animation.ts`                           | Gemeinsame Idle-, Geh-, Lauf-, Sitz-, Gesprächs-, Getränke-, Telefon-, Rauch-, Tanz-, Jubel-, Pöbel-, Verfolgungs-/Festnahmegesten |

Die acht bestehenden Tanzprofile bleiben in `dance-system.ts`. Seedabhängige Phase und Geschwindigkeit verhindern Gleichschritt. Animation bleibt prozedural: kein zweites GLB-/Skelett-System und keine neuen Animationstimer pro NPC. Die Festnahmegeste ist eine visuelle Pose; der bestehende Wechsel in die Zelle bestimmt weiterhin den Ablauf.

Kleidung umfasst zehn Oberteil-Schnitte, sechs Unterteil- und sechs Schuharten. Uniformen haben separate Farben, Mützen, Gürtel, Abzeichen, Funkgerät und Zubehör. Thai-Polizei erhält braune Uniformen, Security dunkle Polos. Cabaret verwendet dieselbe feminine Basis mit Clubkleidung, Schmuck und Make-up. Accessoires umfassen Brillen, Sonnenbrillen, Kopfbedeckung, Rucksack, Tasche, Schmuck, Uhr sowie situationsabhängige Getränke, Telefon und Zigarette. Die Requisiten folgen dem Unterarm. Stoff/Haut, Leder, Satin und Metall unterscheiden sich im Glanz; Texturdownloads sind nicht nötig.

`npc-kit.ts` führt bisherige Aufrufer weiter. Bali-Crowd, Polizei und Flugpersonal verwenden jetzt ebenfalls das Rig. Bahn, WG, lokale Passanten und Zellenwärter profitieren über diesen Einstieg. Tobi behält seine individuelle Figur samt Trägershirt, Zigarette und Flaschenanker; Rundungen und Hände wurden verfeinert.

## Distanzdarstellung und Grenzen

- LOD0 unter 14 m Kameradistanz: Gesicht, kleine Kleidungsteile, Finger und Accessoires.
- LOD1 bis 28 m: Hauptkörper und Frisur, ausgeblendete Kleinteile. Gelenkbewegungen bleiben erhalten.
- LOD2 von 28–80 m: eine zusammengefasste Figur ohne detaillierte Gelenkanimation. Ausserhalb des Sichtfelds keine sekundäre Gelenkanimation/Rendering. Gameplay-Zustände laufen weiter.
- Nana: maximal 32 detaillierte Darsteller, übrige Einwohner in sechs Thin-Instance-Batches. Street Parade: weiterhin 240 reaktive Personen, davon maximal 16 detaillierte Darsteller. Entfernte Körper sind ebenfalls gerundet. Beide Darstellungen wählen Haut-/Kleidungsfarben aus denselben Presets.
- Pro Poolslot maximal zwei zusammengesetzte Garderoben. Wiederbesuche können diese wiederverwenden; beim Wechsel zu einer neuen Identität wird einmalig Geometrie erzeugt. Das ist kein vollständiger vorab gebackener Asset-Cache. Materialien bleiben szenenweit geteilt und werden bei NPC-Entsorgung nicht einzeln zerstört.
- Die lokale Fünfergruppe rendert etwa 60'500 Dreiecke in rund 108 aktiven Meshes mit fünf Figurenmaterialien. Die erste Fassung lag bei 211'500 Dreiecken. Das misst Geometrie dieser Gruppe, **keine zugesicherten 60 FPS** für komplette Levels.
- Röcke folgen beim Sitzen vereinfacht der Hüftbeugung. Keine Stoffsimulation. Ferndarstellung ist bewusst grob; keine fotorealistischen Skin-/Cloth-Assets.

## Lokale Sichtprüfung

Bei laufendem Vite: <http://localhost:5173/test/characters.html>. Die Galerie zeigt zuerst Mann, Frau, Tänzerin, Security und Thai-Polizei. Kamera mit Maus bewegen; Animation auswählen, Varianten wechseln oder Cabaret auswählen. Sie liegt ausserhalb des Produktions-Einstiegspunkts und wird nicht als Spielmenü ausgeliefert.

Durchgeführt: gezielter Client-Typecheck und ESLint; ein lokaler Client-Build; Galerie inklusive Variantenwechsel und Sitz-/Lauf-/Hand-/Tanzgesten; Render-Smoke für Railway, Parade, Nana, Fly High und WG ohne Browserfehler. Die bestehende lokale Nana-Havok-Probe bestand in 3,7 s: Route/Collision/Kamera, neun Venues mit Flirt und Getränkekarte, Security und 16 Flaschen bis Levelabschluss.

Keine vollständige E2E-Suite, keine GitHub-CI. Offene Hardware-/Langzeittests stehen im Test-Backlog.

## Gesichtssystem – Überarbeitung vom 15. September 2026

Die vorherigen Kugelköpfe und aufgesetzten Liniengesichter sind ersetzt. `head.ts` verbindet jetzt drei getrennte Bausteine:

- `face-profile.ts`: sieben Formen (oval, rund, schmal, kantig, herzförmig, breit, länglich). Stirn-/Schläfen-/Kiefer-/Kinnbreite, Wangen, Nasenbreite/-länge/-projektion, Augenabstand/-öffnung/-neigung, Brauen und Lippen werden deterministisch kombiniert. Hautfarbe, Form und weibliche/männliche Körperwahl erzwingen keine ethnischen oder geschlechtlichen Gesichts-Schablonen. `faceAge` erlaubt junge Erwachsene, Erwachsene und ältere Erwachsene; ohne Override leitet sich das Alter aus dem bisherigen Preset ab. Es werden keine Kinder erzeugt.
- `face-mesh.ts`: ein durchgehender, interpolierter Kopf mit modellierten Wangen, Augenhöhlen, Brauenwülsten, Nasenrücken/-spitze/-flügeln und Mund-/Kinnübergang. Geschlossene Nähte teilen geglättete Normalen. Die Haut erhält sparsame Vertex-Farbvariation an Wangen, Nase, Augen und optional Bartschatten. Die Grundform verwendet 48 × 64 Zellen; keine hochauflösenden Texturen.
- `face-features.ts`: mandelförmige Augenöffnungen, geometrische Iris/Pupille in sechs Farben, obere/untere Lider und Lidfalten, geformte Brauen, Ober-/Unterlippen mit Amorbogen, dezente Nasenlochfalten, Ohrmuschel/Helix/Innenfalte/Läppchen. Sommersprossen, vereinzelte Muttermale und Altersfalten liegen in der Nahdetailgruppe. Normale Lippen werden aus dem Hautton abgeleitet; Bühnenrollen erhalten stärkere Make-up-Farben.

Frisuren nutzen eine der Kopfform folgende Kopfhaut mit variierendem bzw. zurückweichendem Haaransatz. Augen erhalten ein sechstes szenenweit geteiltes Material mit dezentem Glanz. Haut bleibt matt; keine teure echte Subsurface-/Porensimulation. Augen, Lippen und Brauen bleiben bis zur bisherigen 28-m-Grenze sichtbar, feine Falten und Hautdetails nur unter 14 m. Die bestehende Ferndarstellung und das NPC-Pooling bleiben erhalten. Es gibt keine neuen Animationstimer oder Änderungen an Interaktion, Kollision, Flirt, Verfolgung oder Missionen.

**Galerie:** <http://localhost:5173/test/faces.html>. Sieben Formen nebeneinander, weitere Merkmalskombinationen, Alterswahl, Haare, Profilansicht und Auswahl einer einzelnen Form zum Heranzoomen. Auch vom Character Studio verlinkt. Die Galerie wird nicht mit dem normalen Produktions-Einstiegspunkt gebaut.

**Lokal geprüft:** Typecheck und gezielter ESLint; Frontal-/Profil-/Nahansicht, alle drei Altersstufen, Haare und Varianten; vollständige Beispielcharaktere ohne Browserfehler. Die bestehende Nana-Havok-Probe bestand in 4,1 s (Route/Etagen, Kamera, Flirt/Getränke, Security, Abschluss). Keine neuen Tests und keine GitHub-CI. Kein erneuter Produktionsbuild für diese optische Änderung.

**Kosten:** Die Fünfergruppe benötigt mit den neuen Köpfen etwa 98'300 statt vorher 60'500 Dreiecke und 117 aktive Meshes bei sechs gemeinsamen Figurenmaterialien. Die sieben haarlosen Nahporträts liegen zusammen bei etwa 79'800 Dreiecken. Das sind Geometriezählungen im lokalen Browser, keine FPS-Garantie. Ein längerer Hardwarevergleich dichter Nana-/Parade-Szenen bleibt im bestehenden Performance-Backlog. Ältere Zahlen oben beschreiben die erste modulare Fassung.

## Erwachsene Nightlife-/Beach-Varianten

Fünf gezielte Körperprofile, begrenzte Formparameter, Outfit-Pools, 23 Posen, Anti-Klon-Erzeugung und lokale Achtergruppen: [Umsetzung und Prüfung](adult-female-characters.md).

## Korrektur der Armrichtungen

`arm-pose.ts` definiert eine gemeinsame Konvention: Arm 0 liegt auf lokalem -X und wird mit negativem Z-Winkel nach aussen gehoben, Arm 1 entsprechend positiv. Zuvor waren die Vorzeichen in Ausgangsstellung, Tanz-, Beach-, Jubel-, WG- und Zugposen teilweise vertauscht. Jetzt verwenden diese Animationen `outwardArmAngle`; negative Ausschläge und zu grosse Überkopfwinkel sind begrenzt. Der abschliessende Gelenkpass wendet zusätzlich einen körperabhängigen Ruheabstand an, auch für ältere Level-Animationen. Schulterpivots berücksichtigen die Armdicke.

Lokal geprüft: Typecheck, gezielter ESLint, Sichtkontrolle von Club-/Pole-/Haar-/Trinkposen. Eine einmalige geometrische Stichprobe über fünf feminine Körperprofile, einen kräftigen Zivilisten und Polizei erfasste 41'184 Arm-/Unterarm-/Handpositionen über 48 Zeitpunkte pro Pose. Keine dieser Mittellinien kreuzte nach innen über die jeweilige Schulterebene. Dies ist keine allgemeine Mesh-Kollisionssimulation und verhindert keine Berührungen zwischen verschiedenen NPCs. Die Achtergalerie hat deshalb zusätzlich grössere Abstände für ausgestreckte Arme. Keine neue Testsuite, keine CI und kein Produktionsbuild.
