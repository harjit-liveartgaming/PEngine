import { Color } from './Particle.js';
import { ParticlePool } from './ParticlePool.js';

export interface EmitterConfig {
  x: number;
  y: number;
  /** Particles per second. Set to 0 for burst-only emitters. */
  rate?: number;
  /** Emission direction in radians (0 = right, -π/2 = up). */
  angle?: number;
  /** Half-spread around angle in radians. */
  spread?: number;
  /** [min, max] initial speed in pixels/s. */
  speed?: [number, number];
  /** [min, max] particle lifetime in seconds. */
  lifetime?: [number, number];
  /** [min, max] starting size in pixels. */
  startSize?: [number, number];
  /** [min, max] ending size in pixels. */
  endSize?: [number, number];
  startColor?: Color;
  endColor?: Color;
  /** Random radius applied to the spawn position. */
  positionVariance?: number;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class Emitter {
  x: number;
  y: number;
  rate: number;
  angle: number;
  spread: number;
  speed: [number, number];
  lifetime: [number, number];
  startSize: [number, number];
  endSize: [number, number];
  startColor: Color;
  endColor: Color;
  positionVariance: number;
  active = true;

  private _acc = 0;

  constructor(config: EmitterConfig) {
    this.x = config.x;
    this.y = config.y;
    this.rate = config.rate ?? 100;
    this.angle = config.angle ?? -Math.PI / 2;
    this.spread = config.spread ?? Math.PI / 8;
    this.speed = config.speed ?? [100, 200];
    this.lifetime = config.lifetime ?? [1, 2];
    this.startSize = config.startSize ?? [6, 12];
    this.endSize = config.endSize ?? [0, 2];
    this.startColor = config.startColor ?? { r: 1, g: 0.8, b: 0.2, a: 1 };
    this.endColor = config.endColor ?? { r: 1, g: 0.1, b: 0, a: 0 };
    this.positionVariance = config.positionVariance ?? 4;
  }

  update(dt: number, pool: ParticlePool): void {
    if (!this.active || this.rate <= 0) return;
    this._acc += this.rate * dt;
    while (this._acc >= 1) {
      this._spawnOne(pool);
      this._acc -= 1;
    }
  }

  burst(count: number, pool: ParticlePool): void {
    for (let i = 0; i < count; i++) {
      this._spawnOne(pool);
    }
  }

  private _spawnOne(pool: ParticlePool): void {
    const p = pool.acquire();
    if (!p) return;

    const pv = this.positionVariance;
    p.x = this.x + rand(-pv, pv);
    p.y = this.y + rand(-pv, pv);

    const spd = rand(this.speed[0], this.speed[1]);
    const dir = this.angle + rand(-this.spread, this.spread);
    p.vx = Math.cos(dir) * spd;
    p.vy = Math.sin(dir) * spd;

    p.age = 0;
    p.lifetime = rand(this.lifetime[0], this.lifetime[1]);
    p.startSize = rand(this.startSize[0], this.startSize[1]);
    p.endSize = rand(this.endSize[0], this.endSize[1]);
    p.startColor = { ...this.startColor };
    p.endColor = { ...this.endColor };
  }
}
