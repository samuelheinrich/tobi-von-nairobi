import type { Scene } from '@babylonjs/core/scene.js';
import type { InputActions, Position3 } from '@tobi/contracts';
import { aircraftLayout } from '@tobi/game-data';
import { AircraftController } from '../aircraft/aircraft-controller.js';
import type { AircraftEnvironment } from '../aircraft/types.js';
import type { SoundCue } from '../audio/sound-cues.js';
import { PushableObject } from '../interactions/pushable-object.js';
import { box, material } from '../levels/materials.js';
import { createNpc, npcPalette } from '../levels/npc-kit.js';
import type { HavokWorld } from '../physics/havok-world.js';
import { EvacuationRuntime } from '../airport/evacuation-runtime.js';

export type FlightPhase =
  'find_trolley' | 'breach_door' | 'enter_cockpit' | 'flying' | 'landing' | 'landed' | 'airport';

/** Coordinates the cabin takeover and hands control to the generic arcade aircraft controller. */
export class FlightRuntime {
  readonly controller: AircraftController;
  readonly trolley: PushableObject;
  readonly pilotSeatAnchor;
  phase: FlightPhase = 'find_trolley';
  doorIntegrity: number = aircraftLayout.takeover.doorIntegrity;
  private doorOpen = 0;
  private impactCooldown = 0;
  private readonly crew;
  private readonly evacuation: EvacuationRuntime;
  private readonly events: SoundCue[] = [];
  private pendingTeleport: Position3 | null = null;

  constructor(
    scene: Scene,
    private readonly world: HavokWorld,
    private readonly aircraft: AircraftEnvironment,
  ) {
    this.pilotSeatAnchor = aircraft.pilotSeatAnchor;
    this.controller = new AircraftController(aircraft.exteriorRoot, aircraftLayout.flight);
    this.evacuation = new EvacuationRuntime(scene, aircraft.evacuationRoutes);
    const trolleyMesh = box(
      scene,
      'service-trolley-pushable',
      [1.05, 1.35, 1.25],
      [...aircraft.trolleySpawn],
      material(scene, 'service-trolley-metal', '#aa8f5b'),
    );
    trolleyMesh.metadata = { ...trolleyMesh.metadata, pushable: true };
    this.trolley = new PushableObject(world, trolleyMesh, {
      id: 'service-trolley',
      mass: 72,
      grabDistance: 2.1,
      holdDistance: 1.15,
      maxSpeed: 5.2,
    });
    for (const x of [-0.42, 0.42])
      for (const z of [-0.48, 0.48]) {
        const wheel = box(
          scene,
          'service-trolley-wheel',
          [0.14, 0.18, 0.18],
          [x, -0.7, z],
          material(scene, 'trolley-rubber', '#151a20'),
        );
        wheel.parent = trolleyMesh;
      }
    for (let shelf = -1; shelf <= 1; shelf++) {
      const line = box(
        scene,
        'service-trolley-trim',
        [1.08, 0.06, 1.28],
        [0, shelf * 0.38, 0],
        material(scene, 'trolley-trim', '#e5d8ab'),
      );
      line.parent = trolleyMesh;
    }
    this.crew = aircraftLayout.crewRoutes.map((route, index) => {
      const rig = createNpc(
        scene,
        `flight-crew-${route.id}`,
        npcPalette(scene, 220 + index),
        null,
        false,
        'crew',
        true,
      );
      rig.root.position.set(route.x, route.floor, route.start);
      return { rig, route, z: Number(route.start), direction: route.direction as 1 | -1 };
    });
  }

  get flying(): boolean {
    return ['flying', 'landing', 'landed'].includes(this.phase);
  }

  get exploringAirport(): boolean {
    return this.phase === 'airport';
  }

  get objective(): string {
    if (this.phase === 'find_trolley') return 'Finde den Servicewagen im Oberdeck';
    if (this.phase === 'breach_door') return 'Ramme den Servicewagen gegen die Cockpittür';
    if (this.phase === 'enter_cockpit') return 'Betritt das Cockpit und übernimm den Pilotensitz';
    if (this.phase === 'flying') return 'Steuere das Flugzeug · L startet den Landeanflug';
    if (this.phase === 'landing') return 'LANDEANFLUG · Auf der Mittellinie bleiben';
    if (this.phase === 'landed') return 'GELANDET · Verlasse mit E den Pilotensitz';
    return 'Durchquere das Terminal und erreiche die Partyhalle';
  }

  get snapshot() {
    const state = this.controller.snapshot;
    return {
      phase: this.phase,
      trolleyGrabbed: this.trolley.grabbed,
      doorIntegrity: Math.max(0, Math.round(this.doorIntegrity)),
      speed: Math.round(state.speed),
      altitude: Math.round(state.altitude),
      pitch: state.pitch,
      roll: state.roll,
      heading: state.heading,
      throttle: state.throttle,
      gearDown: state.gearDown,
      landingProgress: state.landingProgress,
      evacuation: this.evacuation.snapshot,
    };
  }

