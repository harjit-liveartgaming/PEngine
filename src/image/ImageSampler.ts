import { Color } from '../core/Particle.js';

export class ImageSampler {
  private readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;

  constructor(imageData: ImageData) {
    this.data = imageData.data;
    this.width = imageData.width;
    this.height = imageData.height;
  }

  static async fromURL(url: string): Promise<ImageSampler> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(new ImageSampler(ctx.getImageData(0, 0, canvas.width, canvas.height)));
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  static async fromFile(file: File): Promise<ImageSampler> {
    const url = URL.createObjectURL(file);
    try {
      return await ImageSampler.fromURL(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Returns RGBA color at pixel (x, y) with all values in [0, 1].
   * Returns transparent black for out-of-bounds coordinates.
   */
  sample(x: number, y: number): Color {
    const px = x | 0;
    const py = y | 0;
    if (px < 0 || px >= this.width || py < 0 || py >= this.height) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    const i = (py * this.width + px) * 4;
    return {
      r: this.data[i]     / 255,
      g: this.data[i + 1] / 255,
      b: this.data[i + 2] / 255,
      a: this.data[i + 3] / 255,
    };
  }

  /**
   * Returns the average of R, G, B at pixel (x, y) in [0, 1].
   * Useful for reading grayscale depth maps.
   */
  sampleGrayscale(x: number, y: number): number {
    const px = x | 0;
    const py = y | 0;
    if (px < 0 || px >= this.width || py < 0 || py >= this.height) return 0;
    const i = (py * this.width + px) * 4;
    return (this.data[i] + this.data[i + 1] + this.data[i + 2]) / (3 * 255);
  }

  /**
   * Returns a row-major 2D array of every pixel's color: map[y][x].
   * All values are in [0, 1]. For large images, prefer sample() instead.
   */
  toColorMap(): Color[][] {
    const map: Color[][] = new Array(this.height);
    for (let py = 0; py < this.height; py++) {
      const row: Color[] = new Array(this.width);
      for (let px = 0; px < this.width; px++) {
        const i = (py * this.width + px) * 4;
        row[px] = {
          r: this.data[i]     / 255,
          g: this.data[i + 1] / 255,
          b: this.data[i + 2] / 255,
          a: this.data[i + 3] / 255,
        };
      }
      map[py] = row;
    }
    return map;
  }
}
