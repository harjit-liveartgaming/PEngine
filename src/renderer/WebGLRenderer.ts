import { Particle } from '../core/Particle.js';

const VERT = `
attribute vec2 a_pos;
attribute vec4 a_color;
attribute float a_size;

uniform vec2 u_res;

varying vec4 v_color;

void main() {
  vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = a_size;
  v_color = a_color;
}
`;

const FRAG = `
precision mediump float;
varying vec4 v_color;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float alpha = 1.0 - smoothstep(0.3, 0.5, d);
  gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
}
`;

const FLOATS_PER_PARTICLE = 7; // x y r g b a size

export type BlendMode = 'normal' | 'additive';

export class WebGLRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private vbo: WebGLBuffer;
  private cpuBuf: Float32Array;

  private aPos: number;
  private aColor: number;
  private aSize: number;
  private uRes: WebGLUniformLocation;

  constructor(
    canvas: HTMLCanvasElement,
    maxParticles = 10000,
    blendMode: BlendMode = 'additive',
  ) {
    this.canvas = canvas;

    const gl = canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL not supported in this browser');
    this.gl = gl;

    this.program = this._buildProgram(VERT, FRAG);
    this.vbo = gl.createBuffer()!;
    this.cpuBuf = new Float32Array(maxParticles * FLOATS_PER_PARTICLE);

    gl.useProgram(this.program);
    this.aPos = gl.getAttribLocation(this.program, 'a_pos');
    this.aColor = gl.getAttribLocation(this.program, 'a_color');
    this.aSize = gl.getAttribLocation(this.program, 'a_size');
    this.uRes = gl.getUniformLocation(this.program, 'u_res')!;

    gl.enable(gl.BLEND);
    gl.blendFunc(
      gl.SRC_ALPHA,
      blendMode === 'additive' ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA,
    );
    gl.clearColor(0, 0, 0, 1);
  }

  resize(width: number, height: number): void {
    const { gl, canvas } = this;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    gl.uniform2f(this.uRes, width, height);
  }

  /** Render all particles in the array, skipping dead ones. */
  render(particles: readonly Particle[]): void {
    const { gl, cpuBuf, vbo } = this;

    gl.useProgram(this.program);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const maxCount = (cpuBuf.length / FLOATS_PER_PARTICLE) | 0;
    let count = 0;

    for (let i = 0; i < particles.length && count < maxCount; i++) {
      const p = particles[i];
      if (!p.alive) continue;

      // Inline lerp for colour and size — avoids per-particle object allocation.
      const t = p.t;
      const base = count * FLOATS_PER_PARTICLE;
      cpuBuf[base + 0] = p.x;
      cpuBuf[base + 1] = p.y;
      cpuBuf[base + 2] = p.startColor.r + (p.endColor.r - p.startColor.r) * t;
      cpuBuf[base + 3] = p.startColor.g + (p.endColor.g - p.startColor.g) * t;
      cpuBuf[base + 4] = p.startColor.b + (p.endColor.b - p.startColor.b) * t;
      cpuBuf[base + 5] = p.startColor.a + (p.endColor.a - p.startColor.a) * t;
      cpuBuf[base + 6] = p.startSize + (p.endSize - p.startSize) * t;
      count++;
    }

    if (count === 0) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      cpuBuf.subarray(0, count * FLOATS_PER_PARTICLE),
      gl.DYNAMIC_DRAW,
    );

    const stride = FLOATS_PER_PARTICLE * 4;
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(this.aColor);
    gl.vertexAttribPointer(this.aColor, 4, gl.FLOAT, false, stride, 2 * 4);

    gl.enableVertexAttribArray(this.aSize);
    gl.vertexAttribPointer(this.aSize, 1, gl.FLOAT, false, stride, 6 * 4);

    gl.drawArrays(gl.POINTS, 0, count);
  }

  private _buildProgram(vert: string, frag: string): WebGLProgram {
    const { gl } = this;
    const vs = this._compileShader(gl.VERTEX_SHADER, vert);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, frag);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Shader link error: ' + gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  private _compileShader(type: number, src: string): WebGLShader {
    const { gl } = this;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Shader compile error: ' + gl.getShaderInfoLog(shader));
    }
    return shader;
  }
}
