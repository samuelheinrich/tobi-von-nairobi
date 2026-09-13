# ADR 0004 – Prisma und kontrollierte Migrationen

Datum: 2026-09-13. Status: im Plan gewählt, Umsetzung ausstehend.

**Kontext:** Ein TypeScript-Backend benötigt nachvollziehbare Schemaänderungen und konsistente Transaktionen, ohne Datenbankdetails in öffentliche DTOs zu tragen.

**Entscheidung:** Prisma in einem ausschliesslich serverseitigen database-Package. Schema und Migrationen bleiben beisammen. Nötige Constraints/partielle Indizes werden in überprüften SQL-Migrationen ergänzt. Öffentliche Schemas werden unabhängig vom ORM modelliert.

**Alternativen:** ein SQL-Querybuilder bietet mehr direkte SQL-Kontrolle; für diesen Teamworkflow überwiegen der gemeinsame Prisma-Schema-/Clientprozess. ORM-Nutzung ersetzt SQL-Verständnis nicht.

**Folgen:** Buildgenerierung, Versionskompatibilität, Migrationsreviews, echte PostgreSQL-Tests. Keine Schemaänderung per Produktions-`db push`, keine lang laufende Netzwerkoperation innerhalb einer Transaktion.

**Verifikation:** frische DB, Upgrade der vorherigen Version, parallele Rewardrequests und transaktionaler Rollback. Einzelheiten: [Datenmodell](../../api/data-and-api.md).
