# Game Design – TOBI VON NAIROBI

Dies ist die spielerische Spezifikation für die Umsetzung. Zahlen sind initiales Balancing, keine bereits getesteten Ergebnisse. [Architektur](ARCHITECTURE.md) · [MVP-Abnahme](docs/development/milestones.md)

## 1. Erlebnis und Gameplay-Loop

Tobi ist ein männlicher, etwas korpulenter, erstaunlich selbstbewusster Lebemann mit markantem Gang. Seine Erscheinung ist sympathisch und chaotisch, stilisiert in Low-/Mid-Poly. Er hält sich meist für kompetenter, als die Situation rechtfertigt. Gerade bei einer Flucht bewegen sich die Beine überraschend schnell, während Oberkörper und Gesicht verzögert begreifen, was passiert.

Eine harmlose Hauptaufgabe führt in eine halb offene Spielarena. Der Spieler sammelt, spricht mit NPCs, nimmt Abkürzungen und verursacht dadurch mehr Aufmerksamkeit. Er entscheidet wiederholt zwischen zusätzlichen Punkten und einer sicheren Rückkehr. Eine Eskalation verändert Routen, Musik, Gegner und erreichbare Belohnungen. Nach einer gelungenen Flucht werden offene Ziele erledigt und eine Safe Zone erreicht. Ergebnis, Bonusziele, Geld, Fortschritt und nächstes Level werden angezeigt.

Eine Runde dauert 5–15 Minuten. Neue Spieler bekommen klare Primärziele und gut sichtbare Fluchtrouten; erfahrene Spieler verbinden Abkürzungen, seltene Pickups und hohe Combos. Kein komplexes Kampfsystem, keine realistische Polizeisimulation. Würfe dienen Ablenkung und Slapstick. Lesbarkeit bleibt auch im TOBI MODE erhalten: weniger dekorative Partikel statt versteckter Gefahren.

Die Schwierigkeit wächst über Kombinationen, Sichtlinien, Routen, Zeitdruck und Verpflichtungen. Mehr Polizei ist nur ein Werkzeug. Jede notwendige Flucht hat mindestens zwei brauchbare Wege; optionale riskante Wege bringen bessere Zeit oder Punkte.

## 2. Steuerung und Rückmeldung

| Eingabe               | Aktion                                                                          |
| --------------------- | ------------------------------------------------------------------------------- |
| WASD oder Pfeiltasten | bewegen, relativ zur Kamera                                                     |
| Maus                  | Kamera                                                                          |
| Space                 | springen                                                                        |
| Shift                 | sprinten                                                                        |
| E                     | markierten Interaktionspartner benutzen/ansprechen, Fahrzeug betreten/verlassen |
| F                     | gewählten Gegenstand benutzen                                                   |
| Q                     | Gegenstand wechseln                                                             |
| G                     | ausgewählte werfbare Flasche werfen                                             |
| R                     | verfügbare Spezialaktion, kontextabhängig beschriftet                           |
| ESC                   | Pause und Maus freigeben                                                        |

Nur ein Interaktionsziel ist gleichzeitig markiert. Auswahl nach Reichweite, Blickrichtung und Sichtlinie, mit leichter Hysterese gegen Flackern. Das HUD zeigt das tatsächlich gültige Verb: „Sprechen“, „Einsteigen“, „Verstecken“. Abgelehnte Aktionen erklären knapp den Grund, etwa „Inventar voll“.

R ist im MVP ungebunden. Später aktiviert es ausschliesslich ausgewiesene Spezialaktionen wie einen freigeschalteten Karl-Kontakt; spontane Karl-Ereignisse bleiben unabhängig davon. Remapping, Gamepad-/Mobile-Adapter und verschiedene Inputkontexte sind in der [Architektur](ARCHITECTURE.md) vorgesehen.

HUD: Missionsziel, Chaos-Balken mit Textstufe, Sterne, Stamina, ausgewähltes Item mit Menge/Dauer, Combo und laufender Score. Während der Flucht kommt `ESCAPE IN: 12` hinzu. Farben werden durch Symbole/Text ergänzt. Untertitel, getrennte Lautstärken, reduzierte Bewegung, einstellbare Kamera und lesbare UI-Skalierung gehören zum Basiskonzept. Keine realen Medikamentennamen oder realistischen Wirk-/Dosierungsangaben.

## 3. Items, Inventar und Effekte

Jeder Itemtyp definiert `id`, Kategorie, Icon-/Mesh-ID, Seltenheit, Stack-Limit, Punkte, Chaos-Beitrag, erlaubte Aktionen, Effekt-ID und Persistenzklasse. Jede platzierte Instanz hat eine stabile `pickupId`. Entitäten werden nach bestätigter Aufnahme deaktiviert, damit mehrere Triggerkontakte nichts verdoppeln.

