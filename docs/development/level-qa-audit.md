# Level-Audit und Validierungs-Framework

Stand: 17. September 2026. Erster Durchgang als QA-Rolle.

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

### Was es noch nicht prüft, und warum

Geländer, offene Kanten, Türbreiten, Sitzbelegung, Deckenlücken und Z-Fighting sind **nicht**
abgedeckt. Alle brauchen die Geometrie, die im Client entsteht. Sie kommen, sobald die Levels ihre
Geometrie beschreiben statt sie nur zu bauen.

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

## Nächste Schritte, in dieser Reihenfolge

1. **Geometrie beschreibbar machen.** Solange Boden, Wände, Geländer und Türen nur im Client
   entstehen, sind die wichtigsten Problemklassen aus deiner Liste nicht prüfbar. Der kleinste
   tragfähige Schritt: die Szenen-Bauer melden ihre Kollisionskörper an ein Register, das der
   Validator lesen kann.
2. **Flaschen zurückbringen** in Bahn, Flugzeug und Bali-Adventure, nach dem Standard unten.
3. **Phuket reparieren** — Partystrasse verlegen oder Häuserband versetzen, NPCs von den Fahrbahnen
   holen.
4. **Weltgrenzen ergänzen** für die vier Level ohne `navigationBounds`.
