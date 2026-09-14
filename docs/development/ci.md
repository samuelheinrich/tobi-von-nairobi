# CI für Software-WebGL

Die Qualitätsprüfungen und die Browser-Suite laufen in getrennten Jobs. Der Job `quality` prüft Lint, Format, Typen, Units, Inhalte, echte PostgreSQL-Integration, Build und Bundlebudget. Erst wenn er erfolgreich ist, starten drei Browserjobs. Das vermeidet Browser-Minuten für bereits fehlerhaftes Tooling oder Code.

Jeder Browserjob läuft auf einer eigenen GitHub-VM mit eigener PostgreSQL-Instanz. Innerhalb der VM bleibt Playwright bei **einem Worker**, damit mehrere Software-WebGL-Szenen nicht um dieselbe CPU konkurrieren. Die festen Ports 3001, 4173 und 5174 kollidieren zwischen VMs nicht. `reuseExistingServer: false` bleibt bestehen. Mehrere Shards lokal dürfen weiterhin nicht gleichzeitig dieselben Ports belegen.

`fullyParallel` ist nur in CI aktiviert und verteilt unabhängige Testfälle statt ganzer Dateien über `--shard=1/3` bis `3/3`. Es erhöht die Workerzahl nicht. Die vorhandenen Tests teilen keine `beforeAll`-Spielrunde; jeder startet seine eigene Browserseite. Neue Tests dürfen sich nicht auf die Ausführungsreihenfolge anderer Fälle verlassen. [Playwright-Dokumentation](https://playwright.dev/docs/test-sharding).

## Grenzen und Fehlerdiagnose

- `quality`: maximal 20 Minuten.
- Jeder der drei Browserjobs: maximal 25 Minuten inklusive Setup und Build; `fail-fast: false` erhält die Ergebnisse der anderen Shards.
- `required`: wertet sowohl `quality` als auch das Gesamtergebnis der Browsermatrix aus. Fehlgeschlagene, abgebrochene oder übersprungene Jobs ergeben keinen grünen Pflichtcheck.
- Jeder fehlgeschlagene Shard lädt eigene Traces/Screenshots als `browser-failure-artifacts-N` hoch. Bei einem harten Job-Timeout kann GitHub die nachgelagerten Uploadschritte nicht garantieren; die fortlaufende Testausgabe steht zusätzlich im Joblog.
- Browserjobs bauen einmal und starten danach Playwright direkt. `pnpm test:e2e` bleibt der unveränderte lokale Komfortbefehl inklusive Build.

Sharding reduziert die Wanduhrzeit, nicht automatisch die Summe der Runner-Minuten: jede VM hat eigene Installations-/Buildkosten. Die Aufteilung ist zunächst auf drei Runner begrenzt. Keine Retries oder ausgelassenen Tests kaschieren Fehler. Bestehende Test-Backlog-Einträge werden dadurch nicht automatisch abgearbeitet.

Die Verteilung kann ohne Browserstarts geprüft werden:

```bash
CI=true pnpm exec playwright test --list --shard=1/3
CI=true pnpm exec playwright test --list --shard=2/3
CI=true pnpm exec playwright test --list --shard=3/3
```

## Branch-Schutz

Die ursprüngliche Konfiguration liegt in [main-branch-protection.json](main-branch-protection.json). Der Kontextname `required` war bereits korrekt. Ursache des früheren Abbruchs war die Laufzeit der gesamten seriellen Browser-Suite im gemeinsamen 20-Minuten-Job.

Die frühere Übergabe warnte vor Portkonflikten zwischen Shards: Das trifft auf mehrere lokale Prozesse zu; separate GitHub-Matrix-Runner sind voneinander isoliert.

Vor der Wiederherstellung des Schutzes muss die neue CI auf dem zu integrierenden Stand tatsächlich erfolgreich sein. Ein höheres Zeitlimit oder ein lokal erfolgreicher Test allein ist kein Nachweis. Die Datei mit der Ursprungskonfiguration wird nicht abgeschwächt.
