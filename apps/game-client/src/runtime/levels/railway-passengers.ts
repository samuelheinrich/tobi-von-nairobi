import { outwardArmAngle } from '../character/modular/arm-pose.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { Position3 } from '@tobi/contracts';
import { Blocker, NpcVoices, ProximityGreeter } from '@tobi/game-core';
import { railwayLayout, socialBalance } from '@tobi/game-data';
import type { BottleTarget } from '../items/thrown-bottles.js';
import { createNpc, npcPalette, type NpcRig } from './npc-kit.js';
import type { SpeechBubbles } from './speech-bubbles.js';
import { replyCue, type LevelNpcs, type NpcReply } from './level-npcs.js';

interface Passenger {
  rig: NpcRig;
  seated: boolean;
  home: Vector3;
  startled: number;
  id: number;
}

/** Travellers on the benches, drinkers in the bar carriage and one very persistent conductor.
 * The conductor blocks and complains; he has no perception link to the pursuit system at all.
 */
export class RailwayPassengers implements LevelNpcs {
  private readonly people: Passenger[] = [];
  private readonly conductor: { rig: NpcRig; brain: Blocker };
  private readonly voices = new NpcVoices();
  private readonly greeter = new ProximityGreeter(socialBalance.greeting);
  private reply: NpcReply | null = null;
  private time = 0;
  private touching = false;

  public constructor(
    scene: Scene,
    shadows: ShadowGenerator,
    private readonly bubbles: SpeechBubbles,
  ) {
    const layout = railwayLayout;
    let id = 0;
    for (const [carriage, z] of layout.carriageCentres.entries()) {
      if (carriage === layout.barCarriageIndex) {
        for (const [index, dz] of [-4.4, -2.2, 1.1, 3.3, 5.5].entries()) {
          const rig = createNpc(scene, `bar-guest-${id}`, npcPalette(scene, id), shadows);
          rig.root.position.set(0.85, 0, z + dz);
          rig.root.rotation.y = Math.PI / 2;
          this.people.push({
            rig,
            seated: false,
            home: rig.root.position.clone(),
            startled: 0,
            id,
          });
          id++;
          if (index === 0) {
            const keeper = createNpc(scene, `bartender-${id}`, npcPalette(scene, 5), shadows);
            keeper.root.position.set(3.2, 0, z + 1);
            keeper.root.rotation.y = -Math.PI / 2;
            this.people.push({
              rig: keeper,
              seated: false,
              home: keeper.root.position.clone(),
              startled: 0,
              id,
            });
            id++;
          }
        }
        continue;
      }
      for (const offset of layout.seatOffsets)
        for (const x of layout.seatColumns) {
          // A deterministic gap keeps the carriages from looking like a full commuter train.
          if ((id * 7 + carriage * 3) % 5 === 0) {
            id++;
            continue;
          }
          const rig = createNpc(scene, `passenger-${id}`, npcPalette(scene, id), shadows, true);
          rig.root.position.set(x, 0, z + offset);
          rig.seatHeight = 0.55;
          rig.root.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
          this.people.push({ rig, seated: true, home: rig.root.position.clone(), startled: 0, id });
          id++;
        }
    }
    const rig = createNpc(scene, 'conductor', npcPalette(scene, 1), shadows);
    rig.root.position.set(0, 0, layout.conductor.patrolMax);
    this.conductor = {
      rig,
      brain: new Blocker({ ...layout.conductor }, { x: 0, z: layout.conductor.patrolMax }),
    };
  }

  public get targets(): readonly BottleTarget[] {
    return [
      ...this.people.map((person) => ({
        position: { x: person.home.x, y: 1.2, z: person.home.z },
        radius: 0.6,
        hit: () => {
          person.startled = 3;
        },
      })),
      {
        position: {
          x: this.conductor.brain.position.x,
          y: 1.2,
          z: this.conductor.brain.position.z,
        },
        radius: 0.7,
        // A bottle to the cap settles the ticket discussion immediately.
        hit: () => this.conductor.brain.relent(),
      },
    ];
  }

  public get blocked(): boolean {
    return this.touching;
  }

  public update(delta: number, player: Position3): void {
    if (delta <= 0) return;
    this.time += delta;
    const greeted = this.greeter.step(
      delta,
      player,
      this.people.map((person) => ({ id: person.id, x: person.home.x, z: person.home.z })),
    );
    const neighbour = this.people.find((candidate) => candidate.id === greeted);
    if (neighbour) this.say(neighbour.rig, 'greetingTrain', `seat-${neighbour.id}`, neighbour.id);
    const shouting = this.conductor.brain.step(delta, player);
    const at = this.conductor.brain.position;
    this.conductor.rig.root.position.set(at.x, 0, at.z);
    this.conductor.rig.root.rotation.y = this.conductor.brain.facing;
    const stride = Math.sin(this.time * 7) * 0.5;
    for (const [index, leg] of this.conductor.rig.legs.entries())
      leg.rotation.x = index === 0 ? stride : -stride;
    for (const [index, arm] of this.conductor.rig.arms.entries())
      arm.rotation.x = index === 0 ? -stride : stride;
    if (shouting) this.say(this.conductor.rig, 'conductor', 'conductor');
    this.touching =
      this.conductor.brain.state === 'BLOCK' &&
      Math.hypot(player.x - at.x, player.z - at.z) < railwayLayout.conductor.bodyRadius + 0.15;
    for (const person of this.people) {
      person.startled = Math.max(0, person.startled - delta);
      const sway = Math.sin(this.time * 2.2 + person.id) * (person.startled > 0 ? 3 : 1);
      person.rig.head.rotation.z = sway * 0.05;
      for (const [index, arm] of person.rig.arms.entries())
        arm.rotation.z = outwardArmAngle(
          index,
          person.startled > 0 ? 1.3 + sway * 0.2 : 0.1 + sway * 0.06,
        );
      person.rig.root.position.y = person.home.y + (person.seated ? 0 : Math.abs(sway) * 0.02);
    }
  }

  public taunt(position: Position3): number {
    let count = 0;
    for (const person of this.people)
      if (
        Math.hypot(person.home.x - position.x, person.home.z - position.z) <=
        socialBalance.tauntRange
      ) {
        person.startled = 3;
        count++;
      }
    const toConductor = Math.hypot(
      position.x - this.conductor.brain.position.x,
      position.z - this.conductor.brain.position.z,
    );
    if (toConductor <= socialBalance.tauntRange) {
      // Shouting back is the fast way past him; he grumbles and presses himself against the seats.
      this.conductor.brain.relent();
      this.say(this.conductor.rig, 'conductor', 'conductor');
      count++;
    }
    return count;
  }

  public flirt(): boolean {
    return false;
  }

  public resolve(player: Position3): Position3 | null {
    if (this.conductor.brain.yielding) return null;
    const pushed = this.conductor.brain.resolve(player);
    return pushed ? { x: pushed.x, y: player.y, z: pushed.z } : null;
  }

  public takeReply(): NpcReply | null {
    const line = this.reply;
    this.reply = null;
    return line;
  }

  private say(
    rig: NpcRig,
    topic: 'conductor' | 'greetingTrain',
    speaker: string,
    voiceId = 1,
  ): void {
    const line = this.voices.next(topic, speaker);
    this.reply = { text: line, cue: replyCue(topic) };
    this.bubbles.say(
      rig.root.position.add(new Vector3(0, 2.5, 0)),
      line,
      socialBalance.replySeconds,
      { topic, speaker: voiceId },
    );
  }

  public dispose(): void {
    for (const person of this.people) person.rig.root.dispose();
    this.conductor.rig.root.dispose();
  }
}
