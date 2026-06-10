# PEngine

A lightweight WebGL particle engine written in TypeScript. Spawn thousands of GPU-rendered particles from emitters, forces, or directly from PNG images.

**[Live Demo →](https://harjit-liveartgaming.github.io/PEngine/)**

> Click anywhere on the canvas to burst particles.

---

## Features

- **WebGL point-sprite renderer** — additive blending, soft circular particles, single draw call per frame
- **Object-pool allocator** — zero GC allocations during simulation (free-list, O(1) acquire/release)
- **Emitters** — continuous rate-based spawning and one-shot bursts; configurable spread, speed, lifetime, color, and size
- **Forces** — composable `Gravity` and `Wind`; plug in any custom `Force` implementation
- **Image-based spawning** — load a PNG and spawn particles at its pixel positions using its pixel colors
- **Depth map ready** — accepts a second PNG as a depth sampler; `sampleDepth(x, y)` is wired in for future 3D expansion
- **Strict TypeScript** — fully typed public API, zero runtime dependencies

---

## Getting Started

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run build      # production build → dist/
```

---

## Usage

### Fountain emitter

```typescript
import { ParticleSystem, Emitter, Gravity, Wind, WebGLRenderer } from './src/index.js';

const renderer = new WebGLRenderer(canvas, 20_000);
renderer.resize(window.innerWidth, window.innerHeight);

const system = new ParticleSystem(20_000);

system.addEmitter(new Emitter({
  x: canvas.width / 2,
  y: canvas.height - 60,
  rate: 250,
  angle: -Math.PI / 2,
  spread: Math.PI / 7,
  speed: [200, 420],
  lifetime: [1.8, 3],
  startColor: { r: 1, g: 0.95, b: 0.5, a: 1 },
  endColor:   { r: 1, g: 0.15, b: 0,   a: 0 },
}));

system.addForce(new Gravity(160));
system.addForce(new Wind(18));

let last = 0;
function loop(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  system.update(dt);
  renderer.render(system.particles);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

### Image-based emitter

```typescript
import { ImageSampler, ImageEmitter } from './src/index.js';

const colorSampler = await ImageSampler.fromFile(fileInputEvent.target.files[0]);
const depthSampler = await ImageSampler.fromURL('/assets/depth.png');

// Full 2D color array — map[y][x] gives { r, g, b, a } in [0, 1]
const colorMap = colorSampler.toColorMap();

system.addEmitter(new ImageEmitter({
  colorSampler,
  depthSampler,           // stored for future 3D; query via sampleDepth(x, y)
  x: 100, y: 80,          // world-space top-left of the image
  scale: 2,               // 2 world units per pixel
  rate: 500,
  alphaThreshold: 0.1,    // skip transparent pixels
  speed: [0, 10],         // low drift to preserve image shape
  lifetime: [1.5, 3],
}));
```

---

## API

### `ParticleSystem`

| Method | Description |
|---|---|
| `addEmitter<T>(emitter: T): T` | Register an emitter; returns the same instance typed |
| `removeEmitter(emitter)` | Unregister an emitter |
| `addForce(force): Force` | Register a force |
| `removeForce(force)` | Unregister a force |
| `burst(emitter, count)` | Immediately spawn `count` particles |
| `update(dt)` | Advance simulation by `dt` seconds |
| `particles` | `readonly Particle[]` — full pool; renderer skips dead ones |
| `activeCount` | Number of live particles |

### `Emitter` config

| Property | Type | Default | Description |
|---|---|---|---|
| `x`, `y` | `number` | — | Spawn origin |
| `rate` | `number` | `100` | Particles per second |
| `angle` | `number` | `-π/2` | Emission direction (radians) |
| `spread` | `number` | `π/8` | Half-angle spread |
| `speed` | `[min, max]` | `[100, 200]` | Initial speed (px/s) |
| `lifetime` | `[min, max]` | `[1, 2]` | Seconds alive |
| `startSize` / `endSize` | `[min, max]` | `[6,12]` / `[0,2]` | Particle size in px |
| `startColor` / `endColor` | `Color` | orange → transparent | RGBA in [0, 1] |
| `positionVariance` | `number` | `4` | Random spawn radius |

### `ImageSampler`

| Method | Description |
|---|---|
| `ImageSampler.fromURL(url)` | Load from a URL (returns `Promise<ImageSampler>`) |
| `ImageSampler.fromFile(file)` | Load from a `File` object |
| `sample(x, y): Color` | RGBA at pixel (x, y), values in [0, 1] |
| `sampleGrayscale(x, y): number` | Average of R+G+B at (x, y), in [0, 1] |
| `toColorMap(): Color[][]` | Full image as `map[y][x]` |

### `WebGLRenderer`

```typescript
new WebGLRenderer(canvas, maxParticles?, blendMode?)
// blendMode: 'additive' (default) | 'normal'

renderer.resize(width, height)
renderer.render(system.particles)
```

### Forces

```typescript
new Gravity(strength = 200)   // px/s² downward
new Wind(x = 30, y = 0)       // px/s² constant acceleration
```

Implement `Force` for custom behaviour:

```typescript
class Turbulence implements Force {
  apply(p: Particle, dt: number) {
    p.vx += (Math.random() - 0.5) * 80 * dt;
    p.vy += (Math.random() - 0.5) * 80 * dt;
  }
}
```

---

## Architecture

```
src/
├── core/
│   ├── Particle.ts          data class — x y vx vy age lifetime colors sizes
│   ├── ParticlePool.ts      free-list pool, O(1) acquire / release
│   ├── Emitter.ts           rate + burst spawning
│   ├── ParticleSystem.ts    orchestrates emitters, forces, update loop
│   └── IEmitter.ts          shared interface (Emitter & ImageEmitter)
├── forces/
│   ├── Force.ts             interface
│   ├── Gravity.ts
│   └── Wind.ts
├── renderer/
│   └── WebGLRenderer.ts     point sprites · interleaved VBO · additive blend
├── image/
│   ├── ImageSampler.ts      PNG → Color[][] · fromURL · fromFile
│   └── ImageEmitter.ts      spawns at image pixel positions with image colors
└── index.ts                 public API re-exports
demo/
└── main.ts                  fountain + click-to-burst demo
```
