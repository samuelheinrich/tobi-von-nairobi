import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { flyHigh } from '@tobi/game-data';
import type { InputActions, Position3 } from '@tobi/contracts';
import { FlightRuntime } from '../src/runtime/flight/flight-runtime.js';
import { createLevelScene } from '../src/runtime/levels/create-level-scene.js';
import { HavokWorld, preparePhysics } from '../src/runtime/physics/havok-world.js';

/** Small local smoke harness for the phase-1–5 blockout. It deliberately avoids a full route bot. */
export async function exerciseFlight() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const engine = new Engine(canvas, false);
  const scene = new Scene(engine);
  const world = new HavokWorld(scene, await preparePhysics());
  const environment = createLevelScene(scene, world, flyHigh);
  if (!environment.aircraft) throw new Error('Aircraft scene did not expose its runtime contract.');
  await environment.aircraft.modelReady;
  const flight = new FlightRuntime(scene, world, environment.aircraft);
  try {
    for (let i = 0; i < 30; i++) world.step(1 / 60);
    const input: InputActions = {
      moveX: 0,
      moveZ: 1,
      lookX: 0,
      lookY: 0,
      jumpPressed: false,
      sprintHeld: false,
      interactPressed: false,
      specialPressed: false,
      celebratePressed: false,
      throwPressed: false,
      flirtPressed: false,
      landPressed: false,
    };
    let ticks = 0;
    while (flight.phase !== 'enter_cockpit' && ticks++ < 900) {
      const player: Position3 = {
        x: flight.trolley.position.x,
        y: 5.5,
        z: flight.trolley.position.z - 1.1,
      };
      if (!flight.trolley.grabbed) flight.interact(player);
      flight.step(1 / 60, input, player, { x: 0, y: 0, z: 4.6 }, 0);
      world.step(1 / 60);
    }
    if (flight.phase !== 'enter_cockpit') throw new Error('Trolley did not breach cockpit door.');
    flight.interact({ x: -2.15, y: 5.5, z: 62.8 });
    if (!flight.flying) throw new Error('Pilot seat did not start Flight Mode.');
    input.moveX = 0.55;
    input.moveZ = -0.35;
    input.sprintHeld = true;
    for (let i = 0; i < 180; i++)
      flight.step(1 / 60, input, flight.controller.position, { x: 0, y: 0, z: 0 }, 0);
    input.landPressed = true;
    flight.step(1 / 60, input, flight.controller.position, { x: 0, y: 0, z: 0 }, 0);
    input.landPressed = false;
    for (let i = 0; i < 17 * 60; i++)
      flight.step(1 / 60, input, flight.controller.position, { x: 0, y: 0, z: 0 }, 0);
    if (flight.snapshot.phase !== 'landed')
      throw new Error('Landing sequence did not reach touchdown.');
    flight.interact(flight.controller.position);
    const airportExit = flight.takeTeleport();
    if (!flight.exploringAirport || !airportExit)
      throw new Error('Touchdown did not release Tobi onto the airport apron.');
    for (let i = 0; i < 8 * 60; i++)
      flight.step(1 / 60, input, airportExit, { x: 0, y: 0, z: 0 }, 0);
    return {
      phase: flight.phase,
      doorIntegrity: flight.doorIntegrity,
      trolley: flight.trolley.position.asArray(),
      cockpitDoor: environment.aircraft.cockpitDoor.position.asArray(),
      seatAnchors: environment.seatAnchors?.length ?? 0,
      colliders: world.colliders.length,
      clouds: scene.meshes.filter((mesh) => mesh.name === 'passing-cloud').length,
      passengerSeats: scene.meshes.filter((mesh) => mesh.name === 'aircraft-seat-cushion').length,
      flight: flight.snapshot,
      breachSeconds: ticks / 60,
      loadedA380Meshes: scene.meshes.filter((mesh) => mesh.name.startsWith('Object_')).length,
      landscapeHouses: scene.meshes.filter((mesh) => mesh.name.startsWith('flight-house-')).length,
      airportExit,
      terminalParts: scene.meshes.filter((mesh) => mesh.name.startsWith('terminal-')).length,
      evacuees: flight.snapshot.evacuation,
    };
  } finally {
    flight.dispose();
    world.dispose();
    scene.dispose();
    engine.dispose();
    canvas.remove();
  }
}
