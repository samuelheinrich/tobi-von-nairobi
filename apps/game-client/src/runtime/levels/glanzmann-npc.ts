import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { Position3 } from '@tobi/contracts';
import type { BottleTarget } from '../items/thrown-bottles.js';
import type { LevelNpcs, NpcReply } from './level-npcs.js';
import { createNpc, npcPalette } from './npc-kit.js';
import type { SpeechBubbles } from './speech-bubbles.js';

const lines = [
  'Brauchst du iPhone?',
  'Ich bin CEO von iReparatur.',
  'Display kaputt? Glanzmann regelt das.',
] as const;

/** One named Glanzmann cameo per level. Casting owns the portrait limit while this class owns
 * proximity speech and the existing social-NPC contract. */
export class GlanzmannNpc implements LevelNpcs {
  private readonly rig;
  private cooldown = 2;
  private line = 0;
  private reply: NpcReply | null = null;
  public readonly blocked = false;

  public constructor(
    scene: Scene,
    shadows: ShadowGenerator | null,
    private readonly bubbles: SpeechBubbles,
    position: readonly [number, number, number],
    rotation = 0,
  ) {
    this.rig = createNpc(scene, 'glanzmann-special', npcPalette(scene, 104), shadows);
    this.rig.castRole = 'special';
    this.rig.root.position.set(...position);
    this.rig.root.rotation.y = rotation;
  }

  public get targets(): readonly BottleTarget[] {
    return [
      {
        position: {
          x: this.rig.root.position.x,
          y: this.rig.root.position.y + 1.2,
          z: this.rig.root.position.z,
        },
        radius: 0.65,
        hit: () => this.say('Hey! Das ist ein CEO-Hemd.'),
      },
    ];
  }

  public update(delta: number, player: Position3): void {
    this.cooldown = Math.max(0, this.cooldown - delta);
    const dx = player.x - this.rig.root.position.x;
    const dz = player.z - this.rig.root.position.z;
    const distance = Math.hypot(dx, dz);
    this.rig.root.setEnabled(distance < 75);
    if (distance < 6.5) {
      this.rig.root.rotation.y = Math.atan2(dx, dz);
      if (this.cooldown <= 0) {
        this.say(lines[this.line++ % lines.length]!);
        this.cooldown = 14;
      }
    }
  }

  public taunt(position: Position3): number {
    if (
      Math.hypot(position.x - this.rig.root.position.x, position.z - this.rig.root.position.z) > 8
    )
      return 0;
    this.rig.gesture('angry');
    this.say('So redet man nicht mit dem CEO von iReparatur!');
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
    this.rig.root.dispose();
  }

  private say(text: string): void {
    this.reply = { text, cue: 'flirt' };
    this.bubbles.say(this.rig.root.position.add(new Vector3(0, 2.45, 0)), text, 3.2);
  }
}
