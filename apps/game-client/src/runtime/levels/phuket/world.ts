import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Position3, VehicleDefinition } from '@tobi/contracts';
import { phuketSectors, phuketVehicles } from '@tobi/game-data';
import type { AmbientZone } from '../../audio/spatial-ambience.js';
import type { HavokWorld } from '../../physics/havok-world.js';
import { box, material } from '../materials.js';
import { sceneSign } from '../scene-kit.js';
import type { SceneInteractionResult } from '../scene-interaction.js';
import { updateGeometryAudit } from '../../rendering/geometry-validation.js';

interface PhuketWorldOptions {
  solid(mesh: Mesh, cameraObstacle?: boolean): Mesh;
  barrier(mesh: Mesh): Mesh;
}

export interface PhuketWorld {
  readonly root: TransformNode;
  readonly vehicles: readonly VehicleDefinition[];
  readonly audioZones: readonly AmbientZone[];
  setEnabled(active: boolean): void;
  update(delta: number): void;
  focus(position: Position3): void;
  worldLabel(position: Position3): string;
  safeGround(position: Position3): boolean;
  interactionPrompt(position: Position3): string;
  interact(position: Position3): SceneInteractionResult | null;
}

type VenueTheme = 'classic' | 'neon' | 'cabaret' | 'show' | 'ladyboy' | 'dark' | 'club';
interface VenuePlan {
  name: string;
  x: number;
  z: number;
  side: 1 | -1;
  theme: VenueTheme;
}

const venues: readonly VenuePlan[] = [
  { name: 'TIGER MOON', x: -103, z: 35, side: 1, theme: 'classic' },
  { name: 'NEON LOTUS', x: -119, z: 35, side: 1, theme: 'neon' },
  { name: 'SIAM CABARET', x: -135, z: 35, side: 1, theme: 'cabaret' },
  { name: 'PING PONG SHOW 18+', x: -151, z: 35, side: 1, theme: 'show' },
  { name: 'ANDAMAN QUEENS', x: -111, z: 7, side: -1, theme: 'ladyboy' },
  { name: 'BLACK ORCHID', x: -129, z: 7, side: -1, theme: 'dark' },
  { name: 'PHUKET AFTERDARK', x: -149, z: 7, side: -1, theme: 'club' },
] as const;

