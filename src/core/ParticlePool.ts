import { Particle } from './Particle.js';

export class ParticlePool {
  readonly particles: Particle[];
  private freeStack: number[];

  constructor(maxSize = 10000) {
    this.particles = Array.from({ length: maxSize }, (_, i) => {
      const p = new Particle();
      p._index = i;
      return p;
    });
    // Fill in reverse so pop() returns index 0 first.
    this.freeStack = Array.from({ length: maxSize }, (_, i) => maxSize - 1 - i);
  }

  get capacity(): number {
    return this.particles.length;
  }

  get freeCount(): number {
    return this.freeStack.length;
  }

  acquire(): Particle | null {
    if (this.freeStack.length === 0) return null;
    const p = this.particles[this.freeStack.pop()!];
    p.alive = true;
    return p;
  }

  release(p: Particle): void {
    p.alive = false;
    this.freeStack.push(p._index);
  }
}
