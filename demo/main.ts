import { ParticleSystem } from '../src/core/ParticleSystem.js';
import { Emitter } from '../src/core/Emitter.js';
import { Gravity } from '../src/forces/Gravity.js';
import { Wind } from '../src/forces/Wind.js';
import { WebGLRenderer } from '../src/renderer/WebGLRenderer.js';
import { ImageSampler } from '../src/image/ImageSampler.js';
import { ImageEmitter } from '../src/image/ImageEmitter.js';

// ── DOM ──────────────────────────────────────────────────────────────────────
const canvas       = document.getElementById('canvas')        as HTMLCanvasElement;
const countEl      = document.getElementById('count')         as HTMLSpanElement;
const fileInput    = document.getElementById('file-input')    as HTMLInputElement;
const uploadBtn    = document.getElementById('upload-btn')    as HTMLButtonElement;
const fileNameEl   = document.getElementById('file-name')     as HTMLDivElement;
const thresholdEl  = document.getElementById('threshold')     as HTMLInputElement;
const thresholdPct = document.getElementById('threshold-pct') as HTMLSpanElement;

// ── Engine ───────────────────────────────────────────────────────────────────
const MAX      = 30_000;
const renderer = new WebGLRenderer(canvas, MAX);
const system   = new ParticleSystem(MAX);

system.addForce(new Gravity(60));
system.addForce(new Wind(10, 0));

// ── Default fountain ─────────────────────────────────────────────────────────
const fountain = system.addEmitter(new Emitter({
  x: 0, y: 0,
  rate: 250,
  angle: -Math.PI / 2,
  spread: Math.PI / 7,
  speed: [220, 420],
  lifetime: [1.8, 3],
  startSize: [9, 15],
  endSize: [0, 3],
  startColor: { r: 1, g: 0.95, b: 0.5, a: 1 },
  endColor:   { r: 1, g: 0.15, b: 0,   a: 0 },
  positionVariance: 12,
}));

// ── State ────────────────────────────────────────────────────────────────────
let imageEmitter: ImageEmitter | null = null;

// ── Resize ───────────────────────────────────────────────────────────────────
function centerImageEmitter(e: ImageEmitter): void {
  e.x = (window.innerWidth  - e.colorSampler.width  * e.scale) / 2;
  e.y = (window.innerHeight - e.colorSampler.height * e.scale) / 2;
}

function resize(): void {
  renderer.resize(window.innerWidth, window.innerHeight);
  fountain.x = window.innerWidth / 2;
  fountain.y = window.innerHeight - 60;
  if (imageEmitter) centerImageEmitter(imageEmitter);
}

window.addEventListener('resize', resize);
resize();

// ── Upload ───────────────────────────────────────────────────────────────────
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  uploadBtn.textContent = 'Loading…';
  uploadBtn.disabled = true;

  try {
    const sampler = await ImageSampler.fromFile(file);

    // Scale image to fill ~82% of the shorter canvas dimension
    const scale = Math.min(
      (window.innerWidth  * 0.82) / sampler.width,
      (window.innerHeight * 0.82) / sampler.height,
    );

    if (imageEmitter) system.removeEmitter(imageEmitter);
    fountain.active = false;

    imageEmitter = system.addEmitter(new ImageEmitter({
      colorSampler: sampler,
      scale,
      rate: 800,
      alphaThreshold: 0.05,
      brightnessThreshold: thresholdEl.valueAsNumber / 100,
      lifetime: [2, 4],
      startSize: [4, 9],
      endSize:   [0, 2],
      speed:     [0, 12],
    }));

    centerImageEmitter(imageEmitter);

    // Burst immediately so the shape appears right away
    system.burst(imageEmitter, Math.min(imageEmitter.candidateCount, 8_000));

    fileNameEl.textContent = file.name;
  } catch (err) {
    fileNameEl.textContent = 'Failed to load image';
    console.error(err);
  } finally {
    uploadBtn.textContent = '↑ Upload Image';
    uploadBtn.disabled = false;
  }
});

// ── Brightness threshold ─────────────────────────────────────────────────────
thresholdEl.addEventListener('input', () => {
  const pct = thresholdEl.valueAsNumber;
  thresholdPct.textContent = `${pct}%`;
  if (imageEmitter) {
    imageEmitter.brightnessThreshold = pct / 100;
  }
});

// ── Click to burst ───────────────────────────────────────────────────────────
canvas.addEventListener('click', (e: MouseEvent) => {
  const burst = new Emitter({
    x: e.clientX,
    y: e.clientY,
    rate: 0,
    spread: Math.PI,
    speed: [80, 320],
    lifetime: [0.6, 1.8],
    startSize: [10, 20],
    endSize:   [0, 3],
    startColor: { r: 0.4, g: 0.85, b: 1, a: 1 },
    endColor:   { r: 0.05, g: 0, b: 0.9, a: 0 },
    positionVariance: 6,
  });
  system.burst(burst, 120);
});

// ── Loop ─────────────────────────────────────────────────────────────────────
let last = 0;

function loop(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  system.update(dt);
  renderer.render(system.particles);
  countEl.textContent = system.activeCount.toLocaleString();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
