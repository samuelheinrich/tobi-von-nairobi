import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { Position3 } from '@tobi/contracts';
import { NpcVoices } from '@tobi/game-core';
import { nanaPlazaLayout, socialBalance } from '@tobi/game-data';
import type { BottleTarget } from '../items/thrown-bottles.js';
import { createNpc, npcPalette, type NpcRig } from './npc-kit.js';
import { sightBlockers } from './nav-obstacles.js';
import type { SpeechBubbles } from './speech-bubbles.js';
import { replyCue, type LevelNpcs, type NpcReply } from './level-npcs.js';

type Role = 'dancer' | 'bargirl' | 'guest';

interface VenueNpc {
  rig: NpcRig;
  role: Role;
  home: Vector3;
  phase: number;
  startled: number;
  id: number;
}

/** The venue cast: dancers on the poles, staff behind the counters and guests on the stools.
 * Tobi can shout at everybody, but only the dancers and the staff answer a compliment.
 */
export class NanaVenue implements LevelNpcs {
  private readonly people: VenueNpc[] = [];
  private readonly voices = new NpcVoices();
  private readonly solids: Set<Mesh>;
  private reply: NpcReply | null = null;
  private time = 0;
  private cooldown = 0;
  public flirts = 0;

  public constructor(
    private readonly scene: Scene,
    shadows: ShadowGenerator,
    colliders: Mesh[],
    private readonly bubbles: SpeechBubbles,
  ) {
    this.solids = sightBlockers(colliders);
    const layout = nanaPlazaLayout;
    let id = 0;
    const add = (role: Role, x: number, y: number, z: number, facing: number): void => {
      const rig = createNpc(
        scene,
        `nana-${role}-${id}`,
        npcPalette(scene, id, role !== 'guest'),
        shadows,
        role === 'guest',
      );
      rig.root.position.set(x, y, z);
      rig.root.rotation.y = facing;
      this.people.push({
        rig,
        role,
        home: rig.root.position.clone(),
        phase: id * 0.9,
        startled: 0,
        id,
      });
      id++;
    };
    for (const spot of layout.poles)
      add('dancer', spot.x, 0.6, spot.z, Math.atan2(-spot.x, -spot.z));
    for (const counter of layout.bars) {
      const alongZ = counter.z !== 16.6;
      add(
        'bargirl',
        alongZ ? counter.x - counter.side * 1.1 : counter.x,
        0,
        alongZ ? counter.z : counter.z + counter.side * -1.1,
        alongZ ? (counter.side > 0 ? Math.PI / 2 : -Math.PI / 2) : Math.PI,
      );
      for (let i = -2; i <= 2; i++) {
        if (i === 0) continue;
        add(
          'guest',
          alongZ ? counter.x + counter.side * 1.5 : counter.x + i * 2.2,
          0.5,
          alongZ ? counter.z + i * 2.2 : counter.z + counter.side * 1.5,
          alongZ ? (counter.side > 0 ? -Math.PI / 2 : Math.PI / 2) : 0,
        );
      }
    }
  }

  public get targets(): readonly BottleTarget[] {
    return this.people.map((person) => ({
      position: { x: person.home.x, y: person.home.y + 1.15, z: person.home.z },
      radius: 0.6,
      hit: () => {
        person.startled = 3;
      },
    }));
  }

  public readonly blocked = false;

  private canSee(from: Position3, to: Vector3): boolean {
    const delta = new Vector3(to.x - from.x, 0, to.z - from.z);
    const distance = delta.length();
    if (distance < 0.001) return true;
    return !this.scene.pickWithRay(
      new Ray(new Vector3(from.x, 1.4, from.z), delta.normalize(), distance),
      (mesh) => this.solids.has(mesh as Mesh),
    )?.hit;
  }

  public update(delta: number): void {
    if (delta <= 0) return;
    this.time += delta;
    this.cooldown = Math.max(0, this.cooldown - delta);
    for (const person of this.people) {
      person.startled = Math.max(0, person.startled - delta);
      const beat = Math.sin(this.time * (person.startled > 0 ? 9 : 3.4) + person.phase);
      const [leftArm, rightArm] = person.rig.arms;
      if (person.role === 'dancer') {
        // One hand keeps the pole, the hips carry the beat.
        person.rig.root.rotation.y += delta * 1.1;
        if (leftArm) leftArm.rotation.z = 2.5;
        if (rightArm) rightArm.rotation.z = -0.9 - beat * 0.6;
        person.rig.root.position.y = person.home.y + Math.abs(beat) * 0.09;
        for (const [index, leg] of person.rig.legs.entries())
          leg.rotation.x = (index === 0 ? beat : -beat) * 0.35;
      } else {
        if (leftArm) leftArm.rotation.z = (person.startled > 0 ? 1.4 : 0.15) + beat * 0.12;
        if (rightArm) rightArm.rotation.z = -((person.startled > 0 ? 1.4 : 0.15) + beat * 0.12);
      }
      person.rig.head.rotation.z = beat * 0.07;
    }
  }

  public taunt(position: Position3): number {
    let count = 0;
    let speaker: VenueNpc | undefined;
    for (const person of this.people) {
      if (
        Math.hypot(person.home.x - position.x, person.home.z - position.z) >
        socialBalance.tauntRange
      )
        continue;
      person.startled = 3;
      count++;
      if (person.role !== 'guest') speaker ??= person;
    }
    if (speaker) this.say(speaker, 'bargirlTaunt');
    return count;
  }

  public flirt(position: Position3): boolean {
    if (this.cooldown > 0) return false;
    let target: VenueNpc | undefined;
    let best: number = socialBalance.flirtRange;
    for (const person of this.people) {
      if (person.role === 'guest' || person.startled > 0) continue;
      const distance = Math.hypot(person.home.x - position.x, person.home.z - position.z);
      if (distance > best || !this.canSee(position, person.home)) continue;
      target = person;
      best = distance;
    }
    if (!target) return false;
    this.cooldown = socialBalance.flirtCooldownSeconds;
    this.flirts++;
    this.say(target, this.flirts % 4 === 0 ? 'flirtRejected' : 'flirt');
    return true;
  }

  public resolve(): null {
    return null;
  }

  public takeReply(): NpcReply | null {
    const line = this.reply;
    this.reply = null;
    return line;
  }

  private say(person: VenueNpc, topic: 'flirt' | 'flirtRejected' | 'bargirlTaunt'): void {
    const line = this.voices.next(topic, person.id);
    this.reply = { text: line, cue: replyCue(topic) };
    this.bubbles.say(
      person.rig.root.position.add(new Vector3(0, 2.5, 0)),
      line,
      socialBalance.replySeconds,
    );
  }

  public dispose(): void {
    for (const person of this.people) person.rig.root.dispose(false, true);
    this.people.length = 0;
  }
}
