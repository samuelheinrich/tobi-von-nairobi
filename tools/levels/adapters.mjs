/** Projects each level into the shared model. One adapter per level; everything they cannot
 * express is recorded in `notes` rather than silently omitted, so a clean report never reads as
 * more coverage than there is.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rect } from './model.mjs';

/** The data package is TypeScript, so this file is run through tsx. Importing the real modules
 * beats parsing their source: an adapter can never silently miss a block because a comment or a
 * nested literal confused a regular expression, which is exactly what the first version did.
 */
const data = await import('../../packages/game-data/src/index.ts');

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
/** The assembled level, never the raw JSON.
 *
 * `index.ts` merges extra pickups into several levels — Bali gets `baliPickups`, Arlesheim its
 * outdoor bottles. Reading the JSON reported both as far emptier than they are, and turned a real
 * two-level problem into a five-level one. Always read what the game actually loads.
 */
const levelById = new Map(
  [...data.playableLevels, data.drunkTank].map((level) => [level.id, level]),
);
const levelFile = (name) => {
  const raw = JSON.parse(
    readFileSync(join(repoRoot, 'packages/game-data/src/levels', name), 'utf8'),
  );
  return levelById.get(raw.id) ?? raw;
};

const item = (id, p) => ({ id, x: p.x, y: p.y, z: p.z });
const fromPickups = (level) => (level.pickups ?? []).map((p) => item(p.id, p.position));
const fromPowerups = (level) => (level.powerups ?? []).map((p) => item(p.id, p.position));

const base = (level, extra) => ({
  id: level.id,
  title: level.title,
  bounds: level.navigationBounds ?? null,
  ground: null,
  solids: [],
  water: [],
  bridges: [],
  routes: [],
  bottles: fromPickups(level),
  powerups: fromPowerups(level),
  npcs: [],
  spawn: level.spawn ? item('spawn', level.spawn) : null,
  destination: level.destination ? item(level.destination.id, level.destination.position) : null,
  policeSpawns: (level.policeSpawns ?? []).map((p, i) => item(`police-${i}`, p)),
  /** Lower bottle floor for levels that are not a run. */
  minBottles: undefined,
  notes: [],
  ...extra,
});

function zurich() {
  const level = levelFile('zurich-street-parade.json');
  const layout = data.zurichLayout;
  const ground = layout.ground;
  const foot = (b) => rect(b.x, b.z, b.width, b.depth);
  const named = (list, prefix, extra = {}) =>
    list.map((b, i) => ({ id: b.id ?? `${prefix}-${i}`, rect: foot(b), ...extra }));
  // Buildings the client builds as enterable halls rather than closed blocks. The data package
  // lists them as plain blocks, which is the drift this validator exists to surface.
  const enterable = new Set(['hauptbahnhof']);
  const blocks = layout.blocks;
  const towers = layout.towers;
  const mobiles = layout.loveMobiles;
  return base(level, {
    // The playable floor is no longer one plate. `zurichLayout.ground` still describes the
    // original island; the northern city and the station hall are laid down separately in the
    // client. Until that lives in one place, the union is spelled out here.
    ground: {
      minX: Math.min(ground.minX, -124),
      maxX: Math.max(ground.maxX, 124),
      minZ: ground.minZ,
      maxZ: Math.max(ground.maxZ, 123),
    },
    solids: [
      ...named(blocks, 'block').map((s) => (enterable.has(s.id) ? { ...s, enterable: true } : s)),
      ...named(towers, 'tower'),
      // Love mobiles are floats: they drive the route, so they are vehicles, not obstacles.
      ...named(mobiles, 'mobile', { vehicle: true }),
    ],
    water: layout.water.map((w) => ({ id: w.id, rect: w })),
    bridges: layout.bridges.map((b) => ({ id: b.id, rect: b })),
    // The parade walks its own route; love mobiles roll along it.
    routes: [{ id: 'parade', path: [...layout.route], width: 6 }],
    notes: [
      'Promenaden, Zürich HB und die Züge sind nicht modelliert; deren Geometrie liegt im Client.',
    ],
  });
}

function phuket() {
  const level = levelFile('thailand-railway.json');
  const solids = data.phuketShophouses.map((h) => ({
    id: h.id,
    rect: rect(h.x, h.z, h.width, h.depth),
    enterable: h.enterable,
  }));
  const npcs = data.phuketResidents.map((r) => ({ id: `resident-${r.id}`, x: r.x, z: r.z }));
  return base(level, {
    solids,
    // Roadways from world.ts: main road, party road, market road.
    routes: [
      {
        id: 'hauptstrasse',
        path: [
          { x: -192, z: 0 },
          { x: -18, z: 0 },
        ],
        width: 15,
      },
      {
        id: 'partystrasse',
        path: [
          { x: -165, z: 21 },
          { x: -87, z: 21 },
        ],
        width: 14,
      },
      {
        id: 'marktstrasse',
        path: [
          { x: -142, z: -47 },
          { x: -80, z: -47 },
        ],
        width: 10,
      },
    ],
    npcs,
    notes: ['Strand, Nachtmarkt-Stände und Bahnhof sind nicht modelliert.'],
  });
}

function nana() {
  const level = levelFile('bangkok-nana-plaza.json');
  return base(level, {
    // No solids: the venue records carry no footprint, and inventing one produced thirty false
    // reports of residents standing inside walls. Nana needs its geometry described in data
    // before this level can be checked properly.
    solids: [],
    npcs: data.nanaResidents.map((p) => ({ id: `resident-${p.id}`, x: p.x, y: p.y, z: p.z })),
    notes: [
      'Venue-Grundrisse fehlen in den Daten; Kollisionsprüfungen sind hier nicht möglich.',
      'Treppen, Stockwerke und Geländer liegen im Client und werden nicht geprüft.',
    ],
  });
}

const simple = (file, notes) => () => base(levelFile(file), { notes });

export const adapters = {
  'zurich-street-parade': zurich,
  'thailand-railway': phuket,
  'bangkok-nana-plaza': nana,
  'fly-high': simple('fly-high.json', [
    'Kabinengeometrie liegt im Client; nur Items und Grenzen geprüft.',
  ]),
  'arlesheim-hippie-wg': simple('arlesheim-hippie-wg.json', [
    'Hausgeometrie liegt im Client; nur Items und Grenzen geprüft.',
  ]),
  'bali-escape': simple('bali-escape.json', ['Nur Items und Grenzen geprüft.']),
  'beach-bar': simple('beach-bar.json', ['Nur Items und Grenzen geprüft.']),
  'night-market': simple('night-market.json', ['Nur Items und Grenzen geprüft.']),
  'welcome-to-bali': simple('welcome-to-bali.json', ['Nur Items und Grenzen geprüft.']),
  'bali-adventure': simple('bali-adventure.json', ['Nur Items und Grenzen geprüft.']),
  ausnuechterungszelle: () => ({
    ...base(levelFile('ausnuechterungszelle.json'), {
      notes: ['Einzelzelle: die Weltgrenze ist die Zellenwand, nicht eine navigationBounds.'],
    }),
    // An epilogue in a locked cell: no run, no pickups, and nowhere to fall.
    minBottles: 0,
  }),
};
