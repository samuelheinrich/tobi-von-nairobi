import { allLevels } from '../../packages/game-data/dist/index.js';
// Parsing `allLevels` already runs every schema and cross-reference rule; levels that are only
// reachable through gameplay are validated here too, even though the gallery never lists them.
for (const level of allLevels)
  console.log(
    `Validated ${level.id}: ${level.pickups.length} unique pickups, ${level.objectives.length} objectives${level.selectable ? '' : ', not selectable'}.`,
  );
