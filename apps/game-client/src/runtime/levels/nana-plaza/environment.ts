import type { NanaBuilder } from './builder.js';

/** Modular frontage kit; doors are visual on closed shops, clear ground remains continuous. */
export function buildStreets(b: NanaBuilder) {
  b.solid('island-ground', [150, 1, 178], [0, -0.5, -2], '#302f3b', false);
  b.prop('sukhumvit-asphalt', [147, 0.015, 23], [0, 0.015, -63], '#242835');
  for (const z of [-77, -49]) b.prop('sukhumvit-sidewalk', [148, 0.02, 7], [0, 0.02, z], '#77717a');
  b.prop('soi-four-asphalt', [12, 0.02, 45], [0, 0.025, -24], '#3d3548');
  for (let x = -65; x < 70; x += 8)
    for (const z of [-68, -58]) b.prop('lane-mark', [3, 0.02, 0.15], [x, 0.04, z], '#d6c9a2');
  const shop = (x: number, z: number, i: number, facing = 0) => {
    const colors = ['#665860', '#574754', '#807165', '#4b5268'];
    b.solid(
      'bangkok-shophouse',
      [11, 12 + (i % 4) * 3, 10],
      [x, (12 + (i % 4) * 3) / 2, z],
      colors[i % 4],
    );
    const front = z - 5.08;
    b.prop('shop-awning', [11, 0.18, 2], [x, 3.5, front - 0.5], '#84596d');
    b.prop('shop-window', [7, 2, 0.08], [x, 1.7, front], '#dbb881', true);
    b.sign(
      ['MANGO HOTEL', 'OPEN BAR', 'MASSAGE', 'NOODLES 24H', 'MINI MART', 'ATM / EXCHANGE'][i % 6]!,
      [x, 4.4, front - 0.1],
      10,
      i % 2 ? '#ff7dab' : '#52e1d5',
      facing,
    );
    for (let y = 6; y < 12; y += 3) {
      b.prop('window-row', [8, 1.3, 0.1], [x, y, front], '#cfaa77', true);
      b.prop('air-conditioner', [1.4, 0.7, 0.6], [x + 4, y - 0.5, front - 0.25], '#98a3a4');
    }
    b.prop('rain-pipe', [0.12, 11, 0.12], [x - 5, 5.5, front - 0.15], '#252d3c');
  };
  for (let i = 0; i < 12; i++) shop(-66 + i * 12, -85, i);
  for (const x of [-64, -52, -40, -28, -16, 16, 28, 40, 52, 64]) shop(x, -35, Math.abs(x / 4));
  // Close both road ends with construction/parked buses; no invisible walls in the streets.
  for (const x of [-74, 74]) b.solid('roadworks-hoarding', [1, 5, 178], [x, 2.5, -2], '#6b635f');
  b.solid('rear-block-wall', [150, 6, 0.6], [0, 3, 86], '#484956');
  b.solid('north-block-wall', [150, 12, 0.6], [0, 6, -90], '#414354');
  for (const side of [-1, 1]) {
    b.solid('soi-building-row', [9, 10, 30], [side * 12, 5, -17], '#554657');
    for (let i = 0; i < 5; i++) {
      const z = -36 + i * 7;
      b.prop('soi-awning', [2.8, 0.2, 5.8], [side * 7, 3.2, z], '#8f5875');
      b.sign(
        ['SOI 4', 'BEER / FOOD', 'MANGO MASSAGE', 'HOTEL NANA NIGHTS', 'EXCHANGE'][i]!,
        [side * 7.35, 4.2, z],
        6,
        side < 0 ? '#fbc661' : '#fd4e9e',
        (side * Math.PI) / 2,
      );
      b.prop('bar-window', [0.08, 1.5, 4], [side * 7.4, 1.8, z], '#f4aa76', true);
      b.prop('cables', [0.04, 0.06, 46], [side * 6.8, 5.1 + i * 0.12, -23], '#171d2a');
      b.prop('ac-compressor', [0.5, 0.7, 1.1], [side * 7.2, 6, z], '#adb2ae');
      b.prop('food-cart', [1.2, 0.9, 1.8], [side * 5.8, 0.45, z + 1], '#6e9289');
      b.prop('food-cart-canopy', [1.8, 0.15, 2.2], [side * 5.8, 2.2, z + 1], '#dc8a54');
      b.prop('bin', [0.6, 0.8, 0.6], [side * 6.3, 0.4, z + 3], '#314b49');
      b.prop('scooter-body', [0.55, 0.7, 1.5], [side * 5.7, 0.5, z - 2], '#ce6489');
    }
  }
  const traffic = Array.from({ length: 10 }, (_, i) => {
    const bus = i % 5 === 0;
    const body = b.prop(
      bus ? 'city-bus' : i % 3 ? 'taxi' : 'tuk-tuk',
      [bus ? 8 : 3.6, bus ? 2.6 : 1.3, 1.8],
      [0, bus ? 1.3 : 0.7, -68 + (i % 2) * 10],
      bus ? '#d55d4b' : i % 2 ? '#eace43' : '#ed6698',
    );
    return { body, offset: i * 16, direction: i % 2 ? 1 : -1 };
  });
  let time = 0;
  return (delta: number) => {
    time += delta;
    for (const car of traffic)
      car.body.position.x = (((time * 7 + car.offset) % 148) - 74) * car.direction;
  };
}
