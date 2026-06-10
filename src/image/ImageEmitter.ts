import { Color } from '../core/Particle.js';
import { ParticlePool } from '../core/ParticlePool.js';
import { IEmitter } from '../core/IEmitter.js';
import { ImageSampler } from './ImageSampler.js';

interface CandidatePixel {
  /** Image-space x coordinate. */
  x: number;
  /** Image-space y coordinate. */
  y: number;
  color: Color;
}

export interface ImageEmitterConfig {
  /** Drives particle spawn position and color. */
  colorSampler: ImageSampler;
  /**
   * Optional grayscale depth map. Same dimensions as colorSampler.
   * Bright = far (depth 1), dark = near (depth 0).
   * Used by sampleDepth() — wired into 3D positioning when you add z support.
   */
  depthSampler?: ImageSampler;
  /** World-space position of the image's top-left corner. */
  x?: number;
  y?: number;
  /** Image pixels → world units. Default 1. */
  scale?: number;
  /** Particles per second. */
  rate?: number;
  /** Only treat pixels with alpha >= threshold as spawn candidates (0–1). */
  alphaThreshold?: number;
  /** [min, max] lifetime in seconds. */
  lifetime?: [number, number];
  /** [min, max] starting size in pixels. */
  startSize?: [number, number];
  /** [min, max] ending size in pixels. */
  endSize?: [number, number];
  /**
   * [min, max] random drift speed applied on spawn (pixels/s).
   * Keep low to preserve the image shape; set to [0,0] for static particles.
   */
  speed?: [number, number];
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class ImageEmitter implements IEmitter {
  x: number;
  y: number;
  scale: number;
  rate: number;
  lifetime: [number, number];
  startSize: [number, number];
  endSize: [number, number];
  speed: [number, number];
  active = true;

  readonly colorSampler: ImageSampler;
  readonly depthSampler: ImageSampler | undefined;

  /** Pre-computed list of pixels eligible for spawning. */
  private readonly candidates: CandidatePixel[];
  private _acc = 0;

  constructor(config: ImageEmitterConfig) {
    this.colorSampler  = config.colorSampler;
    this.depthSampler  = config.depthSampler;
    this.x             = config.x             ?? 0;
    this.y             = config.y             ?? 0;
    this.scale         = config.scale         ?? 1;
    this.rate          = config.rate          ?? 100;
    this.lifetime      = config.lifetime      ?? [1, 2];
    this.startSize     = config.startSize     ?? [4, 8];
    this.endSize       = config.endSize       ?? [0, 2];
    this.speed         = config.speed         ?? [0, 15];

    const threshold = config.alphaThreshold ?? 0.1;
    const { width, height } = config.colorSampler;
    this.candidates = [];

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const color = config.colorSampler.sample(px, py);
        if (color.a >= threshold) {
          this.candidates.push({ x: px, y: py, color });
        }
      }
    }
  }

  /** Number of eligible spawn pixels. */
  get candidateCount(): number {
    return this.candidates.length;
  }

  update(dt: number, pool: ParticlePool): void {
    if (!this.active || this.rate <= 0 || this.candidates.length === 0) return;
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

  /**
   * Returns the normalised depth [0, 1] at image-space pixel (x, y).
   * Returns 0 if no depthSampler is configured.
   * Intended for future use when mapping particles into 3D space (z = sampleDepth * depthScale).
   */
  sampleDepth(x: number, y: number): number {
    return this.depthSampler?.sampleGrayscale(x, y) ?? 0;
  }

  private _spawnOne(pool: ParticlePool): void {
    if (this.candidates.length === 0) return;
    const p = pool.acquire();
    if (!p) return;

    const pixel = this.candidates[(Math.random() * this.candidates.length) | 0];

    p.x = this.x + pixel.x * this.scale;
    p.y = this.y + pixel.y * this.scale;

    const spd   = rand(this.speed[0], this.speed[1]);
    const angle = Math.random() * Math.PI * 2;
    p.vx = Math.cos(angle) * spd;
    p.vy = Math.sin(angle) * spd;

    p.age      = 0;
    p.lifetime = rand(this.lifetime[0], this.lifetime[1]);
    p.startSize = rand(this.startSize[0], this.startSize[1]);
    p.endSize   = rand(this.endSize[0], this.endSize[1]);

    p.startColor = { ...pixel.color };
    p.endColor   = { ...pixel.color, a: 0 };
  }
}
