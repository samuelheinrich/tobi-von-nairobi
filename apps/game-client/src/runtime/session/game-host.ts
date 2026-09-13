import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { FixedClock, Locomotion, PrototypeSession } from '@tobi/game-core';
import { movement, prototypeBalance, welcomeToBali } from '@tobi/game-data';
import type { GameViewStore } from '../../app/game-view-store.js';
import { KeyboardInput } from '../input/keyboard-input.js';
import { HavokCharacterMotor, HavokWorld, preparePhysics } from '../physics/havok-world.js';
import { createBaliScene } from '../levels/bali-scene.js';
import { TobiVisual } from '../character/tobi-visual.js';
import { BottlePickups } from '../items/bottle-pickups.js';
import { ThirdPersonCamera } from '../camera/third-person-camera.js';
import { AudioFeedback } from '../audio/audio-feedback.js';

/** Composition root for one scene. It owns listeners and resources and can be disposed during async boot. */
export class GameHost {
  private readonly scene: Scene;
  private readonly input: KeyboardInput;
  private readonly world: HavokWorld;
  private readonly motor: HavokCharacterMotor;
  private readonly visual: TobiVisual;
  private readonly bottles: BottlePickups;
  private readonly camera: ThirdPersonCamera;
  private readonly clock = new FixedClock(prototypeBalance.fixedStep, prototypeBalance.maxSubSteps);
  private readonly locomotion = new Locomotion(movement);
  private readonly session = new PrototypeSession(welcomeToBali, prototypeBalance);
  private readonly audio = new AudioFeedback();
  private disposed = false;
  private lastTime = performance.now();
  private uiTime = 0;
  private toastUntil = 0;
  private removeDebug: (() => void) | undefined;
  private debugLoading = false;

