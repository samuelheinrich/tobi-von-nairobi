# Zürich Street Parade: Arbeitsreferenzen

Die Masterwelt ist eine **spielbare Annäherung**, keine importierte GIS-Kopie. Die
`.blend`-Datei enthält nur selbst erzeugte Blockout-Geometrie. Fremde Karten/Fotos
bleiben ausserhalb des GLB; in diesem Verzeichnis liegen nur Quellenlinks.

- [Street Parade: offizielle Route und Distanz](https://www.streetparade.com/infos):
  Utoquai → Bellevue → Quaibrücke → Bürkliplatz → Hafendamm Enge, rund 2 km.
- [Street Parade: offizieller Guide und Bühnen](https://www.streetparade.com/media/pages/gallery/a03bcb05dc-1754376827/stp_guide_25_web.pdf):
  u. a. Opéra Stage am Bellevue.
- [Stadt Zürich: See- und Brückenplan](https://www.stadt-zuerich.ch/content/dam/web/de/stadtleben/sport-und-erholung/dokumente/gewaesser/streetparade-flyer.pdf):
  Bauschänzli, Quaibrücke, Utoquai, Bürkliplatz und Hafen Enge.
- [Stadt Zürich: Innenstadtplan](https://www.stadt-zuerich.ch/content/dam/stzh/prd/Deutsch/Stadtentwicklung/Publikationen_und_Broschueren/Integrationsfoerderung/Andere_Sprachen/Italienisch/WelcomeDesk_italienisch_Ansicht.pdf):
  Bahnhofstrasse, Limmat, Bellevue und Seeufer in räumlicher Beziehung.
- [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/):
  Ankerkoordinaten für HB, Stadelhofen, Enge, Bellevueplatz, Quaibrücke,
  Bürkliplatz, Bauschänzli, Opernhaus und Hafen Enge. Abfrage am 22.09.2026.
- [swisstopo SWISSIMAGE Luftbild](https://map.geo.admin.ch/?E=2683200&N=1247300&bgLayer=ch.swisstopo.swissimage&zoom=7):
  Verlauf von Seeufer, Limmat und Blockrandbebauung im Kartenviewer.
- [SBB Bahnhofplan Zürich HB](https://company.sbb.ch/content/dam/infrastruktur/trafimage/bahnhofplaene/plan-zuerich-hb-a4.pdf),
  [Stadelhofen](https://cdnsource.sbb.ch/content/dam/infrastruktur/trafimage/bahnhofplaene/plan-zuerich-stadelhofen-a4.pdf.sbbdownload.pdf),
  [Enge](https://cdnsource.sbb.ch/content/dam/infrastruktur/trafimage/bahnhofplaene/plan-zuerich-enge-a4.pdf.sbbdownload.pdf):
  spätere Bahnsteig-/Eingangsdetaillierung.
- [SBB-Fotos des HB-Südtrakts](https://news.sbb.ch/de/019d7b76-651d-7ec9-9e09-e092205387be/zuerich-hb-suedtrakt-die-historische-pracht-ist-zurueck)
  und [Stadelhofen-Projektansichten](https://company.sbb.ch/de/bahnentwicklung/projekte/deutschschweiz/region-zuerich/ausbau-zuerich-stadelhofen/bauprojekte.html):
  Silhouette/Materialreferenzen; keine Bilder in den Spiel-Export kopiert.

Lokales Koordinatensystem: Ursprung Bellevueplatz `47.3669084 N, 8.5452016 E`.
`X` zeigt nach Osten, `Y` nach Norden, `Z` nach oben; eine Blender Unit entspricht
**einem Meter**. Kleine equirektanguläre Projektion über dem Innenstadt-Ausschnitt:
`x = (Längengrad - 8.5452016) × 75 450`,
`y = (Breitengrad - 47.3669084) × 111 320`.
Die Utoquai-Route und vereinfachten Ufer/Bahnachsen sind handgesetzt; die Anker
in `recipe.json` sind Kontrollpunkte, keine präzise Kataster-Geometrie.

Für spätere manuelle Fotos: Lizenz/Urheber und Download-Datum jeweils im passenden
Unterordner dokumentieren, private Referenzbilder nicht committen.
