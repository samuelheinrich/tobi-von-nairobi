# Level-Audit und Validierungs-Framework

Stand: 17. September 2026, zweiter Durchgang. Alle elf Level stehen auf **CRITICAL 0**.

Ausführen: `npx tsx tools/levels/validate.mjs [filter] [--json]`. Exitcode 1 bei jedem CRITICAL,
damit der Lauf später eine Änderung blockieren kann.

## Die wichtigste Erkenntnis zuerst

**Es gibt keine einzige Quelle für Level-Geometrie.** Ein Teil steht in `packages/game-data`
(Zürichs Blöcke, Nanas Venues), der grössere Teil entsteht in den Szenen-Bauern unter
`apps/game-client/src/runtime/levels/`. Wo beides existiert, ist es auseinandergelaufen.

Drei Belege aus diesem Durchgang:

- `zurichLayout.ground` beschreibt weiterhin die ursprüngliche Insel (104 × 108 m). Der Nordteil
  mit Hauptbahnhof und Zugtrasse wird in `zurich/city.ts` und `zurich/hauptbahnhof.ts` als eigene
  Bodenstücke gelegt. Die `navigationBounds` wurden auf 236 × 174 m erweitert — gegen die
  Datenlage betrachtet läuft der Spieler damit weit über den Boden hinaus.
- `hauptbahnhof` steht in `zurichLayout.blocks` als massiver Block. Im Client ist es eine
  **begehbare Halle** mit eigenem Boden. Jede Prüfung, die aus den Daten argumentiert — auch der
  bestehende `zurich.test.ts` — irrt sich über den Bahnhof.
- Nanas Venues tragen `id, name, floor, side, z, mode, theme, color, signature`, aber **keinen
  Grundriss**. Kollisionsprüfungen sind für dieses Level aus den Daten unmöglich.

Solange das so bleibt, ist jede Reparatur an Geometrie nicht nachprüfbar: man kann sie umsetzen,
aber nicht zeigen, dass sie hält. **Das ist der Engpass, nicht die einzelnen Bugs.**

## Ergebnis des Durchgangs

| Level                              | CRITICAL | HIGH | Kern                                                 |
| ---------------------------------- | -------: | ---: | ---------------------------------------------------- |
| thailand-railway (Phuket)          |        4 |    5 | 0 Flaschen; Partystrasse führt durch drei Shophäuser |
| fly-high                           |        2 |    0 | 0 Flaschen, keine Weltgrenze                         |
| bali-adventure                     |        2 |    0 | 0 Flaschen, keine Weltgrenze                         |
| welcome-to-bali                    |        1 |    1 | keine Weltgrenze, 5 Flaschen                         |
| zurich-street-parade               |        1 |    0 | Paradenlinie streift den Hafenschuppen               |
| bali-escape                        |        0 |    1 | 5 Flaschen                                           |
| ausnuechterungszelle               |        1 |    0 | keine Weltgrenze (Zelle, siehe Notiz)                |
| beach-bar, night-market, arlesheim |        0 |    0 | im Rahmen des Prüfbaren sauber                       |

### Flaschen — das drängendste Gameplay-Problem

Drei Level haben **null** Flaschen: `thailand-railway`, `fly-high`, `bali-adventure`. Zwei weitere
liegen mit fünf unter jeder brauchbaren Versorgung. Bahn und Flugzeug hast du ausdrücklich genannt;
beide sind betroffen.

### Phuket — konkret und messbar

- **Partystrasse führt durch die Shophäuser 6, 10 und 14**, je 11 bis 21 m weit. Dort fahren
  Scooter und Tuk-Tuks. Die Strasse liegt bei z = 21, das Häuserband bei z = 18 bis 22,4.
