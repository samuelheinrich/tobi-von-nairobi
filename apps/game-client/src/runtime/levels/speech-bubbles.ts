import type { SpeechTopic } from '@tobi/game-core';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';

/** Which voice should read a line aloud. The topic decides both language and character, so the
 * two can never drift apart; `speaker` only separates two NPCs of the same kind. */
export interface SpeechVoice {
  topic: SpeechTopic;
  speaker: number;
}

interface Bubble {
  mesh: Mesh;
  texture: DynamicTexture;
  surface: StandardMaterial;
  anchor: Vector3;
  remaining: number;
}

/** A small fixed pool of speech plates that never allocates while the scene runs.
 *
 * They are turned towards the camera by hand instead of through `billboardMode`: a billboarded
 * plane presents its back face, which reads mirrored, and it also rolls with the camera. Yaw-only
 * facing keeps every plate upright and legible, exactly like the fixed level signs.
 */
export class SpeechBubbles {
  private readonly pool: Bubble[] = [];
  private cursor = 0;
  /** Set by the host to also speak whatever gets shown. Optional: the plate is the primary form. */
  public onSay: ((text: string, voice: SpeechVoice) => void) | undefined;
  public constructor(scene: Scene, capacity = 6) {
    for (let i = 0; i < capacity; i++) {
      const texture = new DynamicTexture(`speech-${i}`, { width: 512, height: 160 }, scene, false);
      texture.hasAlpha = true;
      // Upload the empty plate once: an untouched DynamicTexture never reports itself ready,
      // which would leave `scene.whenReadyAsync()` pending forever. The default invertY is the
      // one the level signs use, so the canvas maps onto the plane the right way up.
      texture.update();
      const surface = new StandardMaterial(`speech-${i}`, scene);
      surface.diffuseTexture = texture;
      surface.useAlphaFromDiffuseTexture = true;
      surface.emissiveColor = Color3.White();
      surface.disableLighting = true;
      surface.backFaceCulling = false;
      const mesh = MeshBuilder.CreatePlane(`speech-${i}`, { width: 3.2, height: 1 }, scene);
      mesh.material = surface;
      mesh.isPickable = false;
      mesh.setEnabled(false);
      this.pool.push({ mesh, texture, surface, anchor: Vector3.Zero(), remaining: 0 });
    }
  }

  public say(anchor: Vector3, text: string, seconds = 3.2, voice?: SpeechVoice): void {
    if (voice) this.onSay?.(text, voice);
    const bubble = this.pool[this.cursor % this.pool.length]!;
    this.cursor++;
    const context = bubble.texture.getContext() as CanvasRenderingContext2D;
    context.clearRect(0, 0, 512, 160);
    context.fillStyle = '#fdf6e6';
    context.strokeStyle = '#243d45';
    context.lineWidth = 8;
    context.beginPath();
    context.roundRect(10, 10, 492, 116, 28);
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(228, 120);
    context.lineTo(256, 152);
    context.lineTo(284, 120);
    context.closePath();
    context.fillStyle = '#fdf6e6';
    context.fill();
    context.fillStyle = '#243d45';
    context.font = 'bold 46px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 68, 460);
    bubble.texture.update();
    bubble.anchor = anchor.clone();
    bubble.remaining = seconds;
    bubble.surface.alpha = 1;
    bubble.mesh.position.copyFrom(anchor);
    bubble.mesh.setEnabled(true);
  }

  public update(delta: number, camera: Vector3): void {
    for (const bubble of this.pool) {
      if (bubble.remaining <= 0) continue;
      bubble.remaining -= delta;
      if (bubble.remaining <= 0) {
        bubble.mesh.setEnabled(false);
        continue;
      }
      bubble.surface.alpha = Math.min(1, bubble.remaining / 0.6);
      bubble.mesh.position.copyFrom(bubble.anchor);
      bubble.mesh.position.y += 0.2 * (1 - Math.min(1, bubble.remaining));
      // A plane's readable face looks along +Z, so turn that face towards the camera.
      bubble.mesh.rotation.y = Math.atan2(bubble.anchor.x - camera.x, bubble.anchor.z - camera.z);
    }
  }

  public dispose(): void {
    for (const bubble of this.pool) {
      bubble.mesh.dispose();
      bubble.texture.dispose();
      bubble.surface.dispose();
    }
    this.pool.length = 0;
  }
}