| Item            | Grundfunktion                               | Vorgeschlagene Regel                                                     |
| --------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| normale Flasche | sammeln, Questfortschritt, Punkte, werfen   | 100 Basispunkte, +3 Chaos, Stack 10                                      |
| seltene Flasche | riskanter oder versteckter Sammelgegenstand | 500 Basispunkte, +6 Chaos, Stack 3                                       |
| Questobjekt     | Mission und Dialog                          | eigener Quest-Pouch, niemals wegen voller Verbrauchsslots blockiert      |
| Speed Boost     | extreme Laufgeschwindigkeit                 | 8 s, Geschwindigkeit ×1,35, gedeckelt auf 11 m/s                         |
| Focus           | Umgebung wirkt langsamer                    | 6 s, betroffene NPC-/Verkehrsbewegung ×0,6; Tobi unverändert             |
| Iron Tobi       | einen Hindernis-Stolperer abfangen          | eine Ladung, höchstens 20 s; schützt nicht vor Festnahme oder Kartenrand |
| Energy          | Stamina auffüllen                           | sofort +60 bis maximal 100                                               |
| Mystery Pill    | positiver/humorvoller Überraschungseffekt   | gewichtete, seedbare Auswahl aus freigegebenem Effektpool                |
| Security-Weste  | bestimmte Identitätsprüfungen täuschen      | 30 s, erkennbare Verkleidung, klare Abbruchregeln                        |

Flasche benutzen (F) erzeugt eine kurze comicartige Geste und verlängert ein aktives Combo-Fenster einmalig um 2 s; keine Gesundheits-/Rauschsimulation. Kein Basisscore für das Benutzen. Werfen (G) verbraucht eine Flasche, erzeugt ein begrenztes Projektil und beim Aufschlag ein Geräuschereignis. Ablenkungswertung entsteht nur bei einer tatsächlichen ersten NPC-/Guard-Reaktion, nicht pro Aufprall. Projektile verschwinden nach Aufschlag oder spätestens 5 s und werden nicht erneut sammelbar.

Ein Effekt besitzt `effectInstanceId`, Starttick, Restdauer, Parameter und Quelle. Gleicher temporärer Effekt wird aufgefrischt, nicht multipliziert; die Dauer ist höchstens das 1,5-Fache der Grunddauer. Verschiedene Effekte können zusammenwirken, unter expliziten Geschwindigkeits-/Sprung-/Combo-Caps. Iron-Ladungen stapeln nicht; Energy wird bei voller Stamina nicht verbraucht. Effekte pausieren mit dem Spiel und enden beim Levelwechsel.

Mystery-Pool: höherer Sprung, kurzer Speed Boost, verwirrte Guards, langsamere NPCs, schnelle Stamina-Regeneration, kurzfristiger Combo-Bonus. Kein Effekt darf einen notwendigen Sprung unmöglich machen, die Kamera unlesbar verzerren oder einen Spieler unentrinnbar einsperren. Pool-Einträge sind pro Level filterbar; das Ergebnis wird beim Verbrauch festgelegt und für Debug-Reproduktion protokolliert.

**Drei Inventarbereiche:** Run-Verbrauchsslots (vier Stack-Slots, Slots 1/2 im MVP ausreichend), unbegrenzter missionsgebundener Quest-Pouch und dauerhaftes Account-Inventar. Normale Level-Pickups sind Run-Inhalt. Sammelzähler für Missionen und Statistiken sind vom verbleibenden Flaschenbestand getrennt: eine geworfene Flasche bleibt „gesammelt“.

Ein voller Verbrauchsstack lässt den Pickup liegen und erzeugt weder Score noch Chaos. Hauptziel-Pickups bekommen immer einen aufnehmbaren Questanteil oder garantierten Platz. Auswahl/Verbrauch sind atomar: erst Gültigkeit und Bestand prüfen, dann Menge ändern und Event erzeugen.

Dauerhafte Vorräte können beim Runstart als Loadout entnommen werden; der Server bucht sie genau einmal ab. Run-Items fliessen nicht automatisch zurück ins Account-Inventar. Im MVP ist das Startloadout leer, wodurch das Speichern des Hauptloops einfach bleibt. Geld und permanente Shopkäufe sind serverseitige Transaktionen. Bei zu wenig Geld erscheint: **KONTO LEER / WARENKORB VOLL**. Die abgelehnte Transaktion ändert keine Bestände.

## 4. Chaos, Wanted und Flucht

### Chaos

Chaos ist ein reeller Wert zwischen 0 und 100. Die UI zeigt eine Ganzzahl, die Regeln verwenden den exakten Wert. Bandgrenzen: `[0,20]`, `(20,40]`, `(40,60]`, `(60,80]`, `(80,100]`. So entstehen auch bei Bruchwerten keine Lücken.

| Chaos   | Spielwirkung                                     | Typisches Reaktionsangebot                                                   |
| ------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| 0–20    | Alltag, normale Musik                            | keine neuen Einsätze                                                         |
| >20–40  | NPCs beobachten und kommentieren                 | Verdacht und Blicke                                                          |
| >40–60  | Security wird aufmerksam                         | Security-Suchauftrag, bis ★                                                  |
| >60–80  | Polizei wird in die Arena entsandt               | Polizeisuche, bis ★★                                                         |
| >80–100 | **TOBI MODE**, maximale audiovisuelle Intensität | zusätzlicher Einsatzdruck bis ★★★; weitere Sterne über bestätigte Eskalation |

