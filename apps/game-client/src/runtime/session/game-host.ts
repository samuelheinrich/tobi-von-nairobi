import { VehicleRuntime } from '../vehicles/vehicle-runtime.js';
import { groundedVisualFeet } from '../physics/ground-detection.js';
import type { PhysicsDebug } from '../physics/debug-physics.js';
import { Tutorial, type LessonSignals } from '@tobi/game-core';
import { setNpcAnimationDelta } from '../character/npc-models.js';
import { tutorialLessons, tutorialLayout } from '@tobi/game-data';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { FlightRuntime } from '../flight/flight-runtime.js';
import { Seating, CharacterFacing } from '@tobi/game-core';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import {
  FixedClock,
  Locomotion,
  PrototypeSession,
  BottleMood,
  BottleHands,
  ColorTrip,
  NpcVoices,
} from '@tobi/game-core';
import {
  movement,
  prototypeBalance,
  welcomeToBali,
  pursuitBalance,
  destinationName,
  hippieHouseLayout,
  zurichLayout,
  socialBalance,
} from '@tobi/game-data';
import type { GameView, LevelDefinition } from '@tobi/contracts';
import { PoliceRuntime } from '../police/police-runtime.js';
import type { GameViewStore } from '../../app/game-view-store.js';
import { KeyboardInput } from '../input/keyboard-input.js';
import { HavokCharacterMotor, HavokWorld, preparePhysics } from '../physics/havok-world.js';
import { createLevelScene } from '../levels/create-level-scene.js';
import type { LevelScene } from '../levels/create-level-scene.js';
import { ParadeCrowd } from '../levels/parade-crowd.js';
import { SpeechBubbles } from '../levels/speech-bubbles.js';
import { SpokenLines } from '../audio/spoken-lines.js';
import { createLevelNpcs } from '../levels/create-level-npcs.js';
import type { LevelNpcs } from '../levels/level-npcs.js';
import { ColorPickups } from '../items/color-pickups.js';
import { ThrownBottles } from '../items/thrown-bottles.js';
import { TobiVisual } from '../character/tobi-visual.js';
import { BottlePickups } from '../items/bottle-pickups.js';
import { ThirdPersonCamera } from '../camera/third-person-camera.js';
import { BaliCrowd } from '../levels/bali-crowd.js';
import { AudioFeedback } from '../audio/audio-feedback.js';

/** Composition root for one scene. It owns listeners and resources and can be disposed during async boot. */
export class GameHost {
  private readonly scene: Scene;
  private readonly input: KeyboardInput;
  private readonly world: HavokWorld;
  private readonly motor: HavokCharacterMotor;
  private readonly visual: TobiVisual;
  private readonly bottles: BottlePickups;
  private readonly crowd: BaliCrowd;
  private readonly camera: ThirdPersonCamera;
  private readonly clock = new FixedClock(prototypeBalance.fixedStep, prototypeBalance.maxSubSteps);
  private readonly locomotion = new Locomotion(movement);
  private readonly session: PrototypeSession;
  private readonly police: PoliceRuntime | null;
  private readonly audio = new AudioFeedback();
  private readonly mood = new BottleMood();
  private readonly hands = new BottleHands();
  private barDrinkSeconds = 0;
  private readonly trip = new ColorTrip();
  private readonly pills: ColorPickups;
  private readonly projectiles: ThrownBottles;
  private readonly parade: ParadeCrowd | null;
  private readonly bubbles: SpeechBubbles;
  private readonly voices = new NpcVoices();
  private readonly spoken = new SpokenLines();
  private tauntCount = 0;
  private readonly npcs: LevelNpcs | null;
  private readonly environment: LevelScene;
  private readonly vehicles: VehicleRuntime | null;
  private lastSafePosition: Vector3 | null = null;
  private readonly seating = new Seating();
  private readonly facing = new CharacterFacing();
  private readonly tutorial: Tutorial | null;
  private coverRouteIndex = 0;
  private seatRouteIndex = 0;
  private readonly flight: FlightRuntime | null;
  private flirts = 0;
  private tauntCooldown = 0;
  private wasGrounded = true;
  private lastWanted = 0;
  private disposed = false;
  private lastTime = performance.now();
  private uiTime = 0;
  private toastUntil = 0;
  private removeDebug: (() => void) | undefined;
  private debugLoading = false;
  private physicsDebug: PhysicsDebug | null = null;

