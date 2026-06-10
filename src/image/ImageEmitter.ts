import { Color } from '../core/Particle.js';
import { ParticlePool } from '../core/ParticlePool.js';
import { IEmitter } from '../core/IEmitter.js';
import { ImageSampler } from './ImageSampler.js';

interface CandidatePixel {
  x: number;
  y: number;
  color: Color;
  /** Perceptual luminance in [0, 1]: 0.299r + 0.587g + 0.114b */
  brightness: number;
}

export interface ImageEmitterConfig {
  colorSampler: ImageSampler;
  depthSampler?: ImageSampler;
  x?: number;
  y?: number;
  scale?: number;
  rate?: number;
  /** Only treat pixels with alpha >= this as candidates (0–1). */
  alphaThreshold?: number;
  /** Only spawn pixels with brightness >= this (0–1). Updatable after construction. */
  brightnessThreshold?: number;
  lifetime?: [number, number];
  startSize?: [number, number];
  endSize?: [number, number];
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

  /** All pixels that pass the alpha threshold, with pre-computed brightness. */
  private readonly _allCandidates: CandidatePixel[];
  /** Subset of _allCandidates that also pass the current brightness threshold. */
  private _candidates: CandidatePixel[];
  private _brightnessThreshold: number;
  private _acc = 0;

  constructor(config: ImageEmitterConfig) {
    this.colorSampler = config.colorSampler;
    this.depthSampler = config.depthSampler;
    this.x            = config.x     ?? 0;
    this.y            = config.y     ?? 0;
    this.scale        = config.scale ?? 1;
    this.rate         = config.rate  ?? 100;
    this.lifetime     = config.lifetime  ?? [1, 2];
    this.startSize    = config.startSize ?? [4, 8];
    this.endSize      = config.endSize   ?? [0, 2];
    this.speed        = config.speed     ?? [0, 15];

    const alphaThreshold = config.alphaThreshold ?? 0.1;
    const { width, height } = config.colorSampler;
    this._allCandidates = [];

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const color = config.colorSampler.sample(px, py);
        if (color.a >= alphaThreshold) {
          const brightness = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
          this._allCandidates.push({ x: px, y: py, color, brightness });
        }
      }
    }

    this._brightnessThreshold = config.brightnessThreshold ?? 0;
    this._candidates = this._applyBrightnessFilter(this._brightnessThreshold);
  }

  get brightnessThreshold(): number {
    return this._brightnessThreshold;
  }

  set brightnessThreshold(value: number) {
    this._brightnessThreshold = value;
    this._candidates = this._applyBrightnessFilter(value);
  }

  /** Number of pixels currently eligible for spawning. */
  get candidateCount(): number {
    return this._candidates.length;
  }

  update(dt: number, pool: ParticlePool): void {
    if (!this.active || this.rate <= 0 || this._candidates.length === 0) return;
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

  sampleDepth(x: number, y: number): number {
    return this.depthSampler?.sampleGrayscale(x, y) ?? 0;
  }

  private _applyBrightnessFilter(min: number): CandidatePixel[] {
    if (min <= 0) return this._allCandidates;
    return this._allCandidates.filter(p => p.brightness >= min);
  }

  private _spawnOne(pool: ParticlePool): void {
    if (this._candidates.length === 0) return;
    const p = pool.acquire();
    if (!p) return;

    const pixel = this._candidates[(Math.random() * this._candidates.length) | 0];

    p.x = this.x + pixel.x * this.scale;
    p.y = this.y + pixel.y * this.scale;

    const spd   = rand(this.speed[0], this.speed[1]);
    const angle = Math.random() * Math.PI * 2;
    p.vx = Math.cos(angle) * spd;
    p.vy = Math.sin(angle) * spd;

    p.age       = 0;
    p.lifetime  = rand(this.lifetime[0], this.lifetime[1]);
    p.startSize = rand(this.startSize[0], this.startSize[1]);
    p.endSize   = rand(this.endSize[0], this.endSize[1]);

    p.startColor = { ...pixel.color };
    p.endColor   = { ...pixel.color, a: 0 };
  }
}
