import { registerNpcGrounding } from '../physics/npc-grounding.js';
import { registerNpcOccupancy } from '../npc/occupancy.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { material } from './materials.js';
import { createCharacter, type CharacterRig } from '../character/modular/rig.js';
import { registerNpcModel } from '../character/npc-models.js';
import {
  appearance,
  categoryFromName,
  type CharacterCategory,
} from '../character/modular/presets.js';
export type NpcRig = CharacterRig;
export interface NpcPalette {
  skin: StandardMaterial;
  top: StandardMaterial;
  bottom: StandardMaterial;
  hair: StandardMaterial;
  seed?: number;
}
/** Legacy palette interface; cached by scene and colour, retained for existing level factories. */
export function npcPalette(scene: Scene, index: number, neon = false): NpcPalette {
  const a = appearance(neon ? 'club_guest' : 'local', index);
  const get = (name: string, color: string) =>
    (scene.getMaterialByName(`npc-${name}-${color}`) as StandardMaterial) ??
    material(scene, `npc-${name}-${color}`, color);
  return {
    skin: get('skin', a.skin),
    top: get('top', a.topColor),
    bottom: get('bottom', a.bottomColor),
    hair: get('hair', a.hairColor),
    seed: index,
  };
}
export function createNpc(
  scene: Scene,
  name: string,
  palette: NpcPalette,
  shadows: ShadowGenerator | null,
  seated = false,
  category?: CharacterCategory,
  female?: boolean,
  thai = false,
): NpcRig {
  const a = appearance(category ?? categoryFromName(name), palette.seed ?? 0, female, thai);
  const rig = createCharacter(scene, name, a, shadows, seated);
  registerNpcOccupancy(scene, rig, seated);
  registerNpcGrounding(scene, rig, seated);
  registerNpcModel(scene, rig, seated);
  return rig;
}
