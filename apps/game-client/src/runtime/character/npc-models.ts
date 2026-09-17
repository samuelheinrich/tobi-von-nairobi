import { setNpcPhysicsDelta } from '../physics/npc-grounding.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Casting, type CastRole } from './characters/casting.js';
import { HumanoidCharacter } from './humanoid/character-runtime.js';
import type { AnimationState, CharacterConfig, HumanoidAction } from './humanoid/schema.js';
import type { CharacterRig } from './modular/rig.js';
import type { CharacterCategory } from './modular/presets.js';

export const npcCategoryRoles: Record<CharacterCategory, CastRole> = {
  local: 'tourist',
  tourist: 'tourist',
  expat: 'expat',
  dancer: 'dancer',
  cabaret: 'ladyboyDancer',
  bartender: 'bargirl',
  vendor: 'vendor',
  taxi: 'taxi',
  hotel: 'resident',
  crew: 'flightAttendant',
  security: 'security',
  police: 'police',
  beach_guest: 'beach',
  club_guest: 'raver',
};
export function npcRole(rig: CharacterRig): CastRole {
  if (rig.castRole) return rig.castRole;
  const name = rig.root.name;
  if (name.includes('conductor')) return 'conductor';
  if (name.includes('cell-guard')) return 'cellGuard';
  if (name.includes('passenger')) return 'passenger';
  if (name.startsWith('resident-')) return 'resident';
  return npcCategoryRoles[rig.appearance.category];
}
interface Actor {
  rig: CharacterRig;
  seated: boolean;
  identity: string;
  config: CharacterConfig | null;
  character: HumanoidCharacter | null;
  pending: boolean;
  last: Vector3;
  elapsed: number;
}
const scenes = new WeakMap<Scene, NpcModels>();

