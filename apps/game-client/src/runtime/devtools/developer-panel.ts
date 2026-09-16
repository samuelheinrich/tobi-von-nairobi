export interface DebugCommands {
  togglePhysics?(): void;
  togglePhysicsLayer?(layer: string): void;
  respawn(): void;
  teleportHome(): void;
  teleports?: readonly { label: string; run(): void }[];
  inspect(): string;
}

/** Imported only by a development-only dynamic import. No gameplay or save authority lives here. */
export function createDeveloperPanel(commands: DebugCommands): () => void {
  const panel = document.createElement('aside');
  panel.className = 'developer-panel';
  const title = document.createElement('strong');
  title.textContent = 'F1 · DEVELOPER TOOLS';
  panel.append(title);
  for (const [label, action] of [
    ['Respawn Tobi', commands.respawn],
    ['Teleport zum Airbnb', commands.teleportHome],
  ] as const) {
    const button = document.createElement('button');
    button.textContent = label;
    button.onclick = action;
    panel.append(button);
  }
  for (const teleport of commands.teleports ?? []) {
    const button = document.createElement('button');
    button.textContent = teleport.label;
    button.onclick = teleport.run;
    panel.append(button);
  }
  if (commands.togglePhysics) {
    const button = document.createElement('button');
    button.textContent = 'Collider / Bodenabfrage';
    button.onclick = commands.togglePhysics;
    panel.append(button);
  }
  if (commands.togglePhysicsLayer) {
    const layers = document.createElement('div');
    for (const layer of [
      'PLAYER',
      'NPC',
      'WORLD_STATIC',
      'WORLD_DYNAMIC',
      'PROP',
      'VEHICLE',
      'PROJECTILE',
      'TRIGGER',
    ]) {
      const label = document.createElement('label'),
        input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = true;
      input.onchange = () => commands.togglePhysicsLayer?.(layer);
      label.append(input, layer + ' ');
      layers.append(label);
    }
    panel.append(layers);
  }
  const state = document.createElement('pre');
  panel.append(state);
  const timer = window.setInterval(() => {
    state.textContent = commands.inspect();
  }, 200);
  document.body.append(panel);
  return () => {
    window.clearInterval(timer);
    panel.remove();
  };
}
