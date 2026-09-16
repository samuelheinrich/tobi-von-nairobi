import { PhysicsViewer } from '@babylonjs/core/Debug/physicsViewer.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { ColliderHandle } from './collider-factory.js';
import type { HavokWorld, HavokCharacterMotor } from './havok-world.js';
import { groundBelow } from './ground-detection.js';
import { movement } from '@tobi/game-data';

/** Lazy developer-only view of actual Havok shapes, not inferred render bounding boxes. */
export class PhysicsDebug {
  private viewer: PhysicsViewer | null = null;
  private shown = new Map<ColliderHandle, AbstractMesh>();
  private readonly player;
  private readonly ray;
  private readonly point;
  private readonly materials = new Map<string, StandardMaterial>();
  private readonly observer;
  private enabled = false;
  private hidden = new Set<string>();
  private readonly contacts: Mesh[] = [];
  constructor(
    private readonly scene: Scene,
    private readonly world: HavokWorld,
    private readonly motor: HavokCharacterMotor,
  ) {
    this.player = MeshBuilder.CreateCapsule(
      'debug-player',
      { height: movement.capsuleHeight, radius: movement.capsuleRadius },
      scene,
    );
    this.player.material = this.surface('PLAYER');
    this.player.isPickable = false;
    this.ray = MeshBuilder.CreateLines(
      'ground-query',
      { points: [Vector3.Zero(), Vector3.Down()], updatable: true },
      scene,
    );
    this.ray.color = Color3.Yellow();
    this.point = MeshBuilder.CreateSphere('ground-contact', { diameter: 0.12, segments: 6 }, scene);
    this.point.material = this.surface('TRIGGER');
    this.point.isPickable = false;
    for (let i = 0; i < 8; i++) {
      const contact = MeshBuilder.CreateSphere(
        'character-contact',
        { diameter: 0.09, segments: 4 },
        scene,
      );
      contact.material = this.surface('PROJECTILE');
      contact.isPickable = false;
      contact.setEnabled(false);
      this.contacts.push(contact);
    }
    this.player.setEnabled(false);
    this.ray.setEnabled(false);
    this.point.setEnabled(false);
    this.observer = scene.onBeforeRenderObservable.add(() => this.update());
  }
  private surface(layer: string): StandardMaterial {
    let mat = this.materials.get(layer);
    if (!mat) {
      mat = new StandardMaterial('debug-' + layer, this.scene);
      mat.emissiveColor = Color3.FromHexString(
        (
          {
            PLAYER: '#39e9ff',
            NPC: '#ff9e40',
            WORLD_STATIC: '#56ec86',
            VEHICLE: '#eb52ea',
            PROJECTILE: '#ff6050',
            TRIGGER: '#ffee44',
          } as Record<string, string>
        )[layer] ?? '#bbbbff',
      );
      mat.disableLighting = true;
      mat.wireframe = true;
      this.materials.set(layer, mat);
    }
    return mat;
  }
  toggleLayer(layer: string): void {
    if (this.hidden.has(layer)) this.hidden.delete(layer);
    else this.hidden.add(layer);
    this.player.setEnabled(this.enabled && !this.hidden.has('PLAYER'));
  }
  toggle(): void {
    this.enabled = !this.enabled;
    this.motor.debugContacts(this.enabled);
    for (const contact of this.contacts) contact.setEnabled(false);
    if (!this.enabled) {
      this.viewer?.dispose();
      this.viewer = null;
      this.shown.clear();
    } else this.viewer = new PhysicsViewer(this.scene);
    this.player.setEnabled(this.enabled && !this.hidden.has('PLAYER'));
    this.ray.setEnabled(this.enabled);
    this.point.setEnabled(this.enabled);
  }
  private update(): void {
    if (!this.viewer) return;
    const live = new Set(
      this.world.colliders.filter((c) => !this.hidden.has(c.config.layer ?? 'WORLD_STATIC')),
    );
    for (const [c] of this.shown)
      if (!live.has(c)) {
        this.viewer.hideBody(c.aggregate.body);
        this.shown.delete(c);
      }
    for (const c of live)
      if (!this.shown.has(c)) {
        const mesh = this.viewer.showBody(c.aggregate.body);
        if (mesh) {
          mesh.material = this.surface(c.config.layer ?? 'WORLD_STATIC');
          this.shown.set(c, mesh);
        }
      }
    for (const [i, mesh] of this.contacts.entries()) {
      const at = this.motor.contacts[i];
      mesh.setEnabled(!!at);
      if (at) mesh.position.copyFrom(at);
    }
    this.player.position.copyFrom(this.motor.position);
    const feet = this.motor.feet,
      from = feet.add(new Vector3(0, 0.3, 0)),
      to = feet.add(new Vector3(0, -1.2, 0));
    MeshBuilder.CreateLines('ground-query', { points: [from, to], instance: this.ray }, this.scene);
    const hit = groundBelow(this.scene, feet);
    this.point.setEnabled(!!hit);
    if (hit) this.point.position.copyFrom(hit.hitPointWorld);
  }
  inspect() {
    return this.world.colliders
      .filter((c) => Vector3.DistanceSquared(c.mesh.position, this.motor.position) < 100)
      .slice(0, 8)
      .map((c) => ({ object: c.source.name, ...c.config }));
  }
  dispose(): void {
    this.scene.onBeforeRenderObservable.remove(this.observer);
    this.viewer?.dispose();
    this.motor.debugContacts(false);
    for (const contact of this.contacts) contact.dispose();
    this.player.dispose();
    this.ray.dispose();
    this.point.dispose();
    for (const m of this.materials.values()) m.dispose();
  }
}
