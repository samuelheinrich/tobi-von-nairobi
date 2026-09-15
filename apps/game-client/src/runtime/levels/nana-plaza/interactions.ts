import type { Position3 } from '@tobi/contracts';
import { nanaDrinks, nanaVenues } from '@tobi/game-data';

import type { SceneInteractionResult } from '../scene-interaction.js';
/** Local arcade tab, deliberately separate from account money and persistence. E opens, F cycles. */
export class NanaBarInteractions {
  private venue: string | null = null;
  private selected = 0;
  private baht = 1200;
  private purchases = 0;
  private near(position: Position3) {
    return nanaVenues.find(
      (v) =>
        v.mode !== 'facade' &&
        Math.abs(position.y - v.floor * 4.8 - 1) < 1.5 &&
        Math.hypot(position.x - v.side * 28.3, position.z - v.z) < 2.2,
    );
  }
  public prompt(position: Position3): string {
    const venue = this.near(position);
    if (!venue) {
      this.venue = null;
      return '';
    }
    if (this.venue !== venue.id) return `E · GETRÄNK BESTELLEN / ${venue.name}`;
    return `${nanaDrinks.map((d, i) => `${i === this.selected ? '▶ ' : ''}${d.name} ${d.price} THB`).join(' · ')} | ${this.baht} THB · F: WÄHLEN · E: KAUFEN · Weggehen: schliessen`;
  }
  public cycle(position: Position3): boolean {
    if (!this.venue || this.near(position)?.id !== this.venue) return false;
    this.selected = (this.selected + 1) % nanaDrinks.length;
    return true;
  }
  public interact(position: Position3): SceneInteractionResult | null {
    const venue = this.near(position);
    if (!venue) {
      this.venue = null;
      return null;
    }
    if (this.venue !== venue.id) {
      this.venue = venue.id;
      return {
        text: 'Was darf es sein? F wählt das Getränk, E bestellt.',
        energy: 0,
        drink: false,
      };
    }
    const drink = nanaDrinks[this.selected]!;
    if (this.baht < drink.price)
      return { text: 'KONTO LEER · WARENKORB VOLL', energy: 0, drink: false };
    this.baht -= drink.price;
    this.purchases++;
    return {
      text: `${venue.name}: ${drink.name} · ${drink.price} THB · REST ${this.baht} THB`,
      energy: drink.energy,
      drink: drink.name !== 'WATER',
    };
  }
  public get bought(): number {
    return this.purchases;
  }
}
