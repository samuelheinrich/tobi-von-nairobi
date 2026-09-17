/** Generic level checks. Each one reads only the shared model, so it applies to every level that
 * has an adapter — including levels written after the check.
 *
 * Severities follow the QA brief: CRITICAL breaks or softlocks the level, HIGH is a clear defect a
 * player will hit, MEDIUM is visible but survivable, LOW is polish.
 */
import { covers, distanceToPath, samplePath } from './model.mjs';

/** Tobi's capsule: 0.42 m radius. Anything closer than this to solid geometry intersects it. */
const CAPSULE_RADIUS = 0.42;
/** Below this many bottles a level cannot keep Tobi supplied. */
const MIN_BOTTLES = 8;
/** A bottle further than this from any other is a lone outlier rather than a placed reward. */
const CLUSTER_RADIUS = 45;

const finding = (severity, code, message, detail) => ({ severity, code, message, detail });

/** Solids that block a vehicle. A parade float stands *on* the route by definition, so counting
 * it as an obstacle reports the level's own design as a defect. */
const blocksRoute = (s) => !s.vehicle && !s.enterable;
const inAnySolid = (model, p, margin = 0) => model.solids.find((s) => covers(s.rect, p, margin));
const inAnyWater = (model, p, margin = 0) =>
  model.water.find((w) => covers(w.rect, p, margin)) &&
  !model.bridges.some((b) => covers(b.rect, p));