Ausgangswerte: Pickup +3/+6, Flasche werfen +5, erstmaliges Erschrecken eines NPC +4, Absperrung +8, verbotener Bereich +10 beim Eintritt mit Cooldown, Quest-Eskalation +10–50. Ausstehende Daten enthalten Ursache und maximale Wiederholrate; Verlassen/Betreten desselben Triggers darf nicht unendlich Combo füttern.

Abbau: nach 8 s ohne neuen Vorfall, ohne Sichtkontakt und ausserhalb verbotener Bereiche −1,5/s; während bestätigter Sichtverfolgung kein Abbau. Darstellungs-/Spawn-Bänder haben 3 Punkte Abwärtshysterese und mindestens 2 s Aufenthaltszeit gegen Musik-/Spawn-Flackern. Score verwendet den geklemmten numerischen Wert.

### Fahndung als eigenständiges System

Chaos erzeugt Aufmerksamkeit und ermöglicht Einsatzbudgets; **bestätigte Vorfälle, Entdeckung und Eskalationen bestimmen die Sterne**. Ein hoher Chaoswert lässt verfügbare Einheiten an definierten entfernten Ankunftspunkten erscheinen und suchen. Er gibt ihnen nicht automatisch Tobis genaue Position. Aktive Fahndung bleibt beim Chaosabbau bestehen, bis eine Flucht abgeschlossen ist.

| Sterne | Bestätigte Reaktion              | Beispielhafte Eskalation                                                 |
| ------ | -------------------------------- | ------------------------------------------------------------------------ |
| 0      | keine aktive Fahndung            | ruhiger Zustand oder noch unbestätigte Suche                             |
| ★      | Security sucht/verfolgt          | Security bestätigt einen Vorfall bei erhöhtem Chaos                      |
| ★★     | lokale Polizei                   | Polizei identifiziert Tobi oder Security meldet schwere Quest-Eskalation |
| ★★★    | mehrere Einheiten                | bestätigter weiterer Vorfall bei hohem Chaos oder Backup-Eskalation      |
| ★★★★   | Sperren und schnellere Einheiten | schwerer Levelvorfall + freigegebene Level-Cap                           |
| ★★★★★  | maximaler Ausnahmezustand        | finales Eskalationsziel bzw. freigegebene Maximalstufe                   |

Jede `LevelDefinition` setzt `maxWanted`, erlaubte Einsatzarten, Spawn-Budgets und Eskalationsregeln. Keine automatische allmächtige Polizei im Tutorial. Ein Director begrenzt aktive und wartende Einheiten; Nachschub erscheint ausserhalb direkter Sicht und mit Vorwarnung. Vier und fünf Sterne erweitern Taktiken und Sperrstellen, statt jede Figur nur schneller zu machen.

### Flucht und Safe Zones

`PursuitStarted` benötigt bestätigte Identifikation. Die letzte bekannte Position stammt aus Sichtungen und Meldungen. Sobald **keine aktive Einheit** direkten Sichtkontakt hat, startet ein gemeinsamer Countdown von 12 s aktiver Spielzeit. Geräusche ändern Suchziele, setzen den Timer aber nur bei erneuter Identifikation zurück. Jede bestätigte neue Sichtung setzt auf 12 s zurück und führt zu CHASE.

Nach Ablauf erzeugt der Director einmal `PursuitEscaped`; Sterne werden 0, Chaos wird auf maximal 40 gesenkt, die Combo erhält ihren Fluchtbeitrag. Ein 8-s-Cooldown blockiert rein passives erneutes Hochstufen aus Restchaos. Neue bestätigte Vorfälle können weiter reagieren. So endet ein erfolgreicher Escape tatsächlich.

Die Safe Zone beendet das Level nur, wenn Pflichtziele erfüllt sind und keine aktive Fahndung besteht. Ein Verfolger vor der Hoteltür wird nicht durch Betreten gelöscht. Verstecke brechen Sicht nur nach ihren räumlichen Regeln; wer beim Eintritt beobachtet wurde, wird dort gesucht. Shops und Hotels unterscheiden per Daten zwischen öffentlichem Innenraum, Versteck und Safe Zone.

Taxi/Tuk-Tuk/Scooter können Routen öffnen, aber Einsteigen bei direkter Beobachtung löscht Identifikation nicht. Taxi ist später eine kurze interaktive Flucht-/Transportoption; Scooter und Tuk-Tuk sind selbst steuerbar. Fahrzeugwechsel braucht freie Ausstiegspunkte, sonst bleibt Tobi im Fahrzeug mit verständlicher Meldung.

### Scheitern und Wiederholung

Keine Gesundheitskampagne im MVP. Ein Guard muss innerhalb etwa 1 m, mit Sichtlinie, insgesamt 1,5 s ununterbrochen Zugriff halten; ein sichtbarer Fangindikator gibt Reaktionszeit. Freikommen setzt ihn zurück. Hinderniskollision führt kurz zum Stolpern, höchstens 0,6 s, mit anschliessender Schutzfrist gegen Kettenstolpern.

