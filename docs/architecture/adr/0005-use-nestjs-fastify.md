# ADR 0005 – NestJS mit Fastify-Adapter

Datum: 2026-09-13. Status: im Plan gewählt, Umsetzung ausstehend.

**Kontext:** Das Backend wächst über Auth, Savegames, Runs, Economy, Achievements und Settings. Mehrere Entwickler benötigen klare Service- und Testgrenzen.

**Entscheidung:** ein modularer NestJS-Monolith, Fastify als HTTP-Adapter. Fachliche Services sind unabhängig von Request-/Responseobjekten. Keine Microservices im MVP.

**Alternative:** Fastify direkt mit Pluginstruktur ist wartbar und schlanker. Für dieses Team werden vorgegebene Nest-Module und Dependency Injection höher gewichtet als minimale Frameworkfläche.

**Folgen:** etwas mehr Boilerplate und Adapterkompatibilität; ausschliesslich geeignete Fastify-Security-/Cookieplugins einsetzen. Gemeinsame validierbare DTO-Schemas bleiben die Quelle, keine zweite handgepflegte DTO-Definition.

**Verifikation:** Boot, Authcookie, CSRF, Logging, OpenAPI-Schema und Datenbanktests in Phase 0/3. Begründung und offizielle Referenzen: [Architektur](../../../ARCHITECTURE.md).
