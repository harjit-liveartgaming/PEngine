import { Particle } from '../core/Particle.js';

export interface Force {
  apply(particle: Particle, dt: number): void;
}