/** Every check receives the model and returns findings. */
export const checks = [
  function worldBounds(model) {
    if (!model.bounds)
      return [
        finding(
          'MEDIUM',
          'WORLD_BOUNDS_MISSING',
          'Das Level erklärt keine navigationBounds. Das ist kein Zaun um den Spieler, sondern ' +
            'das Gitter, auf dem NPCs laufen und aus dem der Server ableitet, wie weit man zu ' +
            'Fuss kommen kann. Ohne Grenzen laufen NPCs auf einer geratenen Box.',
        ),
      ];
    const out = [];
    if (model.ground) {
      const g = model.ground;
      const b = model.bounds;
      if (b.minX < g.minX || b.maxX > g.maxX || b.minZ < g.minZ || b.maxZ > g.maxZ)
        out.push(
          finding(
            'CRITICAL',
            'BOUNDS_EXCEED_GROUND',
            'Die Spielgrenze reicht über den Boden hinaus — der Spieler kann ins Leere laufen.',
            { bounds: b, ground: g },
          ),
        );
    }
    return out;
  },

  function spawnAndGoal(model) {
    const out = [];
    for (const [name, item] of [
      ['Spawn', model.spawn],
      ['Ziel', model.destination],
    ]) {
      if (!item) continue;
      const solid = inAnySolid(model, item, CAPSULE_RADIUS);
      if (solid)
        out.push(finding('CRITICAL', 'SPAWN_IN_SOLID', `${name} steckt in ${solid.id}.`, item));
      // A carried destination is meant to lie outside the walkable grid: you fly there.
      if (model.bounds && !covers(model.bounds, item) && !(name === 'Ziel' && model.carried))
        out.push(
          finding(
            'CRITICAL',
            'SPAWN_OUT_OF_BOUNDS',
            `${name} liegt ausserhalb der Spielgrenze.`,
            item,
          ),
        );
      if (inAnyWater(model, item))
        out.push(finding('CRITICAL', 'SPAWN_IN_WATER', `${name} liegt im Wasser.`, item));
    }
    return out;
  },

  function bottleSupply(model) {
    const out = [];
    // A level may declare a lower floor — the drunk tank is an epilogue with no pickups by design.
    const minimum = model.minBottles ?? MIN_BOTTLES;
    if (model.bottles.length < minimum)
      out.push(
        finding(
          model.bottles.length === 0 ? 'CRITICAL' : 'HIGH',
          'BOTTLES_BELOW_MINIMUM',
          `${model.bottles.length} Flaschen; unter ${minimum} ist Tobis Energieversorgung nicht gesichert.`,
        ),
      );
    for (const bottle of model.bottles) {
      // A bottle inside a hall you can walk into is placement, not a defect.
      const solid = model.solids.find(
        (s) => !s.enterable && covers(s.rect, bottle, CAPSULE_RADIUS),
      );
      if (solid)
        out.push(
          finding('HIGH', 'BOTTLE_IN_SOLID', `Flasche ${bottle.id} steckt in ${solid.id}.`, bottle),
        );
      if (model.bounds && !covers(model.bounds, bottle))
        out.push(
          finding(
            'HIGH',
            'BOTTLE_OUT_OF_BOUNDS',
            `Flasche ${bottle.id} liegt ausserhalb der Spielgrenze.`,
            bottle,
          ),
        );
      if (inAnyWater(model, bottle))
        out.push(
          finding('HIGH', 'BOTTLE_IN_WATER', `Flasche ${bottle.id} liegt im Wasser.`, bottle),
        );
    }
    // An isolated bottle is usually a typo in a coordinate rather than a hidden reward.
    for (const bottle of model.bottles) {
      const nearest = Math.min(
        ...model.bottles
          .filter((o) => o !== bottle)
          .map((o) => Math.hypot(o.x - bottle.x, o.z - bottle.z)),
        Infinity,
      );
      if (Number.isFinite(nearest) && nearest > CLUSTER_RADIUS)
        out.push(
          finding(
            'LOW',
            'BOTTLE_ISOLATED',
            `Flasche ${bottle.id} liegt ${nearest.toFixed(0)} m von der nächsten entfernt.`,
            bottle,
          ),
        );
    }
    return out;
  },

  function powerupPlacement(model) {
    const out = [];
    for (const p of model.powerups) {
      const solid = model.solids.find((s) => !s.enterable && covers(s.rect, p, CAPSULE_RADIUS));
      if (solid)
        out.push(finding('HIGH', 'POWERUP_IN_SOLID', `Powerup ${p.id} steckt in ${solid.id}.`, p));
      if (model.bounds && !covers(model.bounds, p))
        out.push(
          finding(
            'HIGH',
            'POWERUP_OUT_OF_BOUNDS',
            `Powerup ${p.id} liegt ausserhalb der Spielgrenze.`,
            p,
          ),
        );
      if (inAnyWater(model, p))
        out.push(finding('HIGH', 'POWERUP_IN_WATER', `Powerup ${p.id} liegt im Wasser.`, p));
    }
    return out;
  },

  function npcPlacement(model) {
    const out = [];
    const seen = new Map();
    for (const npc of model.npcs) {
      const solid = inAnySolid(model, npc);
      if (solid && !solid.enterable)
        out.push(finding('HIGH', 'NPC_IN_SOLID', `NPC ${npc.id} steht in ${solid.id}.`, npc));
      if (model.bounds && !covers(model.bounds, npc))
        out.push(
          finding(
            'MEDIUM',
            'NPC_OUT_OF_BOUNDS',
            `NPC ${npc.id} steht ausserhalb der Spielgrenze.`,
            npc,
          ),
        );
      if (inAnyWater(model, npc))
        out.push(finding('HIGH', 'NPC_IN_WATER', `NPC ${npc.id} steht im Wasser.`, npc));
      // Without the floor, two people one storey apart read as standing in each other.
      const key = `${npc.x.toFixed(2)},${(npc.y ?? 0).toFixed(2)},${npc.z.toFixed(2)}`;
      if (seen.has(key))
        out.push(
          finding(
            'MEDIUM',
            'NPC_DUPLICATE_SPOT',
            `NPC ${npc.id} steht exakt auf ${seen.get(key)}.`,
            npc,
          ),
        );
      else seen.set(key, npc.id);
    }
    // Two capsules cannot share a metre of floor.
    let overlaps = 0;
    for (let i = 0; i < model.npcs.length; i++)
      for (let j = i + 1; j < model.npcs.length; j++) {
        const a = model.npcs[i];
        const b = model.npcs[j];
        if (Math.abs((a.y ?? 0) - (b.y ?? 0)) > 1.5) continue;
        if (Math.hypot(a.x - b.x, a.z - b.z) < CAPSULE_RADIUS * 2) overlaps++;
      }
    if (overlaps)
      out.push(
        finding(
          'MEDIUM',
          'NPC_OVERLAP',
          `${overlaps} NPC-Paare stehen näher beieinander als zwei Kapselradien.`,
        ),
      );
    return out;
  },

  function npcsOnRoutes(model) {
    const out = [];
    for (const route of model.routes) {
      const hit = model.npcs.filter((npc) => distanceToPath(route.path, npc) < route.width / 2);
      if (hit.length)
        out.push(
          finding(
            'HIGH',
            'NPC_ON_VEHICLE_ROUTE',
            `${hit.length} NPCs stehen auf der Route ${route.id}; dort fahren Fahrzeuge.`,
            { route: route.id, npcs: hit.slice(0, 8).map((n) => n.id) },
          ),
        );
    }
    return out;
  },

  function routesThroughBuildings(model) {
    const out = [];
    for (const route of model.routes) {
      const hits = new Map();
      for (const point of samplePath(route.path, 1)) {
        const solid = model.solids.find(
          (s) => blocksRoute(s) && covers(s.rect, point, route.width / 2),
        );
        if (solid) hits.set(solid.id, (hits.get(solid.id) ?? 0) + 1);
      }
      for (const [id, count] of hits)
        out.push(
          finding(
            'CRITICAL',
            'ROUTE_THROUGH_SOLID',
            `Route ${route.id} führt ${count} m weit durch ${id}.`,
            {
              route: route.id,
              solid: id,
            },
          ),
        );
      if (model.bounds)
        for (const point of samplePath(route.path, 4))
          if (!covers(model.bounds, point)) {
            out.push(
              finding(
                'HIGH',
                'ROUTE_OUT_OF_BOUNDS',
                `Route ${route.id} verlässt die Spielgrenze.`,
                point,
              ),
            );
            break;
          }
    }
    return out;
  },
];

export function runChecks(model) {
  return checks.flatMap((check) => check(model) ?? []);
}

export const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
