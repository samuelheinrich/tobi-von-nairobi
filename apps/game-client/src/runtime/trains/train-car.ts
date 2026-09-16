import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { RestSpot } from '@tobi/game-core';
import type { HavokWorld } from '../physics/havok-world.js';
import { MovingPlatform } from '../physics/moving-platform.js';
import { box, material } from '../levels/materials.js';

export type TrainDoorState = 'CLOSED' | 'OPENING' | 'OPEN' | 'CLOSING';

interface PlatformPart {
  platform: MovingPlatform;
  local: Vector3;
  door?: { side: -1 | 1; panel: -1 | 1 };
}

/** One reusable, walkable carriage. Render parts share one root; only coarse primitives enter
 * Havok. This keeps a three-car train cheap while floors, end walls and doors remain physical. */
export class TrainCar {
  public readonly root: TransformNode;
  public readonly seats: RestSpot[];
  private readonly parts: PlatformPart[] = [];
  private readonly doorMeshes: { mesh: ReturnType<typeof box>; panel: number }[] = [];
  private readonly length = 11.5;
  private readonly width = 3.15;

  public constructor(
    private readonly scene: Scene,
    private readonly world: HavokWorld,
    public readonly id: string,
    accent: string,
  ) {
    this.root = new TransformNode(id, scene);
    const white = material(scene, id + '-white', '#e8edf0'),
      blue = material(scene, id + '-sbb-blue', accent),
      dark = material(scene, id + '-window', '#19364a'),
      interior = material(scene, id + '-interior', '#d8d2c3'),
      seat = material(scene, id + '-seat', '#537da1'),
      metal = material(scene, id + '-metal', '#a8b0b7');
    const visual = (
      name: string,
      size: [number, number, number],
      local: [number, number, number],
      surface = white,
    ) => {
      const mesh = box(scene, `${id}-${name}`, size, local, surface);
      mesh.parent = this.root;
      mesh.metadata = { collision: { collision: 'none' } };
      return mesh;
    };
    visual('floor', [this.width, 0.18, this.length], [0, 0, 0], interior);
    visual('roof', [this.width, 0.18, this.length], [0, 2.75, 0], white);
    visual('front', [this.width, 2.75, 0.16], [0, 1.37, -this.length / 2], blue);
    visual('back', [this.width, 2.75, 0.16], [0, 1.37, this.length / 2], blue);
    for (const side of [-1, 1]) {
      // A two-metre doorway is wide enough for the player capsule and does not rely on
      // squeezing through a cosmetic seam between panels.
      for (const z of [-3.9, 3.9])
        visual('side', [0.13, 2.75, 3.7], [(side * this.width) / 2, 1.37, z], white);
      for (const z of [-3.5, 3.5])
        visual('window', [0.04, 0.92, 1.45], [side * (this.width / 2 + 0.08), 1.82, z], dark);
      visual(
        'door-threshold',
        [0.72, 0.12, 2.08],
        [side * (this.width / 2 + 0.28), -0.05, 0],
        metal,
      );
      for (const panel of [-1, 1]) {
        const mesh = visual(
          'door',
          [0.11, 2.35, 1.02],
          [side * (this.width / 2 + 0.03), 1.18, panel * 0.52],
          blue,
        );
        this.doorMeshes.push({ mesh, panel });
      }
    }
    for (const z of [-4.2, -2.5, 2.5, 4.2])
      for (const side of [-1, 1]) {
        visual('seat', [0.72, 0.55, 1.2], [side * 0.93, 0.37, z], seat);
        visual('seat-back', [0.18, 1.1, 1.2], [side * 1.25, 0.83, z], seat);
      }
    for (const z of [-4, 0, 4]) {
      const pole = MeshBuilder.CreateCylinder(
        `${id}-pole`,
        { height: 2.55, diameter: 0.055 },
        scene,
      );
      pole.parent = this.root;
      pole.position.set(0, 1.35, z);
      pole.material = metal;
      pole.metadata = { collision: { collision: 'none' } };
    }
    this.seats = [-2.5, 2.5].map((z, index) => ({
      id: `${id}-seat-${index + 1}`,
      label: 'S16 · HINSETZEN',
      kind: 'seat' as const,
      position: { x: 0, y: 0, z: 0 },
      exit: { x: 0, y: 0, z: 0 },
      yaw: 0,
      seatHeight: 0.55,
    }));
    const physical = (
      name: string,
      size: [number, number, number],
      local: [number, number, number],
      door?: { side: -1 | 1; panel: -1 | 1 },
    ) => {
      const proxy = box(scene, `${id}-collider-${name}`, size, [0, -100, 0], interior);
      proxy.isVisible = false;
      proxy.isPickable = false;
      this.parts.push({
        platform: new MovingPlatform(world, proxy),
        local: new Vector3(...local),
        ...(door === undefined ? {} : { door }),
      });
    };
    physical('floor', [this.width, 0.18, this.length], [0, 0, 0]);
    physical('front', [this.width, 2.75, 0.18], [0, 1.37, -this.length / 2]);
    physical('back', [this.width, 2.75, 0.18], [0, 1.37, this.length / 2]);
    for (const side of [-1, 1] as const) {
      physical(`side-front-${side}`, [0.14, 2.75, 3.7], [(side * this.width) / 2, 1.37, -3.9]);
      physical(`side-back-${side}`, [0.14, 2.75, 3.7], [(side * this.width) / 2, 1.37, 3.9]);
      for (const panel of [-1, 1] as const)
        physical(
          `door-${side}-${panel}`,
          [0.14, 2.35, 1.02],
          [(side * this.width) / 2, 1.18, panel * 0.52],
          { side, panel },
        );
      physical(
        `door-threshold-${side}`,
        [0.72, 0.12, 2.08],
        [side * (this.width / 2 + 0.28), -0.05, 0],
      );
    }
  }

  public pose(position: Vector3, yaw: number, doors: TrainDoorState, openness: number): void {
    const rotation = Quaternion.FromEulerAngles(0, yaw, 0);
    const rotationMatrix = Matrix.Identity();
    Matrix.FromQuaternionToRef(rotation, rotationMatrix);
    this.root.position.copyFrom(position);
    this.root.rotationQuaternion = rotation;
    for (const part of this.parts) {
      part.platform.sync();
      const local = part.local.clone();
      if (part.door) local.z = part.door.panel * (0.52 + openness * 1.03);
      part.platform.moveTo(
        position.add(Vector3.TransformCoordinates(local, rotationMatrix)),
        rotation,
      );
    }
    for (const { mesh, panel } of this.doorMeshes)
      mesh.position.z = panel * (0.52 + openness * 1.03);
    for (const [index, seat] of this.seats.entries()) {
      const localSeat = new Vector3(index ? 0.9 : -0.9, 0.88, index ? 2.5 : -2.5),
        localExit = new Vector3(0, 1, index ? 2.5 : -2.5),
        worldSeat = position.add(Vector3.TransformCoordinates(localSeat, rotationMatrix)),
        worldExit = position.add(Vector3.TransformCoordinates(localExit, rotationMatrix));
      Object.assign(seat.position, { x: worldSeat.x, y: worldSeat.y, z: worldSeat.z });
      Object.assign(seat.exit, { x: worldExit.x, y: worldExit.y, z: worldExit.z });
      seat.yaw = yaw + (index ? -Math.PI / 2 : Math.PI / 2);
    }
    this.root.metadata = { trainDoorState: doors };
  }

  public dispose(): void {
    for (const part of this.parts) this.world.remove(part.platform.collider);
    this.root.dispose(false, true);
  }
}