  public static async create(
    canvas: HTMLCanvasElement,
    store: GameViewStore,
    signal: AbortSignal,
    level: LevelDefinition = welcomeToBali,
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
      return new GameHost(canvas, store, engine, module, level);
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
    private readonly level: LevelDefinition,
  ) {
    // A level may run without a score economy; the drunk tank hands out neither points nor bonus.
    this.tutorial = level.scenery === 'tutorial' ? new Tutorial(tutorialLessons) : null;
    this.session = new PrototypeSession(level, level.scoring ?? prototypeBalance);
    this.scene = new Scene(engine);
    this.world = new HavokWorld(this.scene, module);
    const environment = createLevelScene(this.scene, this.world, level);
    this.environment = environment;
    this.vehicles = environment.vehicles
      ? new VehicleRuntime(this.scene, this.world, environment.vehicles)
      : null;
    this.flight = level.scenery === 'aircraft' ? new FlightRuntime(this.scene, environment) : null;
    this.pills = new ColorPickups(this.scene, level);
    this.projectiles = new ThrownBottles(this.scene, environment.colliders, () =>
      this.audio.play('smash'),
    );
    this.parade =
      level.scenery === 'street-parade'
        ? new ParadeCrowd(this.scene, level, environment.colliders, zurichLayout.route)
        : null;
    this.bubbles = new SpeechBubbles(this.scene);
    // Every plate that appears is also read aloud, when the browser has a voice for it.
    this.bubbles.onSay = (text, voice) => this.spoken.say(voice.topic, text, voice.speaker);
    this.npcs = createLevelNpcs(this.scene, level, environment, this.bubbles);
    this.motor = new HavokCharacterMotor(this.scene, level.spawn);
    this.visual = new TobiVisual(this.scene, environment.shadows);
    this.crowd = new BaliCrowd(this.scene, level, environment.shadows, environment.colliders);
    this.bottles = new BottlePickups(this.scene, level, environment.shadows);
    this.police =
      level.maxWanted > 0
        ? new PoliceRuntime(this.scene, level, environment.colliders, environment.shadows)
        : null;
    this.camera = new ThirdPersonCamera(
      this.scene,
      level.scenery === 'aircraft'
        ? 'interior'
        : level.scenery === 'railway'
          ? 'railway'
          : level.scenery === 'drunk-tank'
            ? 'cell'
            : level.scenery === 'hippie-house'
              ? 'interior'
              : 'follow',
    );
    this.input = new KeyboardInput(canvas);
    // Settle the capsule before accepting input, with the same single physics step as gameplay.
    for (let i = 0; i < 60; i++) {
      this.world.step(1 / 60);
      this.motor.move({ x: 0, y: -2, z: 0 }, 1 / 60);
    }
    if (this.flight) {
      const home = environment.restSpots?.find((spot) => spot.id === 'tobi-seat');
      if (home) this.motor.teleport(this.seating.enter(home));
    }
    this.motor.support(1 / 60);
    this.syncVisual(0);
    this.camera.update(this.motor.position, 0, true);
    if (import.meta.env.DEV)
      this.scene.metadata = {
        ...this.scene.metadata,
        physicsProbe: { motor: this.motor, world: this.world },
      };
    window.addEventListener('resize', this.onResize);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('keydown', this.onKey);
    document.addEventListener('visibilitychange', this.onVisibility);
    document.addEventListener('pointerlockchange', this.onPointerLock);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.store.update({
      phase: 'ready',
      objective: this.objectiveText(),
      total: level.pickups.length,
      levelId: level.id,
      pursuit: this.police?.system.snapshot() ?? null,
    });
    this.engine.runRenderLoop(this.render);
  }

  public unlockAudio(): void {
    this.audio.start();
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
    this.audio.pause();
    this.spoken.silence();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  };