/** Patong-inspired, connected free-roam district revealed when the railway stops. */
export function createPhuketWorld(
  scene: Scene,
  world: HavokWorld,
  options: PhuketWorldOptions,
): PhuketWorld {
  const root = new TransformNode('phuket-free-roam', scene);
  const sectors = new Map<string, TransformNode>();
  for (const sector of phuketSectors) {
    const node = new TransformNode(`phuket-sector-${sector.id}`, scene);
    node.parent = root;
    sectors.set(sector.id, node);
  }
  const mat = {
    ground: material(scene, 'phuket-ground', '#776f5a'),
    road: material(scene, 'phuket-road', '#2f343c'),
    pavement: material(scene, 'phuket-pavement', '#8d8a82'),
    sand: material(scene, 'phuket-sand', '#d9bd78'),
    sea: material(scene, 'phuket-sea', '#147fa2'),
    white: material(scene, 'phuket-plaster', '#d7d0bd'),
    dark: material(scene, 'phuket-dark', '#171b24'),
    wood: material(scene, 'phuket-wood', '#74432c'),
    roof: material(scene, 'phuket-roof', '#a74335'),
    green: material(scene, 'phuket-green', '#39804e'),
    leaf: material(scene, 'phuket-leaf', '#235f3c'),
    neonPink: material(scene, 'phuket-neon-pink', '#ff3f9a'),
    neonBlue: material(scene, 'phuket-neon-blue', '#2ee7ff'),
    neonGold: material(scene, 'phuket-neon-gold', '#ffd85a'),
    violet: material(scene, 'phuket-violet', '#8b4fff'),
  };
  const drinkSpots: { x: number; z: number; label: string }[] = [];
  mat.sea.emissiveColor = Color3.FromHexString('#063d52');
  mat.neonPink.emissiveColor = Color3.FromHexString('#9c165f');
  mat.neonBlue.emissiveColor = Color3.FromHexString('#087d92');
  mat.neonGold.emissiveColor = Color3.FromHexString('#8d7015');
  mat.violet.emissiveColor = Color3.FromHexString('#48237c');
  const solid = (
    name: string,
    size: [number, number, number],
    at: [number, number, number],
    surface = mat.white,
    parent: TransformNode = root,
    cameraObstacle = true,
  ) => {
    const mesh = options.solid(box(scene, name, size, at, surface), cameraObstacle);
    mesh.parent = parent;
    return mesh;
  };
  const prop = (
    name: string,
    size: [number, number, number],
    at: [number, number, number],
    surface = mat.white,
    parent: TransformNode = root,
  ) => {
    const mesh = box(scene, name, size, at, surface);
    mesh.parent = parent;
    mesh.isPickable = false;
    return mesh;
  };

  // One continuous physical island avoids the old floating-platform impression.
  solid('phuket-island-ground', [196, 0.6, 220], [-110, -0.8, 0], mat.ground, root, false);
  solid('phuket-main-road', [174, 0.12, 15], [-105, -0.42, 0], mat.road, root, false);
  solid('phuket-party-road', [78, 0.12, 14], [-126, -0.4, 21], mat.road, root, false);
  solid('phuket-market-road', [62, 0.1, 10], [-111, -0.4, -47], mat.road, root, false);
  for (const z of [-10, 10])
    solid('phuket-sidewalk', [174, 0.25, 5], [-105, -0.3, z], mat.pavement, root, false);
  for (let x = -183; x <= -30; x += 12)
    prop('phuket-road-dash', [5, 0.03, 0.22], [x, -0.3, 0], mat.neonGold);
  // Station approach gets an authored ramp with a walkable top rather than a step at the world seam.
  const approach = solid(
    'phuket-station-approach',
    [28, 0.35, 8],
    [-36, -0.15, 32],
    mat.pavement,
    sectors.get('station')!,
    false,
  );
  approach.rotation.y = -0.18;
  const gate = sceneSign(scene, 'PHUKET · PATONG  →', -41, 4.5, 27, 8, { plate: '#17553e' });
  gate.rotation.y = Math.PI / 2;
  gate.parent = sectors.get('station')!;

  // Modular town façades. Selected units have shallow or complete open interiors.
  const buildingColours = ['#dcc9a5', '#d89b7b', '#7eb4a5', '#c7a7ce', '#d4d0bf'];
  for (let i = 0; i < 16; i++) {
    const x = -50 - i * 8.2;
    const side = i % 2 ? -1 : 1;
    const z = side * (18 + (i % 3) * 2.2);
    const height = 5.5 + (i % 4) * 1.5;
    const facade = material(
      scene,
      `phuket-building-${i}`,
      buildingColours[i % buildingColours.length]!,
    );
    const width = 7.2;
    const depth = 10;
    if (i % 4 === 0) {
      // Fully enterable shell with a broad street-facing opening.
      solid(
        'phuket-enterable-floor',
        [width, 0.2, depth],
        [x, -0.25, z],
        mat.pavement,
        sectors.get('old-town')!,
        false,
      );
      solid(
        'phuket-enterable-back',
        [width, height, 0.28],
        [x, height / 2 - 0.2, z + side * 5],
        facade,
        sectors.get('old-town')!,
      );
      for (const dx of [-width / 2, width / 2])
        solid(
          'phuket-enterable-side',
          [0.28, height, depth],
          [x + dx, height / 2 - 0.2, z],
          facade,
          sectors.get('old-town')!,
        );
      solid(
        'phuket-walkable-roof',
        [width + 0.4, 0.3, depth + 0.4],
        [x, height - 0.05, z],
        mat.roof,
        sectors.get('old-town')!,
        false,
      );
      solid(
        'phuket-shop-counter',
        [4, 1.05, 0.8],
        [x, 0.12, z + side * 2.2],
        mat.wood,
        sectors.get('old-town')!,
      );
      const label = ['WARUNG', 'MASSAGE', 'TATTOO', 'HOSTEL'][Math.floor(i / 4) % 4]!;
      const sign = sceneSign(scene, label, x, 3.4, z - side * 4.92, 5, {
        plate: i % 8 ? '#174960' : '#7d204f',
      });
      sign.rotation.y = side < 0 ? 0 : Math.PI;
      sign.parent = sectors.get('old-town')!;
      if (i === 4 || i === 12) {
        // Continuous exterior ramp supplies a deterministic route to the walkable roof.
        const ramp = solid(
          'phuket-roof-ramp',
          [2, 0.35, 10],
          [x + width / 2 + 1.2, height / 2 - 0.3, z],
          mat.wood,
          sectors.get('old-town')!,
          false,
        );
        ramp.rotation.x = side * -0.48;
      }
    } else {
      solid(
        'phuket-facade-building',
        [width, height, depth],
        [x, height / 2 - 0.35, z],
        facade,
        sectors.get('old-town')!,
      );
      prop(
        'phuket-awning',
        [6.6, 0.18, 2.2],
        [x, 2.5, z - side * 5.3],
        i % 2 ? mat.neonBlue : mat.neonPink,
        sectors.get('old-town')!,
      );
      for (let floor = 1.5; floor < height - 0.5; floor += 2)
        for (const dx of [-2, 2])
          prop(
            'phuket-window',
            [1.2, 0.9, 0.08],
            [x + dx, floor, z - side * 5.02],
            mat.neonBlue,
            sectors.get('old-town')!,
          );
    }
    // AC boxes and bundled cables keep the modular façades recognisably Thai.
    prop(
      'phuket-ac-unit',
      [1.1, 0.75, 0.5],
      [x + 2.2, 3.2, z - side * 5.25],
      mat.dark,
      sectors.get('old-town')!,
    );
    prop(
      'phuket-cable',
      [0.1, 0.1, width],
      [x, 4.2, z - side * 5.34],
      mat.dark,
      sectors.get('old-town')!,
    ).rotation.y = Math.PI / 2;
  }

  // Seven distinctive, fully enterable nightlife venues on one dense walking street.
  const venueMaterials = [mat.neonPink, mat.neonBlue, mat.violet, mat.neonGold];
  venues.forEach((venue, index) => {
    const parent = sectors.get('nightlife')!;
    const w = venue.theme === 'club' ? 18 : 14;
    const d = venue.theme === 'club' ? 20 : 15;
    const h = venue.theme === 'club' ? 8 : 6;
    const accent = venueMaterials[index % venueMaterials.length]!;
    solid('phuket-venue-floor', [w, 0.2, d], [venue.x, -0.25, venue.z], mat.dark, parent, false);
    solid(
      'phuket-venue-back',
      [w, h, 0.3],
      [venue.x, h / 2 - 0.3, venue.z + (venue.side * d) / 2],
      mat.dark,
      parent,
    );
    for (const dx of [-w / 2, w / 2])
      solid(
        'phuket-venue-side',
        [0.3, h, d],
        [venue.x + dx, h / 2 - 0.3, venue.z],
        mat.dark,
        parent,
      );
    solid(
      'phuket-venue-roof',
      [w + 0.4, 0.3, d + 0.4],
      [venue.x, h - 0.1, venue.z],
      mat.dark,
      parent,
      false,
    );
    const frontZ = venue.z - (venue.side * d) / 2;
    for (const dx of [-w / 2 + 1.2, w / 2 - 1.2])
      solid(
        'phuket-venue-front-post',
        [2.2, h, 0.3],
        [venue.x + dx, h / 2 - 0.3, frontZ],
        mat.dark,
        parent,
      );
    const stageZ = venue.z + venue.side * 3;
    solid('phuket-venue-stage', [w * 0.55, 0.45, 4], [venue.x, 0, stageZ], accent, parent, false);
    for (const dx of [-2, 0, 2]) {
      const pole = MeshBuilder.CreateCylinder(
        'phuket-dance-pole',
        { diameter: 0.08, height: 4.8, tessellation: 10 },
        scene,
      );
      pole.position.set(venue.x + dx, 2.5, stageZ);
      pole.material = mat.neonGold;
      pole.parent = parent;
    }
    solid(
      'phuket-venue-seating',
      [2.2, 0.75, 7],
      [venue.x - w * 0.31, 0.15, venue.z],
      mat.violet,
      parent,
    );
    const barX = venue.x + w * 0.31;
    const barZ = venue.z - venue.side * 1.8;
    solid('phuket-venue-bar', [2.1, 1.05, 6.5], [barX, 0.12, barZ], mat.wood, parent);
    drinkSpots.push({ x: barX, z: barZ, label: venue.name });
    const sign = sceneSign(
      scene,
      venue.name,
      venue.x,
      h - 0.8,
      frontZ - venue.side * 0.12,
      w * 0.72,
      { plate: '#17131d', ink: index % 2 ? '#42efff' : '#ff5bab' },
    );
    sign.rotation.y = venue.side > 0 ? 0 : Math.PI;
    sign.parent = parent;
    if (venue.theme === 'show') {
      const disclaimer = sceneSign(
        scene,
        'SHOW VENUE · 18+ · BÜHNE',
        venue.x,
        3.8,
        venue.z + venue.side * 7.15,
        7,
        { plate: '#661d44' },
      );
      disclaimer.rotation.y = venue.side > 0 ? Math.PI : 0;
      disclaimer.parent = parent;
    }
  });
  sceneSign(scene, 'BANGLA NIGHT WALK · 18+', -126, 7.8, 20, 15, { plate: '#6b1450' }).parent =
    sectors.get('nightlife')!;

  // Night market: solid counters, open aisles, roofs and a food court.
  for (let i = 0; i < 18; i++) {
    const x = -136 + (i % 6) * 9;
    const z = -67 + Math.floor(i / 6) * 13;
    solid(
      'phuket-market-counter',
      [5.2, 1, 1.4],
      [x, 0.1, z],
      mat.wood,
      sectors.get('night-market')!,
    );
    prop(
      'phuket-market-canopy',
      [6.4, 0.18, 5.2],
      [x, 3, z],
      i % 3 === 0 ? mat.neonPink : i % 3 === 1 ? mat.neonBlue : mat.neonGold,
      sectors.get('night-market')!,
    );
    for (const dx of [-2.6, 2.6])
      prop(
        'phuket-market-post',
        [0.12, 3, 0.12],
        [x + dx, 1.5, z],
        mat.dark,
        sectors.get('night-market')!,
      );
  }
  const marketSign = sceneSign(
    scene,
    'PHUKET NIGHT MARKET · FOOD · CLOTHES · CHAOS',
    -111,
    5,
    -75,
    16,
    { plate: '#552052' },
  );
  marketSign.parent = sectors.get('night-market')!;

  // Broad coast with no geometric edge: sand, surf strips and a sea plane extend into the fog.
  solid(
    'patong-beach-sand',
    [27, 0.25, 220],
    [-191, -0.3, 0],
    mat.sand,
    sectors.get('patong-beach')!,
    false,
  );
  prop('andaman-sea', [95, 0.12, 360], [-250, -0.65, 0], mat.sea, sectors.get('patong-beach')!);
  options.barrier(
    box(scene, 'phuket-water-boundary', [0.4, 4, 220], [-204, 1, 0], mat.sea),
  ).parent = root;
  const waves: Mesh[] = [];
  for (let i = 0; i < 20; i++) {
    const wave = prop(
      'patong-wave',
      [0.18, 0.08, 9],
      [-202 + (i % 3) * 1.3, -0.48, -95 + i * 10],
      mat.white,
      sectors.get('patong-beach')!,
    );
    waves.push(wave);
  }
  for (let i = 0; i < 20; i++) {
    const z = -90 + i * 9.5;
    const trunk = MeshBuilder.CreateCylinder(
      'phuket-palm-trunk',
      { diameter: 0.5, height: 6, tessellation: 8 },
      scene,
    );
    trunk.position.set(-178 + (i % 3) * 5, 2.7, z);
    trunk.material = mat.wood;
    trunk.parent = sectors.get('patong-beach')!;
    if (i % 2 === 0) world.addStatic(trunk);
    const crown = MeshBuilder.CreateSphere(
      'phuket-palm-crown',
      { diameter: 5.5, segments: 6 },
      scene,
    );
    crown.scaling.y = 0.28;
    crown.position.set(trunk.position.x, 5.8, z);
    crown.material = mat.leaf;
    crown.parent = sectors.get('patong-beach')!;
  }
  for (let i = 0; i < 12; i++) {
    const z = -75 + i * 13;
    solid(
      'patong-sunbed',
      [2, 0.3, 4],
      [-188 + (i % 2) * 5, -0.05, z],
      i % 2 ? mat.neonPink : mat.neonBlue,
      sectors.get('patong-beach')!,
      false,
    );
    const shade = MeshBuilder.CreateCylinder(
      'patong-parasol',
      { diameterTop: 0.2, diameterBottom: 4.5, height: 0.7, tessellation: 12 },
      scene,
    );
    shade.position.set(-183, 2.4, z);
    shade.material = i % 2 ? mat.neonGold : mat.neonPink;
    shade.parent = sectors.get('patong-beach')!;
  }
  solid(
    'patong-beach-bar',
    [11, 0.25, 18],
    [-183, -0.1, 70],
    mat.wood,
    sectors.get('patong-beach')!,
    false,
  );
  solid(
    'patong-beach-bar-counter',
    [2, 1.1, 13],
    [-181, 0.2, 70],
    mat.dark,
    sectors.get('patong-beach')!,
  );
  drinkSpots.push({ x: -181, z: 70, label: 'PATONG SUNSET BAR' });
  const beachSign = sceneSign(scene, 'PATONG BEACH · SUNSET BAR', -182, 4.2, 61, 10, {
    plate: '#12637a',
  });
  beachSign.rotation.y = Math.PI;
  beachSign.parent = sectors.get('patong-beach')!;

  // Low-cost routed traffic: visual vehicles use fixed lanes and never invade pedestrian space.
  const traffic: { root: TransformNode; speed: number; direction: number }[] = [];
  for (let i = 0; i < 9; i++) {
    const car = new TransformNode(`phuket-traffic-${i}`, scene);
    car.position.set(-45 - i * 18, 0.2, i % 2 ? -3.2 : 3.2);
    car.parent = root;
    prop(
      'phuket-traffic-body',
      [i % 3 === 0 ? 4.2 : 2.2, 1.3, i % 3 === 0 ? 1.8 : 0.8],
      [0, 0.65, 0],
      i % 2 ? mat.neonGold : mat.neonPink,
      car,
    );
    const direction = i % 2 ? 1 : -1;
    car.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    traffic.push({ root: car, speed: 4 + (i % 4), direction });
  }

  const audioZones: readonly AmbientZone[] = [
    {
      id: 'phuket-station',
      x: -30,
      y: 0,
      z: 30,
      radius: 36,
      kind: 'train',
      tempo: 1.3,
      note: 92,
      volume: 0.35,
    },
    {
      id: 'phuket-town',
      x: -73,
      y: 0,
      z: 0,
      radius: 58,
      kind: 'traffic',
      tempo: 1.1,
      note: 145,
      volume: 0.5,
    },
    {
      id: 'phuket-nightlife-a',
      x: -112,
      y: 0,
      z: 21,
      radius: 38,
      kind: 'music',
      tempo: 0.45,
      note: 116,
      volume: 0.72,
    },
    {
      id: 'phuket-nightlife-b',
      x: -146,
      y: 0,
      z: 21,
      radius: 38,
      kind: 'music',
      tempo: 0.39,
      note: 132,
      volume: 0.68,
    },
    {
      id: 'phuket-market',
      x: -111,
      y: 0,
      z: -52,
      radius: 42,
      kind: 'voices',
      tempo: 1.2,
      note: 230,
      volume: 0.48,
    },
    {
      id: 'phuket-beach',
      x: -188,
      y: 0,
      z: 0,
      radius: 64,
      kind: 'surf',
      tempo: 1.55,
      note: 80,
      volume: 0.7,
    },
    {
      id: 'phuket-beach-bar',
      x: -183,
      y: 0,
      z: 70,
      radius: 32,
      kind: 'music',
      tempo: 0.52,
      note: 104,
      volume: 0.55,
    },
  ];
  let time = 0;
  root.setEnabled(false);
  return {
    root,
    vehicles: phuketVehicles,
    audioZones,
    setEnabled(active) {
      root.setEnabled(active);
      if (active) updateGeometryAudit(scene);
    },
    update(delta) {
      if (!root.isEnabled()) return;
      time += delta;
      waves.forEach((wave, index) => {
        wave.position.x = -201.4 + Math.sin(time * 0.75 + index) * 1.8;
        wave.visibility = 0.55 + Math.sin(time * 1.5 + index) * 0.25;
      });
      for (const car of traffic) {
        car.root.position.x += car.direction * car.speed * delta;
        if (car.root.position.x < -193) car.root.position.x = -28;
        if (car.root.position.x > -28) car.root.position.x = -193;
      }
      mat.neonPink.emissiveColor.set(0.55 + Math.sin(time * 3.2) * 0.18, 0.06, 0.32);
    },
    focus(position) {
      // Dense decoration is sectorised; structures and collisions stay loaded and deterministic.
      for (const sector of phuketSectors) {
        const node = sectors.get(sector.id)!;
        const distance = Math.hypot(position.x - sector.x, position.z - sector.z);
        node.setEnabled(distance < sector.radius + (sector.visibilityMargin ?? 70));
      }
    },
    worldLabel(position) {
      const nearest = [...phuketSectors].sort(
        (a, b) =>
          Math.hypot(position.x - a.x, position.z - a.z) -
          Math.hypot(position.x - b.x, position.z - b.z),
      )[0];
      return nearest?.id === 'nightlife'
        ? 'PHUKET · BANGLA NIGHT WALK'
        : nearest?.id === 'night-market'
          ? 'PHUKET · NIGHT MARKET'
          : nearest?.id === 'patong-beach'
            ? 'PHUKET · PATONG BEACH'
            : nearest?.id === 'old-town'
              ? 'PHUKET · TOWN'
              : 'PHUKET · RAILWAY STOP';
    },
    safeGround(position) {
      return position.x > -204 && Math.abs(position.z) < 108;
    },
    interactionPrompt(position) {
      const spot = drinkSpots.find(
        (candidate) => Math.hypot(candidate.x - position.x, candidate.z - position.z) < 2.8,
      );
      return spot ? `E · DRINK BESTELLEN · ${spot.label}` : '';
    },
    interact(position) {
      const spot = drinkSpots.find(
        (candidate) => Math.hypot(candidate.x - position.x, candidate.z - position.z) < 2.8,
      );
      return spot
        ? { text: `${spot.label} · CHANG-STYLE DRINK · ENERGIE VOLL`, energy: 100, drink: true }
        : null;
    },
  };
}