Festnahme, Kartensturz oder Pflicht-Timerablauf führen zu einem kurzen Ergebnis „DAS WAR SO GEPLANT.“ und Retry am letzten bestätigten Checkpoint oder Levelstart. Dauerhafter Fortschritt bleibt erhalten. Noch unbestätigte Run-Belohnungen werden verworfen. Checkpoint-Restarts erhalten das Kennzeichen `assisted`; persönliche Werte sind getrennt, spätere reguläre Zeitranglisten akzeptieren nur durchgängige Runs. Keine permanente Geldstrafe im MVP.

## 5. Police AI und NPC AI

Polizei besteht aus Wahrnehmung, Navigation, Entscheidungs-FSM und ausführender Bewegung. Der Einsatzleiter vergibt Such-/Sperraufträge und verwaltet Gruppenwissen. Allgemeine AI-Klassen enthalten keine Bali-/Hotel-/Zürich-Abfragen.

| State             | Eintritt/Aktion                                          | Relevanter Übergang                                             |
| ----------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| PATROL            | authored Route ablaufen                                  | Vorfall → SUSPICIOUS, Geräusch → INVESTIGATE_SOUND              |
| SUSPICIOUS        | Verdachtsmeter und Blickkontakt aufbauen                 | bestätigt → CHASE, Entwarnung → RETURN_TO_PATROL                |
| INVESTIGATE_SOUND | erreichbare Geräuschposition prüfen                      | identifiziert → CHASE, nichts gefunden → SEARCH                 |
| CHASE             | sichtbares Ziel verfolgen                                | Sicht verloren → LOST_TARGET, Backup-Bedingung → CALL_BACKUP    |
| LOST_TARGET       | letzte Sichtposition festhalten, kurzer Übergang         | Ziel gefunden → CHASE, sonst SEARCH                             |
| SEARCH            | begrenzte Suchpunkte um letzte Position                  | entdeckt → CHASE, globale Flucht beendet → RETURN_TO_PATROL     |
| CALL_BACKUP       | Funkaktion mit Cooldown, Bewegung separat weiter möglich | nach Meldung zurück zum vorherigen Zustand                      |
| BLOCK_ROUTE       | zugewiesenen Sperrpunkt besetzen                         | neuer Auftrag/Entdeckung → CHASE, Entwarnung → RETURN_TO_PATROL |
| RETURN_TO_PATROL  | nächste gültige Patrouillenposition erreichen            | angekommen → PATROL; neue Sichtung hat Vorrang                  |

Priorität: sichere Navigation/Kollision → bestätigte Sichtung → aktiver Auftrag → Routine. Bewegung stoppt nicht zwingend während einer Funkgeste. `LOST_TARGET` ist ein kurzer Zustandswechsel, `SEARCH` die länger laufende Suche; beide besitzen keine separaten konkurrierenden Escape-Timer.

Wahrnehmung: Sichtkegel, Distanz, Hindernis-Raycasts, Verdachtsaufbau statt sofortiger Erkennung. Initial etwa 22 m Reichweite, 100° Sichtfeld, 0,8 s Identifikationszeit; alles pro Archetyp konfigurierbar. Crowd-Zonen reduzieren Erkennbarkeit, garantieren aber keine Unsichtbarkeit. Verkleidung wirkt nur auf freigegebene NPC-/Guard-Typen und nicht auf Einheiten, die Tobi bereits im Chase identifiziert haben. Werfen oder verbotene Aktionen können sie aufdecken.

Navigation nutzt einen in der Content-Pipeline erzeugten Navmesh-/Weggraphen hinter `NavigationPort`. Phase 1/2 prüft die passende Recast-/Babylon-Anbindung; ein einfacher Wegpunktgraph genügt im ersten Testlevel. Türen und Sperren schalten Links um. Fahrzeugverkehr verwendet getrennte Fahrspur-Splines. Es gibt keine vollständige Navmesh-Neuberechnung pro Frame. Steckt ein Agent fest, versucht er begrenzt neu zu planen und erhält danach einen gültigen Rückkehrpunkt ausser Sicht; niemals Teleport direkt zum Spieler.

Nahe Chase-Bewegung wird pro Physikschritt integriert, Entscheidungen etwa 10 Hz, Wahrnehmung 5–10 Hz gestaffelt. Entfernte Zivilisten denken 1–2 Hz oder werden deaktiviert. Aktive Verfolger dürfen nicht allein durch eine Distanzoptimierung verschwinden.

Zivile NPCs: `IDLE`, `WALK`, `TALK`, `STARTLED`, `FLEE`, `RESUME`. Rollen wie Händler, Questgeber, VIP-Empfang und Zuschauer ergänzen Fähigkeiten statt Kopien der gesamten FSM. Dialog ist ein Daten-Graph mit Bedingungen, Textschlüsseln und erlaubten Commands. Ein wichtiger Quest-NPC bleibt erreichbar oder erhält eine definierte Ersatzposition. Der Spieler kann notwendige Missionen durch Slapstick nicht dauerhaft zerstören.

## 6. Combo und Score

