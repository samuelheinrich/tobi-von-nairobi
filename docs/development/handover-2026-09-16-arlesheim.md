# Übergabe: Arlesheimer WG-Quartier

16. September 2026. Die WG ist um Garten, Strassen, neun Gebäude, Dorfplatz/Dom, Waldweg, Fahnen, Quartierplan und elf Nachbarn erweitert. 36 statt 18 Flaschen; optionaler Scooter. [Spezifikation und Dateizuordnung](../gameplay/arlesheim-hippie-wg.md).

Wichtig für Folgearbeiten:

1. Die vorherigen uncommitteten Bali-/Physics-Änderungen bleiben im Arbeitsbaum. Diese Fortsetzung enthält ebenfalls keinen Commit oder Push.
2. `world/scene-builder.ts` ist jetzt der gemeinsame Instanz-/Collider-Builder für Bali und Arlesheim. Keine neue parallele Engine bauen.
3. Die WG-Südwand hat nur im Erdgeschoss eine echte Türlücke. Obere Südwände bleiben massiv. Stockwerkshöhen 0 / 4,5 / 9 m unverändert.
4. `scene.clipPlane` gilt nur innerhalb der WG. Draussen zwingend deaktivieren; sonst verschwindet das Quartier oberhalb der Figur. Flaschen-Cutaway und Stockwerks-HUD folgen derselben Grenze.
5. Das Café hat ein flaches begehbares Dach mit der bestehenden Aussentreppe; andere Häuser haben geneigte Dachplatten. Collider nach Rotation erzeugen.
6. Der rote Baselstab ist ein regionales Motiv, nicht das kommunale Arlesheimer Flügelwappen. Fahnen/Plan sind lokal erzeugte Grafik, keine kopierten Fotos.
7. `arlesheimOutdoorRoute` enthält tatsächliche Tür-/Dach-/Wald-Zugänge. Nach Geometrieänderungen nur den passenden lokalen Routentest verwenden. Keine GitHub-CI und keine vollständige Testsuite starten.
8. Alte Pickup-/Level-IDs erhalten, 18 neue Pickups hinzugefügt. Historische Bestwerte nicht gelöscht; vergleichbare Ranglisten sind eine separate Folgeaufgabe.

Prüfungen: WG-Rundroute mit 36 Flaschen und erneutem Hausbetreten sowie Bali-Regression gemeinsam in 3 Sekunden bestanden; Typecheck erfolgreich. ESLint erfolgreich. Gaststart und visuelle Kontrollen im Haus, Garten und auf dem Dorfplatz ohne Browserfehler. Aussenansichten bestätigen deaktivierten Stockwerksschnitt und sichtbare Fahnen; neues Galeriebild gerendert. Upload-Build siehe Abschlussbericht. Keine allgemeine 60-FPS-Zusage oder vollständige Asset-Abnahme.
