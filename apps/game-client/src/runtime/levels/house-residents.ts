import { outwardArmAngle } from '../character/modular/arm-pose.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { Position3 } from '@tobi/contracts';
import { NpcVoices, ProximityGreeter } from '@tobi/game-core';
import { hippieHouseLayout, socialBalance } from '@tobi/game-data';
import type { BottleTarget } from '../items/thrown-bottles.js';
import { material } from './materials.js';
import { createNpc, npcPalette, type NpcRig } from './npc-kit.js';
import type { SpeechBubbles } from './speech-bubbles.js';
import { replyCue, type LevelNpcs, type NpcReply } from './level-npcs.js';

type Activity = 'yoga' | 'meditate' | 'sit' | 'stir' | 'dance';

interface Resident {
  rig: NpcRig;
  floor: number;
  activity: Activity;
  phase: number;
  startled: number;
  id: number;
}

/** One resident per occupied room plus two breathing groups: yoga on the first floor,
 * meditation under the roof. Purely decorative bodies, so a narrow room never traps Tobi.
 */
export class HouseResidents implements LevelNpcs {
  private readonly people: Resident[] = [];
  private readonly voices = new NpcVoices();
  private readonly greeter = new ProximityGreeter(socialBalance.greeting);
  private reply: NpcReply | null = null;
  private time = 0;

  public constructor(
    scene: Scene,
    shadows: ShadowGenerator,
    private readonly bubbles: SpeechBubbles,
  ) {
    const mat = material(scene, 'wg-yoga-mat', '#7c9fd6');
    let id = 0;
    const place = (
      floor: number,
      x: number,
      z: number,
      activity: Activity,
      facing: number,
    ): void => {
      const rig = createNpc(
        scene,
        `resident-${id}`,
        npcPalette(scene, id + 2),
        shadows,
        activity === 'sit' || activity === 'yoga' || activity === 'meditate',
      );
      rig.root.position.set(x, floor * hippieHouseLayout.floorHeight, z);
      rig.castRole = activity === 'yoga' || activity === 'meditate' ? 'yoga' : 'resident';
      rig.root.rotation.y = facing;
      this.people.push({ rig, floor, activity, phase: id * 0.7, startled: 0, id });
      id++;
    };
    // Yoga class, first floor, room «YOGA»: five mats in a row facing the teacher.
    for (let i = 0; i < 5; i++) {
      const z = -13 + i * 1.6;
      const pad = MeshBuilder.CreateBox(
        'yoga-class-mat',
        { width: 1.9, height: 0.05, depth: 0.8 },
        scene,
      );
      pad.position.set(6.5, 1 * hippieHouseLayout.floorHeight + 0.03, z);
      pad.material = mat;
      pad.isPickable = false;
      place(1, 6.5, z, 'yoga', Math.PI / 2);
    }
    place(1, 10.5, -10, 'yoga', -Math.PI / 2);
    // Meditation circle under the roof.
    for (let i = 0; i < 3; i++) place(2, 6.5, -11.5 + i * 1.5, 'meditate', Math.PI / 2);
    for (const [floor, x, z, activity, facing] of [
      [0, -7, -12, 'stir', 0],
      [0, 7, 9, 'sit', Math.PI],
      [0, -11, 1, 'dance', Math.PI / 2],
      [1, -7, 11, 'sit', Math.PI],
      [1, 7, 1, 'dance', -Math.PI / 2],
      [2, -7, -9, 'sit', 0],
      [2, 8, 11, 'sit', Math.PI],
    ] as const)
      place(floor, x, z, activity, facing);
  }

  public get targets(): readonly BottleTarget[] {
    return this.people.map((person) => ({
      position: {
        x: person.rig.root.position.x,
        y: person.rig.root.position.y + 1.1,
        z: person.rig.root.position.z,
      },
      radius: 0.6,
      hit: () => {
        person.startled = 3;
      },
    }));
  }

  public readonly blocked = false;

  public update(delta: number, player: Position3): void {
    if (delta <= 0) return;
    this.time += delta;
    const greeted = this.greeter.step(
      delta,
      player,
      this.people.map((person) => ({
        id: person.id,
        x: person.rig.root.position.x,
        z: person.rig.root.position.z,
        y: person.floor * hippieHouseLayout.floorHeight,
      })),
    );
    const neighbour = this.people.find((candidate) => candidate.id === greeted);
    if (neighbour)
      this.speak(
        neighbour,
        neighbour.activity === 'yoga' || neighbour.activity === 'meditate'
          ? 'greetingYoga'
          : 'greeting',
      );
    for (const person of this.people) {
      // Same cutaway rule the level uses: never draw a storey above Tobi's head.
      const y = person.floor * hippieHouseLayout.floorHeight;
      person.rig.root.setEnabled(y < player.y + 1.5);
      person.startled = Math.max(0, person.startled - delta);
      const breath = Math.sin(this.time * (person.startled > 0 ? 8 : 1.1) + person.phase);
      const [leftArm, rightArm] = person.rig.arms;
      if (!leftArm || !rightArm) continue;
      if (person.activity === 'yoga' || person.activity === 'meditate') {
        const lift = person.activity === 'yoga' ? 1.6 + breath * 0.75 : 0.35;
        leftArm.rotation.z = outwardArmAngle(0, lift);
        rightArm.rotation.z = outwardArmAngle(1, lift);
        person.rig.root.position.y = y + Math.abs(breath) * 0.05;
      } else if (person.activity === 'dance') {
        leftArm.rotation.z = outwardArmAngle(0, 1.2 + breath * 0.5);
        rightArm.rotation.z = outwardArmAngle(1, 1.2 + breath * 0.5);
        person.rig.root.rotation.y += delta * 0.8;
      } else {
        leftArm.rotation.x = breath * (person.activity === 'stir' ? 0.9 : 0.2);
        rightArm.rotation.x = -breath * 0.15;
      }
      person.rig.head.rotation.z = breath * 0.06;
      if (person.startled > 0) person.rig.head.rotation.y = Math.sin(this.time * 9) * 0.4;
    }
  }

  public taunt(position: Position3): number {
    let count = 0;
    let speaker: Resident | undefined;
    for (const person of this.people) {
      const at = person.rig.root.position;
      if (
        Math.hypot(at.x - position.x, at.z - position.z) > socialBalance.tauntRange ||
        Math.abs(at.y - position.y) > 2.5
      )
        continue;
      person.startled = 3;
      count++;
      speaker ??= person;
    }
    if (speaker)
      this.speak(
        speaker,
        speaker.activity === 'yoga' || speaker.activity === 'meditate' ? 'yoga' : 'resident',
      );
    return count;
  }

  private speak(person: Resident, topic: 'yoga' | 'resident' | 'greeting' | 'greetingYoga'): void {
    const line = this.voices.next(topic, person.id);
    this.reply = { text: line, cue: replyCue(topic) };
    this.bubbles.say(
      person.rig.root.position.add(new Vector3(0, 2.4, 0)),
      line,
      socialBalance.replySeconds,
      { topic, speaker: person.id },
    );
  }

  public flirt(): boolean {
    return false;
  }
  public resolve(): null {
    return null;
  }
  public takeReply(): NpcReply | null {
    const line = this.reply;
    this.reply = null;
    return line;
  }
  public dispose(): void {
    for (const person of this.people) person.rig.root.dispose();
    this.people.length = 0;
  }
}
