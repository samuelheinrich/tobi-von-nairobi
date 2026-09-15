import type { InputActions, InputSource } from '@tobi/contracts';
import { prototypeBalance } from '@tobi/game-data';

const gameKeys = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'ShiftLeft',
  'ShiftRight',
  'KeyE',
  'KeyR',
  'KeyC',
  'KeyG',
  'KeyF',
]);

/** Keyboard/mouse adapter; gameplay never reads DOM key codes. */
export class KeyboardInput implements InputSource {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();
  private lookX = 0;
  private lookY = 0;
  public enabled = false;
  private dragging = false;

  public constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled || !gameKeys.has(event.code) || event.target instanceof HTMLInputElement)
      return;
    event.preventDefault();
    if (!this.held.has(event.code)) this.pressed.add(event.code);
    this.held.add(event.code);
  };
  private onKeyUp = (event: KeyboardEvent): void => {
    this.held.delete(event.code);
  };
  private onPointerDown = (): void => {
    if (this.enabled) this.dragging = true;
  };
  private onPointerUp = (): void => {
    this.dragging = false;
  };
  private onMouseMove = (event: MouseEvent): void => {
    if (!this.enabled || (document.pointerLockElement !== this.canvas && !this.dragging)) return;
    this.lookX += event.movementX * prototypeBalance.cameraSensitivity;
    this.lookY += event.movementY * prototypeBalance.cameraSensitivity;
  };

  public sample(): InputActions {
    const down = (...keys: string[]): number => Number(keys.some((key) => this.held.has(key)));
    const actions: InputActions = {
      moveX: down('KeyD', 'ArrowRight') - down('KeyA', 'ArrowLeft'),
      moveZ: down('KeyW', 'ArrowUp') - down('KeyS', 'ArrowDown'),
      lookX: this.lookX,
      lookY: this.lookY,
      jumpPressed: this.pressed.has('Space'),
      sprintHeld: down('ShiftLeft', 'ShiftRight') > 0,
      interactPressed: this.pressed.has('KeyE'),
      specialPressed: this.pressed.has('KeyR'),
      celebratePressed: this.pressed.has('KeyC'),
      throwPressed: this.pressed.has('KeyG'),
      flirtPressed: this.pressed.has('KeyF'),
    };
    this.pressed.clear();
    this.lookX = this.lookY = 0;
    return actions;
  }

  public reset(): void {
    this.held.clear();
    this.pressed.clear();
    this.lookX = this.lookY = 0;
    this.dragging = false;
  }
  public dispose(): void {
    this.reset();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
  }
}
