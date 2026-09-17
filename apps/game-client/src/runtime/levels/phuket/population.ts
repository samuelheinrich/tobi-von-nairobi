import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { Position3 } from '@tobi/contracts';
import { phuketResidents, type PhuketResident, socialBalance } from '@tobi/game-data';
import type { BottleTarget } from '../../items/thrown-bottles.js';
import { material } from '../materials.js';
import { createNpc, npcPalette, type NpcRig } from '../npc-kit.js';
import type { SpeechBubbles } from '../speech-bubbles.js';
import type { LevelNpcs, NpcReply } from '../level-npcs.js';
import type { CharacterCategory } from '../../character/modular/presets.js';

interface PhuketPerson {
  data: PhuketResident;
  rig: NpcRig;
  startled: number;
  homeX: number;
  homeZ: number;
}

const category: Record<PhuketResident['role'], CharacterCategory> = {
  tourist: 'tourist',
  local: 'local',
  vendor: 'vendor',
  bartender: 'bartender',
  dancer: 'dancer',
  cabaret: 'cabaret',
  security: 'security',
  beach_guest: 'beach_guest',
};

const lineFor = (role: PhuketResident['role'], flirt: boolean) => {
  if (flirt && (role === 'dancer' || role === 'cabaret' || role === 'bartender'))
    return ['Handsome man!', 'Welcome to Phuket!', 'You dance very funny!'][
      role === 'dancer' ? 0 : role === 'cabaret' ? 1 : 2
    ]!;
  return role === 'security'
    ? 'Easy, boss. Keep the walkway clear.'
    : role === 'vendor'
      ? 'Best price! For you, still best price.'
      : role === 'beach_guest'
        ? 'The sea is that way, Tobi.'
        : 'Oi! Phuket has enough chaos already.';
};

/** Dense Phuket crowd with distance culling; there is no per-NPC observer or controller. */
export class PhuketPopulation implements LevelNpcs {
  private readonly people: PhuketPerson[] = [];
  private readonly distant: TransformNode;
  private readonly bottleTargets: BottleTarget[] = [];
  private reply: NpcReply | null = null;
  private time = 0;
  private active = false;
  public readonly blocked = false;

  constructor(
    private readonly scene: Scene,
    shadows: ShadowGenerator,
    private readonly bubbles: SpeechBubbles,
  ) {
    this.distant = new TransformNode('phuket-distant-crowd', scene);
    for (const data of phuketResidents.slice(0, 28)) {
      const rig = createNpc(
        scene,
        `phuket-${data.role}-${data.id}`,
        npcPalette(scene, 200 + data.id, data.role === 'dancer' || data.role === 'cabaret'),
        shadows,
        data.action === 'sit',
        category[data.role],
        data.female,
        true,
      );
      rig.root.position.set(data.x, 0, data.z);
      rig.root.rotation.y = (data.id * 1.71) % (Math.PI * 2);
      rig.root.setEnabled(false);
      rig.gesture(data.action);
      const person = { data, rig, startled: 0, homeX: data.x, homeZ: data.z };
      this.people.push(person);
      this.bottleTargets.push({
        position: { x: data.x, y: 1.2, z: data.z },
        radius: 0.65,
        hit: () => {
          person.startled = 4;
        },
      });
    }
    // Remaining crowd is a deliberately cheap far LOD, visually filling bars and the beachfront.
    const farMaterial = material(scene, 'phuket-distant-person', '#293647');
    for (const data of phuketResidents.slice(28)) {
      const body = MeshBuilder.CreateCapsule(
        `phuket-distant-${data.id}`,
        { height: 1.65, radius: 0.28, tessellation: 5 },
        scene,
      );
      body.position.set(data.x, 0.83, data.z);
      body.scaling.x = 0.75 + (data.id % 3) * 0.12;
      body.material = farMaterial;
      body.parent = this.distant;
      body.isPickable = false;
    }
    this.distant.setEnabled(false);
  }
  get targets(): readonly BottleTarget[] {
    return this.bottleTargets;
  }
  update(delta: number, player: Position3): void {
    if (delta <= 0) return;
    const state = (this.scene.metadata?.railwayJourney as { state?: string } | undefined)?.state;
    const shouldBeActive = state === 'STOPPED' || state === 'DOORS_OPEN';
    if (shouldBeActive !== this.active) {
      this.active = shouldBeActive;
      this.distant.setEnabled(shouldBeActive);
    }
    if (!this.active) return;
    this.time += delta;
    for (const person of this.people) {
      person.startled = Math.max(0, person.startled - delta);
      const distance = Math.hypot(
        player.x - person.rig.root.position.x,
        player.z - person.rig.root.position.z,
      );
      person.rig.root.setEnabled(distance < 46);
      if (distance >= 46) continue;
      if (person.data.action === 'walk' || person.startled > 0) {
        const speed = person.startled > 0 ? 2.7 : 0.45;
        const phase = this.time * speed + person.data.id;
        person.rig.root.position.x =
          person.homeX + Math.sin(phase) * (person.startled > 0 ? 3.2 : 1.2);
        person.rig.root.position.z =
          person.homeZ + Math.cos(phase * 0.7) * (person.startled > 0 ? 2.2 : 0.8);
        person.rig.root.rotation.y = Math.atan2(Math.cos(phase), -Math.sin(phase * 0.7));
        person.rig.gesture(person.startled > 0 ? 'flee' : 'walk');
      } else if (person.data.action === 'dance') {
        person.rig.root.rotation.z = Math.sin(this.time * 2.4 + person.data.id) * 0.05;
        person.rig.gesture('dance');
      }
      const target = this.bottleTargets[person.data.id];
      if (target) {
        target.position.x = person.rig.root.position.x;
        target.position.y = 1.2;
        target.position.z = person.rig.root.position.z;
      }
    }
  }
  taunt(position: Position3): number {
    const nearby = this.people.filter(
      ({ rig }) =>
        rig.root.isEnabled() &&
        Vector3.Distance(rig.root.position, new Vector3(position.x, 0, position.z)) <
          socialBalance.tauntRange,
    );
    for (const p of nearby) p.startled = 4;
    if (nearby[0]) this.say(nearby[0], false);
    return nearby.length;
  }
  flirt(position: Position3): boolean {
    const person = this.people.find(
      ({ data, rig }) =>
        ['dancer', 'cabaret', 'bartender'].includes(data.role) &&
        rig.root.isEnabled() &&
        Math.hypot(rig.root.position.x - position.x, rig.root.position.z - position.z) <
          socialBalance.flirtRange,
    );
    if (!person) return false;
    this.say(person, true);
    return true;
  }
  resolve(): Position3 | null {
    return null;
  }
  takeReply(): NpcReply | null {
    const value = this.reply;
    this.reply = null;
    return value;
  }
  private say(person: PhuketPerson, flirt: boolean) {
    const text = lineFor(person.data.role, flirt);
    this.reply = { text, cue: flirt ? 'flirt' : 'grumble' };
    this.bubbles.say(person.rig.root.position.add(new Vector3(0, 2.5, 0)), text, 3.4, {
      topic: flirt ? 'flirt' : 'crowdAnnoyed',
      speaker: person.data.id,
    });
  }
  dispose() {
    for (const person of this.people) person.rig.root.dispose();
    this.distant.dispose();
  }
}
