import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { NpcVoices } from '@tobi/game-core';
import { socialBalance } from '@tobi/game-data';
import type { BottleTarget } from '../items/thrown-bottles.js';
import { createNpc, npcPalette, type NpcRig } from './npc-kit.js';
import type { SpeechBubbles } from './speech-bubbles.js';
import { replyCue, type LevelNpcs, type NpcReply } from './level-npcs.js';

type GuardState = 'OFF_DUTY' | 'APPROACHING' | 'COMPLAINING' | 'LEAVING';

const POST = new Vector3(6.4, 0, 6);
const BARS = new Vector3(4.1, 0, 0);

/** The only other character in the drunk tank. Shouting brings him to the bars once,
 * he says his line, and he walks straight back to his post.
 */
export class CellGuard implements LevelNpcs {
  private readonly rig: NpcRig;
  private readonly voices = new NpcVoices();
  private state: GuardState = 'OFF_DUTY';
  private wait = 0;
  private time = 0;
  private reply: NpcReply | null = null;
  private shouts = 0;

  public constructor(
    scene: Scene,
    shadows: ShadowGenerator,
    private readonly bubbles: SpeechBubbles,
  ) {
    this.rig = createNpc(scene, 'cell-guard', npcPalette(scene, 3), shadows);
    this.rig.root.position.copyFrom(POST);
    this.rig.root.rotation.y = Math.PI;
  }

  public readonly targets: readonly BottleTarget[] = [];
  public readonly blocked = false;

  public update(delta: number): void {
    if (delta <= 0) return;
    this.time += delta;
    const goal = this.state === 'APPROACHING' ? BARS : POST;
    const at = this.rig.root.position;
    const dx = goal.x - at.x,
      dz = goal.z - at.z;
    const distance = Math.hypot(dx, dz);
    const moving = distance > 0.08 && this.state !== 'COMPLAINING';
    if (moving) {
      const amount = Math.min(distance, delta * 1.9);
      at.x += (dx / distance) * amount;
      at.z += (dz / distance) * amount;
      this.rig.root.rotation.y = Math.atan2(dx, dz);
    }
    const stride = moving ? Math.sin(this.time * 6.5) * 0.5 : 0;
    for (const [index, leg] of this.rig.legs.entries())
      leg.rotation.x = index === 0 ? stride : -stride;
    for (const [index, arm] of this.rig.arms.entries())
      arm.rotation.x = index === 0 ? -stride : stride;
    if (this.state === 'APPROACHING' && distance <= 0.08) {
      this.state = 'COMPLAINING';
      this.wait = 2.6;
      this.rig.root.rotation.y = -Math.PI / 2;
      const line = this.voices.next('cellGuard', 'guard');
      this.reply = { text: line, cue: replyCue('cellGuard') };
      this.bubbles.say(at.add(new Vector3(0, 2.5, 0)), line, socialBalance.replySeconds, {
        topic: 'cellGuard',
        speaker: 3,
      });
    } else if (this.state === 'COMPLAINING') {
      this.wait -= delta;
      if (this.wait <= 0) this.state = 'LEAVING';
    } else if (this.state === 'LEAVING' && distance <= 0.08) {
      this.state = 'OFF_DUTY';
      this.rig.root.rotation.y = Math.PI;
    }
  }

  /** Shouting in the cell: Tobi says his piece, and the guard comes over if he is not already busy.
   * Tobi's own line stays in the HUD; a plate right in front of the camera would fill the screen. */
  public taunt(): number {
    this.shouts++;
    this.reply = {
      text: this.voices.next('tobiCellTaunt', 'tobi'),
      cue: replyCue('tobiCellTaunt'),
    };
    if (this.state === 'OFF_DUTY') this.state = 'APPROACHING';
    return 1;
  }

  public get visits(): number {
    return this.shouts;
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
    this.rig.root.dispose(false, true);
  }
}