  public static async create(
    canvas: HTMLCanvasElement,
    store: GameViewStore,
    signal: AbortSignal,
  ): Promise<GameHost | null> {
    if (!Engine.IsSupported)
      throw new Error(
        'Dein Browser unterstützt WebGL 2 nicht. Bitte nutze einen aktuellen Desktop-Browser.',
      );
    const module = await preparePhysics();
    if (signal.aborted) return null;
    const engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: false });
    if (engine.webGLVersion < 2) {
      engine.dispose();
      throw new Error('Für Tobi wird WebGL 2 benötigt.');
    }
    engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
    try {
      return new GameHost(canvas, store, engine, module);
    } catch (error) {
      engine.dispose();
      throw error;
    }
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly store: GameViewStore,
    private readonly engine: Engine,
    module: Awaited<ReturnType<typeof preparePhysics>>,
  ) {
    this.scene = new Scene(engine);
    this.world = new HavokWorld(this.scene, module);
    const environment = createBaliScene(this.scene, this.world, welcomeToBali);
    this.motor = new HavokCharacterMotor(this.scene, welcomeToBali.spawn);
    this.visual = new TobiVisual(this.scene, environment.shadows);
    this.bottles = new BottlePickups(this.scene, welcomeToBali, environment.shadows);
    this.camera = new ThirdPersonCamera(this.scene);
    this.input = new KeyboardInput(canvas);
    // Settle the capsule before accepting input, with the same single physics step as gameplay.
    for (let i = 0; i < 60; i++) {
      this.world.step(1 / 60);
      this.motor.move({ x: 0, y: -2, z: 0 }, 1 / 60);
    }
    this.syncVisual(0);
    this.camera.update(this.motor.position, 0, true);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('keydown', this.onKey);
    document.addEventListener('visibilitychange', this.onVisibility);
    document.addEventListener('pointerlockchange', this.onPointerLock);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.store.update({ phase: 'ready', total: welcomeToBali.pickups.length });
    this.engine.runRenderLoop(this.render);
  }

  public start = (): void => {
    if (!['ready', 'paused'].includes(this.store.getSnapshot().phase)) return;
    this.audio.start();
    this.clock.reset();
    this.input.reset();
    this.input.enabled = true;
    this.lastTime = performance.now();
    this.store.update({ phase: 'playing' });
    this.canvas.focus();
    // Drag-to-look remains available if the browser declines pointer lock.
    try {
      void this.canvas.requestPointerLock()?.catch(() => undefined);
    } catch {
      /* browser denied the request */
    }
  };

  public pause = (): void => {
    if (this.store.getSnapshot().phase !== 'playing') return;
    this.input.enabled = false;
    this.input.reset();
    this.clock.reset();
    this.store.update({ phase: 'paused' });
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  };

  public setMuted(muted: boolean): void {
    this.audio.muted = muted;
  }
  private onResize = (): void => {
    this.engine.resize();
  };
  private onBlur = (): void => {
    this.pause();
  };
  private onVisibility = (): void => {
    if (document.hidden) this.pause();
  };
  private onPointerLock = (): void => {
    if (!document.pointerLockElement) this.pause();
  };
  private onContextLost = (event: Event): void => {
    event.preventDefault();
    this.pause();
    this.store.update({
      phase: 'error',
      error: 'Die Grafikverbindung wurde unterbrochen. Bitte starte den Prototyp neu.',
    });
  };
  private onKey = (event: KeyboardEvent): void => {
    if (event.code === 'Escape') this.pause();
    if (import.meta.env.DEV && event.code === 'F1') {
      event.preventDefault();
      void this.toggleDebug();
    }
  };

  private async toggleDebug(): Promise<void> {
    if (!import.meta.env.DEV) return;
    if (this.removeDebug) {
      this.removeDebug();
      this.removeDebug = undefined;
      return;
    }
    if (this.debugLoading) return;
    this.debugLoading = true;
    try {
      const { createDeveloperPanel } = await import('../devtools/developer-panel.js');
      if (this.disposed) return;
      this.removeDebug = createDeveloperPanel({
        respawn: () => {
          this.store.update({ debug: true });
          this.respawn();
        },
        teleportHome: () => {
          this.store.update({ debug: true });
          this.motor.teleport({ x: 0, y: 1.5, z: 19 });
          this.locomotion.reset();
        },
        inspect: () =>
          JSON.stringify(
            {
              position: this.motor.position.asArray().map((n) => Number(n.toFixed(2))),
              grounded: this.motor.grounded,
              fps: Math.round(this.engine.getFps()),
              droppedSeconds: Number(this.clock.droppedSeconds.toFixed(3)),
              objective: this.session.mission.active?.id,
            },
            null,
            2,
          ),
      });
    } finally {
      this.debugLoading = false;
    }
  }

  private respawn(): void {
    this.motor.teleport(welcomeToBali.spawn);
    this.locomotion.reset();
    this.camera.reset();
    this.clock.reset();
  }

  private step = (delta: number): void => {
    if (this.store.getSnapshot().phase !== 'playing') return;
    const actions = this.input.sample();
    this.camera.look(actions.lookX, actions.lookY);
    const velocity = this.locomotion.step(
      actions,
      this.camera.yaw,
      this.motor.support(delta),
      delta,
    );
    this.world.step(delta);
    this.motor.move(velocity, delta);
    if (velocity.y > 0 && this.motor.velocity.y < velocity.y)
      this.locomotion.velocity.y = this.motor.velocity.y;
    const position = this.motor.position;
    if (position.y < -8) this.respawn();
    this.session.elapsedSeconds += delta;
    for (const id of this.bottles.nearby(position)) {
      if (!this.session.collect(id)) continue;
      this.bottles.collect(id);
      this.audio.pickup();
      this.toastUntil = this.session.elapsedSeconds + 2;
      this.store.update({
        toast:
          this.session.collected.size === 5
            ? 'Flaschen vollzählig. Ab ins Airbnb!'
            : '+100 · Läuft bei Tobi.',
      });
    }
    const destination = welcomeToBali.destination;
    const nearDestination =
      Vector3.Distance(position, new Vector3(destination.position.x, 1, destination.position.z)) <
      destination.radius;
    if (actions.interactPressed && nearDestination && this.session.reach(destination.id)) {
      this.input.enabled = false;
      this.input.reset();
      this.audio.victory();
      this.store.update({
        phase: 'complete',
        toast: '',
        score: this.session.score,
        collected: this.session.collected.size,
        elapsedSeconds: Math.floor(this.session.elapsedSeconds),
        nearDestination: false,
      });
      if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    }
    if (this.store.getSnapshot().phase === 'playing') this.store.update({ nearDestination });
  };

  private syncVisual(delta: number): void {
    const position = this.motor.position;
    this.visual.root.position.copyFrom(
      position.subtract(new Vector3(0, movement.capsuleHeight / 2, 0)),
    );
    const velocity = this.motor.velocity;
    const speed = Math.hypot(velocity.x, velocity.z);
    if (speed > 0.1 && this.store.getSnapshot().phase === 'playing') {
      const target = Math.atan2(velocity.x, velocity.z);
      const difference = Math.atan2(
        Math.sin(target - this.visual.root.rotation.y),
        Math.cos(target - this.visual.root.rotation.y),
      );
      this.visual.root.rotation.y += difference * Math.min(1, delta * 14);
    }
    this.visual.animate(
      delta,
      this.store.getSnapshot().phase === 'playing' ? speed : 0,
      this.motor.grounded,
      this.store.getSnapshot().phase === 'complete',
    );
  }

  private render = (): void => {
    if (this.disposed) return;
    const now = performance.now();
    const delta = Math.max(0, (now - this.lastTime) / 1000);
    this.lastTime = now;
    try {
      if (this.store.getSnapshot().phase === 'playing') this.clock.advance(delta, this.step);
      this.syncVisual(Math.min(delta, 0.1));
      if (this.store.getSnapshot().phase !== 'paused') this.bottles.update(Math.min(delta, 0.1));
      this.camera.update(this.motor.position, Math.min(delta, 0.1));
      this.uiTime += delta;
      if (this.uiTime >= 0.1) {
        this.uiTime = 0;
        this.store.update({
          collected: this.session.collected.size,
          stamina: Math.round(this.locomotion.stamina),
          score: this.session.score,
          elapsedSeconds: Math.floor(this.session.elapsedSeconds),
          fps: Math.round(this.engine.getFps()),
          objective:
            this.session.mission.active?.type === 'collect'
              ? 'Sammle 5 Flaschen'
              : 'Erreiche das Airbnb',
          ...(this.session.elapsedSeconds > this.toastUntil ? { toast: '' } : {}),
        });
      }
      this.scene.render();
    } catch (error) {
      this.pause();
      this.store.update({
        phase: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'Die Spielszene konnte nicht fortgesetzt werden.',
      });
      this.engine.stopRenderLoop(this.render);
    }
  };

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.engine.stopRenderLoop(this.render);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('keydown', this.onKey);
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.removeEventListener('pointerlockchange', this.onPointerLock);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.removeDebug?.();
    this.input.dispose();
    this.audio.dispose();
    this.bottles.dispose();
    this.motor.dispose();
    this.visual.dispose();
    this.world.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
