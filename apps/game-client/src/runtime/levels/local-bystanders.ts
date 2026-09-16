import type { CharacterCategory } from '../character/modular/presets.js';
import { animateCharacter } from '../character/modular/animation.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Position3 } from '@tobi/contracts';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { LevelNpcs, NpcReply } from './level-npcs.js';
import type { SpeechBubbles } from './speech-bubbles.js';
import { createNpc, npcPalette } from './npc-kit.js';

/** Small authored groups share reactions while the session owns any police consequences. */
export class LocalBystanders implements LevelNpcs {
  private readonly people;
  private reply: NpcReply | null = null;
  private time = 0;
  public readonly blocked = false;
  public constructor(
    scene: Scene,
    shadows: ShadowGenerator,
    private readonly bubbles: SpeechBubbles,
    positions: readonly (readonly [number, number])[],
    private readonly line: string,
    beachZone = false,
    private readonly heightAt: (x: number, z: number) => number = () => 0,
    categories: readonly CharacterCategory[] = [],
  ) {
    this.people = positions.map(([x, z], i) => {
      const rig = createNpc(
        scene,
        `local-${i}`,
        npcPalette(scene, i),
        shadows,
        false,
        categories[i] ?? (beachZone && z < -25 ? 'beach_guest' : 'local'),
      );
      rig.root.position.set(x, heightAt(x, z), z);
      return { rig, home: new Vector3(x, heightAt(x, z), z), startled: 0 };
    });
  }
  public get targets() {
    return this.people.map((p) => ({
      position: {
        x: p.rig.root.position.x,
        y: p.rig.root.position.y + 1.2,
        z: p.rig.root.position.z,
      },
      radius: 0.65,
      hit: () => {
        p.startled = 3;
      },
    }));
  }
  public taunt(position: Position3): number {
    let count = 0;
    for (const p of this.people)
      if (
        Math.hypot(
          position.x - p.rig.root.position.x,
          position.z - p.rig.root.position.z,
          position.y - p.rig.root.position.y - 1,
        ) < 8
      ) {
        p.startled = 3;
        count++;
        if (count === 1) {
          this.reply = { text: this.line, cue: 'grumble' };
          this.bubbles.say(p.rig.root.position.add(new Vector3(0, 2.4, 0)), this.line, 3);
        }
      }
    return count;
  }
  public update(delta: number, player?: Position3): void {
    this.time += delta;
    for (const p of this.people) {
      const near =
        !player ||
        Math.hypot(player.x - p.rig.root.position.x, player.z - p.rig.root.position.z) < 65;
      p.rig.root.setEnabled(near);
      if (!near) continue;
      const wasStartled = p.startled > 0;
      p.startled = Math.max(0, p.startled - delta);
      const previousX = p.rig.root.position.x;
      const previousZ = p.rig.root.position.z;
      let moving = false;
      if (wasStartled && player) {
        const dx = p.rig.root.position.x - player.x;
        const dz = p.rig.root.position.z - player.z;
        const length = Math.max(0.01, Math.hypot(dx, dz));
        const fromHome = Vector3.Distance(p.rig.root.position, p.home);
        if (fromHome < 5) {
          p.rig.root.position.x += (dx / length) * delta * 3.8;
          p.rig.root.position.z += (dz / length) * delta * 3.8;
          moving = true;
        }
      } else {
        const dx = p.home.x - p.rig.root.position.x;
        const dz = p.home.z - p.rig.root.position.z;
        const length = Math.hypot(dx, dz);
        if (length > 0.05) {
          const step = Math.min(length, delta * 1.2);
          p.rig.root.position.x += (dx / length) * step;
          p.rig.root.position.z += (dz / length) * step;
          moving = true;
        }
      }
      p.rig.root.position.y = this.heightAt(p.rig.root.position.x, p.rig.root.position.z);
      if (moving)
        p.rig.root.rotation.y = Math.atan2(
          p.rig.root.position.x - previousX,
          p.rig.root.position.z - previousZ,
        );
      animateCharacter(
        p.rig,
        wasStartled ? 'flee' : moving ? 'walk' : 'idle',
        this.time,
        p.rig.appearance.seed,
      );
    }
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
    for (const p of this.people) p.rig.root.dispose();
  }
}
