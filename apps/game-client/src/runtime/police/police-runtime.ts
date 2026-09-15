import { createNpc, npcPalette } from '../levels/npc-kit.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { LevelDefinition } from '@tobi/contracts';
import { NavigationGrid, NpcVoices, PursuitSystem, type SpeechTopic } from '@tobi/game-core';
import { pursuitBalance } from '@tobi/game-data';
import { material } from '../levels/materials.js';
import { navigationObstacles, sightBlockers } from '../levels/nav-obstacles.js';

/** Babylon projection of portable pursuit rules. Ground navigation comes from real static colliders. */
export interface PoliceCallout {
  topic: SpeechTopic;
  text: string;
  position: { x: number; y: number; z: number };
  /** Which officer spoke, so they do not all share one voice. */
  speaker: number;
}

export class PoliceRuntime {
  public readonly system: PursuitSystem;
  private readonly roots: TransformNode[] = [];
  private readonly indicators: Mesh[] = [];
  private readonly limbs: TransformNode[][] = [];
  private gait = 0;
  private readonly voices = new NpcVoices();
  /** Previous state per officer, to speak on a transition rather than every frame. */
  private readonly lastState = new Map<number, string>();
  private chaseChatter = 0;
  private pending: PoliceCallout | null = null;
  public constructor(
    scene: Scene,
    level: LevelDefinition,
    colliders: Mesh[],
    shadows: ShadowGenerator,
  ) {
    const obstacles = navigationObstacles(colliders);
    if (!level.navigationBounds) throw new Error('Missing navigation bounds');
    const nav = new NavigationGrid(level.navigationBounds, obstacles);
    for (const spawn of level.policeSpawns ?? [])
      if (!nav.open(spawn)) throw new Error('Police spawn intersects a collider');
    const solids = sightBlockers(colliders);
    this.system = new PursuitSystem(
      level.maxWanted,
      level.policeSpawns ?? [],
      {
        ...pursuitBalance,
        wantedThresholds: level.wantedThresholds ?? pursuitBalance.wantedThresholds,
        chaosPerBottle: level.chaosPerBottle,
        chaseSpeed: level.policeSpeed,
      },
      {
        path: (a, b) => nav.path(a, b),
        clear: (a, b) => nav.clear(a, b),
        canSee: (a, b) => {
          const origin = new Vector3(a.x, 1.55, a.z);
          const direction = new Vector3(b.x - a.x, 0, b.z - a.z);
          const length = direction.length();
          if (length < 0.001) return true;
          const hit = scene.pickWithRay(new Ray(origin, direction.normalize(), length), (m) =>
            solids.has(m as Mesh),
          );
          return !hit?.hit;
        },
      },
    );
    const red = material(scene, 'police-alert', '#ff6545');
    const blue = material(scene, 'police-search', '#4c98ec');
    for (const agent of this.system.agents) {
      const category = agent.id === 0 && !level.wantedThresholds ? 'security' : 'police';
      const rig = createNpc(
        scene,
        `guard-${agent.id}`,
        npcPalette(scene, agent.id + 6),
        shadows,
        false,
        category,
        false,
        level.worldId === 'bangkok',
      );
      const root = rig.root;
      this.limbs.push([...rig.legs, ...rig.arms]);
      const marker = MeshBuilder.CreateSphere(
        'guard-state',
        { diameter: 0.22, segments: 4 },
        scene,
      );
      marker.position.y = 2.4;
      marker.parent = root;
      marker.material = red;
      marker.metadata = { chase: red, search: blue };
      this.indicators.push(marker);
      this.roots.push(root);
      root.setEnabled(false);
    }
  }
  /** Pops the line an officer shouted since the last call, for the speech plates. */
  public takeCallout(): PoliceCallout | null {
    const callout = this.pending;
    this.pending = null;
    return callout;
  }

  private callOut(topic: SpeechTopic, agentId: number, at: { x: number; z: number }): void {
    // One line at a time: three officers shouting over each other reads as noise.
    this.pending = {
      topic,
      text: this.voices.next(topic, agentId),
      position: { x: at.x, y: 2.15, z: at.z },
      speaker: agentId,
    };
  }

  public sync(delta = 0): void {
    this.gait += delta * 11;
    this.chaseChatter = Math.max(0, this.chaseChatter - delta);
    for (const agent of this.system.activeAgents) {
      const previous = this.lastState.get(agent.id);
      this.lastState.set(agent.id, agent.state);
      if (previous === agent.state) continue;
      // Only the transitions worth hearing; PATROL and RETURN_TO_PATROL stay silent.
      if (agent.state === 'CHASE') {
        this.callOut('policeSpotted', agent.id, agent.position);
        this.chaseChatter = 2.5;
      } else if (agent.state === 'SEARCH' && previous === 'CHASE') {
        this.callOut('policeSearch', agent.id, agent.position);
        this.chaseChatter = 3;
      }
    }
    // While the chase runs, keep one officer talking on a slow cadence.
    if (delta > 0 && this.chaseChatter === 0) {
      const chasing = this.system.activeAgents.filter((agent) => agent.state === 'CHASE');
      const searching = this.system.activeAgents.filter((agent) => agent.state === 'SEARCH');
      const speaker = chasing[0] ?? searching[0];
      if (speaker) {
        this.callOut(chasing.length ? 'policeChase' : 'policeSearch', speaker.id, speaker.position);
        this.chaseChatter = chasing.length ? 3.5 : 7;
      }
    }
    for (const agent of this.system.agents) {
      const root = this.roots[agent.id],
        marker = this.indicators[agent.id];
      if (!root || !marker) continue;
      root.setEnabled(agent.id < this.system.wanted.maximum);
      const moving =
        Math.hypot(root.position.x - agent.position.x, root.position.z - agent.position.z) > 0.001;
      if (delta > 0)
        for (const [index, limb] of (this.limbs[agent.id] ?? []).entries())
          limb.rotation.x = moving
            ? Math.sin(this.gait + agent.id) *
              0.55 *
              (index % 2 === 0 ? 1 : -1) *
              (index < 2 ? 1 : -1)
            : 0;
      root.rotation.z = this.system.isStaggered(agent.id) ? Math.sin(this.gait * 2) * 0.25 : 0;
      root.position.set(agent.position.x, 0, agent.position.z);
      const dx = agent.target.x - agent.position.x,
        dz = agent.target.z - agent.position.z;
      if (Math.hypot(dx, dz) > 0.1) root.rotation.y = Math.atan2(dx, dz);
      marker.material = agent.state === 'CHASE' ? marker.metadata.chase : marker.metadata.search;
      marker.isVisible = agent.state !== 'PATROL' && agent.state !== 'RETURN_TO_PATROL';
    }
  }
  public dispose(): void {
    for (const root of this.roots) root.dispose();
  }
}
