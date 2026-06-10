import { Particle } from '../core/Particle.js';
import { Force } from './Force.js';

export class Gravity implements Force {
  /** Downward acceleration in pixels/s². */
  constructor(public strength = 200) {}

  apply(p: Particle, dt: number): void {
    p.vy += this.strength * dt;
  }
}