  interactionPrompt(player: Position3): string {
    if (this.phase === 'flying')
      return 'W/S · PITCH   A/D · ROLL   SHIFT/SPACE · SCHUB   L · LANDEN';
    if (this.phase === 'landing')
      return `LANDEANFLUG · ${Math.round(this.controller.landingProgress * 100)}%`;
    if (this.phase === 'landed') return 'E · PILOTENSITZ VERLASSEN UND EVAKUIEREN';
    // After the breach the trolley remains beside the doorway. The cockpit action must win over
    // its grab prompt, otherwise the same E press simply picks the trolley up again.
    if (this.phase === 'enter_cockpit' && this.insidePilotInteractionZone(player))
      return 'E · PILOTENSITZ ÜBERNEHMEN';
    if (this.trolley.grabbed) return 'E · WAGEN LOSLASSEN   WASD · SCHIEBEN';
    if (this.trolley.near(player)) return 'E · SERVICEWAGEN GREIFEN';
    return '';
  }

  interact(player: Position3): boolean {
    if (this.phase === 'landed') {
      this.phase = 'airport';
      this.aircraft.setAirportPresentation(true);
      this.evacuation.start();
      this.pendingTeleport = {
        x: this.aircraft.airportExit[0],
        y: this.aircraft.airportExit[1],
        z: this.aircraft.airportExit[2],
      };
      this.events.push('alert');
      return true;
    }
    if (this.flying) return true;
    if (this.phase === 'enter_cockpit' && this.insidePilotInteractionZone(player)) {
      this.trolley.release();
      this.phase = 'flying';
      this.aircraft.setFlightPresentation(true);
      this.controller.start();
      this.events.push('alert');
      return true;
    }
    if (this.trolley.interact(player)) {
      this.phase = this.trolley.grabbed ? 'breach_door' : this.phase;
      return true;
    }
    return false;
  }

  step(
    delta: number,
    input: InputActions,
    player: Position3,
    playerVelocity: Position3,
    facingYaw: number,
  ): void {
    if (this.flying) {
      if (this.phase === 'flying' && input.landPressed) {
        this.phase = 'landing';
        this.controller.beginLanding();
        this.events.push('alert');
      }
      this.controller.step(delta, input);
      if (this.phase === 'landing' && this.controller.landed) {
        this.phase = 'landed';
        this.events.push('land');
      }
      return;
    }
    if (this.phase === 'airport') {
      this.evacuation.update(delta);
      return;
    }
    this.impactCooldown = Math.max(0, this.impactCooldown - delta);
    this.trolley.step(delta, input, player, facingYaw, playerVelocity);
    const speed = this.trolley.velocity.z;
    const door = aircraftLayout.takeover.cockpitDoor;
    const distance = door.z - this.trolley.position.z;
    if (
      this.doorIntegrity > 0 &&
      this.impactCooldown === 0 &&
      Math.abs(this.trolley.position.x - door.x) < 1.7 &&
      distance > -0.25 &&
      distance < 1.15 &&
      speed >= aircraftLayout.takeover.minimumImpactSpeed
    ) {
      this.impactCooldown = 0.65;
      this.doorIntegrity = Math.max(0, this.doorIntegrity - speed * 30);
      this.events.push(this.doorIntegrity === 0 ? 'smash' : 'block');
      this.trolley.release();
      if (this.doorIntegrity === 0) {
        this.world.remove(this.aircraft.cockpitDoorCollider);
        this.phase = 'enter_cockpit';
      }
    }
    if (this.doorIntegrity <= 0 && this.doorOpen < 1) {
      this.doorOpen = Math.min(1, this.doorOpen + delta * 2.2);
      this.aircraft.cockpitDoor.rotation.y = -this.doorOpen * 1.35;
      this.aircraft.cockpitDoor.position.x = -this.doorOpen * 1.25;
    }
    for (const member of this.crew) {
      member.z += member.direction * member.route.speed * 0.45 * delta;
      if (member.z >= member.route.maxZ || member.z <= member.route.minZ) {
        member.direction = member.direction > 0 ? -1 : 1;
        member.z = Math.max(member.route.minZ, Math.min(member.route.maxZ, member.z));
      }
      member.rig.root.position.z = member.z;
      member.rig.root.rotation.y = member.direction > 0 ? 0 : Math.PI;
      member.rig.gesture('walk');
    }
  }

  takeSound(): SoundCue | null {
    return this.events.shift() ?? null;
  }

  takeTeleport(): Position3 | null {
    const teleport = this.pendingTeleport;
    this.pendingTeleport = null;
    return teleport;
  }

  /** The authored cockpit is larger than the fallback pilot chair and blocks access to its exact
   * centre from some angles. Treat the usable cockpit aisle as one interaction zone instead of
   * requiring Tobi's capsule centre to hit a small sphere inside the chair. */
  private insidePilotInteractionZone(player: Position3): boolean {
    const approach = this.aircraft.cockpitApproach;
    const pilot = this.aircraft.pilotApproach;
    const rear = Math.min(approach[2]!, pilot[2]!) - 0.75;
    const front = Math.max(approach[2]!, pilot[2]!) + 2.5;
    return (
      Math.abs(player.x) <= 6.2 &&
      Math.abs(player.y - pilot[1]!) <= 2.2 &&
      player.z >= rear &&
      player.z <= front
    );
  }

  dispose(): void {
    this.trolley.dispose();
    this.evacuation.dispose();
    for (const member of this.crew) member.rig.dispose();
  }
}
