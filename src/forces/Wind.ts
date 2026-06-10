import { Particle } from '../core/Particle.js';
import { Force } from './Force.js';

export class Wind implements Force {
  /** Constant acceleration in pixels/s² along each axis. */
  constructor(public x = 30, public y = 0) {}

  apply(p: Particle, dt: number): void {
    p.vx += this.x * dt;
    p.vy += this.y * dt;
  }
}
