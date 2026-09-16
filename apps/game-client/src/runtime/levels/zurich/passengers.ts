import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { Position3 } from '@tobi/contracts';
import { zurichPassengerSpawns } from '@tobi/game-data';
import { animateCharacter } from '../../character/modular/animation.js';
import type { TrainSystem } from '../../trains/train-system.js';
import type { LevelNpcs, NpcReply } from '../level-npcs.js';
import { createNpc, npcPalette } from '../npc-kit.js';
import type { SpeechBubbles } from '../speech-bubbles.js';

type StationId = 'hb' | 'stadelhofen';
interface Passenger {
  rig: ReturnType<typeof createNpc>;
  home: Vector3;
  target: Vector3;
  station: StationId;
  boards: boolean;
  riding: boolean;
  phase: number;
  alternate: Vector3 | null;
  towardAlternate: boolean;
}

const doorAt = (station: StationId, index: number) =>
  station === 'hb'
    ? new Vector3(-4.15, 0.35, 75 + (Math.floor(index / 2) % 3) * 12)
    : new Vector3(69.2, 0.35, 75 + (Math.floor(index / 2) % 3) * 12);
const exitAt = (station: StationId, index: number) =>
  station === 'hb'
    ? new Vector3(-42 + (index % 5) * 6, 0.1, 62 + (index % 2) * 5)
    : new Vector3(78 + (index % 3) * 3, 0.1, 66 + (index % 2) * 5);

/** Waypoint passengers share the normal modular rigs and grounding pool. Only authored boarders
 * approach doors; the rest wait, sit or walk toward exits instead of random wandering. */
export class StationPassengers implements LevelNpcs {
  private readonly people: Passenger[];
  private reply: NpcReply | null = null;
  private time = 0;
  private previousStation = 'Zürich HB';
  public readonly blocked = false;

  public constructor(
    scene: Scene,
    shadows: ShadowGenerator,
    private readonly bubbles: SpeechBubbles,
    private readonly trains: TrainSystem,
  ) {
    this.people = zurichPassengerSpawns.map(([x, y, z, role], index) => {
      const rig = createNpc(
        scene,
        `station-passenger-${index}`,
        npcPalette(scene, index + 40),
        shadows,
        role === 'waiting_area',
      );
      rig.root.position.set(x, y, z);
      const home = rig.root.position.clone();
      const alternate =
        role === 'stairs'
          ? new Vector3(-35, -4.68, 72)
          : role === 'exit'
            ? home.add(new Vector3(index % 2 ? 8 : -8, 0, 4))
            : role === 'shop'
              ? home.add(new Vector3(index % 2 ? 5 : -5, 0, 0))
              : null;
      return {
        rig,
        home,
        target: alternate?.clone() ?? home.clone(),
        station: x > 40 ? 'stadelhofen' : 'hb',
        boards: role === 'train_door',
        riding: false,
        phase: index * 1.71,
        alternate,
        towardAlternate: !!alternate,
      };
    });
  }

  public get targets() {
    return this.people
      .filter((person) => !person.riding)
      .map((person) => ({
        position: {
          x: person.rig.root.position.x,
          y: person.rig.root.position.y + 1.2,
          z: person.rig.root.position.z,
        },
        radius: 0.65,
        hit: () => {
          person.target.copyFrom(exitAt(person.station, person.rig.appearance.seed));
        },
      }));
  }

  public update(delta: number, player: Position3): void {
    this.time += delta;
    const train = this.trains.primary,
      snapshot = train?.snapshot;
    if (!train || !snapshot) return;
    const station: StationId = snapshot.currentStation.includes('Stadelhofen')
      ? 'stadelhofen'
      : 'hb';
    if (snapshot.currentStation !== this.previousStation && train.doorsOpen) {
      this.previousStation = snapshot.currentStation;
      for (const [index, person] of this.people.entries())
        if (person.riding && index % 2 === 0) {
          person.station = station;
          person.riding = false;
          person.rig.root.position.copyFrom(doorAt(station, index));
          person.target.copyFrom(exitAt(station, index));
          person.rig.root.setEnabled(true);
          train.passengerCount = Math.max(8, train.passengerCount - 1);
        }
    }
    for (const [index, person] of this.people.entries()) {
      if (person.riding) continue;
      const distanceToPlayer = Math.hypot(
        player.x - person.rig.root.position.x,
        player.z - person.rig.root.position.z,
      );
      person.rig.root.setEnabled(distanceToPlayer < 78);
      if (!person.rig.root.isEnabled()) continue;
      if (train.doorsOpen && person.boards && person.station === station)
        person.target.copyFrom(doorAt(station, index));
      const deltaPosition = person.target.subtract(person.rig.root.position),
        distance = Math.hypot(deltaPosition.x, deltaPosition.z);
      if (distance > 0.08) {
        const step = Math.min(distance, delta * 1.25);
        person.rig.root.position.x += (deltaPosition.x / distance) * step;
        person.rig.root.position.z += (deltaPosition.z / distance) * step;
        person.rig.root.rotation.y = Math.atan2(deltaPosition.x, deltaPosition.z);
        animateCharacter(person.rig, 'walk', this.time, person.phase);
      } else {
        animateCharacter(
          person.rig,
          person.rig.action === 'sit' ? 'sit' : 'idle',
          this.time,
          person.phase,
        );
        if (
          train.doorsOpen &&
          person.boards &&
          person.station === station &&
          Vector3.Distance(person.rig.root.position, doorAt(station, index)) < 0.45
        ) {
          person.riding = true;
          person.rig.root.setEnabled(false);
          train.passengerCount++;
        } else if (person.alternate && !person.boards) {
          person.towardAlternate = !person.towardAlternate;
          person.target.copyFrom(person.towardAlternate ? person.alternate : person.home);
        }
      }
    }
  }

  public taunt(position: Position3): number {
    const person = this.people.find(
      (candidate) =>
        !candidate.riding &&
        Vector3.Distance(
          candidate.rig.root.position,
          new Vector3(position.x, position.y, position.z),
        ) < 7,
    );
    if (!person) return 0;
    const line = 'Entschuldigung, das ist der Ruhebereich.';
    this.bubbles.say(person.rig.root.position.add(new Vector3(0, 2.3, 0)), line, 3);
    this.reply = { text: line, cue: 'grumble' };
    return 1;
  }
  public flirt(): boolean {
    return false;
  }
  public resolve(): null {
    return null;
  }
  public takeReply(): NpcReply | null {
    const reply = this.reply;
    this.reply = null;
    return reply;
  }
  public dispose(): void {
    for (const person of this.people) person.rig.dispose();
  }
}
