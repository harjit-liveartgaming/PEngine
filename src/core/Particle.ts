export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class Particle {
  /** Index in the owning ParticlePool — set once at construction. */
  _index = 0;

  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  age = 0;
  lifetime = 1;
  alive = false;

  startSize = 8;
  endSize = 0;

  startColor: Color = { r: 1, g: 1, b: 1, a: 1 };
  endColor: Color = { r: 1, g: 1, b: 1, a: 0 };

  /** Normalised age [0, 1]. */
  get t(): number {
    return this.lifetime > 0 ? Math.min(this.age / this.lifetime, 1) : 1;
  }
}