Eine qualifizierte Aktion innerhalb von 5 s aktiver Spielzeit verlängert die Kette: erstmaliger Pickup, markierter Hindernissprung, bestätigtes Security-Ausweichen, wirksames Power-up, erfolgreiche Flucht. Die Anzeige `TOBI COMBO x5` zählt Kettenschritte. Der echte Punktefaktor ist gedeckelt und separat definiert:

```text
comboFactor = 1 + 0.25 × min(chainLength - 1, 12)     # 1.0 bis 4.0
chaosFactor = 1 + chaosAtEvent / 100                # 1.0 bis 2.0
wantedFactor = 1 + 0.10 × wantedAtEvent             # 1.0 bis 1.5
eventScore = floor(basePoints × comboFactor × chaosFactor × wantedFactor)
levelScore = sum(eventScore) + timeBonus + objectiveBonus + secretBonus
```

Fünfter Kettenschritt bedeutet regulär Faktor 2,0, nicht Faktor 5. Mystery-Combo fügt vorübergehend +1 Faktor hinzu, Gesamtfaktor maximal 5,0. HUD und Hilfetext machen Kette und Punktebonus unterscheidbar. Die Wertung verwendet Chaos/Wanted **nach dem auslösenden normalen Aktionsereignis**; beim Escape gilt die vorherige Fahndung für die Fluchtbelohnung, bevor Sterne/Chaos reduziert werden. Diese Reihenfolge ist Bestandteil der Score-Version.

Basispunkte: Flasche 100, seltene Flasche 500, einmaliger markierter Fence Jump 150, qualifiziertes Dodge 250, Flucht 1'000. Power-up und Flaschennutzung können die Kette beeinflussen, liefern selbst 0 Punkte. Missionsbonus beispielsweise 2'000, Bonusziel 1'000, Secret 750. Zeitbonus: `max(0, parTimeSeconds - activeRunSeconds) × 10`, maximal 3'000. Endboni werden nicht nochmals multipliziert; Chaos und Sterne erzeugen keine Punkte pro Sekunde.

Kettenlänge hat ein Sicherheitslimit 99, der Punktemultiplikator sättigt früher. Zeitfensterablauf oder Festnahme beendet die Combo; Pause hält sie an. Ein Hindernis-/NPC-Paar zählt pro Run nur einmal oder nach einem explizit längeren Content-Cooldown. Pro Run sind nur die ersten drei Fluchten scorewirksam; spätere bleiben spielerisch gültig. Pickup-IDs können im selben Run nicht wiederholt zählen. Diese Regeln verhindern einfache Punkteschleifen.

Nach Levelabschluss zeigt das Ergebnis Zeit, Flaschen/Total, maximale Combo, Fluchten, höchste Sterne, Bonus-/Secretfortschritt, Score und Speichersynchronisation. Beispielhafte `84'250` sind eine Präsentationsreferenz, kein mit diesen Anfangswerten garantierter Score. `scoreRulesVersion` und `contentVersion` begleiten jeden Run; unterschiedliche Regelsätze teilen keine Rangliste.

## 7. Datengetriebene Missionen

Missionen sind gerichtete, azyklische Objective-Graphen. Jeder Knoten besitzt stabile ID, Typ, Parameter, Voraussetzungen, Pflicht-/Bonusstatus und Aktivierungsregel. `allOf`/`anyOf`-Abhängigkeiten ermöglichen Reihenfolgen und Alternativrouten. Zustände: `locked`, `active`, `completed`, `failed`, `skipped`. Ein alternatives erfolgreiches Ziel markiert nicht benötigte Geschwister als `skipped`.

Beispielhafte Missionsdaten, keine implementierte Mission:

```json
{
  "schemaVersion": 1,
  "id": "bali_mvp_escape",
  "worldId": "bali",
  "levelId": "bali_mvp_escape",
  "objectives": [
    {
      "id": "bottles",
      "type": "collect",
      "itemId": "bottle_common",
      "amount": 5,
      "required": true
    },
    {
      "id": "escape",
      "type": "escapePolice",
      "after": { "allOf": ["bottles"] },
      "minWanted": 2,
      "required": true
    },
    {
      "id": "home",
      "type": "reach",
      "after": { "allOf": ["escape"] },
      "targetId": "airbnb_safe_zone",
      "required": true
    },
    { "id": "rare", "type": "collect", "itemId": "bottle_rare", "amount": 1, "required": false }
  ],
  "onObjectiveCompleted": [
    { "objectiveId": "bottles", "command": "emitIncident", "incidentId": "bar_alarm" }
  ]
}
```

`bar_alarm` ist ein Content-Eintrag mit Chaosdelta, optionalem `minimumChaos`, Geräuschposition, Polizeieinsatz und Vorwarnung. Der MVP-Alarm verwendet +50 Chaos und `minimumChaos: 61`; das Chaos-System berechnet `clamp(max(currentChaos + delta, minimumChaos), 0, 100)`. Damit startet die Polizeiphase auch nach langsamem Sammeln mit zwischenzeitlichem Chaosabbau. Eine Mindestschwelle ist nur für ausdrücklich definierte Quest-Eskalationen erlaubt. Keine `if (missionId === ...)`-Verzweigung in der Runtime. Der Director sorgt über authored Sichtlinien für eine erreichbare Polizeibegegnung, nicht über geheime Teleportation.

