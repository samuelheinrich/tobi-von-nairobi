# Architecture Decision Records

Diese ADRs dokumentieren die im Implementierungsplan gewählten Entscheidungen. **Status aller Einträge: geplant, noch nicht umgesetzt.** Sie behaupten keine bereits erfolgte technische Validierung oder Teamfreigabe. Nach dem jeweiligen Prototyp wird das Ergebnis ergänzt; ersetzte Entscheidungen bleiben nachvollziehbar.

| ADR                                                  | Entscheidung                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| [0001](0001-use-babylonjs.md)                        | Babylon.js, Havok und WebGL-2-Basispfad                                        |
| [0002](0002-use-postgresql.md)                       | PostgreSQL und getrennte Runtime-/Persistenzzustände                           |
| [0003](0003-use-pnpm-monorepo.md)                    | pnpm-Monorepo, modulare Packages und kurzer Trunk-Workflow                     |
| [0004](0004-use-prisma.md)                           | Prisma mit überprüften SQL-Migrationen und Transaktionen                       |
| [0005](0005-use-nestjs-fastify.md)                   | modularer NestJS-Monolith mit Fastify-Adapter                                  |
| [0006](0006-use-versioned-contracts-and-content.md)  | gemeinsame Schemas und versionierter datengetriebener Content                  |
| [0007](0007-client-simulation-and-save-authority.md) | lokale Simulation, serverseitige Dauerzustände und begrenzte Score-Validierung |

Format künftiger ADRs: Datum, Status, Kontext, Entscheidung, verworfene Alternativen, Folgen, Verifikation und Anlass zur Neubewertung. Kleine Balanceänderungen benötigen keine ADR.