/** Scene-owned shared templates and a bounded reuse pool. AI/collisions keep their existing roots. */
class NpcModels {
  private readonly actors = new Set<Actor>();
  private readonly casting = new Casting();
  private readonly identities = new Map<string, CharacterConfig | null>();
  private readonly templates = new Map<string, Promise<HumanoidCharacter | null>>();
  private readonly available = new Map<string, HumanoidCharacter[]>();
  private readonly storage: TransformNode;
  private readonly jobs: (() => Promise<void>)[] = [];
  private loading = 0;
  private disposed = false;
  delta: number | null = null;
  constructor(private readonly scene: Scene) {
    this.storage = new TransformNode('npc-model-storage', scene);
    this.storage.setEnabled(false);
    scene.onBeforeRenderObservable.add(() => this.update());
    scene.onDisposeObservable.add(() => {
      this.disposed = true;
      this.jobs.length = 0;
      this.actors.clear();
      this.available.clear();
      this.templates.clear();
    });
  }
  register(rig: CharacterRig, seated: boolean): void {
    const actor: Actor = {
      rig,
      seated,
      identity: '',
      config: null,
      character: null,
      pending: false,
      last: rig.root.position.clone(),
      elapsed: 0,
    };
    this.actors.add(actor);
    rig.root.onDisposeObservable.add(() => {
      this.actors.delete(actor);
      // The root already owns/disposes its meshes; dispose the instance's skeleton and clips too.
      actor.character?.dispose();
      actor.character = null;
    });
  }
  private pump(): void {
    while (!this.disposed && this.loading < 2 && this.jobs.length) {
      this.loading++;
      void this.jobs.shift()!().finally(() => {
        this.loading--;
        this.pump();
      });
    }
  }
  template(config: CharacterConfig): Promise<HumanoidCharacter | null> {
    let task = this.templates.get(config.id);
    if (!task) {
      task = new Promise((resolve) => {
        this.jobs.push(async () => {
          try {
            resolve(await HumanoidCharacter.load(this.scene, this.storage, config));
          } catch (error) {
            if (!this.disposed) console.warn('[npc-model] placeholder retained:', config.id, error);
            resolve(null);
          }
        });
      });
      this.templates.set(config.id, task);
      this.pump();
    }
    return task;
  }
  choose(role: CastRole, seed: number, identity = `${role}:${seed}`): CharacterConfig | null {
    if (!this.identities.has(identity))
      this.identities.set(identity, this.casting.pick(role, seed));
    return this.identities.get(identity) ?? null;
  }
  private release(actor: Actor): void {
    actor.rig.modelActive = false;
    const model = actor.character;
    if (!model) return;
    actor.character = null;
    model.mount(this.storage);
    model.root.setEnabled(false);
    const free = this.available.get(model.config.id) ?? [];
    if (free.length < 2) {
      free.push(model);
      this.available.set(model.config.id, free);
    } else model.dispose();
  }
  private async obtain(actor: Actor): Promise<void> {
    if (!actor.config || actor.pending || actor.character) return;
    actor.pending = true;
    const config = actor.config,
      identity = actor.identity;
    try {
      const template = await this.template(config);
      if (!template && actor.identity === identity) actor.config = null;
      if (!template || this.disposed || actor.rig.root.isDisposed() || actor.identity !== identity)
        return;
      const model = this.available.get(config.id)?.pop() ?? template.instantiate(actor.rig.root);
      model.mount(actor.rig.root);
      model.controller.preview(
        actor.seated
          ? 'sit_idle'
          : ['dance', 'pole', 'club'].includes(actor.rig.action)
            ? 'dance'
            : 'idle',
      );
      model.pose(1, {
        speed: 0,
        grounded: true,
        sitting: actor.seated,
        drinking: false,
        holding: false,
        seatHeight: (actor.rig.seatHeight ?? 0.5) / Math.max(0.1, actor.rig.root.scaling.y),
        anchoredSeat: !!actor.rig.seatAnchor,
      });
      if (actor.rig.seatAnchor) model.alignToSeat(actor.rig.seatAnchor);
      model.root.setEnabled(true);
      model.root.metadata = { npcModel: config.id, role: npcRole(actor.rig), identity };
      actor.character = model;
      actor.rig.modelActive = true;
      actor.elapsed = 1;
    } catch (error) {
      console.warn('[npc-model] instance unavailable:', config.id, error);
      actor.config = null;
    } finally {
      actor.pending = false;
    }
  }
  private update(): void {
    if (this.disposed || !this.scene.activeCamera) return;
    const delta = this.delta ?? Math.min(0.05, this.scene.getEngine().getDeltaTime() / 1000);
    const camera = this.scene.activeCamera.globalPosition;
    for (const actor of this.actors) {
      const rig = actor.rig,
        at = rig.root.position;
      const distance = Vector3.Distance(camera, at);
      const visible =
        rig.root.isEnabled() &&
        rig.head.isVisible &&
        distance < 80 &&
        (!this.scene.frustumPlanes ||
          this.scene.frustumPlanes.every((p) => p.dotCoordinate(at) >= -3));
      // Crowd pool slots share the far batch's resident identity. Independent authored NPCs
      // may reuse palette seeds, but must not receive the same unique portrait twice.
      const pooled = /^(nana-resident-|parade-near-)/.test(rig.root.name);
      const role = npcRole(rig);
      const identity = `${pooled ? '' : rig.root.uniqueId + ':'}${role}:${rig.appearance.seed}`;
      if (identity !== actor.identity) {
        this.release(actor);
        actor.identity = identity;
        actor.config = this.choose(npcRole(rig), rig.appearance.seed, identity);
      }
      if (visible) void this.obtain(actor);
      const speed = delta > 0 ? Math.hypot(at.x - actor.last.x, at.z - actor.last.z) / delta : 0;
      actor.last.copyFrom(at);
      actor.elapsed += delta;
      const model = actor.character;
      if (!model) continue;
      rig.visual.setEnabled(false);
      rig.distant.setEnabled(false);
      model.root.setEnabled(visible);
      if (!visible || delta <= 0 || actor.elapsed < (distance < 18 ? 0 : distance < 38 ? 0.1 : 0.4))
        continue;
      const seated =
        actor.seated || rig.action === 'sit' || rig.legs.every((l) => l.rotation.x < -1);
      const baseAction: HumanoidAction = seated
        ? 'sit_idle'
        : rig.action === 'flee'
          ? 'run_away'
          : speed > 0.2
            ? speed > 3.5
              ? 'run'
              : 'walk'
            : ['dance', 'club', 'pole'].includes(rig.action)
              ? 'dance'
              : rig.action === 'drink'
                ? 'drink'
                : ['angry', 'talk', 'arrest', 'phone', 'smoke'].includes(rig.action)
                  ? 'taunt'
                  : rig.action === 'cheer'
                    ? 'celebrate'
                    : 'idle';
      let contextualAction: HumanoidAction = baseAction;
      if (baseAction === 'sit_idle') {
        // Longer talking and relaxed-idle clips belong on explicit seats. The deterministic seed
        // keeps a coach/aircraft cabin stable after reload and prevents every row moving in sync.
        const preferred =
          rig.appearance.seed % 5 === 0
            ? 'sit_talk'
            : rig.appearance.seed % 2 === 0
              ? 'sit_idle_alt'
              : 'sit_idle';
        if (model.clips.has(preferred)) contextualAction = preferred;
      } else if (
        baseAction === 'walk' &&
        ['raver', 'bargirl', 'dancer'].includes(role) &&
        rig.appearance.seed % 3 !== 0
      ) {
        // Drunken walks are nightlife flavour, never commuter or aircraft locomotion.
        const preferred = rig.appearance.seed % 2 === 0 ? 'drunk_walk' : 'drunk_walk_alt';
        if (model.clips.has(preferred)) contextualAction = preferred;
      }
      const action =
        model.config.actionOverrides?.[baseAction] ??
        model.config.actionOverrides?.[contextualAction] ??
        contextualAction;
      if (model.controller.action !== action || model.controller.serial === 0) {
        model.controller.preview(action);
        model.controller.time = (rig.appearance.seed * 0.713) % model.controller.timing().duration;
      }
      // Keep an unbounded clock: loop policy/root-motion need to know when a cycle was crossed.
      model.controller.time += actor.elapsed * (0.9 + (rig.appearance.seed % 7) * 0.035);
      const state: AnimationState = {
        speed,
        grounded: true,
        sitting: seated,
        drinking: action === 'drink',
        holding: false,
        // Crowd/navigation code owns rig.root. A standalone actor may use source root motion;
        // applying it here as well would move twice and be corrected on the next navigation tick.
        applyRootMotion: false,
        seatHeight: (actor.rig.seatHeight ?? 0.5) / Math.max(0.1, actor.rig.root.scaling.y),
        anchoredSeat: !!actor.rig.seatAnchor,
      };
      model.pose(actor.elapsed, state);
      if (actor.rig.seatAnchor) model.alignToSeat(actor.rig.seatAnchor);
      rig.root.rotation.z = 0;
      actor.elapsed = 0;
    }
  }
}
export function npcModels(scene: Scene): NpcModels {
  let models = scenes.get(scene);
  if (!models) {
    models = new NpcModels(scene);
    scenes.set(scene, models);
  }
  return models;
}
export function registerNpcModel(scene: Scene, rig: CharacterRig, seated: boolean): void {
  npcModels(scene).register(rig, seated);
}
/** Called by the game host so pause/custody never advance an NPC's animation clock. */
export function setNpcAnimationDelta(scene: Scene, delta: number): void {
  setNpcPhysicsDelta(scene, delta);
  const models = scenes.get(scene);
  if (models) models.delta = delta;
}
