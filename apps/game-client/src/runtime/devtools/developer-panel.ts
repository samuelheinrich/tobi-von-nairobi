export interface DebugCommands {
  respawn(): void;
  teleportHome(): void;
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