Handler-Vertrag: Typ-ID und Parameterschema, `createState`, `activate`, `handleEvent`, `evaluate`, `serialize`, `restore`. Registrierung erfolgt aus expliziten Modul-Deskriptoren beim Build/Start, nie durch Download ausführbaren Codes. Neue Arten ergänzen Schema, Handler, Testfixture und lokalisierte Darstellung. Der Composition Root ist nur für die Registrierung zuständig.

| Handler          | Auswertung                                                      |
| ---------------- | --------------------------------------------------------------- |
| CollectObjective | qualifizierte Pickup-IDs, Menge; Inventarverbrauch irrelevant   |
| ReachObjective   | Zieltrigger und erlaubter Spieler-/Fahrzeugzustand              |
| EscapeObjective  | einmaliges Escape-Event, vorherige Sterne mindestens Parameter  |
| TalkObjective    | Dialogknoten/Entscheidung bestätigt                             |
| SurviveObjective | aktive Dauer in gefordertem Zustand, Reset-/Fail-Regel explizit |
| TimerObjective   | eigene Deadline und `failMission` oder `failBonus`              |
| VehicleObjective | Einsteigen, geforderte Strecke, Aussteigen oder Wechsel         |

Standardmässig zählt ein Objective nur Ereignisse nach seiner Aktivierung. Optionaler retrospektiver Fortschritt muss mit `progressScope: run` angegeben werden. Bereits betretene Reach-Zonen werden bei Aktivierung erneut auf Aufenthalt geprüft. Escape vor Aktivierung erfüllt kein späteres Escapeziel. Missionsfehler und Bonusfehler sind getrennt; ein verpasstes Bonusziel blockiert den Abschluss nicht.

Der Validator prüft unbekannte Typen, fehlende Ziele/Items/Übersetzungen, doppelte IDs, Zyklen, unerreichbare Pflichtknoten, widersprüchliche Timer, ungültige Effekte und fehlende Spawns. Handlerzustand trägt eine Schema-Version. Levelabschluss und Belohnungen werden genau einmal ausgelöst.

## 8. Levelsystem und Content-Vertrag

Eine LevelDefinition referenziert World, Reihenfolge/Unlock-Voraussetzungen, Missionen, Asset-Bundles, Szenenteile, Spawnpunkte, Trigger, Safe Zones, Verstecke, Routen, Nav-/Traffic-Daten, NPC-Archetypen, Polizeiprofil, Audio und Replay-Ziele. Raumdaten liegen in einem Levelverzeichnis mit kleinen getrennten Dateien. GLB-Node-Metadaten referenzieren stabile IDs; keine Abhängigkeit von zufälliger Exportreihenfolge.

Lifecycle: validieren → notwendige Bundles laden → Geometrie/Collider/Nav aufbauen → Gameplay-Entitäten instanziieren → Missionszustand laden → freigeben → pausieren/abschliessen → Zustand projizieren → Ressourcen freigeben. Beim Fehler gibt es Retry und Rückkehr ins Menü. Das nächste World-Bundle wird erst bei Bedarf geladen.

Jedes spielbare Kampagnenlevel besitzt Hauptmission, Bonusziel, versteckte Sammlung, mindestens zwei Fluchtrouten oder gleichwertige Entscheidungswege, Zeit-/Score-Ziel, Secret und Easter Egg. Der Arlesheim-Hub hat dafür eine optionale 5–10-minütige Einführungsmission; freies Verweilen im Hub ist ungetaktet und wird nicht als Rekord gewertet.

## 9. Kampagne: vier Worlds, sechzehn Levels

Die Tabelle definiert neben der Hauptaufgabe auch konkreten Replay-Inhalt. Versteckte Sammlungen sind Platzierungsvorgaben, keine zufälligen Pflichtspawns.

