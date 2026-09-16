import { crowdMove, findGroundedSpawn } from '../../physics/ground-detection.js';
import { diversifyFemaleGroup } from '../../character/modular/female/presets.js';
import { animateFemale } from '../../character/modular/female/animation.js';
import { animateCharacter, type CharacterAction } from '../../character/modular/animation.js';
import { appearance, nanaCategory } from '../../character/modular/presets.js';
import { NanaSecurity } from './security.js';
import { DistantPopulation } from './distant-population.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { Position3 } from '@tobi/contracts';
import { NpcVoices, type SpeechTopic } from '@tobi/game-core';
import { nanaResidents, socialBalance, type NanaResident } from '@tobi/game-data';
import type { BottleTarget } from '../../items/thrown-bottles.js';
import { createNpc, npcPalette, type NpcRig } from '../npc-kit.js';
import type { SpeechBubbles } from '../speech-bubbles.js';
import { replyCue, type LevelNpcs, type NpcReply } from '../level-npcs.js';
import { animateDance } from '../../character/dance-system.js';
import { applyGlbPreview } from '../../character/glb-preview.js';

interface Resident extends NanaResident {
  startled: number;
  flirts: number;
  position: Vector3;
}
interface Slot {
  rig: NpcRig;
  resident: Resident | null;
  elapsed: number;
}

/** One bounded pool across street/courtyard/interiors; no individual controller or render observer. */
export class NanaVenue implements LevelNpcs {
  private readonly people: Resident[] = nanaResidents.map((p) => ({
    ...p,
    startled: 0,
    flirts: 0,
    position: new Vector3(p.x, p.y, p.z),
  }));
  private readonly looks = diversifyFemaleGroup(
    nanaResidents.map((p) => appearance(nanaCategory[p.role], p.id)),
  );
  private readonly slots: Slot[] = [];
  private readonly voices = new NpcVoices();
  private readonly solids: Set<Mesh>;
  private reply: NpcReply | null = null;
  private time = 0;
  private cooldown = 0;
  private allocation = 1;
  private greeting = 0;
  private chaos = 0;
  private mood = 0;
  private readonly security: NanaSecurity;
  public flirts = 0;
  public readonly blocked = false;
  private readonly bottleTargets: BottleTarget[];
  private readonly distant: DistantPopulation;

