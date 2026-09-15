import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Locomotion, Seating } from '@tobi/game-core';
import { flyHigh, movement, aircraftLayout } from '@tobi/game-data';
import { createLevelScene } from '../src/runtime/levels/create-level-scene.js';
import { FlightRuntime } from '../src/runtime/flight/flight-runtime.js';
import {
  HavokWorld,
  HavokCharacterMotor,
  preparePhysics,
} from '../src/runtime/physics/havok-world.js';

/** A real Havok route plus real crew visibility. Teleports only implement authored E interactions. */
export async function exerciseFlight() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const engine = new Engine(canvas, false),
    scene = new Scene(engine);
  const world = new HavokWorld(scene, await preparePhysics());
  const environment = createLevelScene(scene, world, flyHigh);
  const flight = new FlightRuntime(scene, environment);
  const motor = new HavokCharacterMotor(scene, flyHigh.spawn);
  const locomotion = new Locomotion(movement),
    seating = new Seating();
  let ticks = 0;
  const trace: unknown[] = [];
  const tick = (x = 0, z = 0) => {
    const velocity = locomotion.step(
      {
        moveX: x,
        moveZ: z,
        lookX: 0,
        lookY: 0,
        jumpPressed: false,
        sprintHeld: false,
        interactPressed: false,
        specialPressed: false,
        throwPressed: false,
        flirtPressed: false,
        celebratePressed: false,
      },
      0,
      motor.support(1 / 60),
      1 / 60,
    );
    velocity.x *= 0.5;
    velocity.z *= 0.5;
    world.step(1 / 60);
    if (seating.active) motor.teleport(seating.active.position);
    else motor.move(velocity, 1 / 60);
    const outcome = flight.step(1 / 60, motor.position, seating.active);
    if (outcome)
      throw Error(
        JSON.stringify({ outcome, at: motor.position.asArray(), trace, crew: flight.puzzle.crew }),
      );
    ticks++;
  };
  const walk = (x: number, z: number) => {
    for (let i = 0; i < 2400; i++) {
      const p = motor.position,
        dx = x - p.x,
        dz = z - p.z,
        distance = Math.hypot(dx, dz);
      if (distance < 0.16) {
        trace.push({ x, z, at: p.asArray() });
        return;
      }
      tick(dx / distance, dz / distance);
    }
    throw Error(JSON.stringify({ stuck: motor.position.asArray(), target: [x, z], trace }));
  };
  const enter = (id: string) => {
    const spot = seating.nearest(motor.position, environment.restSpots ?? []);
    if (spot?.id !== id) throw Error(`Cannot interact with ${id} from ${motor.position}`);
    motor.teleport(seating.enter(spot));
    locomotion.reset();
  };
  const leave = () => {
    const exit = seating.leave();
    if (exit) motor.teleport(exit);
    locomotion.reset();
  };
  const until = (ready: () => boolean) => {
    for (let i = 0; i < 3600; i++) {
      if (ready()) return;
      tick();
    }
    throw Error('Timed out waiting for crew');
  };
  try {
    for (let i = 0; i < 60; i++) tick();
    walk(-3.05, -32);
    enter('tobi-seat');
    until(() => flight.puzzle.crew[0]!.direction > 0 && flight.puzzle.crew[0]!.position.z > -25);
    leave();
    walk(-3.05, -24.5);
    enter('seat-hide');
    until(() => flight.puzzle.stage === 1);
    leave();
    walk(-3.05, -14.5);
    walk(4.6, -14.5);
    walk(4.6, -11.4);
    walk(3.05, -11.4);
    walk(3.05, -0.5);
    // Cross behind the attendant after she has gone aft; the toilet entry faces the left aisle.
    until(() => flight.puzzle.crew[1]!.direction < 0 && flight.puzzle.crew[1]!.position.z < -4);
    walk(-3.05, -0.5);
    enter('toilet-hide');
    until(() => flight.puzzle.stage === 2);
    until(() => flight.puzzle.crew[1]!.direction < 0 && flight.puzzle.crew[1]!.position.z < -4);
    leave();
    // Centre console and the second trolley require the other aisle. A standing passenger
    // occupies that aisle at Z=6; pass through the central gap between rows before continuing.
    walk(-3.05, 10.2);
    walk(3.05, 10.2);
    walk(3.05, 32);
    walk(0, 33);
    walk(0, 47);
    const upstairs = motor.position.y;
    walk(4, 47);
    walk(4, 35);
    walk(3.2, 12);
    walk(0, 12);
    walk(3.2, 12);
    walk(3.2, 32);
    const finalPosition = motor.position.asArray();
    // Independent geometry probe for the second stair: a fresh setup at its lower entrance.
    // The puzzle solution above has already finished; this does not contribute to its progress.
    motor.teleport({ x: 0, y: 1.1, z: -33 });
    const stairProbe = (targetZ: number) => {
      for (let i = 0; i < 1200; i++) {
        const dz = targetZ - motor.position.z;
        if (Math.abs(dz) < 0.15) return motor.position.y;
        world.step(1 / 60);
        motor.move({ x: 0, y: motor.grounded ? 0 : -2, z: Math.sign(dz) * 2.9 }, 1 / 60);
        motor.support(1 / 60);
      }
      throw Error(`Aft stair stuck at ${motor.position}`);
    };
    const aftUp = stairProbe(-47);
    const aftDown = stairProbe(-33);
    return {
      aftUp,
      aftDown,
      stage: flight.puzzle.stage,
      ready: flight.puzzle.ready,
      returns: flight.puzzle.returns,
      upstairs,
      position: finalPosition,
      seconds: ticks / 60,
      trace,
      police: flyHigh.maxWanted,
      cloudCount: scene.meshes.filter((m) => m.name === 'passing-cloud').length,
      seats: scene.meshes.filter((m) => m.name === 'aircraft-seat-cushion').length,
      configuredSpots: aircraftLayout.seats.length,
    };
  } finally {
    flight.dispose();
    motor.dispose();
    world.dispose();
    scene.dispose();
    engine.dispose();
    canvas.remove();
  }
}