| Nr./Level           | Hauptmission und Eskalation                               | Neu / Cap                                               | Bonus, Sammlung, Routen, Secret/Easter Egg                                                                                   |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1 Welcome to Bali   | bewegen, springen, 5 Flaschen, Airbnb                     | Grundlagen; 0 Sterne                                    | ohne Stolpern; 2 seltene Flaschen; Strand oder Gasse; Dachterrasse und übertriebene Buchungsnotiz                            |
| 2 Beach Bar         | 10 Flaschen, Barkeeper, Mystery Item                      | NPCs, Security; ★                                       | ohne Fangkontakt; 3 Kronkorken; Küche oder Promenade; verstecktes Rezept und Karl-Tischreservierung                          |
| 3 Scooter Trouble   | Scooter abholen, falsche Schlüssel, Flucht                | Scooter-Grundfunktion; ★★                               | ohne Kollision; 3 Helmsticker; Küstenweg oder Hinterhof; Werkstattabkürzung und Mini-CEO-Helm                                |
| 4 Bali Escape       | banale Gepäckübergabe endet in Polizeijagd                | volle Fussflucht; ★★★                                   | zwei Fluchten; 3 goldene Flaschen; Markt oder Hoteldächer; Servicelift und Abu-Dhabi-Prospekt                                |
| 5 Bangkok Nights    | mehrere Orte vor Deadline besuchen                        | dichte Gassen, Zeitdruck; ★★★                           | 30 s Restzeit; 3 Neonchips; Hauptmarkt oder Kanalseite; Nachtstand und „Abu Dhabi morgen“                                    |
| 6 The Pharmacy Run  | abstrahierte Power-up-Lieferung besorgen                  | Effektkombinationen; ★★★                                | nur ein Power-up; 3 bunte Tokens; Lagergang oder Aussensteg; Hinterzimmer und riesige harmlose Bonbonbox                     |
| 7 Tuk-Tuk Escape    | Fahrer finden, Tuk-Tuk fahren und entkommen               | Verkehrs-/Fahrzeugwechsel; ★★★                          | saubere Kurven; 3 Wimpel; Verkehrsschleife oder Seitenstrassen; Dachparkplatz und Karl-Fahrpreis                             |
| 8 Wrong Hotel       | falsche Tasche, Security, Markt, richtiges Hotel          | kombinierte Eskalation; ★★★★                            | seltene Tasche zurückbringen; 3 Kofferanhänger; Serviceausgang oder Garage; Geheimgang und Zimmer „CEO 0“                    |
| 9 Zürich HB         | eigenes Gepäck unter falschen Funden suchen               | dichter NPC-Strom; ★★★                                  | drei falsche Taschen entdecken; 3 Gepäckmarken; Unterführung oder Seitenhalle; Schliessfach und Abu-Dhabi-Abfahrtstafel      |
| 10 Konto leer       | Einkaufsliste mit begrenztem Budget lösen                 | Shopökonomie; ★★★                                       | genau 0 Münzen übrig; 3 Rabattsymbole; Passage oder Hinterhöfe; Rückgabeschalter und übervoller Warenkorb                    |
| 11 Der kleine CEO   | VIP-Ziel mit Gespräch, Ablenkung oder Weste               | Verkleidung/Zugangsregeln; ★★★★                         | unentdeckt; 3 Visitenkarten; Empfang oder Serviceeingang; Dachmeeting und absurder Geschäftsplan                             |
| 12 Rauchzeichen     | falsche Ausgänge bei Nebel, dann Zürich-Flucht            | Sichtzonen und kombinierte Routen; ★★★★                 | richtiger Ausgang zuerst; 3 Leuchtsymbole; Altstadt oder Seeweg; Nebelschalter und „Abu Dhabi wetterfest“                    |
| 13 Home Sweet Home  | im Zuhause ankommen und Hub einrichten                    | Hub, Outfit-/Statistikzugang; bis ★★ im Einführungslauf | drei Hausaufgaben; 3 Erinnerungsstücke; Garten oder Seitengasse; Abstellkammer und ungeöffnete Umzugskartons                 |
| 14 Das Erbe         | absurde Schnitzeljagd, banaler Endfund                    | verzweigte Hinweise; ★★★                                | ohne falschen Hinweis; 3 Schlüsselanhänger; Dorfweg oder Hintergärten; Abkürzung und Schatz = Ersatz-Einkaufschip            |
| 15 Karl regelt das  | mysteriöse Hilfe über mehrere Stationen                   | bedingte Weltveränderungen; ★★★★                        | Hilfe sparsam nutzen; 3 Karl-Notizen; spontane Tür oder längerer Normalweg; unsichtbares Büro und signierter leerer Brief    |
| 16 TOBI VON NAIROBI | sammeln, täuschen, Fahrzeuge wechseln, Combo und Heimkehr | alle Systeme; ★★★★★                                     | Combo bis Schluss; 4 World-Souvenirs; schnelle Sperrenroute oder lange Gartenroute; letzter Karl-Zugang und Abu-Dhabi-Koffer |

Jedes Level erhält zusätzlich konkrete `parTime`, Score-Medaillen und Sammlungszahlen in Daten. Anfangs Medaillenschwellen aus internen Referenzruns ableiten; danach anhand von neuen und geübten Spielern kalibrieren. Eine World öffnet die nächste nach dem Abschluss ihrer Pflichtlevels, Bonusziele sind optional. Freigeschaltete Level sind jederzeit wiederholbar; das Zuhause ist nach Level 13 direkt aus der Auswahl erreichbar.

Zürich ist lose von HB, Bahnhofstrasse, Langstrasse, Altstadt und See inspiriert, mit spielgerechten Distanzen. „Nairobi“ bleibt im Finale Titel und überzogene Selbstinszenierung; es wird keine zusätzliche fünfte World vorausgesetzt.

## 10. Running Gags als Systeme

Ein `GagDirector` bewertet registrierte Trigger, Voraussetzungen, Cooldowns und einmalige Contentflags. Seedbare Auswahl sorgt für Reproduzierbarkeit; humorvolle Zufälle entscheiden niemals allein über die Lösbarkeit einer Pflichtmission.