  public setMuted(muted: boolean): void {
    this.audio.muted = muted;
    // Spoken lines run through the browser's synthesiser, not the AudioContext, so muting the
    // master gain would leave them talking. They have to be stopped separately.
    this.spoken.enabled = !muted;
    if (muted) this.spoken.silence();
  }
  private onResize = (): void => {
    this.engine.resize();
  };
  private onBlur = (): void => {
    this.pause();
    this.audio.pause();
  };
  private onVisibility = (): void => {
    if (document.hidden) this.onBlur();
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
      const { PhysicsDebug } = await import('../physics/debug-physics.js');
      this.physicsDebug ??= new PhysicsDebug(this.scene, this.world, this.motor);
      if (this.disposed) return;
      this.removeDebug = createDeveloperPanel({
        togglePhysics: () => this.physicsDebug?.toggle(),
        togglePhysicsLayer: (layer) => this.physicsDebug?.toggleLayer(layer),
        respawn: () => {
          this.store.update({ debug: true });
          this.respawn();
        },
        teleportHome: () => {
          this.store.update({ debug: true });
          this.motor.teleport({ ...this.level.destination.position, y: 1.5 });
          this.locomotion.reset();
        },
        ...(this.environment.debugTeleports
          ? {
              teleports: this.environment.debugTeleports.map((teleport) => ({
                label: `Teleport · ${teleport.label}`,
                run: () => {
                  this.store.update({ debug: true });
                  this.motor.teleport(teleport.position);
                  this.locomotion.reset();
                  this.camera.reset();
                },
              })),
            }
          : {}),
        inspect: () =>
          JSON.stringify(
            {
              position: this.motor.position.asArray().map((n) => Number(n.toFixed(2))),
              grounded: this.motor.grounded,
              physics: {
                bodies: this.world.colliders.length,
                nearNPCs: this.scene.metadata?.npcPhysicsCount,
                surfaceVelocity: this.motor.surfaceVelocity.asArray(),
                nearby: this.physicsDebug?.inspect(),
              },
              fps: Math.round(this.engine.getFps()),
              droppedSeconds: Number(this.clock.droppedSeconds.toFixed(3)),
              objective: this.session.mission.active?.id,
              pursuit: this.police?.system.snapshot(),
              level: this.environment.debugState?.(),
              agents: this.police?.system.agents.map((a) => ({
                id: a.id,
                state: a.state,
                position: a.position,
              })),
            },
            null,
            2,
          ),
      });
    } finally {
      this.debugLoading = false;
    }
  }

  private tutorialView(): GameView['lesson'] {
    const lesson = this.tutorial?.active;
    if (!lesson || !this.tutorial) return null;
    const target =
      lesson.metric === 'cover'
        ? (tutorialLayout.coverRoute[this.coverRouteIndex] ?? tutorialLayout.cover)
        : lesson.metric === 'seated'
          ? (tutorialLayout.seatRoute[this.seatRouteIndex] ?? tutorialLayout.seat.exit)
          : lesson.metric === 'taunts'
            ? tutorialLayout.trainer
            : lesson.metric === 'bottles'
              ? this.level.pickups.find((p) => !this.session.collected.has(p.id))?.position
              : null;
    const dx = target ? target.x - this.motor.position.x : 0;
    const dz = target ? target.z - this.motor.position.z : 0;
    const bearing = `${Math.abs(dz) > 0.35 ? (dz > 0 ? 'N' : 'S') : ''}${Math.abs(dx) > 0.35 ? (dx > 0 ? 'E' : 'W') : ''}`;
    return {
      ...lesson,
      index: this.tutorial.index,
      total: tutorialLessons.length,
      distance: target ? Math.hypot(dx, dz) : null,
      bearing,
    };
  }

  private objectiveText(): string {
    if (this.tutorial?.active) return this.tutorial.active.title;
    if (this.flight) return this.flight.puzzle.hint;
    if (this.level.scenery === 'drunk-tank') return 'Ausnüchtern und die Nacht beenden';
    const active = this.session.mission.active?.type;
    if (active === 'collect')
      return `Sammle ${this.level.pickups.length} Flaschen${this.environment.worldLabel ? ' · ' + this.environment.worldLabel(this.motor.position) : ''}`;
    if (active === 'escapePolice') return 'Hänge die Polizei ab';
    return `Erreiche ${destinationName(this.level)}`;
  }

  private respawn(): void {
    this.seating.leave();
    this.vehicles?.cancel();
    this.motor.setCollisionEnabled(true);
    this.motor.teleport(this.level.spawn);
    this.locomotion.reset();
    this.camera.reset();
    this.clock.reset();
  }

  private step = (delta: number): void => {
    if (this.store.getSnapshot().phase !== 'playing') return;
    const actions = this.input.sample();
    this.barDrinkSeconds = Math.max(0, this.barDrinkSeconds - delta);
    const lessonSignals: Partial<LessonSignals> = {};
    this.camera.look(actions.lookX, actions.lookY);
    if (this.seating.active) this.facing.yaw = this.seating.active.yaw;
    let usedInteraction = false;
    const escort = this.npcs?.movement?.(this.motor.position);
    if (escort) {
      actions.interactPressed = false;
      const exit = this.seating.leave();
      if (exit) this.motor.teleport(exit);
    }
    if (actions.interactPressed && !this.seating.active && this.vehicles) {
      const result = this.vehicles.interact(this.motor.position);
      usedInteraction = result.handled;
      if (result.handled) {
        this.toastUntil = this.session.elapsedSeconds + 5;
        this.store.update({ toast: this.vehicles.message });
        this.locomotion.halt();
        if (result.exit) this.motor.teleport(result.exit);
      }
    }
    if (actions.interactPressed && !usedInteraction) {
      const exit = this.seating.leave();
      const spot = exit
        ? null
        : this.seating.nearest(this.motor.position, this.environment.restSpots ?? []);
      const target = exit ?? (spot ? this.seating.enter(spot) : null);
      if (target) {
        if (exit) lessonSignals.stoodUp = 1;
        this.motor.teleport(target);
        this.locomotion.halt();
        usedInteraction = true;
      }
    }
    if (actions.interactPressed && !usedInteraction) {
      const result = this.environment.interact?.(this.motor.position);
      if (result) {
        usedInteraction = true;
        this.locomotion.stamina = Math.min(
          movement.maxStamina,
          this.locomotion.stamina + result.energy,
        );
        if (this.locomotion.stamina === movement.maxStamina) this.locomotion.refill();
        if (result.energy > 0) {
          this.audio.play('drink');
          this.barDrinkSeconds = 1.2;
          if (result.drink) this.mood.collect();
        }
        this.toastUntil = this.session.elapsedSeconds + 4;
        this.store.update({ toast: result.text });
      }
    }
    const sitting = this.seating.active !== null || !!this.vehicles?.active;
    const movementActions = escort
      ? { ...actions, moveX: escort.x, moveZ: escort.z, jumpPressed: false, sprintHeld: false }
      : sitting
        ? { ...actions, moveX: 0, moveZ: 0, jumpPressed: false, sprintHeld: false }
        : this.flight
          ? { ...actions, jumpPressed: false }
          : actions;
    const velocity = this.locomotion.step(
      movementActions,
      escort ? 0 : this.camera.yaw,
      this.motor.support(delta),
      delta,
    );
    if (velocity.y > 0 && this.motor.grounded && this.wasGrounded) {
      this.audio.play('jump');
      lessonSignals.jumps = 1;
    }
    if (this.motor.grounded && !this.wasGrounded) this.audio.play('land');
    this.wasGrounded = this.motor.grounded;
    this.facing.update(velocity);
    this.environment.update?.(delta);
    this.vehicles?.step(delta, actions);
    this.motor.setCollisionEnabled(!this.vehicles?.active);
    this.world.step(delta);
    if (this.flight) {
      velocity.x *= 0.5;
      velocity.z *= 0.5;
    }
    if (this.vehicles?.active) {
      this.motor.teleport(
        this.vehicles.active.riderFeet.add(new Vector3(0, movement.capsuleHeight / 2, 0)),
      );
      this.facing.yaw = this.vehicles.active.yaw;
    } else if (this.seating.active) this.motor.teleport(this.seating.active.position);
    else this.motor.move(velocity, delta);
    if (velocity.y > 0 && this.motor.velocity.y < velocity.y)
      this.locomotion.velocity.y = this.motor.velocity.y;
    const position = this.motor.position;
    if (!this.vehicles?.active && this.environment.safeGround) {
      if (!this.environment.safeGround(position)) {
        this.motor.teleport(this.lastSafePosition ?? this.level.spawn);
        this.locomotion.reset();
        position.copyFrom(this.motor.position);
        this.toastUntil = this.session.elapsedSeconds + 3;
        this.store.update({ toast: 'Zu tief! Zurück ans sichere Ufer.' });
      } else if (this.motor.grounded && position.y > 0) this.lastSafePosition = position.clone();
    }
    if (position.y < -8) this.respawn();
    this.session.elapsedSeconds += delta;
    this.parade?.update(delta);
    const beforeBottles = this.session.collected.size;
    for (const id of this.bottles.nearby(position, this.vehicles?.active?.definition.kind)) {
      if (!this.session.collect(id)) continue;
      this.bottles.collect(id);
      this.police?.system.disrupt();
      this.hands.collect();
      this.visual.celebratePickup();
      this.audio.pickup();
      // Every bottle is also a full refuel: the run is about momentum, not about pacing stamina.
      const wasTired = this.locomotion.stamina < movement.maxStamina - 5;
      this.locomotion.refill();
      if (wasTired) this.audio.play('refill');

      this.toastUntil = this.session.elapsedSeconds + 2;
      this.store.update({
        toast:
          this.session.collected.size === this.level.pickups.length
            ? this.police
              ? 'Flaschen vollzählig. Jetzt die Polizei abhängen!'
              : `Flaschen vollzählig. Auf zu ${destinationName(this.level)}!`
            : `+${prototypeBalance.bottlePoints} · ENERGIE VOLL · ${this.mood.label}`,
      });
    }
    // An early practice throw can never strand the later throwing lesson without a bottle.
    if (this.tutorial?.active?.metric === 'throws' && !this.hands.holding && !this.hands.drinking)
      this.hands.collect();
    const drinks = this.hands.step(delta);
    for (let i = 0; i < drinks; i++) {
      this.mood.collect();
      this.audio.play('drink');
      if (this.session.collected.size % 3 === 0) this.audio.play('hiccup');
    }
    this.trip.step(delta);
    if (this.environment.audioZones)
      this.audio.spatialEnvironment(delta, position, this.environment.audioZones);
    else this.audio.environment(delta, this.level.scenery);
    for (const id of this.pills.nearby(position))
      if (this.trip.collect(id)) {
        this.pills.collect(id);
        this.audio.play('powerup');
        this.toastUntil = this.session.elapsedSeconds + 3;
        this.store.update({ toast: 'FARBRAUSCH · Die Parade hat jetzt noch mehr Farben.' });
      }
    if (
      !sitting &&
      actions.throwPressed &&
      this.projectiles.count < 8 &&
      this.visual.canThrow &&
      this.hands.throw()
    ) {
      // The visible character leads the throw; orbiting the camera never changes its direction.
      this.visual.root.rotation.y = this.facing.yaw;
      lessonSignals.throws = 1;
      this.visual.throwBottle((prop) => {
        this.projectiles.launchProp(prop, this.facing.yaw);
        this.audio.play('throw');
        this.police?.system.disrupt();
      });
    }
    if (this.projectiles.count > 0)
      this.projectiles.update(delta, [
        ...(this.police?.system.activeAgents.map((a) => ({
          position: { x: a.position.x, y: 1.25, z: a.position.z },
          radius: 0.75,
          hit: () => this.police?.system.stagger(a.id),
        })) ?? []),
        ...(this.parade?.system.people.map((p) => ({
          position: { x: p.position.x, y: 1.25, z: p.position.z },
          radius: 0.65,
          hit: () => {
            this.parade?.system.frighten(p.id, position);
          },
        })) ?? this.crowd.targets),
        ...(this.npcs?.targets ?? []),
      ]);
    this.tauntCooldown = Math.max(0, this.tauntCooldown - delta);
    if (
      actions.celebratePressed &&
      !actions.specialPressed &&
      !actions.throwPressed &&
      !sitting &&
      !escort &&
      this.motor.grounded &&
      !this.hands.drinking &&
      Math.hypot(velocity.x, velocity.z) < 0.12 &&
      this.visual.celebrate()
    ) {
      lessonSignals.celebrates = 1;
      this.toastUntil = this.session.elapsedSeconds + 3;
      this.store.update({ toast: 'CELEBRATE · Tobi tanzt! Bewegen zum Abbrechen.' });
    }
    if (actions.specialPressed && this.tauntCooldown === 0) {
      this.tauntCooldown = 3;
      this.tauntCount++;
      this.visual.taunt();
      const count =
        (this.parade?.taunt(position) ?? this.crowd.taunt(position)) +
        (this.npcs?.taunt(position) ?? 0);
      this.police?.system.provoke();
      this.audio.play('provoke');
      if (count > 0) lessonSignals.taunts = 1;
      this.flight?.puzzle.taunt();
      // Tobi says something different every time; the cell and the cabin have their own registers.
      const shoutTopic =
        this.level.scenery === 'drunk-tank'
          ? 'tobiCellTaunt'
          : this.flight
            ? 'tobiFlightTaunt'
            : 'tobiTaunt';
      const shout = this.voices.next(shoutTopic, 'tobi');
      this.bubbles.say(
        new Vector3(position.x, position.y + 1.35, position.z),
        shout,
        socialBalance.replySeconds,
        { topic: shoutTopic, speaker: 0 },
      );
      // After a few rounds the crowd stops finding it charming.
      const crowdTopic = this.tauntCount > 2 ? 'crowdAnnoyed' : 'crowd';
      const responder = this.parade?.responder ?? this.crowd.responder;
      if (responder)
        this.bubbles.say(
          new Vector3(responder.x, responder.y, responder.z),
          this.voices.next(crowdTopic, count),
          socialBalance.replySeconds,
          { topic: crowdTopic, speaker: count },
        );
      this.toastUntil = this.session.elapsedSeconds + 3;
      this.store.update({
        speech: shout,
        toast: this.flight
          ? `${shout} · Beschwerde ${this.flight.puzzle.strikes}/3`
          : count
            ? `${shout} · ${count} Leute reagieren.`
            : shout,
      });
    }
    if (
      actions.flirtPressed &&
      !this.environment.cycleInteraction?.(position) &&
      this.npcs?.flirt(position)
    )
      this.flirts++;
    this.npcs?.context?.(this.police?.system.chaos.value ?? 0, this.store.getSnapshot().mood);
    this.npcs?.update(delta, position);
    // A blocking NPC pushes Tobi back out of its body; it never reports him to anyone.
    const pushed = this.vehicles?.active ? null : (this.npcs?.resolve(position) ?? null);
    if (pushed) {
      this.motor.teleport({ x: pushed.x, y: position.y, z: pushed.z });
      this.audio.play('block');
    }
    const reply = this.npcs?.takeReply();
    if (reply) {
      this.audio.play(reply.cue);
      this.toastUntil = this.session.elapsedSeconds + 3;
      this.store.update({ speech: reply.text, toast: reply.text });
    }
    const cabinOutcome = this.flight?.step(delta, position, this.seating.active);
    if (cabinOutcome) {
      const home = this.environment.restSpots?.find((spot) => spot.id === 'tobi-seat');
      if (home) this.motor.teleport(this.seating.enter(home));
      this.locomotion.reset();
      this.camera.reset();
      this.audio.play('grumble');
      this.toastUntil = this.session.elapsedSeconds + 5;
      this.store.update({
        toast:
          cabinOutcome === 'disruptive'
            ? 'DREI BESCHWERDEN. Zurück auf Platz 42C! E zum Aufstehen.'
            : '«Bitte zurück auf Ihren Platz!» E zum Aufstehen.',
      });
      return;
    }
    const outcome = this.police?.system.step(delta, position);
    const wanted = this.police?.system.wanted.level ?? 0;
    if (wanted > this.lastWanted) this.audio.play('alert');
    this.lastWanted = wanted;
    this.audio.update(
      delta,
      Math.hypot(this.motor.velocity.x, this.motor.velocity.z),
      this.motor.grounded,
      wanted,
      this.level.atmosphere === 'night',
      !this.flight,
    );
    if (outcome === 'escaped') {
      this.audio.play('escape');
      this.session.escaped();
      this.session.score += pursuitBalance.escapeBonus;
      this.toastUntil = this.session.elapsedSeconds + 4;
      this.store.update({ toast: '+500 · ABGEHÄNGT. Karl war’s diesmal nicht.' });
    }
    if (outcome === 'caught') {
      this.input.enabled = false;
      this.input.reset();
      if (document.pointerLockElement === this.canvas) document.exitPointerLock();
      this.audio.play('caught');
      this.bubbles.say(
        new Vector3(position.x, position.y + 1.6, position.z),
        this.voices.next('policeCaught', 'arrest'),
        socialBalance.replySeconds,
        { topic: 'policeCaught', speaker: 1 },
      );
      this.store.update({ phase: 'caught', pursuit: this.police?.system.snapshot() ?? null });
      return;
    }
    if (this.tutorial) {
      if (this.tutorial.active?.metric === 'seated') {
        const waypoint = tutorialLayout.seatRoute[this.seatRouteIndex];
        if (waypoint && Math.hypot(position.x - waypoint.x, position.z - waypoint.z) < 0.8)
          this.seatRouteIndex++;
      }
      if (this.tutorial.active?.metric === 'cover') {
        const waypoint = tutorialLayout.coverRoute[this.coverRouteIndex];
        if (waypoint && Math.hypot(position.x - waypoint.x, position.z - waypoint.z) < 0.8)
          this.coverRouteIndex++;
      }
      const trainer = new Vector3(
        tutorialLayout.trainer.x,
        tutorialLayout.trainer.y,
        tutorialLayout.trainer.z,
      );
      const sight = position.subtract(trainer),
        distance = sight.length();
      const hidden =
        position.x > 3.5 &&
        Math.abs(position.z - tutorialLayout.cover.z) < 2 &&
        this.scene.pickWithRay(
          new Ray(trainer, sight.normalize(), distance),
          (mesh) => mesh.name === 'tutorial-cover',
        )?.hit;
      this.tutorial.observe({
        ...lessonSignals,
        distance: Math.hypot(this.motor.velocity.x, this.motor.velocity.z) * delta,
        camera: Math.abs(actions.lookX) + Math.abs(actions.lookY),
        sprint: this.locomotion.sprinting ? delta : 0,
        bottles: this.session.collected.size - beforeBottles,
        drinks,
        cover: hidden ? delta : 0,
        seated: this.seating.active?.kind === 'seat' ? delta : 0,
      });
    }
    const destination = this.level.destination;
    const nearDestination =
      Vector3.Distance(
        position,
        new Vector3(destination.position.x, destination.position.y + 1, destination.position.z),
      ) < destination.radius;
    if (
      actions.interactPressed &&
      !usedInteraction &&
      (!this.flight || this.flight.puzzle.ready) &&
      (!this.tutorial || this.tutorial.complete) &&
      nearDestination &&
      !this.police?.system.wanted.level &&
      this.session.reach(destination.id)
    ) {
      this.input.enabled = false;
      this.input.reset();
      this.audio.victory();
      this.store.update({
        phase: 'complete',
        result: {
          pickupIds: [...this.session.collected],
          elapsedMs: Math.round(this.session.elapsedSeconds * 1000),
          escapes: this.police?.system.escapes ?? 0,
          debugUsed: this.store.getSnapshot().debug,
        },
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
    this.environment.focus?.(position);
    const cameraMode = this.environment.cameraMode?.(position);
    if (cameraMode) this.camera.setMode(cameraMode);
    if (this.level.scenery === 'hippie-house')
      this.bottles.cutaway(cameraMode === 'interior' ? position.y : Number.POSITIVE_INFINITY);
    this.visual.root.position.copyFrom(
      groundedVisualFeet(
        this.scene,
        this.motor.feet,
        this.motor.grounded && !this.seating.active && !this.vehicles?.active,
      ),
    );
    const velocity = this.motor.relativeVelocity;
    const speed = this.vehicles?.active ? 0 : Math.hypot(velocity.x, velocity.z);
    if (!this.vehicles?.active && speed > 0.1 && this.store.getSnapshot().phase === 'playing') {
      const target = Math.atan2(velocity.x, velocity.z);
      const difference = Math.atan2(
        Math.sin(target - this.visual.root.rotation.y),
        Math.cos(target - this.visual.root.rotation.y),
      );
      this.visual.root.rotation.y += difference * Math.min(1, delta * 14);
    }
    if (this.seating.active) this.visual.root.rotation.y = this.seating.active.yaw;
    if (this.vehicles?.active) this.visual.root.rotation.y = this.vehicles.active.yaw;
    this.visual.root.setEnabled(this.seating.active?.kind !== 'toilet');
    const activeSeatAnchor = this.seating.active?.seatAnchorId
      ? this.environment.seatAnchors?.find(
          (anchor) => anchor.id === this.seating.active?.seatAnchorId,
        )
      : undefined;
    const tripped = this.visual.animate(
      ['paused', 'caught'].includes(this.store.getSnapshot().phase) ? 0 : delta,
      this.store.getSnapshot().phase === 'playing' ? speed : 0,
      this.motor.grounded || !!this.vehicles?.active,
      this.store.getSnapshot().phase === 'complete',
      this.mood.amount,
      this.locomotion.stamina,
      this.hands.holding || this.barDrinkSeconds > 0,
      Math.max(this.hands.drinkPose, Math.sin((Math.PI * this.barDrinkSeconds) / 1.2)),
      this.seating.active?.kind === 'seat' || !!this.vehicles?.active,
      this.vehicles?.active?.seatHeight ?? this.seating.active?.seatHeight ?? 0.42,
      activeSeatAnchor,
    );
    if (tripped) this.audio.play('stumble');
  }

  private render = (): void => {
    if (this.disposed) return;
    const now = performance.now();
    const delta = Math.max(0, (now - this.lastTime) / 1000);
    this.lastTime = now;
    try {
      if (this.store.getSnapshot().phase === 'playing') this.clock.advance(delta, this.step);
      this.syncVisual(Math.min(delta, 0.1));
      setNpcAnimationDelta(
        this.scene,
        this.store.getSnapshot().phase === 'playing' ? Math.min(delta, 0.05) : 0,
      );
      if (this.store.getSnapshot().phase === 'playing') {
        this.pills.update(Math.min(delta, 0.1));
      }
      this.crowd.update(
        this.store.getSnapshot().phase === 'playing' ? Math.min(delta, 0.1) : 0,
        this.motor.position,
        this.mood.amount,
      );
      this.police?.sync(this.store.getSnapshot().phase === 'playing' ? Math.min(delta, 0.1) : 0);
      const callout = this.police?.takeCallout();
      if (callout)
        this.bubbles.say(
          new Vector3(callout.position.x, callout.position.y, callout.position.z),
          callout.text,
          socialBalance.replySeconds,
          { topic: callout.topic, speaker: callout.speaker },
        );
      if (this.store.getSnapshot().phase !== 'paused') this.bottles.update(Math.min(delta, 0.1));
      this.bubbles.update(
        this.store.getSnapshot().phase === 'playing' ? Math.min(delta, 0.1) : 0,
        this.camera.camera.position,
      );
      this.camera.setVehicle(this.vehicles?.active?.definition.kind ?? null);
      this.camera.update(this.motor.position, Math.min(delta, 0.1));
      // Read-only position projection for local route diagnostics; no mutation/test commands.
      this.canvas.dataset.playerPosition = `${this.motor.position.x.toFixed(2)},${this.motor.position.y.toFixed(2)},${this.motor.position.z.toFixed(2)}`;
      const train = this.environment.transit?.primary?.snapshot;
      if (train)
        this.canvas.dataset.trainState = `${train.state}|${train.doorState}|${train.currentStation}|${train.nextStation}|${train.speed.toFixed(2)}`;
      this.uiTime += delta;
      if (this.uiTime >= 0.1) {
        this.uiTime = 0;
        this.store.update({
          collected: this.session.collected.size,
          mood: Math.round(this.mood.amount * 100),
          moodLabel: this.mood.label,
          emptyBottles: this.hands.empties,
          drinking: this.hands.drinking || this.barDrinkSeconds > 0,
          tripSeconds: Math.ceil(this.trip.remaining),
          tripIntensity: this.trip.intensity,
          crowdCount: this.parade?.system.people.length ?? 0,
          interiorFloor: this.flight
            ? this.motor.position.y > 4.4
              ? 1
              : 0
            : this.level.scenery === 'nana-plaza' && this.motor.position.z > 4
              ? Math.max(0, Math.min(2, Math.floor((this.motor.position.y - 0.5) / 4.8)))
              : this.level.scenery === 'hippie-house' &&
                  this.environment.cameraMode?.(this.motor.position) === 'interior'
                ? Math.max(
                    0,
                    Math.min(
                      hippieHouseLayout.floors.length - 1,
                      Math.floor((this.motor.position.y - 0.5) / hippieHouseLayout.floorHeight),
                    ),
                  )
                : null,
          tauntedCount: this.parade?.system.taunted.size ?? 0,
          flirts: this.flirts,
          blocked: this.npcs?.blocked ?? false,
          posture:
            this.seating.active?.kind === 'seat'
              ? 'sitting'
              : this.seating.active
                ? 'hidden'
                : 'standing',
          interaction:
            this.vehicles?.prompt(this.motor.position) ||
            (this.seating.active
              ? 'E · AUFSTEHEN / VERSTECK VERLASSEN'
              : (() => {
                  const spot = this.seating.nearest(
                    this.motor.position,
                    this.environment.restSpots ?? [],
                  );
                  return spot
                    ? `E · ${spot.label}`
                    : (this.environment.interactionPrompt?.(this.motor.position) ?? '');
                })()),
          lesson: this.tutorialView(),
          cabin: this.flight
            ? {
                stage: this.flight.puzzle.stage,
                strikes: this.flight.puzzle.strikes,
                returns: this.flight.puzzle.returns,
                ready: this.flight.puzzle.ready,
              }
            : null,
          stamina: Math.round(this.locomotion.stamina),
          score: this.session.score,
          elapsedSeconds: Math.floor(this.session.elapsedSeconds),
          fps: Math.round(this.engine.getFps()),
          objective: this.objectiveText(),
          pursuit: this.police?.system.snapshot() ?? null,
          canCheckIn:
            this.session.mission.active?.type === 'reach' &&
            !this.police?.system.wanted.level &&
            (!this.flight || this.flight.puzzle.ready) &&
            (!this.tutorial || this.tutorial.complete),
          ...(this.session.elapsedSeconds > this.toastUntil ? { toast: '', speech: '' } : {}),
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
    this.spoken.dispose();
    this.flight?.dispose();
    this.npcs?.dispose();
    this.bubbles.dispose();
    this.projectiles.dispose();
    this.pills.dispose();
    this.parade?.dispose();
    this.police?.dispose();
    this.bottles.dispose();
    this.motor.dispose();
    this.visual.dispose();
    this.crowd.dispose();
    this.physicsDebug?.dispose();
    this.vehicles?.dispose();
    this.world.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
