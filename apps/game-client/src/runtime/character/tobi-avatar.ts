import type { Scene } from '@babylonjs/core/scene.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { HumanoidCharacter } from './humanoid/character-runtime.js';
import type { CharacterAnimationController } from './humanoid/animation-controller.js';
import type { AnimationState } from './humanoid/schema.js';
import { tobiConfig, tobiDrunkConfig } from './characters/tobi.js';
import type { SeatAnchor } from './seating/seat-anchor.js';

/** Tobi's two skins share the generic runtime and a single gameplay animation clock. */
export class TobiAvatar {
  private readonly looks = new Map<'sober' | 'drunk', HumanoidCharacter>();
  private current: 'sober' | 'drunk' = 'sober';
  private disposed = false;
  private constructor() {}
  static async load(scene: Scene, anchor: TransformNode): Promise<TobiAvatar | null> {
    const avatar = new TobiAvatar();
    try {
      avatar.looks.set('sober', await HumanoidCharacter.load(scene, anchor, tobiConfig));
      void HumanoidCharacter.load(scene, anchor, tobiDrunkConfig)
        .then((character) => {
          if (avatar.disposed) {
            character.dispose();
            return;
          }
          avatar.looks.set('drunk', character);
          avatar.show();
        })
        .catch((error: unknown) => console.warn('[character] drunk skin unavailable', error));
      return avatar;
    } catch (error) {
      avatar.dispose();
      console.warn('[character] avatar unavailable', error);
      return null;
    }
  }
  private get active(): HumanoidCharacter {
    return this.looks.get(this.current) ?? this.looks.get('sober')!;
  }
  setDrunk(drunk: boolean): void {
    this.current = drunk ? 'drunk' : 'sober';
    this.show();
  }
  private show(): void {
    for (const character of this.looks.values())
      character.root.setEnabled(character === this.active);
  }
  animate(delta: number, state: AnimationState, controller: CharacterAnimationController): void {
    this.active.pose(delta, state, controller);
  }
  alignToSeat(anchor: SeatAnchor, visualRoot: TransformNode): void {
    anchor.alignPelvis(visualRoot, this.active.rig.joints.get('hips')!.node, false);
  }
  attach(prop: TransformNode, controller: CharacterAnimationController): void {
    this.active.attachProp(prop, this.active.config.attachments.bottle_right_hand!, controller);
  }
  detach(prop: TransformNode): TransformNode {
    return this.active.attachments.detach(prop);
  }
  dispose(): void {
    this.disposed = true;
    for (const c of this.looks.values()) c.dispose();
    this.looks.clear();
  }
}
