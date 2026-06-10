import { Particle } from './Particle.js';
import { ParticlePool } from './ParticlePool.js';
import { IEmitter } from './IEmitter.js';
import { Force } from '../forces/Force.js';

export class ParticleSystem {
  private pool: ParticlePool;
  private emitters = new Set<IEmitter>();
  private forces = new Set<Force>();

  constructor(maxParticles = 10000) {
    this.pool = new ParticlePool(maxParticles);
  }

  get maxParticles(): number {
    return this.pool.capacity;
  }

  get activeCount(): number {
    return this.pool.capacity - this.pool.freeCount;
  }

  /** All particles (alive and dead). Use particle.alive to filter. */
  get particles(): readonly Particle[] {
    return this.pool.particles;
  }

  /** Returns the emitter so callers keep the concrete type (Emitter, ImageEmitter, etc.). */
  addEmitter<T extends IEmitter>(emitter: T): T {
    this.emitters.add(emitter);
    return emitter;
  }

  removeEmitter(emitter: IEmitter): void {
    this.emitters.delete(emitter);
  }

  addForce(force: Force): Force {
    this.forces.add(force);
    return force;
  }

  removeForce(force: Force): void {
    this.forces.delete(force);
  }

  /** Immediately spawn `count` particles from the given emitter. */
  burst(emitter: IEmitter, count: number): void {
    emitter.burst(count, this.pool);
  }

  update(dt: number): void {
    for (const emitter of this.emitters) {
      emitter.update(dt, this.pool);
    }

    const { particles } = this.pool;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!p.alive) continue;

      for (const force of this.forces) {
        force.apply(p, dt);
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.age += dt;

      if (p.age >= p.lifetime) {
        this.pool.release(p);
      }
    }
  }
}
