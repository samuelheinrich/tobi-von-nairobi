import { describe, expect, it } from 'vitest';
import { Tutorial, type TutorialLesson } from './tutorial.js';
const lessons: TutorialLesson[] = [
  { id: 'move', metric: 'distance', threshold: 3, title: 'Move', body: '', key: 'W' },
  {
    id: 'collect',
    metric: 'bottles',
    threshold: 2,
    cumulative: true,
    title: 'Collect',
    body: '',
    key: '',
  },
  { id: 'sit', metric: 'seated', threshold: 1, title: 'Sit', body: '', key: 'E' },
  { id: 'stand', metric: 'stoodUp', threshold: 1, title: 'Stand', body: '', key: 'E' },
];
describe('guided tutorial', () => {
  it('counts confirmed movement and early pickups without skipping future practice actions', () => {
    const tutorial = new Tutorial(lessons);
    tutorial.observe({ bottles: 2, seated: 5, stoodUp: 1 });
    expect(tutorial.index).toBe(0);
    tutorial.observe({ distance: 3 });
    expect(tutorial.index).toBe(1);
    tutorial.observe({});
    expect(tutorial.index).toBe(2);
    tutorial.observe({ seated: 0.5 });
    expect(tutorial.complete).toBe(false);
    tutorial.observe({ seated: 0.5 });
    expect(tutorial.index).toBe(3);
    tutorial.observe({ stoodUp: 1 });
    expect(tutorial.complete).toBe(true);
  });
  it('supports a new lesson through data and a new confirmed signal, with no sequence switch', () => {
    const tutorial = new Tutorial([
      ...lessons,
      { id: 'throw', metric: 'throws', threshold: 1, title: 'Throw', key: 'G', body: '' },
    ]);
    tutorial.observe({ distance: 3 });
    tutorial.observe({ bottles: 2 });
    tutorial.observe({ seated: 1 });
    tutorial.observe({ stoodUp: 1 });
    expect(tutorial.active?.id).toBe('throw');
    tutorial.observe({ throws: 1 });
    expect(tutorial.complete).toBe(true);
  });
});