- **Karl regelt das:** ein geeigneter Sperrpunkt öffnet, Taxi kommt, Tür wird zugänglich, Sterne sinken um eins oder ein optionales Item erscheint. Höchstens eine spontane Rettung pro Run, erst nach mindestens 90 s und in erlaubten Situationen; vorläufige Chance 15 % je qualifiziertem Trigger, kein Zufallswurf pro Frame. Pflicht-Karl-Momente in Level 15/16 sind authored Ereignisse. Karl bleibt durch Notizen, Anrufe und entfernte Silhouetten unsichtbar genug. Jede Zufallsabkürzung hat eine normale Alternative.
- **Konto leer, Warenkorb voll:** UI-Reaktion auf einen echten serverseitig abgelehnten Kauf. Der Witz verändert die Transaktionsregeln nicht.
- **Der kleine CEO:** kurzlebige Zugangsberechtigung nach Dialog-/Outfitbedingungen, mit Ablauf und alternativem Serviceweg. Manche Guards glauben es, andere nicht.
- **Airbnb:** Start, Safe Zone oder Ziel je Level; Buchungsnachricht **BUCHUNG BESTÄTIGT / NERVEN STORNIERT**. Zugang wird über den normalen Level-/Fluchtvertrag geprüft.
- **Abu Dhabi:** pro Kapitel absurdere, auffindbare Dialoge; accountweit eindeutige Dialogflags für das Achievement.
- **Security Tobi:** eine Weste verändert NPC-Reaktionen und freigegebene Zutrittsprüfungen. Aktive Verfolger vergessen den Spieler nicht durch einen Outfitwechsel.

Victory Screen des Finales:

```text
TOBI VON NAIROBI

KARL HAT ES GEREGELT.
```

## 11. Achievements und Audio

| Achievement       | Präziser initialer Trigger                                                |
| ----------------- | ------------------------------------------------------------------------- |
| Erste Runde       | erste bestätigte Flaschenaufnahme                                         |
| Tobi Airlines     | mindestens 2,5 s zusammenhängende freiwillige Flugphase, kein Respawnfall |
| Konto leer        | gültiger Kauf senkt vorher positives Geld auf exakt 0                     |
| Karl regelt das   | erstes angewendetes Karl-Rettungsereignis                                 |
| Security Expert   | eine dafür markierte Mission ohne bestätigte Entdeckung abschliessen      |
| Nairobi Drift     | Escape abschliessen, nach mindestens 100 m aktiver Fahrzeugflucht im Run  |
| Der kleine CEO    | VIP-Hauptmission beenden                                                  |
| Abu Dhabi Calling | alle im Kampagnenmanifest geforderten Dialog-IDs finden                   |
| ★★★★★             | eine bestätigte Fünf-Sterne-Verfolgung erfolgreich abschütteln            |

Definitionen und Rewardregeln liegen in game-data. Freischaltung ist accountweit einmalig; In-Run-Anzeige kann sofort erscheinen, Persistenz bestätigt der Server. Wiederholte Zustellung oder Checkpoint-Restart verdoppelt keine Belohnung.

Audio besteht aus Master-, Musik-, SFX- und Sprachbus. Musik wechselt mit geglätteter Intensität zwischen ruhig, Verdacht, Chase und TOBI MODE. Sirenen haben begrenzte Stimmenzahl und klare Prioritäten. Wichtige Warnungen besitzen sichtbare Entsprechungen, Dialoge Untertitel. Tobi kommentiert mit Cooldowns, damit derselbe Witz nicht bei jedem Pickup wiederholt wird.

## 12. Bali-MVP als spielbarer Nachweis

Eine kleine Arena umfasst Airbnb, Bar-/Pickup-Platz, eine lange sichere Gasse und einen kurzen Sprungweg mit Sichtblockern. Fünf Flaschen aktivieren den datengetriebenen Baralarm. Nach einer sichtbaren Vorwarnung trifft Polizei ein; ein klar geführter Kontakt startet mindestens ★★, maximal ★★★. Der Spieler bricht Sichtlinien, wartet den 12-s-Timer ab und erreicht das Airbnb. Eine seltene Flasche, ein Bonusziel, ein Secret und ein Karl-Easter-Egg erlauben einen zweiten Durchlauf.

MVP enthält Laufen/Sprint/Sprung, Kamera, Flaschenaufnahme/-wurf, Stamina, einen Speed- und einen Energy-Effekt, Inventar, Chaos/Wanted, grundlegende Police-FSM, Missionen, Combo/Score, Pause, Ergebnis und dauerhaftes Speichern. Mystery, Focus, Iron, zivile Dialogketten, Fahrzeuge, Verkleidung und Shops sind nachfolgende Features. Ihre Daten-/Portgrenzen werden bereits vorgesehen, ihre volle Implementierung ist kein MVP-Kriterium.

Beim ersten Playtest werden Zielverständnis, erste bewusste Routenentscheidung, faire Entdeckung, nachvollziehbare Flucht und Wunsch nach einem zweiten Run beobachtet. Erst nach einem unterhaltsamen Durchlauf beginnt die Produktion aller Kampagnenlevels.
