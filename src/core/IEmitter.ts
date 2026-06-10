import { ParticlePool } from './ParticlePool.js';

export interface IEmitter {
  active: boolean;
  update(dt: number, pool: ParticlePool): void;
  burst(count: number, pool: ParticlePool): void;
}