  public constructor(
    private readonly scene: Scene,
    _shadows: ShadowGenerator,
    colliders: Mesh[],
    private readonly bubbles: SpeechBubbles,
  ) {
    // Unlike ground navigation, sight includes upper slabs and the ceiling between two people.
    this.solids = new Set(colliders.filter((m) => m.name !== 'island-ground'));
    const palettes = Array.from({ length: 8 }, (_, i) => npcPalette(scene, i, i % 2 === 0));
    for (let i = 0; i < 32; i++) {
      const rig = createNpc(scene, `nana-resident-${i}`, palettes[i % 8]!, null);
      rig.root.setEnabled(false);
      this.slots.push({ rig, resident: null, elapsed: 0 });
    }
    // Dev-only: `?glb=…` swaps a few of these bodies for a downloaded model. No-op otherwise.
    void applyGlbPreview(
      scene,
      this.slots.map((slot) => slot.rig),
    );
    for (const p of this.people)
      if (p.action !== 'sit') {
        const spawn = findGroundedSpawn(scene, p.position);
        if (spawn) p.position.copyFrom(spawn);
      }
    this.security = new NanaSecurity(scene, colliders, bubbles);
    this.distant = new DistantPopulation(scene, this.people, this.looks);
    this.bottleTargets = this.people.map((p) => ({
      position: p.position.add(new Vector3(0, 1.15, 0)),
      radius: 0.6,
      hit: () => {
        p.startled = 3;
      },
    }));
  }
  public get targets(): readonly BottleTarget[] {
    return this.bottleTargets;
  }
  public context(chaos: number, mood = 0): void {
    this.chaos = chaos;
    this.mood = mood;
  }
  public movement(player: Position3) {
    return this.security.movement(player);
  }
  private canSee(from: Position3, person: Resident): boolean {
    const origin = new Vector3(from.x, from.y + 0.4, from.z);
    const target = person.position.add(new Vector3(0, 1.4, 0));
    const direction = target.subtract(origin),
      length = direction.length();
    return (
      length < 0.01 ||
      !this.scene.pickWithRay(new Ray(origin, direction.normalize(), length), (mesh) =>
        this.solids.has(mesh as Mesh),
      )?.hit
    );
  }
  private near(from: Position3, person: Resident, range: number): boolean {
    return (
      Math.abs(from.y - person.position.y - 1) < 2 &&
      Math.hypot(from.x - person.position.x, from.z - person.position.z) < range
    );
  }
  public update(delta: number, player: Position3): void {
    if (delta <= 0) return;
    this.security.step(delta, player, this.chaos);
    this.time += delta;
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.allocation += delta;
    this.greeting += delta;
    for (const p of this.people) {
      p.startled = Math.max(0, p.startled - delta);
      if (p.action === 'walk' || p.action === 'cross') {
        const desired = new Vector3(
          p.x + Math.sin(this.time * 0.32 + p.id) * (p.action === 'cross' ? 1.8 : 0.35),
          p.position.y,
          p.z + Math.sin(this.time * 0.4 + p.id) * 0.75,
        );
        p.position.copyFrom(crowdMove(this.scene, p.position, desired));
      }
    }
    for (const p of this.people) {
      const target = this.bottleTargets[p.id]!.position;
      target.x = p.position.x;
      target.y = p.position.y + 1.15;
      target.z = p.position.z;
    }
    if (this.allocation >= 0.4) {
      this.allocation = 0;
      const candidates = this.people
        .filter(
          (p) => Math.hypot(p.position.x - player.x, p.position.z - player.z, p.y - player.y) < 18,
        )
        .sort(
          (a, b) =>
            Math.hypot(a.position.x - player.x, a.position.z - player.z, (a.y - player.y) * 2) -
            Math.hypot(b.position.x - player.x, b.position.z - player.z, (b.y - player.y) * 2),
        )
        .slice(0, this.slots.length);
      const assigned = new Set(this.slots.map((s) => s.resident));
      for (const slot of this.slots)
        if (slot.resident && !candidates.includes(slot.resident)) {
          slot.resident = null;
          slot.rig.root.setEnabled(false);
        }
      for (const p of candidates)
        if (!assigned.has(p)) {
          const slot =
            this.slots.find((s) => !s.resident && s.rig.appearance.seed === p.id) ??
            this.slots.find((s) => !s.resident);
          if (!slot) break;
          slot.resident = p;
          slot.rig.dressAppearance(this.looks[p.id]!);
          slot.rig.gesture(p.action);
          slot.rig.root.rotation.set(0, p.action === 'sit' ? 0 : p.id * 1.3, 0);
          slot.rig.seatHeight = 0.5;
          for (const limb of [...slot.rig.arms, ...slot.rig.legs]) limb.rotation.set(0, 0, 0);
          slot.rig.root.setEnabled(true);
        }
    }
    this.distant.update(
      delta,
      this.time,
      player,
      new Set(this.slots.flatMap((s) => (s.resident ? [s.resident.id] : []))),
    );
    for (const slot of this.slots) {
      const p = slot.resident;
      if (!p) continue;
      slot.rig.root.position.copyFrom(p.position);
      const distance = Math.hypot(player.x - p.position.x, player.z - p.position.z, player.y - p.y);
      const head = slot.rig.head;
      const visible =
        distance < 8 ||
        !this.scene.activeCamera ||
        !this.scene.frustumPlanes ||
        head.isInFrustum(this.scene.frustumPlanes);
      slot.elapsed += delta;
      if (!visible || slot.elapsed < (distance < 15 ? 0 : distance < 32 ? 0.1 : 0.5)) continue;
      slot.elapsed = 0;
      if (p.action === 'dance' && slot.rig.appearance.femaleStyle)
        animateFemale(slot.rig, this.time, p.dance.includes('pole') ? 'pole' : 'dance');
      else if (p.action === 'dance')
        animateDance(slot.rig, p.dance, this.time, p.id, distance < 15);
      else {
        const action = p.startled
          ? 'angry'
          : p.action === 'hail'
            ? 'cheer'
            : p.action === 'cross'
              ? 'walk'
              : p.action;
        animateCharacter(slot.rig, action as CharacterAction, this.time, p.id);
      }
    }
    if (this.greeting > 9) {
      const p = this.people.find((p) => this.near(player, p, 4) && this.canSee(player, p));
      if (p) {
        this.say(
          p,
          this.chaos > 40
            ? 'nanaSecurity'
            : this.mood > 45
              ? 'nanaDrunk'
              : (
                  {
                    bartender: 'nanaBartender',
                    tourist: 'nanaTourist',
                    expat: 'nanaExpat',
                    'street vendor': 'nanaVendor',
                    'taxi driver': 'nanaTaxi',
                    security: 'nanaSecurity',
                    dancer: 'greetingBar',
                    'ladyboy dancer': 'greetingBar',
                  } as const
                )[p.role],
        );
        this.greeting = 0;
      }
    }
  }
  public taunt(position: Position3): number {
    const nearby = this.people.filter(
      (p) => this.near(position, p, socialBalance.tauntRange) && this.canSee(position, p),
    );
    for (const p of nearby) p.startled = 3;
    if (nearby[0]) this.say(nearby[0], 'bargirlTaunt');
    return nearby.length;
  }
  public flirt(position: Position3): boolean {
    if (this.cooldown > 0) return false;
    const target = this.people
      .filter(
        (p) =>
          ['dancer', 'ladyboy dancer', 'bartender'].includes(p.role) &&
          !p.startled &&
          this.near(position, p, socialBalance.flirtRange) &&
          this.canSee(position, p),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.position.x - position.x, a.position.z - position.z) -
          Math.hypot(b.position.x - position.x, b.position.z - position.z),
      )[0];
    if (!target) return false;
    this.cooldown = socialBalance.flirtCooldownSeconds;
    this.flirts++;
    target.flirts++;
    this.say(target, target.flirts % 4 === 0 ? 'flirtRejected' : 'flirt');
    return true;
  }
  public resolve(): null {
    return null;
  }
  public takeReply(): NpcReply | null {
    const reply = this.reply;
    this.reply = null;
    return reply;
  }
  private say(p: Resident, topic: SpeechTopic): void {
    const line = this.voices.next(topic, p.id);
    this.reply = { text: line, cue: replyCue(topic) };
    this.bubbles.say(p.position.add(new Vector3(0, 2.5, 0)), line, socialBalance.replySeconds, {
      topic,
      speaker: p.id,
    });
  }
  public dispose(): void {
    this.distant.dispose();
    this.security.dispose();
    for (const slot of this.slots) slot.rig.root.dispose();
    this.slots.length = 0;
  }
}
