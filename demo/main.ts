import { ParticleSystem } from '../src/core/ParticleSystem.js';
import { Emitter } from '../src/core/Emitter.js';
import { Gravity } from '../src/forces/Gravity.js';
import { Wind } from '../src/forces/Wind.js';
import { WebGLRenderer } from '../src/renderer/WebGLRenderer.js';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const countEl = document.getElementById('count') as HTMLSpanElement;

const MAX = 20_000;
const renderer = new WebGLRenderer(canvas, MAX);
const system = new ParticleSystem(MAX);

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
  fountain.x = window.innerWidth / 2;
  fountain.y = window.innerHeight - 60;
}

window.addEventListener('resize', resize);

// --- Fountain ---
const fountain = system.addEmitter(
  new Emitter({
    x: 0,
    y: 0,
    rate: 250,
    angle: -Math.PI / 2,
    spread: Math.PI / 7,
    speed: [220, 420],
    lifetime: [1.8, 3],
    startSize: [9, 15],
    endSize: [0, 3],
    startColor: { r: 1, g: 0.95, b: 0.5, a: 1 },
    endColor: { r: 1, g: 0.15, b: 0, a: 0 },
    positionVariance: 12,
  }),
);

system.addForce(new Gravity(160));
system.addForce(new Wind(18, 0));

resize();

// --- Click to burst ---
canvas.addEventListener('click', (e: MouseEvent) => {
  const burstEmitter = new Emitter({
    x: e.clientX,
    y: e.clientY,
    rate: 0,
    angle: -Math.PI / 2,
    spread: Math.PI,
    speed: [80, 320],
    lifetime: [0.6, 1.8],
    startSize: [10, 20],
    endSize: [0, 3],
    startColor: { r: 0.4, g: 0.85, b: 1, a: 1 },
    endColor: { r: 0.05, g: 0, b: 0.9, a: 0 },
    positionVariance: 6,
  });
  system.burst(burstEmitter, 120);
});

// --- Loop ---
let last = 0;

function loop(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  system.update(dt);
  renderer.render(system.particles);

  countEl.textContent = String(system.activeCount);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
