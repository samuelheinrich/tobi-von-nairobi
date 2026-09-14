import type { GameView } from '@tobi/contracts';
import './tutorial-coach.css';
/** Non-modal: the player can carry out the instruction while reading it. */
export function TutorialCoach({ lesson }: { lesson: GameView['lesson'] }) {
  if (!lesson) return null;
  return (
    <aside
      className="tutorial-coach"
      aria-label="Tutorial-Anleitung"
      aria-live="polite"
      data-testid="tutorial-coach"
      data-lesson={lesson.id}
    >
      <span>
        TOBIS FAHRSCHULE · {lesson.index + 1}/{lesson.total}
      </span>
      <kbd>{lesson.key}</kbd>
      <h2>{lesson.title}</h2>
      <p>{lesson.body}</p>
      {lesson.distance !== null && (
        <strong
          data-testid="tutorial-navigation"
          data-bearing={lesson.bearing}
          data-distance={lesson.distance.toFixed(2)}
        >
          ZIEL: {Math.ceil(lesson.distance)} m ·{' '}
          {
            {
              N: 'NORDEN',
              NE: 'NORDOSTEN',
              E: 'OSTEN',
              SE: 'SÜDOSTEN',
              S: 'SÜDEN',
              SW: 'SÜDWESTEN',
              W: 'WESTEN',
              NW: 'NORDWESTEN',
              '': 'HIER',
            }[lesson.bearing]
          }
        </strong>
      )}
      <progress value={lesson.index} max={lesson.total} aria-label="Tutorial-Fortschritt" />
    </aside>
  );
}
