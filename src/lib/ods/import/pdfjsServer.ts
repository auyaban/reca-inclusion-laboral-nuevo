// Helper para cargar pdfjs-dist en Node.js serverless (Vercel).
//
// pdfjs-dist@5.x — incluso el legacy build — referencia DOMMatrix/Path2D/
// ImageData, que son APIs del browser y no existen en Node. Sin polyfills,
// `await import("pdfjs-dist/legacy/build/pdf.mjs")` tira
// "DOMMatrix is not defined" en runtime.
//
// Para extracción de TEXTO (no rendering), pdfjs solo necesita el constructor
// y unas pocas operaciones matriciales 2D. Polyfill mínimo abajo. Si en el
// futuro se necesita rendering server-side, considerar `unpdf` o `canvas`.

type Matrix6 = [number, number, number, number, number, number];

class DOMMatrixPolyfill {
  a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
  m11 = 1; m12 = 0; m13 = 0; m14 = 0;
  m21 = 0; m22 = 1; m23 = 0; m24 = 0;
  m31 = 0; m32 = 0; m33 = 1; m34 = 0;
  m41 = 0; m42 = 0; m43 = 0; m44 = 1;
  is2D = true;
  isIdentity = true;

  constructor(init?: string | number[]) {
    if (Array.isArray(init)) {
      if (init.length === 6) {
        const [a, b, c, d, e, f] = init as Matrix6;
        this.a = a; this.b = b; this.c = c; this.d = d; this.e = e; this.f = f;
      } else if (init.length === 16) {
        this.a = init[0]; this.b = init[1];
        this.c = init[4]; this.d = init[5];
        this.e = init[12]; this.f = init[13];
      }
    }
  }

  multiply(other: DOMMatrixPolyfill): DOMMatrixPolyfill {
    const m = new DOMMatrixPolyfill();
    m.a = this.a * other.a + this.c * other.b;
    m.b = this.b * other.a + this.d * other.b;
    m.c = this.a * other.c + this.c * other.d;
    m.d = this.b * other.c + this.d * other.d;
    m.e = this.a * other.e + this.c * other.f + this.e;
    m.f = this.b * other.e + this.d * other.f + this.f;
    return m;
  }

  multiplySelf(other: DOMMatrixPolyfill): DOMMatrixPolyfill {
    Object.assign(this, this.multiply(other));
    return this;
  }

  invertSelf(): DOMMatrixPolyfill {
    const det = this.a * this.d - this.b * this.c;
    if (det === 0) return this;
    const a = this.d / det;
    const b = -this.b / det;
    const c = -this.c / det;
    const d = this.a / det;
    const e = (this.c * this.f - this.d * this.e) / det;
    const f = (this.b * this.e - this.a * this.f) / det;
    this.a = a; this.b = b; this.c = c; this.d = d; this.e = e; this.f = f;
    return this;
  }

  translate(tx: number, ty: number): DOMMatrixPolyfill {
    const m = new DOMMatrixPolyfill([this.a, this.b, this.c, this.d, this.e, this.f]);
    m.e += this.a * tx + this.c * ty;
    m.f += this.b * tx + this.d * ty;
    return m;
  }

  scale(sx: number, sy?: number): DOMMatrixPolyfill {
    const sxy = sy ?? sx;
    const m = new DOMMatrixPolyfill();
    m.a = this.a * sx;
    m.b = this.b * sx;
    m.c = this.c * sxy;
    m.d = this.d * sxy;
    m.e = this.e;
    m.f = this.f;
    return m;
  }

  transformPoint(point: { x: number; y: number; z?: number; w?: number }) {
    return {
      x: this.a * point.x + this.c * point.y + this.e,
      y: this.b * point.x + this.d * point.y + this.f,
      z: point.z ?? 0,
      w: point.w ?? 1,
    };
  }
}

let _polyfilled = false;

function applyServerPolyfills() {
  if (_polyfilled) return;
  _polyfilled = true;

  const g = globalThis as Record<string, unknown>;
  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = DOMMatrixPolyfill;
  }
  // pdfjs-dist también referencia Path2D e ImageData en algunos paths.
  // Stubs no-op para que el constructor no rompa (no hacemos rendering).
  if (typeof g.Path2D === "undefined") {
    g.Path2D = class {};
  }
  if (typeof g.ImageData === "undefined") {
    g.ImageData = class {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      colorSpace = "srgb";
      constructor(data: Uint8ClampedArray | number, width: number, height?: number) {
        if (typeof data === "number") {
          this.width = data;
          this.height = width;
          this.data = new Uint8ClampedArray(data * width * 4);
        } else {
          this.data = data;
          this.width = width;
          this.height = height ?? data.length / (4 * width);
        }
      }
    };
  }
}

/**
 * Carga pdfjs-dist con los polyfills necesarios para Node serverless.
 * Usar en lugar de `await import("pdfjs-dist")` directamente.
 */
export async function loadPdfjs() {
  applyServerPolyfills();
  return await import("pdfjs-dist/legacy/build/pdf.mjs");
}
