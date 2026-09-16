import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { Position3, WorldSectorDefinition } from '@tobi/contracts';
/** Visibility sectors with lazy decoration. Structural collision never disappears below a player. */
export class WorldSectors {
  private readonly entries = new Map<
    string,
    {
      definition: WorldSectorDefinition;
      meshes: AbstractMesh[];
      build?: () => void;
      built: boolean;
      visible: boolean;
    }
  >();
  private elapsed = 0;
  constructor(definitions: readonly WorldSectorDefinition[]) {
    for (const definition of definitions)
      this.entries.set(definition.id, { definition, meshes: [], built: false, visible: true });
  }
  add(id: string, mesh: AbstractMesh): void {
    this.entries.get(id)?.meshes.push(mesh);
  }
  decorate(id: string, build: () => void): void {
    const entry = this.entries.get(id);
    if (entry) entry.build = build;
  }
  update(position: Position3, delta = 0.25): void {
    this.elapsed += delta;
    if (this.elapsed < 0.2) return;
    this.elapsed = 0;
    for (const entry of this.entries.values()) {
      const { definition: d } = entry;
      const distance = Math.hypot(position.x - d.x, position.z - d.z);
      const margin = d.visibilityMargin ?? 150;
      const visible = distance < d.radius + margin + (entry.visible ? 10 : -10);
      if (visible && !entry.built) {
        entry.built = true;
        entry.build?.();
      }
      if (visible !== entry.visible) for (const mesh of entry.meshes) mesh.setEnabled(visible);
      entry.visible = visible;
    }
  }
  get stats() {
    return {
      sectors: this.entries.size,
      loaded: [...this.entries.values()].filter((e) => e.built).length,
      visible: [...this.entries.values()].filter((e) => e.visible).length,
    };
  }
}
