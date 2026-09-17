# Animation-, NPC- und Rendering-Audit vom 17. September 2026

## Animationen

Die NPC-Runtime setzte ihre Animationszeit bislang nach jedem Clip mit `% duration` zurück. Damit
ging die Information über abgeschlossene Zyklen verloren. Gleichzeitig entfernte der Clip-Sampler
sämtliche horizontale Hips-Translation. Eine echte Root-Motion-Animation bewegte sich deshalb nur
innerhalb des Quellclips und begann anschliessend wieder am Anfang.

Die Runtime führt die Animationszeit jetzt unbegrenzt weiter und löst sie über explizite Metadaten
auf:

- `loopMode`: `repeat`, `pingpong` oder `once`
- `rootMotion`: Translation auf den Gameplay-Transform übertragen
- `inPlace`: Translation nur als lokale Pose behandeln
- `crossfadeDuration`, `playbackSpeed` und `reverseAllowed`

Root Motion wird aus allen animierten Translationsknoten zwischen Hips und Model-Root extrahiert.
Das ist für Character-Creator-Dateien relevant, die gleichzeitig `CC_Base_BoneRoot` und
`CC_Base_Hip` verschieben. Navigation und Root Motion sind gegenseitig exklusiv: Wenn AI oder ein
Character Controller bereits die Weltposition schreibt, wird der Clip in-place abgespielt.

Der Asset-Audit ergab:

| Clip                    |    horizontale Quelltranslation | Loop-Behandlung                    |
| ----------------------- | ------------------------------: | ---------------------------------- |
| `bar-walker`            |   BoneRoot 0,19 m + Hips 0,40 m | Repeat mit Root Motion             |
| `bar-dancer-hard`       | Hips 3,03 m, Pose-Seam 1,93 rad | stationär, Ping-Pong               |
| `bar-dancer-naked`      |  BoneRoot 12,31 m + Hips 0,15 m | stationär, Repeat mit 0,35 s Blend |
| `bar-dancer-heels`      |                 BoneRoot 6,07 m | stationär, sauberer Repeat         |
| Civilian `dance-hard`   |  praktisch 0 m, Seam 0,0016 rad | sauberer Repeat                    |
| Civilian `dance-medium` |        0 m, Seam < 0,000001 rad | sauberer Repeat                    |

Das lokale [Animation Studio](../../apps/game-client/test/animation-studio.html) zeigt Character
Root, Hips, Quelltrajektorie, verwendete Root-Motion-Bones, World Delta und Loop-Metadaten.

## NPC-Belegung

Die bisherige Sitzbelegung war ein Boolean und wurde häufig registriert, bevor ein Level dem NPC
seinen SeatAnchor zugewiesen hatte. Freistehende Spawnpunkte wurden nicht gegen andere NPCs
geprüft. Das neue szenenweite Occupancy-System arbeitet nach abgeschlossener Levelplatzierung und
verwaltet:

- eindeutiges `SeatAnchor.occupiedBy`
- deterministische Suche nach einem nahen freien Spawnpunkt
- räumliches Hashing statt vollständigem Paarvergleich
- sanfte Capsule-Separation für stehende und laufende Figuren
- Debug-Daten für Radius, Anchor-Besitz und erkannte Überlappungen

Autorisierte Sitzreihen dürfen eng beieinander liegen. Zwei Figuren können jedoch nicht denselben
Anchor beanspruchen. Im Physics-Debug werden Spawnflächen angezeigt und Überlappungen rot markiert.

## Z-Fighting

Die konkrete Ursache im Nana-Plaza-Erdgeschoss waren echte Geometrieüberlagerungen:

- `nana-floor-*` reichte von Z=4 bis Z=66.
- `nana-rear-floor-*` reichte von Z=52 bis Z=66.
- Damit lagen pro Seitenflügel 14 Meter Boden exakt übereinander, auf allen drei Etagen.
- Im Erdgeschoss lagen beide Bodenarten zusätzlich mit ihrer Oberseite exakt auf
  `island-ground` bei Y=0.

Die Seitenflügel enden nun bei Z=52 und treffen die hintere Galerie nur noch an der Kante. Die
begehbare Erdgeschossoberfläche liegt kontrolliert 25 mm über dem Basisboden. Es wird kein globaler
`polygonOffset` verwendet.

Der neue Geometrie-Audit meldet sichtbare, begehbare bzw. als Boden benannte Flächen mit relevanter
XZ-Überdeckung und weniger als 1,5 mm Höhendifferenz. Die Physics-Debugansicht markiert solche
Bereiche magenta. Nana Plaza und das Flugzeuglevel melden nach dem Umbau keine Konflikte. Der
Phuket-Bereich wird erneut geprüft, sobald sein gestreamter Root aktiviert wird.

Die Third-Person-Kamera verwendet bereits `near=0.15` und `far=900` und hat damit kein extremes
Depth-Verhältnis. Shadow Bias (`0.002`) und Normal Bias (`0.03`) sind ebenfalls plausibel. Diese
Werte wurden deshalb nicht als Ersatz für die Geometriekorrektur verändert.

## Lokale Prüfung

- Client-Typecheck
- Root-Motion-Probe über die 13-Sekunden-Loopgrenze von `bar-walker`: World Transform blieb
  kontinuierlich und sprang nicht zum Ursprung zurück.
- Nana Plaza im laufenden Browser: 0 gemeldete NPC-Überlappungen, 0 coplanare Boden-Konflikte.
- Fly High im laufenden Browser: 56 NPCs, eindeutige Seat-Besitzer, 0 Überlappungen und 0 coplanare
  Boden-Konflikte.
- Thailand Railway im laufenden Browser: 33 NPCs, eindeutige Seat-Besitzer und 0 Überlappungen.

Gemäss Projektregel wurden weder GitHub CI noch die vollständige Playwright-Suite gestartet.