- **3 von 62 Bewohnern stehen in Gebäuden** (#17, #37 in Haus 10, #49 in Haus 8).
- **30 von 62 stehen auf Fahrbahnen.**

Ursache: die Bewohner entstehen in `phuket.ts` über eine Modulo-Formel um vier Zentren, ohne jede
räumliche Prüfung. Die Streuung selbst ist übrigens in Ordnung — keine Duplikate, kein Paar näher
als ein Meter. Das Problem ist nicht die Verteilung, sondern die fehlende Validierung gegen Welt
und Fahrwege.

## Was das Framework prüft

`tools/levels/` besteht aus drei Teilen: ein gemeinsames Raummodell (`model.mjs`), generische
Prüfungen darauf (`checks.mjs`), und pro Level ein Adapter (`adapters.mjs`), der es in das Modell
übersetzt. Eine neue Prüfung gilt damit sofort für jedes Level, auch für später gebaute.

| Prüfung                                            | Was sie findet                                                  |
| -------------------------------------------------- | --------------------------------------------------------------- |
| `WORLD_BOUNDS_MISSING`                             | Level ohne Spielgrenze                                          |
| `BOUNDS_EXCEED_GROUND`                             | Grenze reicht über den Boden hinaus                             |
| `SPAWN_IN_SOLID` / `_OUT_OF_BOUNDS` / `_IN_WATER`  | Start oder Ziel unerreichbar                                    |
| `BOTTLES_BELOW_MINIMUM`                            | Energieversorgung nicht gesichert                               |
| `BOTTLE_IN_SOLID` / `_IN_WATER` / `_OUT_OF_BOUNDS` | Flasche nicht erreichbar                                        |
| `BOTTLE_ISOLATED`                                  | Flasche weit ab von allen anderen — meist ein Koordinatenfehler |
| `POWERUP_*`                                        | dasselbe für Pillen                                             |
| `NPC_IN_SOLID` / `_IN_WATER` / `_OUT_OF_BOUNDS`    | Figur in Wand, Wasser oder Nichts                               |
| `NPC_DUPLICATE_SPOT` / `NPC_OVERLAP`               | zwei Figuren auf einem Fleck                                    |
| `NPC_ON_VEHICLE_ROUTE`                             | Figur auf einem Fahrweg                                         |
| `ROUTE_THROUGH_SOLID`                              | Fahrweg durch ein Gebäude                                       |
| `ROUTE_OUT_OF_BOUNDS`                              | Fahrweg verlässt die Welt                                       |

### Geometrie-Register — der Engpass ist aufgelöst

`HavokWorld.describeGeometry()` liest die fertigen Kollisionskörper aus der laufenden Szene zurück.
`tools/levels/capture-geometry.mjs` fährt den Devserver, öffnet jedes Level und legt die Körper
unter `tools/levels/geometry/<level>.json` ab. Der Validator prüft den Schnappschuss offline.

Erfasst sind **2'349 Körper aus sieben Levels**. Damit greifen zwei Prüfungen, die vorher unmöglich
waren:

| Prüfung                 | Was sie findet                                        |
| ----------------------- | ----------------------------------------------------- |
| `VOID_IN_PLAYABLE_AREA` | erklärte Spielfläche ohne Boden darunter              |
| `UNRAILED_EDGE`         | begehbare Fläche mit Absturzkante und ohne Begrenzung |

Nach jeder Änderung an Level-Geometrie muss `capture-geometry.mjs` neu laufen; die Schnappschüsse
liegen im Repository, damit der Validator ohne Browser auskommt.

**Boden von Wand unterscheidet sich über die Form, nicht über das Flag.** `prop(solid)` setzt
`walkable: true` pauschal — jedes Dach, jede Fassade trägt dasselbe Kennzeichen. Eine Fläche gilt
hier als begehbar, wenn sie höchstens 1,2 m dick und in beiden Grundrissachsen mindestens 1,5 m
breit ist; als Begrenzung zählt, was mindestens 0,8 m hoch ist.

### Was weiterhin fehlt

Türbreiten, Sitzbelegung, Deckenlücken und Z-Fighting. Türen und Sitze brauchen eine Auszeichnung
im Level, keine Form-Heuristik.

## Zweiter Durchgang — was repariert ist

| Level                | vorher             | jetzt               |
| -------------------- | ------------------ | ------------------- |
| thailand-railway     | CRITICAL 4, HIGH 5 | CRITICAL 0, HIGH 10 |
| zurich-street-parade | CRITICAL 2, HIGH 8 | CRITICAL 0, HIGH 2  |
| fly-high             | CRITICAL 2         | CRITICAL 0, HIGH 0  |
| bali-adventure       | CRITICAL 2         | CRITICAL 0, HIGH 3  |
| welcome-to-bali      | CRITICAL 1, HIGH 1 | CRITICAL 0, HIGH 1  |
| bangkok-nana-plaza   | CRITICAL 0         | CRITICAL 0, HIGH 3  |
| übrige               | CRITICAL 0         | CRITICAL 0          |

Die HIGH-Zahlen steigen teilweise, weil zwei neue Prüfungen dazugekommen sind. Das ist kein
Rückschritt: es waren vorher dieselben Mängel, nur unsichtbar.

### Flaschen — Standard statt Einzelplatzierung

`packages/game-data/src/bottles.ts` beschreibt, **wo** eine Flasche in einer Szene plausibel liegt
(Bar, DJ-Pult, Tisch, Gepäckablage, Vestibül …), gewichtet die Sorten und verteilt sie
abwechselnd von beiden Enden der Liste, damit sie über das ganze Level streuen statt sich an der
besten Stelle zu häufen. Bahn (14) und Flugzeug (16) sind darüber bestückt.

### Phuket

Die Südreihe der sechzehn Shophäuser lag bei z 13,0 bis 27,4, die Partystrasse bei z 14 bis 28 —
Scooter und Tuk-Tuks fuhren 21 m weit durch Häuser. Die Reihe steht jetzt bei z 34 aufwärts.
Die Grundrisse sind als `phuketShophouses` in die Daten gewandert; Szenenbauer, Bewohner und
Validator lesen dieselbe Quelle statt drei auseinandergelaufener Kopien derselben Schleife.

30 von 62 Bewohnern standen auf Fahrbahnen, 3 in Gebäuden. `packages/game-data/src/spawn-safety.ts`
ist die allgemeine Antwort: `keepClear` schiebt Standorte aus Rechtecken heraus, in denen sie
nichts zu suchen haben, und verwirft dabei nie einen. Seine Strassenrechtecke reichen über beide
Enden der Fahrbahn hinaus — eine Route ist eine Linie mit Breite, und knapp hinter dem letzten
Wegpunkt zu stehen ist nicht sicherer als daneben.

### Zürich — neu gebaut

Vier gemeldete Fehler, hinter zweien davon dieselbe Ursache.

**Der Zug fuhr durch Wände und sperrte einen aus beiden Bahnhöfen aus.** Die Einhausung entstand
als ein achsparalleler Kasten je Wegpunkt. Die S16 nimmt auf ihrem Nordbogen zwei Kurven, und ein
an z ausgerichteter Kasten steht quer zu einem in x laufenden Gleis — auf dem Oststück fuhr der
Zug also mitten durch seinen eigenen Tunnel, und zwischen den Stücken klafften ohnehin 14 bis 18 m.
Schlimmer: die Schleife ummauerte **jeden** Wegpunkt, auch die beiden Halte. Damit stand eine
Betonscheibe auf der Bahnsteigkante von HB Gleis 12 und auf beiden Kanten in Stadelhofen — genau
dort, wo die Türen aufgehen.

Die Einhausung folgt jetzt dem Gleis: zur Strecke gedrehte Wände mit Überlappung an den Stössen,
und nur auf dem offenen Bogen zwischen den Bahnhöfen. `zurichStationBoxes` in den Daten sagt, wo
ein Bahnhof anfängt; Bauer und Validator lesen dieselbe Angabe.

**Der Weg nach Stadelhofen war versperrt.** Er war mehr als versperrt: es gab überhaupt keine
begehbare Linie. Die Zufahrtsstrasse begann bei x 41 hinter einer Fassadenreihe, die auf ihr
stand, und die Südwand des Bahnhofs war über dem Ostperron geschlossen und über den Gleisen offen
— der einzige Zugang führte über die Schienen. Die Strasse läuft jetzt von der Promenade bis zum
Vorplatz, zwei Fassaden und der Shop sind von ihr heruntergerückt, und die Wand hat einen sechs
Meter breiten Eingang auf Perron 3, während die Gleismündung zu ist.

**Man sah nicht, dass dort ein Bahnhof ist.** Stadelhofens Sektor wurde auf 72 m sichtbar und
tauchte aus dem Nichts auf. Bahnhöfe sind Landmarken; ihre Sichtweiten reichen jetzt auf 130 m
und mehr.

**Ein Drittel des Levels hatte keinen Boden.** Zwei Lücken, 70 m und 50 m breit, zwischen drei
getrennten Platten. Die Platte ist durchgehend, nur dort offen, wo der HB eigene Böden trägt, und
hat an der Aussenkante eine Brüstung statt eines Sturzes in den See.

Dazu: zwei Flaschen lagen im Tramwagen, und die Paradenroute lief drei Meter durch den
Hafenschuppen.

### Fly High liess sich nie abschliessen

Der Server leitet die schnellstmögliche ehrliche Zeit aus der Luftlinie zwischen Start und Ziel
im Sprint ab. Fly High endet auf einem Flughafen 1,5 km von der Kabine entfernt — die Untergrenze
lag bei 152 Sekunden und **jedes** Ergebnis wurde als unplausibel abgelehnt. Aufgefallen ist es
niemandem, weil die Server-Integrationstests `apps/game-server/dist` importieren: sie prüften
einen Build vom 13.

Das Ziel sagt jetzt selbst, wie man hinkommt. `carried: true` heisst «ein Fahrzeug bringt dich
hin», und beide Leser handeln danach: der Server misst die begehbare Fläche statt der Luftlinie,
die Levelprüfung nennt ein Ziel ausserhalb der Grenzen keinen Mangel mehr.

### Die Fahrt, nachgemessen

`probe-ride.mjs` hat den kompletten Umlauf mitgeschrieben:

```
  1s  STOPPED  · Zürich HB → Stadelhofen · Türen CLOSED
 16s  BOARDING · Türen OPENING
 31s  BOARDING · Türen OPEN
252s  BOARDING · Türen CLOSING
289s  DEPARTING
360s  APPROACHING
569s  ARRIVING
766s  STOPPED  · Zürich Stadelhofen → Zürich HB · Türen CLOSED
799s  BOARDING · Türen OPENING
820s  BOARDING · Türen OPEN
```

Der Zug fährt ab, legt die ganze Strecke zurück, hält in Stadelhofen, dreht die Richtung und
öffnet dort die Türen — an der Kante, auf der vorher eine Betonscheibe stand. Die Zeiten sind
Wanduhrsekunden im Headless-Browser mit Software-Rendering; der simuliert rund zehnmal langsamer
als das Spiel auf echter Hardware, acht Sekunden Türöffnung werden hier zu gut 200.

**Nicht geprüft:** der Spieler an Bord. Die Sonde liest die Zustandsmaschine des Zuges, nicht
jemanden, der mitfährt.

## Neue Prüfungen

| Prüfung                   | Was sie findet                              |
| ------------------------- | ------------------------------------------- |
| `DESTINATION_UNREACHABLE` | Ziel vom Start aus nicht zu Fuss erreichbar |
| `BOTTLES_UNREACHABLE`     | Flaschen, zu denen kein Weg führt           |

Die Erreichbarkeit flutet vom Startpunkt über die erfassten Körper, stockwerkweise, und nimmt
Treppen, Rampen und Rolltreppen als Verbindung zwischen Ebenen. Sie ist die Prüfung, die den
Zürcher Fall überhaupt hätte finden können: **jede Fläche war da, keine davon nützte etwas.**

## Drei Korrekturen an den Prüfungen selbst

1. **`prop(solid)` machte jeden Körper begehbar.** Damit war jedes Dach, jedes Vordach und die
   Glashalle eine Terrasse in elf Metern Höhe ohne Geländer — 47 Meldungen aus einer einzigen
   Zeile. `prop` nimmt jetzt `'barrier'`: massiv, aber kein Boden. Die Geometrieprüfung glaubt
   dem Kennzeichen und rät nur noch, wo keines gesetzt ist.
2. **Die Leerraumprüfung tastete `navigationBounds` ab.** Das ist das Gitter, auf dem NPCs laufen,
   nicht der Zaun um den Spieler — in Zürich reicht es 118 m in den See hinaus. Ein Drittel des
   Levels las sich als Loch und begrub die zwei echten Lücken im Rauschen. Level erklären jetzt
   die Flächen, die sie gepflastert haben.
3. **`WORLD_BOUNDS_MISSING` war CRITICAL und die Meldung falsch.** Fehlende `navigationBounds`
   halten niemanden im Gebiet; sie kosten NPCs ihr Gitter und dem Server seinen Massstab. MEDIUM,
   mit einer Meldung, die sagt, was wirklich fehlt.

## Was ich nicht belegen kann

`DESTINATION_UNREACHABLE` und `BOTTLES_UNREACHABLE` schlagen in **Nana Plaza** und der
**Arlesheimer WG** an. Beide sind mehrstöckig, und eine Treppe ist ein schräger Körper, den der
Schnappschuss als achsparallelen Klotz ablegt — die Flutfüllung nähert sie nur an. Ich konnte in
keinem der beiden Fälle zeigen, dass es ein echter Levelfehler ist. Deshalb melden mehrstöckige
Level diese Befunde als HIGH mit dem Vorbehalt in der Meldung, nicht als CRITICAL. **Beide Level
gehören einmal zu Fuss abgelaufen**, bevor man daran etwas ändert.

## Werkzeuge

| Befehl                                                 | Zweck                                        |
| ------------------------------------------------------ | -------------------------------------------- |
| `npx tsx tools/levels/validate.mjs [filter]`           | alle Prüfungen, Exitcode 1 bei CRITICAL      |
| `node tools/levels/capture-geometry.mjs [filter]`      | Körper aus der laufenden Szene abholen       |
| `node tools/levels/probe-ride.mjs "Street Parade" 480` | Zustände eines laufenden Levels mitschreiben |

`probe-ride.mjs` liest `window.__levelProbe()`: Spielerposition, Zugzustände, Türen. Geometrie
beantwortet «ist da ein Boden», das hier beantwortet «passiert das Richtige». Vorsicht bei der
Auslegung: der Headless-Browser rendert per Software und läuft rund zehnmal langsamer als Echtzeit.

## Vier Irrtümer aus dem ersten Lauf

Der erste Durchgang meldete 12 CRITICAL und 68 HIGH. Ein Teil davon war **mein Fehler**, nicht der
der Levels — das gehört genauso dokumentiert:

1. **Love Mobiles als Hindernis gewertet.** Die Paradenwagen stehen naturgemäss auf der Route. Sie
   sind jetzt als `vehicle` markiert und blockieren keinen Fahrweg mehr.
2. **NPC-Prüfung ohne Stockwerk.** Zwei Personen übereinander in Nana lasen sich als ineinander
   stehend: 30 falsche Treffer. Höhe zählt jetzt mit.
3. **Nana-Grundrisse geraten.** Ich hatte 10 × 10 m angenommen, weil die Daten keinen Grundriss
   führen — 30 erfundene Meldungen. Jetzt führt Nana keine Solids und sagt das offen.
4. **Flaschen in begehbaren Hallen.** Die Flasche im Hauptbahnhof ist korrekt platziert, sobald man
   weiss, dass die Halle betretbar ist.

Ein Validator, der falsch meldet, ist schlimmer als keiner — man gewöhnt sich das Wegsehen an.

## Zweiter Durchgang, mit Geometrie

67 Befunde. Die zwei schwersten:

- **Zürich: 36 % der erklärten Spielfläche hat keinen Boden darunter** (939 von 2'640 Stichproben).
  Die `navigationBounds` decken 236 × 174 m, der tatsächliche Boden nur die Insel plus einen
  Nordstreifen. Das ist das «man landet im Nirgendwo».
- **47 Flächen ohne Absturzsicherung**, darunter `hb-glass-roof` in 11,6 m Höhe und mehrere
  Phuket-Venue-Dächer in 6 bis 8 m.

Die Dächer sind kein Zufall: weil `prop(solid)` alles als begehbar auszeichnet, wird jedes Dach zur
Plattform, die der Spieler betreten und von der er fallen kann. Entweder gehören Dächer als
nicht begehbar markiert, oder sie brauchen Geländer. Beides ist eine Entscheidung pro Fläche, keine
Sammelkorrektur.

## Nächste Schritte, in dieser Reihenfolge

1. ~~Geometrie beschreibbar machen~~ — erledigt, siehe oben.
2. **Flaschen zurückbringen** in Bahn, Flugzeug und Bali-Adventure.
3. **Phuket reparieren** — Partystrasse verlegen oder Häuserband versetzen, NPCs von den Fahrbahnen
   holen.
4. **Weltgrenzen ergänzen** für die vier Level ohne `navigationBounds`.
5. **Zürich überarbeiten** — Boden unter der Spielfläche, Weg nach Stadelhofen, Zugtrasse.
