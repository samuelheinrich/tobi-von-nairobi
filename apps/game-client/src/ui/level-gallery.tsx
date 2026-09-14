import { playableLevels, welcomeToBali, worldNames } from '@tobi/game-data';

const previews = import.meta.glob<string>('../assets/level-previews/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});
export function levelPreview(id: string): string | undefined {
  return previews[`../assets/level-previews/${id}.webp`];
}
export function levelTitle(id: string, title: string): string {
  return id === welcomeToBali.id ? `Tutorial · ${title}` : title;
}

/** Static thumbnails keep the menu cheap: only the selected level owns a Babylon scene. */
export function LevelGallery({
  selected,
  disabled,
  onSelect,
}: {
  selected: string;
  disabled: boolean;
  onSelect(id: string): void;
}) {
  return (
    <section className="level-gallery" aria-label="Levelauswahl">
      <div className="gallery-heading">
        <div>
          <span className="eyebrow">DEINE REISE</span>
          <h2>Dein nächster Stopp.</h2>
        </div>
        <label className="gallery-select">
          SCHNELLAUSWAHL
          <select
            aria-label="Level wählen"
            value={selected}
            disabled={disabled}
            onChange={(event) => onSelect(event.target.value)}
          >
            {playableLevels.map((level, index) => (
              <option key={level.id} value={level.id}>
                {index + 1}. {levelTitle(level.id, level.title)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="gallery-note">
        Alle {playableLevels.length} Level frei wählbar. Kein Login nötig.
      </p>
      <ol className="level-grid">
        {playableLevels.map((level, index) => (
          <li key={level.id}>
            <button
              className="level-card"
              aria-label={`Level ${index + 1}: ${levelTitle(level.id, level.title)}`}
              aria-pressed={selected === level.id}
              disabled={disabled}
              onClick={() => onSelect(level.id)}
            >
              <div className="level-card-image">
                <img
                  src={levelPreview(level.id)}
                  alt=""
                  width="640"
                  height="360"
                  decoding="async"
                />
                <span className="level-number">{String(index + 1).padStart(2, '0')}</span>
                {index === 0 && <span className="tutorial-badge">HIER BEGINNEN</span>}
                <span className="selected-check" aria-hidden="true">
                  ✓
                </span>
              </div>
              <div className="level-card-copy">
                <span className="level-world">
                  {worldNames[level.worldId]}
                  {index === 0 ? ' / TUTORIAL' : ''}
                </span>
                <strong>{level.title}</strong>
                <span className="level-card-details">
                  {level.pickups.length} Flaschen{' '}
                  <span>
                    {level.maxWanted
                      ? `${'★'.repeat(level.maxWanted)} Verfolgung`
                      : 'In Ruhe erkunden'}
                  </span>
                </span>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
