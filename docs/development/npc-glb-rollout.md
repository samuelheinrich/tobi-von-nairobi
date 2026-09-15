# NPC-GLBs in den Levels · 15. September 2026

Die Besetzung aus `runtime/character/characters/casting.ts` ist jetzt im regulären Spiel aktiv. Es ist kein URL-Schalter nötig. Die Modelle unter `public/characters/` werden im Produktionsbuild mitgeliefert; `models/` und die FBX-Arbeitsdateien bleiben lokal.

## Besetzung

| Rolle                                                  | Darstellung                                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Polizei, Security, Schaffner, Zellenwärter             | vorhandenes Officer-Modell                                                          |
| Flugpersonal                                           | Valery als definierter Platzhalter                                                  |
| Tänzerinnen / Barpersonal                              | vorhandener Dancer-/Cast-Pool einschliesslich Ely, Hip-Hop und Pole                 |
| Cabaret                                                | Ladyboy-Modell                                                                      |
| Street Parade                                          | vier Gabber-Modelle                                                                 |
| Touristen, Expats, Bewohner, Reisende, Verkäufer, Taxi | konfigurierte Townsfolk-/Cast-Platzhalter; Sam/Chris je höchstens einmal pro Level  |
| Yoga, Beach                                            | Fitness-/Townsfolk-Besetzung als Platzhalter, solange passende Clips/Outfits fehlen |

Ein zugeordnetes Platzhaltermodell bleibt selbstverständlich sichtbar als Platzhalter – nicht jede Rolle hat bereits ein endgültiges Kostüm. Die Konvertierung weiterer FBX-Dateien allein ergänzt keine neue Besetzung.

## Anbindung

- `npc-kit.ts` registriert jeden bestehenden NPC beim szeneneigenen `npc-models.ts`. Dadurch erreichen die Änderungen alle bisherigen NPC-Erzeuger, einschliesslich Tutorial, Flugzeug und Zelle.
- Ein Template pro Modell lädt/retargetet die Clips einmal. Höchstens zwei Template-Importe laufen gleichzeitig. Instanzen teilen Geometrie und Materialien, besitzen aber eigene Skeletons, Clips und Animationszeit. Freigewordene Instanzen werden begrenzt wiederverwendet.
- Die bisherigen Gameplay-Roots, Trefferziele, Dialoge, Guards und Kollisionskörper bleiben erhalten. `castRole` ermöglicht eine explizite Rolle. Nana-/Parade-Slots wechseln ihre Darstellung zusammen mit der Bewohner-ID.
- Die alten Nah- und Fernkörper werden nach erfolgreichem Laden deaktiviert. Während des Ladens oder bei einem fehlgeschlagenen Import bleibt die vorhandene Figur erhalten. `modelActive` verhindert, dass der bisherige LOD-Code sie wieder einschaltet.
- Bewegte NPCs verwenden Walk/Run, sitzende Personen Sit Idle, Tänzer Dance. Die übrigen Gesten verwenden vorhandene generische Actions. Figuren starten mit unterschiedlichen Phasen und Tempi. Fehlende Spezialclips wie Yoga oder Telefonieren werden dadurch nicht zu neu erstellten Motion-Capture-Animationen.
- Ein gemeinsamer Update-Durchlauf reduziert die Pose-Frequenz mit der Entfernung. Offscreen-NPCs werden nicht animiert. Der GameHost übergibt beim Pausieren Delta 0. Die vorhandenen Stockwerks-Sichtbarkeiten werden berücksichtigt.

## Hintergrundmengen

`far-npc-models.ts` ersetzt die bisherigen primitiven Crowd-Silhouetten von Nana Plaza und Street Parade mit den zugehörigen GLB-Körpern. Eine gebackene Stand-/Sitzpose pro Modell wird über Thin Instances wiederholt. Skeletons werden nur beim Erzeugen dieser Pose benötigt; die entfernten Kopien haben keine eigenen Controller. Wenn ein Bewohner in den Nahbereichspool wechselt, verschwindet seine Fernkopie.

Die Fernstufe hat bewusst reduzierte Bewegung. Geometriequalität und Hardwarekosten hängen von den vorhandenen Modellen ab; es wurde keine allgemeine 60-FPS-Freigabe durchgeführt. Ein kaputtes Fernmodell lässt seine alte Silhouette als Fallback stehen.

## Lokale Prüfung und Build

`http://localhost:5173/test/npc-cast.html` zeigt alle 17 Rollen über denselben NPC-Erzeuger wie das Spiel sowie ein instanziertes Fernmodell. Lokal geprüft: 17/17 Rollen geladen, prozedurale Körper deaktiviert, Modellwechsel in einem Slot und anschliessendes Dispose. Zugpassagiere wurden zusätzlich im laufenden Level angesehen. Nana Plaza und Street Parade wurden über den aktivierten Startknopf gestartet; beide laden Nah- und Fernmodelle ohne gemeldete Modell-/Browserfehler. Der erste Prüfversuch hatte den Start während der Ladephase per Tastatur verpasst und wurde korrigiert. Typecheck, gezieltes ESLint und die 18 vorhandenen Character-/Casting-Tests wurden lokal ausgeführt.

Keine GitHub-CI und keine vollständige E2E-Suite. Weitere manuelle Durchläufe und Hardwaremessungen stehen im Test-Backlog. Der aktuelle Upload wird aus `apps/game-client/dist/` erstellt; für diesen Auftrag kein ZIP erzeugen.

Produktionsbuild erfolgreich: `apps/game-client/dist/`, 242 Dateien, rund 83,2 MiB und 47 GLB-Modelle/Clips. Alle GLBs aus `public/characters/` sind bytegleich im Build enthalten; HTML verweist auf gebaute Assets. Kein neues ZIP erstellt.
