# Produktionsziel

Das Spiel heisst **Tobi von Nairobi**. Der Repository-Slug und die Paketwurzel lauten `tobi-von-nairobi`, gemeinsame Packages verwenden `@tobi/*`.

- Repository: [samuelheinrich/tobi-von-nairobi](https://github.com/samuelheinrich/tobi-von-nairobi)
- Geplanter öffentlicher Origin: **https://tobi-von-nairobi.ch**
- API unter demselben Origin: **https://tobi-von-nairobi.ch/api/v1**

Die Domain ist eine Zielkonfiguration, noch keine erfolgte Bereitstellung. DNS-Einträge, Hostinganbieter, TLS-Zertifikat und Secrets werden bei der Deployment-Einrichtung ergänzt. In Produktion bekommt der Server `CLIENT_URL=https://tobi-von-nairobi.ch`; der Browser behält `VITE_API_BASE_URL=/api/v1`. Die relative API-Adresse ermöglicht denselben Origin ohne zusätzliche CORS-Freigaben. Localhost bleibt für lokale Entwicklung und Tests unverändert.

Die Umbenennung verändert vorhandene lokale Datenbanknamen, Zugangsdaten und Docker-Volumes nicht. Neue Setups erhalten die neuen Tobi-Standardwerte. Bereits eingerichtete `.env`-Dateien bleiben lokal und werden nicht veröffentlicht.

Bei einer bestehenden lokalen Compose-Installation hält `COMPOSE_PROJECT_NAME` in der nicht versionierten Root-`.env` den bisherigen Projektnamen und damit das zugehörige Volume stabil. Neue Installationen verwenden automatisch `tobi`. Ein Datenbankumzug ist für die Umbenennung nicht nötig.
