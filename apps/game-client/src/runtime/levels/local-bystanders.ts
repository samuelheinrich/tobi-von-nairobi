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
  ) {
    this.people = positions.map(([x, z], i) => {
      const rig = createNpc(scene, `local-${i}`, npcPalette(scene, i), shadows);
      rig.root.position.set(x, 0, z);
      return { rig, startled: 0 };
    });
  }
  public get targets() {
    return this.people.map((p) => ({
      position: { x: p.rig.root.position.x, y: 1.2, z: p.rig.root.position.z },
      radius: 0.65,
      hit: () => {
        p.startled = 3;
      },
    }));
  }
  public taunt(position: Position3): number {
    let count = 0;
    for (const p of this.people)
      if (Math.hypot(position.x - p.rig.root.position.x, position.z - p.rig.root.position.z) < 8) {
        p.startled = 3;
        count++;
        if (count === 1) {
          this.reply = { text: this.line, cue: 'grumble' };
          this.bubbles.say(p.rig.root.position.add(new Vector3(0, 2.4, 0)), this.line, 3);
        }
      }
    return count;
  }
  public update(delta: number): void {
    this.time += delta;
    for (const p of this.people) {
      p.startled = Math.max(0, p.startled - delta);
      p.rig.head.rotation.z = Math.sin(this.time * 2) * 0.04;
      p.rig.arms.forEach(
        (arm, i) => (arm.rotation.z = (i ? -1 : 1) * (p.startled > 0 ? 1.1 : 0.1)),
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
